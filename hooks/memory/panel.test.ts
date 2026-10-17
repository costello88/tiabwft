import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const files = new Map<string, string>()
// The engine resolves paths for the platform (C:/repo/x on Windows); the stand-ins key them as /repo/x.
const key = (path: string): string => path.split(String.fromCharCode(92)).join('/').replace(/^[A-Za-z]:/, '')
const engine = (on: On) => {
  mock.store(on)
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
