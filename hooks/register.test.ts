import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { PANE, sessionFacts } from './register'
import { extractSuggestion } from './suggestion'
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

test('session facts always name the model and stay quiet below the thresholds', async () => {
  const facts = sessionFacts({ model: 'claude-opus-5-5', mcpTools: 10, contextPercent: 30, costUsd: 1, rateLimitPercent: 20 })
  expect(facts).toContain('claude-opus-5-5')
  expect(facts).not.toContain('/compact')
  expect(facts).not.toContain('has cost over')
  expect(facts).not.toContain('usage limit')
})

test('session facts add tips once thresholds are crossed, in steady buckets', async () => {
  const facts = sessionFacts({ model: 'claude-sonnet-5-5', mcpTools: 120, contextPercent: 75, costUsd: 23.4, rateLimitPercent: 90 })
  expect(facts).toContain('/compact')
  expect(facts).toContain('over $20')
  expect(facts).toContain('usage limit')
  expect(facts).toContain('120 connector tools')
  // the cost line reads the same at $21 and $49, so the cached prompt holds
  expect(sessionFacts({ model: 'm', mcpTools: 0, costUsd: 21 })).toBe(sessionFacts({ model: 'm', mcpTools: 0, costUsd: 49 }))
})

test('the compose section carries the live facts', async ($, on) => {
  base(on)
  const { sections } = await $.prompt.compose(FACTS)
  expect(sections.at(-1)?.text).toContain('Model in use: claude-opus-5-5')
})

test('the protocol asks for a full stack from real lookups', async ($, on) => {
  base(on)
  const text = (await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? ''
  for (const part of ['Full stack', 'Flow', 'Start here', '🤖', '🔌', '🧩', '📦', '🛡️', 'mcp-registry', 'SearchPlugins', 'gh search repos', '--topic=claude-skills', "user's language", 'Also considered', '/25']) {
    expect(text).toContain(part)
  }
})

test('the protocol requires content, distribution and best odds for growth goals', async ($, on) => {
  base(on)
  const text = (await $.prompt.compose(FACTS)).sections.at(-1)?.text ?? ''
  for (const part of ['🎬', '📣', 'Best odds', 'disclosed']) {
    expect(text).toContain(part)
  }
})

const REPLY_EN = `Here is how to set it up.

## 💡 There's a better way

**Goal:** website leads land in the CRM automatically.

| Layer | Pick | Why | How to add | Status |
|---|---|---|---|---|
| 🔌 CRM | HubSpot | contacts and deals | connect it | new |

**Start here:** connect HubSpot.`

const REPLY_NL = `Klaar.

**💡 Er is een betere manier**

**Doel:** elke websitelead komt in het CRM.

**Begin hier:** verbind HubSpot.`

const turnEnd = (answer: string, extra: { agentId?: string; isAborted?: boolean } = {}) => ({
  answer,
  durationMs: 1000,
  isAborted: extra.isAborted ?? false,
  turnId: `t-${Math.random()}`,
  reason: extra.isAborted ? ('aborted' as const) : ('answer' as const),
  ...(extra.agentId === undefined ? {} : { agentId: extra.agentId }),
})

const PANE_PROPS = {
  title: '💡 Better way',
  isFocused: false,
  bodyColumns: 60,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}

const paneText = async ($: Engine, surface: 'terminal' | 'desktop') => {
  const ui = await $.ui.mount({ plugin: 'tiabwft', surface, component: 'Pane', requestId: PANE, props: PANE_PROPS })
  const all = [await ui.find({ key: 'meta' }), await ui.find({ key: 'block' }), await ui.find({ type: 'Text' })]
  await ui.unmount()

  return all.map(found => found?.text ?? '').join('\n')
}

test('extractSuggestion cuts the block from its 💡 heading and reads the goal, in any language', async () => {
  const en = extractSuggestion(REPLY_EN, 0)
  expect(en?.markdown.startsWith("## 💡 There's a better way")).toBe(true)
  expect(en?.markdown).not.toContain('Here is how')
  expect(en?.topic).toBe('website leads land in the CRM automatically.')
  expect(extractSuggestion(REPLY_NL, 0)?.topic).toBe('elke websitelead komt in het CRM.')
  expect(extractSuggestion('Fixed the typo.', 0)).toBeUndefined()
})

test('the panel shows a hint first, then the latest block on every surface', async ($, on) => {
  on('turn.complete', async () => ({ text: '' }))
  for (const surface of ['terminal', 'desktop'] as const) {
    expect(await paneText($, surface)).toContain('No suggestion yet')
  }
  await $.turn.complete(turnEnd(REPLY_EN))
  for (const surface of ['terminal', 'desktop'] as const) {
    const text = await paneText($, surface)
    expect(text).toContain('website leads land in the CRM automatically.')
    expect(text).toContain('HubSpot')
  }
})

test('subagent turns and interrupted turns leave the panel alone', async ($, on) => {
  on('turn.complete', async () => ({ text: '' }))
  await $.turn.complete(turnEnd(REPLY_EN, { agentId: 'sub-1' }))
  await $.turn.complete(turnEnd(REPLY_NL, { isAborted: true }))
  expect(await paneText($, 'desktop')).toContain('No suggestion yet')
})

test('/tiabwft panel opens the pane', async ($, on) => {
  on('command.run', async () => ({ text: '' }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  const ran = await $.command.run({ command: 'tiabwft', args: 'panel', ...RUN })
  expect(ran.text).toContain('panel')
})
