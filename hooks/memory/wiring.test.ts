import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const FACTS = { model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['terminal' as const], tools: [], outputStyle: null, traits: [] }
const files = new Map<string, string>()
// The engine resolves paths for the platform (C:/repo/x on Windows); the stand-ins key them as /repo/x.
const key = (path: string): string => path.split(String.fromCharCode(92)).join('/').replace(/^[A-Za-z]:/, '')

const engine = (on: On, isHanging = false, reply = '{"facts":[],"suggested":[]}') => {
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
  on('model.complete', isHanging
    ? () => new Promise(() => {})
    : async () => ({ value: { isAnswered: true, text: reply, usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }))
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
})

test('mode memory=off adds no memory section', { options: { memory: 'off' } }, async ($, on) => {
  files.clear()
  files.set('/repo/.claude/tiabwft/memory.md', '## Rejected\n- Zapier: too expensive (said, 2026-10-17)\n')
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/repo' } as never)
  const text = (await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? ''
  expect(text).not.toContain('What you know about this user')
})
