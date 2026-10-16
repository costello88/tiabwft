import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const SECTION_ID = 'tiabwft:better-way'
const FACTS = {
  model: 'claude-opus-5-5',
  promptModel: 'claude-opus-5-5',
  surfaces: ['terminal' as const],
  tools: [],
  outputStyle: null,
  traits: [],
}
const RUN = {
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
}

const base = (on: On) =>
  on('prompt.compose', async () => ({
    sections: [{ id: 'intro', text: 'You are Claude.', scope: 'shared' as const }],
  }))

const ids = async ($: Engine) =>
  (await $.prompt.compose(FACTS)).sections.map(s => s.id)

test('adds the better-way section last by default', async ($, on) => {
  base(on)
  const { sections } = await $.prompt.compose(FACTS)
  expect(sections.map(s => s.id)).toEqual(['intro', SECTION_ID])
  expect(sections[1]?.text).toContain("There's a better way")
  expect(sections[1]?.scope).toBe('session')
})

test('big-asks-only mode still adds a section, with its own wording', { options: { mode: 'big-asks-only' } }, async ($, on) => {
  base(on)
  const { sections } = await $.prompt.compose(FACTS)
  expect(sections.at(-1)?.text).toContain('big asks only')
})

test('mode off adds nothing', { options: { mode: 'off' } }, async ($, on) => {
  base(on)
  expect(await ids($)).toEqual(['intro'])
})

test('/tiabwft off mutes it and /tiabwft on brings it back', async ($, on) => {
  base(on)
  const off = await $.command.run({ command: 'tiabwft', args: 'off', ...RUN })
  expect(off.text).toContain('off')
  expect(await ids($)).toEqual(['intro'])

  await $.command.run({ command: 'tiabwft', args: 'on', ...RUN })
  expect(await ids($)).toEqual(['intro', SECTION_ID])
})
