import { expect, test } from 'claude-code/testing'
import type { ModelCompleteResult } from 'claude-code'

import type { Fact, Memory } from '../../types'
import { emptyMemory, factId, mergeMemories } from './facts'
import { applyLearned, forgetById, forgetMatching, learn, loadAll, persistAll, rememberText } from './session'
import type { Loaded, MemoryDeps } from './session'
import { addSuggested, PROJECT_FILE, projectPartition } from './store'

const replyWith = (json: object) => async (): Promise<ModelCompleteResult> => ({ isAnswered: true, text: JSON.stringify(json), usage: { input_tokens: 1, output_tokens: 1 } } as ModelCompleteResult)

const makeDeps = (over: Partial<MemoryDeps> = {}, files: Record<string, string> = {}) => {
  const data = new Map(Object.entries(files))
  const store = new Map<string, unknown>()
  const deps: MemoryDeps = {
    root: '/repo',
    files: {
      exists: async p => data.has(p),
      read: async p => { const t = data.get(p); if (t === undefined) throw new Error('missing'); return t },
      write: async (p, t) => { data.set(p, t) },
    },
    kv: { get: async k => store.get(k), set: async (k, v) => { store.set(k, v) } },
    now: () => 1000,
    toolNames: async () => [],
    complete: replyWith({ facts: [], suggested: [] }),
    ...over,
  }
  return { deps, data, store }
}

test('loadAll merges the file, the env scan and marks suggested-then-installed as worked', async () => {
  const { deps } = makeDeps({}, {
    '/repo/package.json': JSON.stringify({ dependencies: { '@supabase/supabase-js': '2' } }),
    [`/repo/${PROJECT_FILE}`]: '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n',
  })
  await addSuggested(deps.kv, ['Supabase'])
  const loaded = await loadAll(deps)
  expect(loaded.file.existed).toBe(true)
  expect(loaded.project.facts.map(f => `${f.kind}:${f.subject}`).sort()).toEqual(['rejection:Zapier', 'stack:Supabase', 'worked:Supabase'])
})

test('loadAll uses Azure when configured, and still works when it times out', async () => {
  const remote: Memory = { facts: [{ id: factId('constraint', 'budget'), kind: 'constraint', scope: 'personal', subject: 'budget', text: 'max €50', source: 'conversation', firstSeen: 5, lastSeen: 5 }], tombstones: {} }
  const fast = makeDeps({ azure: { config: { url: 'https://x/api/memory', key: 'k' }, fetch: async url => ({ ok: true, status: 200, text: JSON.stringify(url.includes('personal') ? remote : emptyMemory()) }), sleep: () => new Promise(() => {}) } })
  expect((await loadAll(fast.deps)).personal.facts.map(f => f.subject)).toEqual(['budget'])
  const slow = makeDeps({ azure: { config: { url: 'https://x', key: 'k' }, fetch: () => new Promise(() => {}), sleep: async () => {} } })
  expect((await loadAll(slow.deps)).personal.facts).toEqual([])
})

test('persistAll skips the project file for scan-only memory, writes it once a real fact exists', async () => {
  const { deps, data, store } = makeDeps({}, { '/repo/package.json': JSON.stringify({ dependencies: { stripe: '1' } }) })
  const loaded = await loadAll(deps)
  await persistAll(deps, { projectFile: 'commit' }, loaded.personal, loaded.project, loaded.file)
  expect(data.has(`/repo/${PROJECT_FILE}`)).toBe(false)
  expect(store.has('memory.personal')).toBe(true)
  const learned = await learn({ ...deps, complete: replyWith({ facts: [{ kind: 'decision', scope: 'project', subject: 'Vercel', text: 'team knows it' }], suggested: ['HubSpot'] }) }, 'We picked Vercel because the team already knows it well', 'ok', loaded.personal, loaded.project)
  expect(learned.fresh).toEqual(['decision:vercel'])
  await persistAll(deps, { projectFile: 'commit' }, learned.personal, learned.project, { existed: false })
  expect(data.get(`/repo/${PROJECT_FILE}`)).toContain('- Vercel: team knows it')
  expect(store.get('memory.suggested')).toEqual(['hubspot'])
})

test('learn sorts personal and project facts and ignores trivial turns', async () => {
  const { deps } = makeDeps({ complete: replyWith({ facts: [{ kind: 'constraint', scope: 'personal', subject: 'budget', text: 'max €20' }, { kind: 'stack', scope: 'project', subject: 'Supabase', text: 'auth' }], suggested: [] }) })
  const r = await learn(deps, 'my budget is max €20 and this project uses Supabase for auth', 'ok', emptyMemory(), emptyMemory())
  expect(r.personal.facts.map(f => f.subject)).toEqual(['budget'])
  expect(r.project.facts.map(f => f.subject)).toEqual(['Supabase'])
  const none = await learn(deps, 'hi', 'hello', emptyMemory(), emptyMemory())
  expect(none.fresh).toEqual([])
})

test('forgetMatching and forgetById delete across both memories, never env facts', async () => {
  const personal: Memory = { facts: [{ id: 'rejection:zapier', kind: 'rejection', scope: 'personal', subject: 'Zapier', text: 'too expensive', source: 'conversation', firstSeen: 1, lastSeen: 1 }], tombstones: {} }
  const project: Memory = { facts: [{ id: 'stack:zapier', kind: 'stack', scope: 'project', subject: 'Zapier', text: 'seen in .env.example', source: 'env', firstSeen: 1, lastSeen: 1 }], tombstones: {} }
  expect(forgetMatching(personal, project, 'za', 9).removed).toEqual([])
  const r = forgetMatching(personal, project, 'zap', 9)
  expect(r.removed.map(f => f.id)).toEqual(['rejection:zapier'])
  expect(r.project.facts.length).toBe(1)
  const byId = forgetById(personal, project, 'rejection:zapier', 9)
  expect(byId.personal.facts).toEqual([])
  expect(byId.personal.tombstones['rejection:zapier']).toBe(9)
})

test('rememberText uses the reader, marks the facts as the user, and falls back to a constraint', async () => {
  const viaReader = makeDeps({ complete: replyWith({ facts: [{ kind: 'rejection', scope: 'personal', subject: 'Make', text: 'too fiddly' }], suggested: [] }) })
  const a = await rememberText(viaReader.deps, 'never suggest Make, too fiddly', emptyMemory(), emptyMemory())
  expect(a.added.map(f => `${f.kind}:${f.subject}:${f.source}`)).toEqual(['rejection:Make:user'])
  const fallback = makeDeps()
  const b = await rememberText(fallback.deps, 'budget max €50 a month', emptyMemory(), emptyMemory())
  expect(b.added.map(f => `${f.kind}:${f.text}:${f.scope}`)).toEqual(['constraint:budget max €50 a month:personal'])
})

test('rememberText always reaches the reader, even for short text', async () => {
  let calls = 0
  const { deps } = makeDeps({ complete: async () => { calls += 1; return { isAnswered: true, text: JSON.stringify({ facts: [{ kind: 'rejection', scope: 'personal', subject: 'Zapier', text: 'no' }], suggested: [] }), usage: { input_tokens: 1, output_tokens: 1 } } as ModelCompleteResult } })
  const r = await rememberText(deps, 'no Zapier', emptyMemory(), emptyMemory())
  expect(calls).toBe(1)
  expect(r.added.map(f => `${f.kind}:${f.subject}`)).toEqual(['rejection:Zapier'])
})

test('rememberText fallback strips colons from the subject and cuts long text', async () => {
  const { deps } = makeDeps()
  const a = await rememberText(deps, 'budget: max €50 a month', emptyMemory(), emptyMemory())
  expect(a.added.length).toBe(1)
  expect(a.added[0]?.kind).toBe('constraint')
  expect(a.added[0]?.subject.includes(':')).toBe(false)
  const b = await rememberText(deps, 'x'.repeat(200), emptyMemory(), emptyMemory())
  expect(b.added.length).toBe(1)
  expect(b.added[0]?.text.length).toBe(160)
})

test('rememberText sends no secret to the model and stores nothing', async () => {
  let calls = 0
  const { deps } = makeDeps({ complete: async () => { calls += 1; return { isAnswered: false } as ModelCompleteResult } })
  const r = await rememberText(deps, 'my key is sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789', emptyMemory(), emptyMemory())
  expect(calls).toBe(0)
  expect(r.added).toEqual([])
})

test('persistAll never overwrites a project file that could not be read', async () => {
  const { deps, data } = makeDeps({}, { [`/repo/${PROJECT_FILE}`]: 'precious' })
  const files = { ...deps.files, read: async (p: string) => { if (p.endsWith('memory.md')) throw new Error('locked'); return deps.files.read(p) } }
  const broken = { ...deps, files }
  const loaded = await loadAll(broken)
  expect(loaded.file.existed).toBe(true)
  expect(loaded.file.readFailed).toBe(true)
  const project: Memory = { facts: [{ id: 'decision:vercel', kind: 'decision', scope: 'project', subject: 'Vercel', text: 'x', source: 'conversation', firstSeen: 1, lastSeen: 1 }], tombstones: {} }
  await persistAll(broken, { projectFile: 'commit' }, loaded.personal, project, loaded.file)
  expect(data.get(`/repo/${PROJECT_FILE}`)).toBe('precious')
})

test('learn leaves out facts that mergeFact dropped', async () => {
  const project: Memory = { facts: [{ id: 'rejection:zapier', kind: 'rejection', scope: 'project', subject: 'Zapier', text: 'too expensive', source: 'user', firstSeen: 1, lastSeen: 1 }], tombstones: {} }
  const { deps } = makeDeps({ complete: replyWith({ facts: [{ kind: 'stack', scope: 'project', subject: 'Zapier', text: 'we use it' }, { kind: 'stack', scope: 'project', subject: 'Supabase', text: 'auth' }], suggested: [] }) })
  const r = await learn(deps, 'we use Zapier for automations and Supabase for auth, ok?', 'ok', emptyMemory(), project)
  expect(r.fresh).toEqual(['stack:supabase'])
})

test('persistAll does not wait on a hanging Azure save', async () => {
  const waits: number[] = []
  const { deps } = makeDeps({ azure: { config: { url: 'https://x', key: 'k' }, fetch: () => new Promise(() => {}), sleep: async ms => { waits.push(ms) } } })
  await persistAll(deps, { projectFile: 'commit' }, emptyMemory(), emptyMemory(), { existed: false })
  expect(waits).toContain(5000)
})

test('applyLearned merges only fresh facts into the current memory and keeps its other changes', async () => {
  const { deps } = makeDeps({ complete: replyWith({ facts: [{ kind: 'rejection', scope: 'project', subject: 'Zapier', text: 'too expensive' }], suggested: [] }) })
  const learned = await learn(deps, 'I never want Zapier again, it is far too expensive for me', 'ok', emptyMemory(), emptyMemory())
  const current = { personal: emptyMemory(), project: { facts: [], tombstones: { 'stack:old': 5 } } as Memory }
  const merged = applyLearned(current, learned)
  expect(merged.project.facts.map(f => f.id)).toEqual([factId('rejection', 'Zapier')])
  expect(merged.project.tombstones).toEqual({ 'stack:old': 5 })
  expect(applyLearned(current, { ...learned, fresh: [] }).project.facts).toEqual([])
})

test('a kept unreadable line survives a learn-and-save', async () => {
  const long = `- Supabase: ${'x'.repeat(161)} (said, 2026-10-17)`
  const original = ['## Notes', '- free text', '## Stack', long, '## Rejected', '- Zapier: too expensive (said, 2026-10-17)', ''].join('\n')
  const { deps, data } = makeDeps({}, { [`/repo/${PROJECT_FILE}`]: original })
  const loaded = await loadAll(deps)
  expect(loaded.unreadable).toBe(2)
  const learned = await learn({ ...deps, complete: replyWith({ facts: [{ kind: 'decision', scope: 'project', subject: 'Vercel', text: 'team knows it' }], suggested: [] }) }, 'We picked Vercel because the team already knows it well', 'ok', loaded.personal, loaded.project)
  await persistAll(deps, { projectFile: 'commit' }, learned.personal, learned.project, loaded.file)
  const written = data.get(`/repo/${PROJECT_FILE}`) ?? ''
  expect(written).toContain('- Vercel: team knows it')
  expect(written).toContain('- Zapier: too expensive')
  expect(written).toContain("## Couldn't read (kept as written)\n## Notes\n- free text\n" + long + '\n')
})

test('persistAll does not rewrite a project file whose text would not change', async () => {
  const canonical = '<!-- tiabwft memory: edit freely, one fact per line -->\n## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n'
  const { deps, data } = makeDeps({}, { [`/repo/${PROJECT_FILE}`]: canonical })
  let writes = 0
  const counting = { ...deps, files: { ...deps.files, write: async (p: string, t: string) => { writes += 1; data.set(p, t) } } }
  const loaded = await loadAll(counting)
  const after = await persistAll(counting, { projectFile: 'commit' }, loaded.personal, loaded.project, loaded.file)
  expect(writes).toBe(0)
  expect(after.file.text).toBe(canonical)
})

const T = Date.parse('2026-10-17T12:00:00Z')
const remoteFact = (kind: Fact['kind'], subject: string, text: string, lastSeen: number): Fact =>
  ({ id: factId(kind, subject), kind, scope: 'project', subject, text, source: 'conversation', firstSeen: lastSeen, lastSeen })
// A mocked Azure: GET answers the given project memory, PUT bodies are recorded.
const azureWith = (project: Memory, puts: string[] = []) => ({
  config: { url: 'https://x/api/memory', key: 'k' },
  fetch: async (url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === 'PUT') {
      puts.push(`${url} ${init.body ?? ''}`)
      return { ok: true, status: 204, text: '' }
    }
    return { ok: true, status: 200, text: JSON.stringify(url.includes('personal') ? emptyMemory() : project) }
  },
  sleep: () => new Promise<void>(() => {}),
})
const withMtime = (deps: MemoryDeps, mtime: number): MemoryDeps => ({ ...deps, files: { ...deps.files, mtime: async () => mtime } })

// This machine synced at T - 1000, holding the given facts; the file changed at T.
const syncedBefore = async (store: Map<string, unknown>, ids: string[]) => {
  store.set(`memory.lastSync.${await projectPartition('/repo')}`, { at: T - 1000, ids })
}

test('with Azure, a fact deleted by hand after the last sync stays deleted', async () => {
  const remote: Memory = { facts: [remoteFact('rejection', 'Zapier', 'too expensive', T - 5000), remoteFact('rejection', 'Make', 'too fiddly', T - 5000)], tombstones: {} }
  const puts: string[] = []
  const { deps, store } = makeDeps({ azure: azureWith(remote, puts) }, { [`/repo/${PROJECT_FILE}`]: '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n' })
  await syncedBefore(store, [factId('rejection', 'Zapier'), factId('rejection', 'Make')])
  const loaded = await loadAll(withMtime(deps, T))
  expect(loaded.project.facts.map(f => f.subject)).toEqual(['Zapier'])
  expect(loaded.project.tombstones[factId('rejection', 'Make')]).toBe(T)
  await persistAll(withMtime(deps, T), { projectFile: 'commit' }, loaded.personal, loaded.project, loaded.file)
  const sent = puts.find(p => p.includes('partition=project')) ?? ''
  expect(sent).toContain('"rejection:make":')
  expect(sent).not.toContain('too fiddly')
})

test('with Azure, a hand-edited text wins over an older remote copy', async () => {
  const remote: Memory = { facts: [remoteFact('rejection', 'Zapier', 'too expensive', T - 5000)], tombstones: {} }
  const { deps, store } = makeDeps({ azure: azureWith(remote) }, { [`/repo/${PROJECT_FILE}`]: '## Rejected\n- Zapier: far too pricey (said, 2026-10-17)\n' })
  await syncedBefore(store, [factId('rejection', 'Zapier')])
  const loaded = await loadAll(withMtime(deps, T))
  expect(loaded.project.facts.map(f => f.text)).toEqual(['far too pricey'])
  expect(loaded.project.facts[0]!.lastSeen).toBe(T)
})

test('with Azure, a remote fact newer than the last sync is taken, and so is a newer remote edit', async () => {
  const remote: Memory = { facts: [remoteFact('stack', 'Supabase', 'auth', T + 5000), remoteFact('rejection', 'Zapier', 'never again', T + 5000)], tombstones: {} }
  const { deps, store } = makeDeps({ azure: azureWith(remote) }, { [`/repo/${PROJECT_FILE}`]: '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n' })
  await syncedBefore(store, [factId('rejection', 'Zapier'), factId('stack', 'Supabase')])
  const loaded = await loadAll(withMtime(deps, T))
  expect(loaded.project.facts.map(f => `${f.subject}:${f.text}`).sort()).toEqual(['Supabase:auth', 'Zapier:never again'])
  expect(loaded.project.tombstones).toEqual({})
})

test('without a project file, Azure facts are taken as before', async () => {
  const remote: Memory = { facts: [remoteFact('rejection', 'Make', 'too fiddly', T - 5000)], tombstones: {} }
  const { deps } = makeDeps({ azure: azureWith(remote) })
  const loaded = await loadAll(withMtime(deps, T))
  expect(loaded.project.facts.map(f => f.subject)).toEqual(['Make'])
})

test('the first sync on a new machine is a plain merge: nothing counts as deleted by hand', async () => {
  const remote: Memory = { facts: [remoteFact('rejection', 'Make', 'too fiddly', T - 5000)], tombstones: {} }
  const { deps } = makeDeps({ azure: azureWith(remote) }, { [`/repo/${PROJECT_FILE}`]: '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n' })
  const loaded = await loadAll(withMtime(deps, T))
  expect(loaded.project.facts.map(f => f.subject).sort()).toEqual(['Make', 'Zapier'])
  expect(loaded.project.tombstones).toEqual({})
})

test('a successful Azure save records the last sync; a failed one does not', async () => {
  const project: Memory = { facts: [remoteFact('rejection', 'Zapier', 'too expensive', 5)], tombstones: {} }
  const key = `memory.lastSync.${await projectPartition('/repo')}`
  const ok = makeDeps({ azure: azureWith(emptyMemory()), now: () => 777 })
  await persistAll(ok.deps, { projectFile: 'commit' }, emptyMemory(), project, { existed: false })
  expect(ok.store.get(key)).toEqual({ at: 777, ids: [factId('rejection', 'Zapier')] })
  const failing = makeDeps({ azure: { ...azureWith(emptyMemory()), fetch: async () => ({ ok: false, status: 500, text: '' }) } })
  await persistAll(failing.deps, { projectFile: 'commit' }, emptyMemory(), project, { existed: false })
  expect(failing.store.has(key)).toBe(false)
})

test('persistAll counts the facts the Azure cap leaves out, and none without Azure', async () => {
  const many: Memory = { facts: Array.from({ length: 455 }, (_, i) => remoteFact('stack', `tool ${i}`, 'x', i)), tombstones: {} }
  const synced = makeDeps({ azure: azureWith(emptyMemory()) })
  expect((await persistAll(synced.deps, { projectFile: 'commit' }, emptyMemory(), many, { existed: false })).leftOut).toBe(5)
  const local = makeDeps()
  expect((await persistAll(local.deps, { projectFile: 'commit' }, emptyMemory(), many, { existed: false })).leftOut).toBe(0)
})

// Two machines on one shared Azure partition. The fake function merges like the real
// one: the newest fact wins, and a tombstone removes the facts not seen after it.
const sharedAzure = () => {
  let held: Memory = emptyMemory()
  const azure = {
    config: { url: 'https://x/api/memory', key: 'k' },
    fetch: async (url: string, init?: { method?: string; body?: string }) => {
      const isPut = init?.method === 'PUT'
      if (!url.includes('partition=project')) {
        return { ok: true, status: isPut ? 204 : 200, text: isPut ? '' : JSON.stringify(emptyMemory()) }
      }
      if (isPut) {
        held = mergeMemories(held, JSON.parse(init?.body ?? '{}') as Memory)
        return { ok: true, status: 204, text: '' }
      }
      return { ok: true, status: 200, text: JSON.stringify(held) }
    },
    sleep: () => new Promise<void>(() => {}),
  }
  return { azure, held: () => held }
}

// One machine: its own files with mtimes, its own store, and a clock the test moves.
const machine = (azure: MemoryDeps['azure'], fileText?: string) => {
  let clock = T
  const path = `/repo/${PROJECT_FILE}`
  const mtimes = new Map<string, number>()
  const { deps, data } = makeDeps({ azure, now: () => clock }, fileText === undefined ? {} : { [path]: fileText })
  if (fileText !== undefined) {
    mtimes.set(path, clock)
  }
  const m: MemoryDeps = {
    ...deps,
    files: {
      ...deps.files,
      write: async (p: string, t: string) => { data.set(p, t); mtimes.set(p, clock) },
      mtime: async (p: string) => mtimes.get(p),
    },
  }
  let state: Loaded | undefined
  return {
    data,
    at: (time: number) => { clock = time },
    // A change on disk outside tiabwft (a hand edit, a git pull): new text or only a new mtime.
    touch: (text?: string) => {
      if (text !== undefined) {
        data.set(path, text)
      }
      mtimes.set(path, clock)
    },
    // A session start: the load, then the session-start save.
    start: async (): Promise<Memory> => {
      const loaded = await loadAll(m)
      const after = await persistAll(m, { projectFile: 'commit' }, loaded.personal, loaded.project, loaded.file)
      state = { ...loaded, file: after.file }
      return loaded.project
    },
    // A fact learned during the session, then the background save.
    learn: async (subject: string, text: string): Promise<void> => {
      const current = state!
      const project = mergeMemories(current.project, { facts: [remoteFact('stack', subject, text, clock)], tombstones: {} })
      const after = await persistAll(m, { projectFile: 'commit' }, current.personal, project, current.file)
      state = { ...current, project, file: after.file }
    },
  }
}
const subjects = (m: Memory): string[] => m.facts.map(f => f.subject).sort()
const HOUR = 60 * 60 * 1000
const BASE = '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n'

test('two machines: a fact learned on A survives B, whose file was touched later but never edited, and A keeps it', async () => {
  const { azure, held } = sharedAzure()
  const a = machine(azure, BASE)
  const b = machine(azure, BASE)
  b.at(T)
  await b.start()
  a.at(T + HOUR)
  await a.start()
  a.at(T + 2 * HOUR)
  await a.learn('Supabase', 'auth and database')
  // B was in a session all along: its background save comes after A's sync, without A's fact.
  b.at(T + 3 * HOUR)
  await b.learn('Vercel', 'hosting')
  // A git pull on B rewrites memory.md with the same text: only the mtime moves.
  b.at(T + 4 * HOUR)
  b.touch(b.data.get(`/repo/${PROJECT_FILE}`))
  b.at(T + 5 * HOUR)
  expect(subjects(await b.start())).toEqual(['Supabase', 'Vercel', 'Zapier'])
  expect(b.data.get(`/repo/${PROJECT_FILE}`)).toContain('- Supabase: auth and database')
  expect(held().tombstones).toEqual({})
  a.at(T + 6 * HOUR)
  expect(subjects(await a.start())).toEqual(['Supabase', 'Vercel', 'Zapier'])
  expect(a.data.get(`/repo/${PROJECT_FILE}`)).toContain('- Supabase: auth and database')
})

test('one machine: a line deleted by hand after a sync stays deleted, and the deletion reaches Azure', async () => {
  const { azure, held } = sharedAzure()
  const b = machine(azure, `${BASE}- Make: too fiddly (said, 2026-10-17)\n`)
  b.at(T)
  await b.start()
  expect(subjects(held())).toEqual(['Make', 'Zapier'])
  b.at(T + HOUR)
  b.touch(BASE)
  b.at(T + 2 * HOUR)
  expect(subjects(await b.start())).toEqual(['Zapier'])
  expect(subjects(held())).toEqual(['Zapier'])
  expect(held().tombstones[factId('rejection', 'Make')]).toBe(T + HOUR)
  b.at(T + 3 * HOUR)
  expect(subjects(await b.start())).toEqual(['Zapier'])
  expect(b.data.get(`/repo/${PROJECT_FILE}`)).not.toContain('Make')
})

test('a new machine syncing for the first time takes everything in Azure', async () => {
  const { azure, held } = sharedAzure()
  const a = machine(azure, BASE)
  a.at(T)
  await a.start()
  await a.learn('Supabase', 'auth and database')
  // A fresh clone of an older commit: its mtime is newer than everything in Azure.
  const fresh = machine(azure, BASE)
  fresh.at(T + HOUR)
  fresh.touch()
  expect(subjects(await fresh.start())).toEqual(['Supabase', 'Zapier'])
  expect(held().tombstones).toEqual({})
})
