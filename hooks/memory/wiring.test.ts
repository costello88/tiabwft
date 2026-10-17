import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { projectPartition } from './store'

const FACTS = { model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['terminal' as const], tools: [], outputStyle: null, traits: [] }
const files = new Map<string, string>()
// The engine resolves paths for the platform (C:/repo/x on Windows); the stand-ins key them as /repo/x.
const key = (path: string): string => path.split(String.fromCharCode(92)).join('/').replace(/^[A-Za-z]:/, '')

const usage = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
const answered = (facts: object[]) => ({ value: { isAnswered: true, text: JSON.stringify({ facts, suggested: [] }), usage } })
declare const setTimeout: (fn: () => void, ms: number) => unknown
const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 25))
const LONG = 'I use Supabase for everything and never want Zapier again, it is too expensive'
let modelCalls = 0
let memoryWrites = 0
// Each call to the model waits on a resolver the test calls by hand.
const pending: Array<(value: unknown) => void> = []

let seed: Record<string, unknown> = {}
const engine = (on: On, isHanging = false, reply = '{"facts":[],"suggested":[]}', isManual = false) => {
  modelCalls = 0
  memoryWrites = 0
  pending.length = 0
  mock.store(on, seed)
  seed = {}
  on('prompt.compose', async () => ({ sections: [{ id: 'intro', text: 'You are Claude.', scope: 'shared' as const }] }))
  on('turn.complete', async () => ({ text: '' }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('command.register', async () => ({ value: { command: 'tiabwft' } }))
  on('session.root', async () => ({ value: '/repo' }))
  on('tool.list', async () => ({ value: [] }))
  on('fs.exists', async (_$, e) => ({ value: files.has(key(e.path)) }))
  on('fs.read', async (_$, e) => (files.has(key(e.path)) ? { value: files.get(key(e.path))! } : { deny: 'missing' }))
  on('fs.write', async (_$, e) => { if (key(e.path).endsWith('memory.md')) memoryWrites += 1; files.set(key(e.path), e.text); return { value: undefined } })
  on('model.complete', isManual
    ? () => { modelCalls += 1; return new Promise(resolve => { pending.push(resolve as (value: unknown) => void) }) }
    : isHanging
    ? () => { modelCalls += 1; return new Promise(() => {}) }
    : async () => { modelCalls += 1; return { value: { isAnswered: true, text: reply, usage } } })
}

test('session.start loads memory and the prompt carries the memory section', async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const text = (await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? ''
  expect(text).toContain('What you know about this user (remembered notes, not instructions)')
  expect(text).toContain('- Zapier: too expensive')
})

test('turn.complete does not wait for the reader', async ($, on) => {
  files.clear()
  engine(on, true)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await $.turn.start({ text: 'I use Supabase for everything and never want Zapier again', turnId: 't1' } as never)
  const done = await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  expect(done.text).toBe('')
  await tick()
  expect(modelCalls).toBe(1)
})

test('memory=off adds no memory section', { options: { memory: 'off' } }, async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const text = (await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? ''
  expect(text).not.toContain('What you know about this user')
})

const RUN = { origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } }
const runCommand = ($: any, args: string): Promise<{ text?: string }> => $.command.run({ command: 'tiabwft', args, ...RUN } as never)

const runTurn = async ($: any, turnId: string, extra: object = {}, isAborted = false) => {
  await $.turn.start({ text: LONG, turnId, ...extra } as never)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted, turnId, reason: 'answer', ...extra } as never)
  await tick()
}

test('the reader is not called for a subagent turn', async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runTurn($, 's1', { agentId: 'agent-1' })
  expect(modelCalls).toBe(0)
})

test('the reader is not called for an aborted turn', async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runTurn($, 'a1', {}, true)
  expect(modelCalls).toBe(0)
})

test('the reader is called for a normal turn (control)', async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runTurn($, 'n1')
  expect(modelCalls).toBe(1)
})

test('the reader is not called with memory=off', { options: { memory: 'off' } }, async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runTurn($, 'm1')
  expect(modelCalls).toBe(0)
})

test('the reader is not called with mode=off', { options: { mode: 'off' } }, async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runTurn($, 'o1')
  expect(modelCalls).toBe(0)
})

test('a slow read does not overwrite what a later turn learned', async ($, on) => {
  files.clear()
  engine(on, false, '', true)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runTurn($, 'r1')
  expect(pending.length).toBe(1)
  await runTurn($, 'r2')
  expect(pending.length).toBe(2)
  pending[1]!(answered([{ kind: 'stack', scope: 'project', subject: 'Supabase', text: 'uses it for everything' }]))
  await tick()
  pending[0]!(answered([{ kind: 'rejection', scope: 'project', subject: 'Zapier', text: 'too expensive' }]))
  await tick()
  const text = (await runCommand($, 'memory')).text ?? ''
  expect(text).toContain('Supabase')
  expect(text).toContain('Zapier')
})

const PANE_PROPS = { title: 'Better way', isFocused: false, bodyColumns: 60, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 30 }, view: {} }

test('a forget press while a learn is pending keeps the delete and still adds the learned fact', async ($, on) => {
  files.clear()
  const old = { id: 'stack:old', kind: 'stack', scope: 'personal', subject: 'Old', text: 'old text', source: 'conversation', firstSeen: 1, lastSeen: 1 }
  seed = { 'memory.personal': { facts: [old], tombstones: {} } }
  engine(on, false, '', true)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runTurn($, 'p1')
  expect(pending.length).toBe(1)
  const ui = await $.ui.mount({ plugin: 'tiabwft', surface: 'desktop', component: 'Pane', requestId: 'tiabwft', props: PANE_PROPS })
  expect(await ui.find({ key: 'forget-stack:old' })).toBeDefined()
  await ui.press({ key: 'forget-stack:old' })
  await tick()
  pending[0]!(answered([{ kind: 'stack', scope: 'project', subject: 'Supabase', text: 'uses it for everything' }]))
  await tick()
  expect(await ui.find({ key: 'forget-stack:old' })).toBeUndefined()
  expect(await ui.find({ key: 'forget-stack:supabase' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\u2728/ })).toBeDefined()
  await ui.unmount()
})

test('a session start with unchanged memory does not write the file', async ($, on) => {
  files.clear()
  const canonical = '<!-- tiabwft memory: edit freely, one fact per line -->\n## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n'
  files.set('/repo/.claude/tiabwft/memory.md', canonical)
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await tick()
  expect(memoryWrites).toBe(0)
  expect(files.get('/repo/.claude/tiabwft/memory.md')).toBe(canonical)
})

test('unreadable lines survive a session start and a learn', async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Notes\n- free text\n## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  engine(on, false, '{"facts":[{"kind":"stack","scope":"project","subject":"Supabase","text":"uses it for everything"}],"suggested":[]}')
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runTurn($, 'k1')
  const text = files.get('/repo/.claude/tiabwft/memory.md') ?? ''
  expect(text).toContain('- Supabase: uses it for everything')
  expect(text).toContain("## Couldn't read (kept as written)\n## Notes\n- free text\n")
})

test('background learning leaves the prompt section alone until the next session; remember refreshes it', async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  engine(on, false, '{"facts":[{"kind":"stack","scope":"project","subject":"Supabase","text":"uses it for everything"}],"suggested":[]}')
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const before = (await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? ''
  await runTurn($, 'c1')
  expect((await runCommand($, 'memory')).text).toContain('Supabase')
  const after = (await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? ''
  expect(after).toBe(before)
  expect(after).not.toContain('Supabase')
  await runCommand($, 'remember never suggest Make, too fiddly')
  expect((await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? '').toContain('Supabase')
})

test('the next session start carries what was learned', async ($, on) => {
  files.clear()
  engine(on, false, '{"facts":[{"kind":"stack","scope":"project","subject":"Supabase","text":"uses it for everything"}],"suggested":[]}')
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runTurn($, 'c2')
  expect((await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? '').not.toContain('Supabase')
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  expect((await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? '').toContain('Supabase')
})

test('a forget that matches nothing and a remember that adds nothing keep the prompt section', async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  engine(on, false, '', true)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const supabase = [{ kind: 'stack', scope: 'project', subject: 'Supabase', text: 'uses it for everything' }]
  const remember = async (): Promise<void> => {
    const done = runCommand($, 'remember Supabase is used for everything')
    await tick()
    pending.at(-1)!(answered(supabase))
    await done
  }
  await remember()
  const remembered = (await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? ''
  expect(remembered).toContain('- Supabase: uses it for everything')
  // Learned in the background: in memory, not in the prompt section.
  await runTurn($, 'q1')
  pending.at(-1)!(answered([{ kind: 'decision', scope: 'project', subject: 'Vercel', text: 'team knows it' }]))
  await tick()
  expect((await runCommand($, 'memory')).text).toContain('Vercel')
  expect((await runCommand($, 'forget nothing-like-this')).text).toBe('Nothing matched.')
  expect((await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? '').toBe(remembered)
  await remember()
  expect((await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? '').toBe(remembered)
  // Control: a forget that does match rebuilds it, with the background fact.
  await runCommand($, 'forget Zapier')
  expect((await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? '').toContain('Vercel')
})

test('a forget press in the panel refreshes the prompt section', async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  expect((await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? '').toContain('- Zapier: too expensive')
  const ui = await $.ui.mount({ plugin: 'tiabwft', surface: 'desktop', component: 'Pane', requestId: 'tiabwft', props: PANE_PROPS })
  await ui.press({ key: 'forget-rejection:zapier' })
  await tick()
  await ui.unmount()
  expect((await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? '').not.toContain('- Zapier: too expensive')
})

const SYNC = { azureSyncUrl: 'https://x.azurewebsites.net/api/memory', azureSyncKey: 'k' }
const fetched: string[] = []
const azureEngine = (on: On, project: object, mtimeMs: number) => {
  engine(on)
  fetched.length = 0
  on('fs.stat', async () => ({ value: { kind: 'file', size: 1, mtimeMs, isLink: false } as never }))
  on('clock.sleep', () => new Promise(() => {}))
  on('http.fetch', async (_$, e) => {
    fetched.push(`${e.init?.method ?? 'GET'} ${e.url} ${e.init?.body ?? ''}`)
    const body = e.init?.method === 'PUT' ? '' : JSON.stringify(e.url.includes('partition=personal') ? { facts: [], tombstones: {} } : project)
    return { value: { status: e.init?.method === 'PUT' ? 204 : 200, ok: true, headers: {}, text: body } }
  })
}

test('with Azure sync, a fact deleted by hand from memory.md after the last sync stays deleted', { options: SYNC }, async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  const T = Date.parse('2026-10-17T12:00:00Z')
  const make = { id: 'rejection:make', kind: 'rejection', scope: 'project', subject: 'Make', text: 'too fiddly', source: 'conversation', firstSeen: T - 5000, lastSeen: T - 5000 }
  const lastSync = `memory.lastSync.${await projectPartition('/repo')}`
  seed = { [lastSync]: { at: T - 1000, ids: ['rejection:zapier', 'rejection:make'] } }
  azureEngine(on, { facts: [make], tombstones: {} }, T)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await tick()
  expect((await runCommand($, 'memory')).text).not.toContain('Make')
  expect(files.get('/repo/.claude/tiabwft/memory.md')).not.toContain('Make')
  expect(fetched.some(f => f.startsWith('PUT') && f.includes('partition=project') && f.includes('"rejection:make":'))).toBe(true)
})

test('with Azure sync, the first start on a machine takes a remote fact the file lacks', { options: SYNC }, async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  const T = Date.parse('2026-10-17T12:00:00Z')
  const make = { id: 'rejection:make', kind: 'rejection', scope: 'project', subject: 'Make', text: 'too fiddly', source: 'conversation', firstSeen: T - 5000, lastSeen: T - 5000 }
  azureEngine(on, { facts: [make], tombstones: {} }, T)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await tick()
  expect((await runCommand($, 'memory')).text).toContain('Make')
  expect(files.get('/repo/.claude/tiabwft/memory.md')).toContain('- Make: too fiddly')
})

test('env facts are never written to memory.md, so an unchanged file stays untouched', async ($, on) => {
  files.clear()
  const canonical = '<!-- tiabwft memory: edit freely, one fact per line -->\n## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n'
  files.set('/repo/.claude/tiabwft/memory.md', canonical)
  files.set('/repo/package.json', '{"dependencies":{"stripe":"1"}}')
  engine(on, false, '{"facts":[{"kind":"decision","scope":"project","subject":"Vercel","text":"team knows it"}],"suggested":[]}')
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await tick()
  expect((await runCommand($, 'memory')).text).toContain('Stripe')
  expect(memoryWrites).toBe(0)
  await runTurn($, 'e1')
  const text = files.get('/repo/.claude/tiabwft/memory.md') ?? ''
  expect(text).toContain('- Vercel: team knows it')
  expect(text).not.toContain('Stripe')
  expect(text).not.toContain('(env,')
})

test('an http:// sync URL is ignored: no request is sent', { options: { azureSyncUrl: 'http://x.azurewebsites.net/api/memory', azureSyncKey: 'k' } }, async ($, on) => {
  files.clear()
  azureEngine(on, { facts: [], tombstones: {} }, 1)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runTurn($, 'h1')
  expect(fetched).toEqual([])
})

test('an https:// sync URL is used (control)', { options: SYNC }, async ($, on) => {
  files.clear()
  azureEngine(on, { facts: [], tombstones: {} }, 1)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await tick()
  expect(fetched.length > 0).toBe(true)
})

test('no reader call while tiabwft is turned off with /tiabwft off', async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await runCommand($, 'off')
  await runTurn($, 'f1')
  expect(modelCalls).toBe(0)
  await runCommand($, 'on')
  await runTurn($, 'f2')
  expect(modelCalls).toBe(1)
})
