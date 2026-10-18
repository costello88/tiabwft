import { expect, test } from 'claude-code/testing'

import type { Fact } from '../../types'
import { factId } from './facts'
import { KEPT_HEADING, MEMORY_FILE_HEADER, parseMemoryFile, renderMemoryFile } from './memfile'

const DAY = Date.parse('2026-10-17T00:00:00Z')
const fact = (over: Partial<Fact> & Pick<Fact, 'kind' | 'subject' | 'text'>): Fact => ({
  id: factId(over.kind, over.subject), scope: 'project', source: 'conversation', firstSeen: DAY, lastSeen: DAY, ...over,
})

test('renders grouped, dated lines and skips personal and env facts', async () => {
  const text = renderMemoryFile({
    facts: [
      fact({ kind: 'rejection', subject: 'Zapier', text: 'too expensive', reason: 'per task pricing' }),
      fact({ kind: 'stack', subject: 'Supabase', text: 'seen in package.json', source: 'env' }),
      fact({ kind: 'constraint', subject: 'budget', text: 'max €50 a month', scope: 'personal' }),
    ],
    tombstones: {},
  })
  expect(text).toBe([
    MEMORY_FILE_HEADER,
    '## Rejected',
    '- Zapier: too expensive; per task pricing (said, 2026-10-17)',
    '',
  ].join('\n'))
})

test('a rendered file parses back to the same facts', async () => {
  const facts = [
    fact({ kind: 'stack', subject: 'Supabase', text: 'database and auth', source: 'conversation' }),
    fact({ kind: 'decision', subject: 'Vercel', text: 'team knows it', source: 'user' }),
  ]
  const parsed = parseMemoryFile(renderMemoryFile({ facts, tombstones: {} }), 0)
  expect(parsed.unreadable).toBe(0)
  expect(parsed.memory.facts).toEqual(facts)
})

test('hand edits count: a line without a date is the user, today; junk lines are counted', async () => {
  const parsed = parseMemoryFile([
    MEMORY_FILE_HEADER,
    '## Constraints',
    '- language: answers in Dutch',
    'this line is not a fact',
    '## Unknown heading',
    '- something: here',
  ].join('\n'), DAY)
  expect(parsed.memory.facts).toEqual([fact({ kind: 'constraint', subject: 'language', text: 'answers in Dutch', source: 'user' })])
  expect(parsed.unreadable).toBe(2)
})

test('a line holding a secret is refused', async () => {
  const parsed = parseMemoryFile('## Stack\n- OpenAI: key sk-abcdefghijklmnopqrstuv (you, 2026-10-17)\n', DAY)
  expect(parsed.memory.facts.length).toBe(0)
  expect(parsed.unreadable).toBe(1)
})

test('a password line is refused even though neither part alone matches', async () => {
  const parsed = parseMemoryFile('## Stack\n- password: hunter2 (you, 2026-10-17)\n', DAY)
  expect(parsed.memory.facts.length).toBe(0)
  expect(parsed.unreadable).toBe(1)
})

test('control characters in a body or a subject are refused', async () => {
  const body = parseMemoryFile('## Stack\n- Supabase: db\u001b (said, 2026-10-17)\n', DAY)
  expect(body.memory.facts.length).toBe(0)
  expect(body.unreadable).toBe(1)
  const subject = parseMemoryFile('## Stack\n- Sup abase: db (said, 2026-10-17)\n', DAY)
  expect(subject.memory.facts.length).toBe(0)
  expect(subject.unreadable).toBe(1)
})

test('an impossible date is refused', async () => {
  const parsed = parseMemoryFile('## Stack\n- Supabase: db (said, 2026-99-99)\n', DAY)
  expect(parsed.memory.facts.length).toBe(0)
  expect(parsed.unreadable).toBe(1)
})

test('a body over 240 characters with no "; " is refused', async () => {
  const parsed = parseMemoryFile(`## Stack\n- Supabase: ${'x'.repeat(241)} (said, 2026-10-17)\n`, DAY)
  expect(parsed.memory.facts.length).toBe(0)
  expect(parsed.unreadable).toBe(1)
})

test('a repeated subject under one heading keeps the first line', async () => {
  const parsed = parseMemoryFile([
    '## Stack',
    '- Supabase: first (said, 2026-10-17)',
    '- supabase: second (said, 2026-10-17)',
  ].join('\n'), DAY)
  expect(parsed.memory.facts.length).toBe(1)
  expect(parsed.memory.facts[0]!.text).toBe('first')
  expect(parsed.unreadable).toBe(1)
})

test('a reason survives the round trip as its own field', async () => {
  const rejected = fact({ kind: 'rejection', subject: 'Zapier', text: 'too expensive', reason: 'per task' })
  const text = renderMemoryFile({ facts: [rejected], tombstones: {} })
  expect(text).toContain('- Zapier: too expensive; per task (said, 2026-10-17)')
  const parsed = parseMemoryFile(text, 0)
  expect(parsed.unreadable).toBe(0)
  expect(parsed.memory.facts[0]!.text).toBe('too expensive')
  expect(parsed.memory.facts[0]!.reason).toBe('per task')
})

test('unreadable lines are kept as written under a final heading, and that section is not parsed', async () => {
  const long = `- Supabase: ${'x'.repeat(241)} (said, 2026-10-17)`
  const parsed = parseMemoryFile([
    MEMORY_FILE_HEADER,
    '## Notes',
    '- free text',
    '## Stack',
    long,
    '- Vercel: hosting (said, 2026-10-17)',
  ].join('\n'), DAY)
  expect(parsed.memory.facts.map(f => f.subject)).toEqual(['Vercel'])
  expect(parsed.unreadable).toBe(2)
  expect(parsed.kept).toEqual(['## Notes', '- free text', long])
  const text = renderMemoryFile(parsed.memory, parsed.kept)
  expect(text).toBe([
    MEMORY_FILE_HEADER,
    '## Stack',
    '- Vercel: hosting (said, 2026-10-17)',
    KEPT_HEADING,
    '## Notes',
    '- free text',
    long,
    '',
  ].join('\n'))
  const again = parseMemoryFile(text, DAY)
  expect(again.memory.facts).toEqual(parsed.memory.facts)
  expect(again.kept).toEqual(parsed.kept)
  expect(again.unreadable).toBe(2)
  expect(renderMemoryFile(again.memory, again.kept)).toBe(text)
})

test('a valid-looking line under the kept heading stays kept, not parsed', async () => {
  const parsed = parseMemoryFile(`${KEPT_HEADING}\n- Vercel: hosting (said, 2026-10-17)\n`, DAY)
  expect(parsed.memory.facts).toEqual([])
  expect(parsed.kept).toEqual(['- Vercel: hosting (said, 2026-10-17)'])
})

test('env lines in an older file still load', async () => {
  const parsed = parseMemoryFile('## Stack\n- Supabase: seen in package.json (env, 2026-10-17)\n', DAY)
  expect(parsed.memory.facts.map(f => f.source)).toEqual(['env'])
  expect(renderMemoryFile(parsed.memory)).toBe(`${MEMORY_FILE_HEADER}\n`)
})
