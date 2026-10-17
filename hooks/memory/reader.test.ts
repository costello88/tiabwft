import { expect, test } from 'claude-code/testing'
import type { ModelCompleteRequest, ModelCompleteResult } from 'claude-code'

import { buildReaderPrompt, parseReaderReply, runReader, shouldRead } from './reader'

const answered = (text: string): ModelCompleteResult => ({ isAnswered: true, text, usage: { input_tokens: 1, output_tokens: 1 } } as ModelCompleteResult)

test('shouldRead skips short prompts without a 💡 block', async () => {
  expect(shouldRead('fix the typo', 'Done.')).toBe(false)
  expect(shouldRead('fix the typo', '## 💡 There is a better way\n...')).toBe(true)
  expect(shouldRead('I use Supabase and I never want Zapier again, it is too expensive', 'ok')).toBe(true)
})

test('buildReaderPrompt caps both inputs', async () => {
  const p = buildReaderPrompt('p'.repeat(5000), 'a'.repeat(9000))
  expect(p).toContain('p'.repeat(2000))
  expect(p).not.toContain('p'.repeat(2001))
  expect(p).toContain('a'.repeat(6000))
  expect(p).not.toContain('a'.repeat(6001))
})

test('parseReaderReply keeps valid facts, drops bad ones, caps at 8, reads suggested', async () => {
  const facts = [
    { kind: 'stack', scope: 'project', subject: 'Supabase', text: 'database and auth' },
    { kind: 'rejection', scope: 'personal', subject: 'Zapier', text: 'never again', reason: 'too expensive' },
    { kind: 'wish', subject: 'x', text: 'y' },
    { kind: 'stack', subject: 'OpenAI', text: 'key sk-abcdefghijklmnopqrstuv' },
    ...Array.from({ length: 10 }, (_, i) => ({ kind: 'decision', subject: `tool ${i}`, text: 'chosen' })),
  ]
  const r = parseReaderReply(`Sure:\n${JSON.stringify({ facts, suggested: ['HubSpot', 'Slack', ''] })}`, 7)
  expect(r.facts.length).toBe(8)
  expect(r.facts[0]).toEqual({ id: 'stack:supabase', kind: 'stack', scope: 'project', subject: 'Supabase', text: 'database and auth', source: 'conversation', firstSeen: 7, lastSeen: 7 })
  expect(r.facts[1]?.scope).toBe('personal')
  expect(r.suggested).toEqual(['HubSpot', 'Slack'])
})

test('parseReaderReply survives junk', async () => {
  expect(parseReaderReply('no json here', 1)).toEqual({ facts: [], suggested: [] })
  expect(parseReaderReply('{ not: json }', 1)).toEqual({ facts: [], suggested: [] })
})

test('runReader calls haiku once with the system prompt and limits, and parses the reply', async () => {
  const calls: ModelCompleteRequest[] = []
  const complete = async (request: ModelCompleteRequest) => {
    calls.push(request)
    return answered('{"facts":[{"kind":"constraint","scope":"personal","subject":"budget","text":"max €50 a month"}],"suggested":[]}')
  }
  const r = await runReader(complete, 'Our budget is max €50 a month for all tools, keep that in mind', 'ok', 3)
  expect(calls.length).toBe(1)
  expect(calls[0]?.model).toBe('haiku')
  expect(calls[0]?.effort).toBe('low')
  expect(calls[0]?.timeoutMs).toBe(10000)
  expect(r.facts[0]?.subject).toBe('budget')
})

test('runReader makes no call for a trivial turn and swallows failures', async () => {
  let called = false
  const r = await runReader(async () => { called = true; return answered('{}') }, 'hi', 'hello', 1)
  expect(called).toBe(false)
  expect(r.facts).toEqual([])
  const failing = await runReader(async () => { throw new Error('boom') }, 'x'.repeat(50), 'ok', 1)
  expect(failing).toEqual({ facts: [], suggested: [] })
  const unanswered = await runReader(async () => ({ isAnswered: false, reason: 'empty-reply' } as ModelCompleteResult), 'x'.repeat(50), 'ok', 1)
  expect(unanswered).toEqual({ facts: [], suggested: [] })
})
