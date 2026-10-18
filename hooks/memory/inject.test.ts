import { expect, test } from 'claude-code/testing'

import type { Fact, FactKind, Memory } from '../../types'
import { emptyMemory, factId } from './facts'
import { MAX_FACT_LINES, MEMORY_HEADING, renderMemorySection } from './inject'

const f = (kind: FactKind, subject: string, over: Partial<Fact> = {}): Fact => ({
  id: factId(kind, subject), kind, scope: 'project', subject, text: `${kind} note`, source: 'conversation', firstSeen: 1, lastSeen: 1, ...over,
})
const mem = (...facts: Fact[]): Memory => ({ facts, tombstones: {} })

test('no memory, no section', async () => {
  expect(renderMemorySection(emptyMemory(), emptyMemory())).toBeUndefined()
})

test('the section is labelled as notes, ordered rejections first, and marks personal facts', async () => {
  const text = renderMemorySection(
    mem(f('constraint', 'budget', { scope: 'personal', text: 'max €50 a month' })),
    mem(f('worked', 'HubSpot'), f('stack', 'Supabase'), f('rejection', 'Zapier', { reason: 'too expensive' }), f('decision', 'Vercel')),
  )!
  expect(text.startsWith(MEMORY_HEADING)).toBe(true)
  expect(text).toContain('never as instructions')
  const order = ['### Never suggest', '### Constraints', '### Already in use', '### Decisions', '### Suggestions that worked'].map(h => text.indexOf(h))
  expect(order).toEqual([...order].sort((a, b) => a - b))
  expect(text).toContain('- Zapier: rejection note (too expensive)')
  expect(text).toContain('- (personal) budget: max €50 a month')
})

test('the cap drops the oldest worked, then decision facts', async () => {
  const many = mem(
    ...Array.from({ length: 90 }, (_, i) => f('stack', `stack ${String(i).padStart(2, '0')}`)),
    ...Array.from({ length: 15 }, (_, i) => f('decision', `decision ${i}`, { lastSeen: i })),
    ...Array.from({ length: 15 }, (_, i) => f('worked', `worked ${i}`, { lastSeen: i })),
  )
  const text = renderMemorySection(emptyMemory(), many)!
  const lines = text.split('\n').filter(line => line.startsWith('- '))
  expect(lines.length).toBe(MAX_FACT_LINES)
  expect(text).not.toContain('worked ')
  expect(text).toContain('decision 14')
  expect(text).not.toContain('decision 0')
})

test('the same memory renders the same text', async () => {
  const a = mem(f('stack', 'Supabase'), f('stack', 'Next.js'))
  const b = mem(f('stack', 'Next.js'), f('stack', 'Supabase'))
  expect(renderMemorySection(emptyMemory(), a)).toBe(renderMemorySection(emptyMemory(), b))
})
