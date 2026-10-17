import { expect, test } from 'claude-code/testing'
import type { ModelCompleteResult } from 'claude-code'

import type { Memory } from '../../types'
import { emptyMemory, factId } from './facts'
import { forgetById, forgetMatching, learn, loadAll, persistAll, rememberText } from './session'
import type { MemoryDeps } from './session'
import { addSuggested, PROJECT_FILE } from './store'

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
  expect(loaded.fileExisted).toBe(true)
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
  await persistAll(deps, { projectFile: 'commit' }, loaded.personal, loaded.project, loaded.fileExisted)
  expect(data.has(`/repo/${PROJECT_FILE}`)).toBe(false)
  expect(store.has('memory.personal')).toBe(true)
  const learned = await learn({ ...deps, complete: replyWith({ facts: [{ kind: 'decision', scope: 'project', subject: 'Vercel', text: 'team knows it' }], suggested: ['HubSpot'] }) }, 'We picked Vercel because the team already knows it well', 'ok', loaded.personal, loaded.project)
  expect(learned.fresh).toEqual(['decision:vercel'])
  await persistAll(deps, { projectFile: 'commit' }, learned.personal, learned.project, false)
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
  expect(loaded.fileExisted).toBe(true)
  expect(loaded.readFailed).toBe(true)
  const project: Memory = { facts: [{ id: 'decision:vercel', kind: 'decision', scope: 'project', subject: 'Vercel', text: 'x', source: 'conversation', firstSeen: 1, lastSeen: 1 }], tombstones: {} }
  await persistAll(broken, { projectFile: 'commit' }, loaded.personal, project, loaded.fileExisted, loaded.readFailed)
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
  await persistAll(deps, { projectFile: 'commit' }, emptyMemory(), emptyMemory(), false)
  expect(waits).toContain(5000)
})
