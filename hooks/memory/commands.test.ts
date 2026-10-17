import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const RUN = { origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } }
const files = new Map<string, string>()
// The engine resolves paths for the platform (C:/repo/x on Windows); the stand-ins key them as /repo/x.
const key = (path: string): string => path.split(String.fromCharCode(92)).join('/').replace(/^[A-Za-z]:/, '')
const usage = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
declare const setTimeout: (fn: () => void, ms: number) => unknown
const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 25))
const LONG = 'I use Supabase for everything and never want Zapier again, it is too expensive'
let modelCalls = 0

const engine = (on: On, reply = '{"facts":[],"suggested":[]}') => {
  modelCalls = 0
  mock.store(on)
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
  on('fs.write', async (_$, e) => { files.set(key(e.path), e.text); return { value: undefined } })
  on('model.complete', async () => { modelCalls += 1; return { value: { isAnswered: true, text: reply, usage } } })
}
const run = ($: any, args: string): Promise<{ text?: string }> => $.command.run({ command: 'tiabwft', args, ...RUN } as never)

test('remember, list, forget', async ($, on) => {
  files.clear()
  engine(on, '{"facts":[{"kind":"rejection","scope":"project","subject":"Zapier","text":"too expensive"}],"suggested":[]}')
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  expect((await run($, 'remember never suggest Zapier, too expensive')).text).toContain('Zapier')
  expect((await run($, 'memory')).text).toContain('Zapier')
  expect((await run($, 'forget zapier')).text).toContain('Zapier')
  expect((await run($, 'memory')).text).not.toContain('Zapier')
  expect((await run($, 'forget nothing-here')).text).toBe('Nothing matched.')
})

test('memory off pauses learning, reset needs a confirmation', async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Decisions\n- Vercel: team knows it (you, 2026-10-17)\n')
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  expect((await run($, 'memory off')).text).toContain('paused')
  expect((await run($, 'memory reset')).text).toContain('memory reset confirm')
  expect(files.get('/repo/.claude/tiabwft/memory.md')).toContain('Vercel')
  expect((await run($, 'memory reset confirm')).text).toContain('deleted')
  expect(files.get('/repo/.claude/tiabwft/memory.md')).not.toContain('Vercel')
})

test('paused learning makes no reader call until memory on', async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await run($, 'memory off')
  await $.turn.start({ text: LONG, turnId: 't1' } as never)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  await tick()
  expect(modelCalls).toBe(0)
  expect((await run($, 'memory on')).text).toContain('on again')
  await $.turn.start({ text: LONG, turnId: 't2' } as never)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer' } as never)
  await tick()
  expect(modelCalls).toBe(1)
})

test('memory=off setting refuses the memory commands', { options: { memory: 'off' } }, async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  expect((await run($, 'memory')).text).toContain('off in the tiabwft settings')
})

test('env facts survive forget and memory reset confirm', async ($, on) => {
  files.clear()
  files.set('/repo/package.json', '{"dependencies":{"stripe":"1"}}')
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  expect((await run($, 'memory')).text).toContain('Stripe')
  expect((await run($, 'forget stripe')).text).toBe('Nothing matched.')
  expect((await run($, 'memory reset confirm')).text).toContain('deleted')
  expect((await run($, 'memory')).text).toContain('Stripe')
})

test('extra spaces in the arguments are collapsed', async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  expect((await run($, 'memory   off')).text).toContain('paused')
})

test('missing arguments give usage lines', async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  expect((await run($, 'forget')).text).toBe('Usage: /tiabwft forget <text>')
  expect((await run($, 'remember  ')).text).toBe('Usage: /tiabwft remember <text>')
  expect((await run($, 'memory foo')).text).toBe('Usage: /tiabwft memory [off|on|reset]')
})

test('mode off: memory commands change nothing and write nothing', { options: { mode: 'off' } }, async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Decisions\n- Vercel: team knows it (you, 2026-10-17)\n')
  engine(on, '{"facts":[{"kind":"rejection","scope":"project","subject":"Zapier","text":"too expensive"}],"suggested":[]}')
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const before = files.get('/repo/.claude/tiabwft/memory.md')
  for (const args of ['remember never suggest Zapier', 'forget vercel', 'memory reset confirm', 'memory']) {
    expect((await run($, args)).text).toContain("isn't loaded")
  }
  expect(files.get('/repo/.claude/tiabwft/memory.md')).toBe(before)
})
