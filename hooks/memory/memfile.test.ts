import { expect, test } from 'claude-code/testing'

import type { Fact } from '../../types'
import { factId } from './facts'
import { MEMORY_FILE_HEADER, parseMemoryFile, renderMemoryFile } from './memfile'

const DAY = Date.parse('2026-10-17T00:00:00Z')
const fact = (over: Partial<Fact> & Pick<Fact, 'kind' | 'subject' | 'text'>): Fact => ({
  id: factId(over.kind, over.subject), scope: 'project', source: 'conversation', firstSeen: DAY, lastSeen: DAY, ...over,
})

test('renders grouped, dated lines and skips personal facts', async () => {
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
    '## Stack',
    '- Supabase: seen in package.json (env, 2026-10-17)',
    '## Rejected',
    '- Zapier: too expensive; per task pricing (said, 2026-10-17)',
    '',
  ].join('\n'))
})

test('a rendered file parses back to the same facts', async () => {
  const facts = [
    fact({ kind: 'stack', subject: 'Supabase', text: 'seen in package.json', source: 'env' }),
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
