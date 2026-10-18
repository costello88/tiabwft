import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const files = new Map<string, string>()
// The engine resolves paths for the platform (C:/repo/x on Windows); the stand-ins key them as /repo/x.
const key = (path: string): string => path.split(String.fromCharCode(92)).join('/').replace(/^[A-Za-z]:/, '')
let seed: Record<string, unknown> = {}
const engine = (on: On) => {
  mock.store(on, seed)
  seed = {}
  on('prompt.compose', async () => ({ sections: [{ id: 'intro', text: 'You are Claude.', scope: 'shared' as const }] }))
  on('turn.complete', async () => ({ text: '' }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('command.register', async () => ({ value: { command: 'tiabwft' } }))
  on('session.root', async () => ({ value: '/repo' }))
  on('tool.list', async () => ({ value: [] }))
  on('fs.exists', async (_$, e) => ({ value: files.has(key(e.path)) }))
  on('fs.read', async (_$, e) => (files.has(key(e.path)) ? { value: files.get(key(e.path))! } : { deny: 'missing' }))
  on('fs.write', async (_$, e) => { files.set(key(e.path), e.text); return { value: undefined } })
}
const PANE_PROPS = { title: '💡 Better way', isFocused: false, bodyColumns: 60, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 30 }, view: {} }

test('the panel lists what it knows, locks env facts and deletes others', async ($, on) => {
  files.clear()
  files.set('/repo/package.json', JSON.stringify({ dependencies: { stripe: '1' } }))
  files.set('/repo/.claude/tiabwft/memory.md', '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'tiabwft', surface, component: 'Pane', requestId: 'tiabwft', props: PANE_PROPS })
    expect((await ui.find({ type: 'Text', text: /What I know/ }))?.text).toContain('What I know')
    expect(await ui.find({ type: 'Text', text: /🔒/ })).toBeDefined()
    expect(await ui.find({ key: 'forget-rejection:zapier' })).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ plugin: 'tiabwft', surface: 'desktop', component: 'Pane', requestId: 'tiabwft', props: PANE_PROPS })
  await ui.press({ key: 'forget-rejection:zapier' })
  expect(await ui.find({ key: 'forget-rejection:zapier' })).toBeUndefined()
  expect(files.get('/repo/.claude/tiabwft/memory.md')).not.toContain('Zapier')
  await ui.unmount()
})

test('the panel says memory is off', { options: { memory: 'off' } }, async ($, on) => {
  files.clear()
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const ui = await $.ui.mount({ plugin: 'tiabwft', surface: 'desktop', component: 'Pane', requestId: 'tiabwft', props: PANE_PROPS })
  expect((await ui.find({ type: 'Text', text: /Memory is off/ }))?.text).toContain('Memory is off')
  expect(await ui.find({ type: 'Text', text: /What I know/ })).toBeUndefined()
  await ui.unmount()
})

declare const setTimeout: (fn: () => void, ms: number) => unknown
const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 25))
const mem = (facts: object[]) => ({ facts, tombstones: {} })
const personalFact = (kind: string, scope: string, subject: string, firstSeen = 1) =>
  ({ id: `${kind}:${subject.toLowerCase()}`, kind, scope, subject, text: `${subject} text`, source: 'conversation', firstSeen, lastSeen: 1 })
const mountPane = ($: any) => $.ui.mount({ plugin: 'tiabwft', surface: 'desktop', component: 'Pane', requestId: 'tiabwft', props: PANE_PROPS })

test('two quick forget presses on different facts delete both', async ($, on) => {
  files.clear()
  seed = { 'memory.personal': mem([personalFact('stack', 'personal', 'Alpha'), personalFact('stack', 'personal', 'Beta'), personalFact('stack', 'personal', 'Gamma')]) }
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const ui = await mountPane($)
  const first = ui.press({ key: 'forget-stack:alpha' })
  const second = ui.press({ key: 'forget-stack:beta' })
  await first
  await second
  await tick()
  expect(await ui.find({ key: 'forget-stack:alpha' })).toBeUndefined()
  expect(await ui.find({ key: 'forget-stack:beta' })).toBeUndefined()
  expect(await ui.find({ key: 'forget-stack:gamma' })).toBeDefined()
  await ui.unmount()
})

test('a fact with a broken date still renders the pane', async ($, on) => {
  files.clear()
  seed = { 'memory.personal': mem([personalFact('stack', 'personal', 'Nan', Number.NaN), personalFact('stack', 'personal', 'Huge', 1e16), personalFact('stack', 'personal', 'Fine')]) }
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const ui = await mountPane($)
  expect(await ui.find({ type: 'Text', text: /What I know/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Huge/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Fine/ })).toBeDefined()
  await ui.unmount()
})

test('personal and project facts get their own icons, env facts have no forget button', async ($, on) => {
  files.clear()
  files.set('/repo/package.json', JSON.stringify({ dependencies: { stripe: '1' } }))
  files.set('/repo/.claude/tiabwft/memory.md', '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  seed = { 'memory.personal': mem([personalFact('constraint', 'personal', 'Budget')]) }
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const ui = await mountPane($)
  expect(await ui.find({ type: 'Text', text: /\u{1F464} Budget/u })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\u{1F5C2}\uFE0F? Zapier/u })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Stripe/ })).toBeDefined()
  expect(await ui.find({ key: 'forget-stack:stripe' })).toBeUndefined()
  expect(await ui.find({ key: 'forget-constraint:budget' })).toBeDefined()
  await ui.unmount()
})

test('the section shows next to a suggestion too', async ($, on) => {
  files.clear()
  seed = { 'memory.personal': mem([personalFact('stack', 'personal', 'Alpha')]) }
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  await $.turn.complete({ answer: "ok\n\n**\u{1F4A1} There's a better way**\n\nGoal: ship faster\n\nStart here: connect GitHub", durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  const ui = await mountPane($)
  expect(await ui.find({ type: 'Markdown' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /What I know/ })).toBeDefined()
  expect(await ui.find({ key: 'forget-stack:alpha' })).toBeDefined()
  await ui.unmount()
})

test('105 facts show 100 and a "+5 more" line', async ($, on) => {
  files.clear()
  const many = Array.from({ length: 105 }, (_, i) => personalFact('stack', 'personal', `Tool${String(i).padStart(2, '0')}`))
  seed = { 'memory.personal': mem(many) }
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const ui = await mountPane($)
  expect(await ui.find({ type: 'Text', text: /\+5 more \(see \/tiabwft memory\)/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Tool99 text/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Tool100 text/ })).toBeUndefined()
  await ui.unmount()
})
