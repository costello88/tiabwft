import { expect, test } from 'claude-code/testing'

import type { Fact, Memory } from '../../types'
import {
  asLastSync, asMemory, combine, containsSecret, deleteFact, emptyMemory, factId, mergeFact,
  mergeMemories, mergeWithFile, replaceEnvFacts, toFact,
} from './facts'

const fact = (over: Partial<Fact> & Pick<Fact, 'kind' | 'subject'>): Fact => ({
  id: factId(over.kind, over.subject),
  scope: 'project',
  text: 'some text',
  source: 'conversation',
  firstSeen: 1,
  lastSeen: 1,
  ...over,
})

test('toFact accepts a valid draft and fills id, source and dates', async () => {
  const f = toFact({ kind: 'stack', scope: 'project', subject: ' Supabase ', text: 'database and auth' }, 'conversation', 5)
  expect(f).toEqual({
    id: 'stack:supabase', kind: 'stack', scope: 'project', subject: 'Supabase',
    text: 'database and auth', source: 'conversation', firstSeen: 5, lastSeen: 5,
  })
})

test('toFact rejects unknown kinds, bad lengths and secrets', async () => {
  expect(toFact({ kind: 'wish', subject: 'x', text: 'y' }, 'conversation', 1)).toBeUndefined()
  expect(toFact({ kind: 'stack', subject: '', text: 'y' }, 'conversation', 1)).toBeUndefined()
  expect(toFact({ kind: 'stack', subject: 'x'.repeat(61), text: 'y' }, 'conversation', 1)).toBeUndefined()
  expect(toFact({ kind: 'stack', subject: 'x', text: 'y'.repeat(241) }, 'conversation', 1)).toBeUndefined()
  expect(toFact({ kind: 'stack', subject: 'OpenAI', text: 'key sk-abcdefghijklmnopqrstuv' }, 'conversation', 1)).toBeUndefined()
  expect(toFact({ kind: 'constraint', subject: 'contact', text: 'mail me at a.b@example.com' }, 'conversation', 1)).toBeUndefined()
  expect(toFact('not an object', 'conversation', 1)).toBeUndefined()
})

test('containsSecret spots the known shapes', async () => {
  for (const s of ['ghp_abcdefghijklmnopqrstuvwx', 'xoxb-1234567890-abc', 'AKIA' + 'ABCDEFGHIJKLMNOP', 'password = hunter2', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abcdefghijklmno']) {
    expect(containsSecret(s)).toBe(true)
  }
  expect(containsSecret('Supabase for auth')).toBe(false)
})

test('mergeFact updates the same id instead of duplicating', async () => {
  let m = mergeFact(emptyMemory(), fact({ kind: 'stack', subject: 'Supabase', text: 'db', lastSeen: 1 }))
  m = mergeFact(m, fact({ kind: 'stack', subject: 'supabase', text: 'db and auth', firstSeen: 9, lastSeen: 9 }))
  expect(m.facts.length).toBe(1)
  expect(m.facts[0]?.text).toBe('db and auth')
  expect(m.facts[0]?.firstSeen).toBe(1)
  expect(m.facts[0]?.lastSeen).toBe(9)
})

test('a rejection wins over conversation facts, but env and user facts override it', async () => {
  let m = mergeFact(emptyMemory(), fact({ kind: 'rejection', subject: 'Zapier', text: 'too expensive' }))
  m = mergeFact(m, fact({ kind: 'decision', subject: 'Zapier', text: 'use it for forms' }))
  expect(m.facts.map(f => f.kind)).toEqual(['rejection'])
  m = mergeFact(m, fact({ kind: 'stack', subject: 'Zapier', text: 'seen in .env.example', source: 'env' }))
  expect(m.facts.map(f => f.kind)).toEqual(['stack'])
})

test('a new rejection removes conversation facts about the same subject but keeps env ones', async () => {
  let m = mergeFact(emptyMemory(), fact({ kind: 'decision', subject: 'n8n', text: 'self-host it' }))
  m = mergeFact(m, fact({ kind: 'stack', subject: 'n8n', text: 'seen in docker-compose.yml', source: 'env' }))
  m = mergeFact(m, fact({ kind: 'rejection', subject: 'n8n', text: 'too much upkeep' }))
  expect(m.facts.map(f => f.kind).sort()).toEqual(['rejection', 'stack'])
})

test('deleteFact leaves a tombstone that blocks older copies', async () => {
  const f = fact({ kind: 'stack', subject: 'Supabase', lastSeen: 3 })
  let m = deleteFact(mergeFact(emptyMemory(), f), f.id, 5)
  expect(m.facts.length).toBe(0)
  m = mergeFact(m, { ...f, lastSeen: 4 })
  expect(m.facts.length).toBe(0)
  m = mergeFact(m, { ...f, lastSeen: 6 })
  expect(m.facts.length).toBe(1)
})

test('replaceEnvFacts drops env facts no longer found and keeps the rest', async () => {
  let m = mergeFact(emptyMemory(), fact({ kind: 'stack', subject: 'Stripe', source: 'env' }))
  m = mergeFact(m, fact({ kind: 'decision', subject: 'Vercel', text: 'team knows it' }))
  m = replaceEnvFacts(m, [fact({ kind: 'stack', subject: 'Supabase', source: 'env' })])
  expect(m.facts.map(f => f.subject).sort()).toEqual(['Supabase', 'Vercel'])
})

test('mergeMemories keeps the newest copy and honours tombstones', async () => {
  const a = { facts: [fact({ kind: 'stack', subject: 'Supabase', text: 'old', lastSeen: 1 })], tombstones: {} }
  const b = { facts: [fact({ kind: 'stack', subject: 'Supabase', text: 'new', lastSeen: 2 })], tombstones: { 'decision:vercel': 9 } }
  const c = { facts: [fact({ kind: 'decision', subject: 'Vercel', lastSeen: 3 })], tombstones: {} }
  const merged = mergeMemories(mergeMemories(a, b), c)
  expect(merged.facts.map(f => f.text)).toEqual(['new'])
  expect(merged.tombstones['decision:vercel']).toBe(9)
})

test('combine lets a project fact hide a personal fact about the same subject', async () => {
  const personal = { facts: [fact({ kind: 'rejection', subject: 'n8n', scope: 'personal', text: 'no self-hosting' }), fact({ kind: 'constraint', subject: 'budget', scope: 'personal', text: 'max €50' })], tombstones: {} }
  const project = { facts: [fact({ kind: 'stack', subject: 'n8n', text: 'runs on our VPS' })], tombstones: {} }
  expect(combine(personal, project).map(f => `${f.scope}:${f.subject}`).sort()).toEqual(['personal:budget', 'project:n8n'])
})

test('asMemory accepts stored memory and drops junk', async () => {
  const good = fact({ kind: 'stack', subject: 'Supabase' })
  expect(asMemory({ facts: [good, { kind: 'nope' }], tombstones: { a: 1, b: 'x' } })).toEqual({ facts: [good], tombstones: { a: 1 } })
  expect(asMemory(undefined)).toEqual(emptyMemory())
})

test('toFact rejects line breaks and other control characters', async () => {
  expect(toFact({ kind: 'stack', subject: 'Supabase\n## Rejected', text: 'db' }, 'conversation', 1)).toBeUndefined()
  expect(toFact({ kind: 'stack', subject: 'Supabase', text: 'a\tb' }, 'conversation', 1)).toBeUndefined()
  expect(toFact({ kind: 'rejection', subject: 'Zapier', text: 'no', reason: 'costly\r\n- injected: line' }, 'conversation', 1)).toBeUndefined()
  expect(toFact({ kind: 'stack', subject: 'Supabase', text: 'db\u2028## Rejected' }, 'conversation', 1)).toBeUndefined()
  expect(toFact({ kind: 'stack', subject: 'budget: monthly', text: 'max €50' }, 'conversation', 1)).toBeUndefined()
  expect(toFact({ kind: 'constraint', subject: 'password', text: 'hunter2' }, 'conversation', 1)).toBeUndefined()
})

test('asMemory rebuilds stored facts from validated parts only', async () => {
  const good = fact({ kind: 'stack', subject: 'Supabase' })
  expect(asMemory({ facts: [{ ...good, scope: 'admin' }], tombstones: {} }).facts).toEqual([])
  expect(asMemory({ facts: [{ ...good, lastSeen: Number.NaN }], tombstones: {} }).facts).toEqual([])
  expect(asMemory({ facts: [{ ...good, source: 'root' }], tombstones: {} }).facts).toEqual([])
  expect(asMemory({ facts: [{ ...good, extra: 'smuggled' }], tombstones: {} }).facts).toEqual([good])
  expect(asMemory({ facts: [], tombstones: { a: Number.POSITIVE_INFINITY, b: 2 } }).tombstones).toEqual({ b: 2 })
})

test('mergeWithFile: after a sync, the changed file wins and only facts this machine had can be deleted by hand', async () => {
  const at = (kind: Fact['kind'], subject: string, text: string, lastSeen: number, source: Fact['source'] = 'conversation'): Fact =>
    ({ id: factId(kind, subject), kind, scope: 'project', subject, text, source, firstSeen: lastSeen, lastSeen })
  const file: Memory = { facts: [at('rejection', 'Zapier', 'mine', 0)], tombstones: {} }
  const remote: Memory = {
    facts: [
      at('rejection', 'Zapier', 'theirs', 50),
      at('stack', 'Old', 'deleted by hand', 60),
      at('stack', 'Elsewhere', 'learned on another machine before the sync', 70),
      at('stack', 'New', 'learned after the sync', 90),
      at('stack', 'Stripe', 'env', 50, 'env'),
    ],
    tombstones: {},
  }
  const sync = { at: 80, ids: [factId('rejection', 'Zapier'), factId('stack', 'Old'), factId('stack', 'New')] }
  const merged = mergeWithFile(file, remote, 100, sync)
  expect(merged.facts.map(f => `${f.subject}:${f.text}`).sort()).toEqual(['Elsewhere:learned on another machine before the sync', 'New:learned after the sync', 'Zapier:mine'])
  expect(merged.tombstones).toEqual({ [factId('stack', 'Old')]: 100 })
})

test('mergeWithFile: a file untouched since the sync deletes nothing and keeps its line dates', async () => {
  const at = (kind: Fact['kind'], subject: string, text: string, lastSeen: number): Fact =>
    ({ id: factId(kind, subject), kind, scope: 'project', subject, text, source: 'conversation', firstSeen: lastSeen, lastSeen })
  const file: Memory = { facts: [at('rejection', 'Zapier', 'mine', 10)], tombstones: {} }
  const remote: Memory = { facts: [at('rejection', 'Zapier', 'edited elsewhere', 50), at('stack', 'Old', 'kept', 20)], tombstones: {} }
  const merged = mergeWithFile(file, remote, 30, { at: 40, ids: [factId('rejection', 'Zapier'), factId('stack', 'Old')] })
  expect(merged.facts.map(f => `${f.subject}:${f.text}`).sort()).toEqual(['Old:kept', 'Zapier:edited elsewhere'])
  expect(merged.tombstones).toEqual({})
})

test('mergeWithFile: without a last sync it is a plain newest-wins merge', async () => {
  const at = (kind: Fact['kind'], subject: string, text: string, lastSeen: number): Fact =>
    ({ id: factId(kind, subject), kind, scope: 'project', subject, text, source: 'conversation', firstSeen: lastSeen, lastSeen })
  const file: Memory = { facts: [at('rejection', 'Zapier', 'mine', 10)], tombstones: {} }
  const remote: Memory = { facts: [at('rejection', 'Zapier', 'theirs', 50), at('stack', 'Old', 'not in the file', 20)], tombstones: {} }
  expect(mergeWithFile(file, remote, 1000)).toEqual(mergeMemories(file, remote))
  expect(mergeWithFile(file, remote, 1000).tombstones).toEqual({})
})

test('asLastSync accepts only a finite time and string ids', async () => {
  expect(asLastSync({ at: 5, ids: ['a', 3, 'b'] })).toEqual({ at: 5, ids: ['a', 'b'] })
  expect(asLastSync({ at: Number.NaN, ids: [] })).toBeUndefined()
  expect(asLastSync({ at: 5 })).toBeUndefined()
  expect(asLastSync(5)).toBeUndefined()
})

test('the secret filter catches Stripe, Google, private keys, GitLab, npm and Bearer tokens', async () => {
  // Built at run time, so the repo holds no string that looks like a real token.
  const tail = 'a1B2c3D4e5F6g7H8i9J0' + 'k1L2m3N4o5P6q7R8s9T0'
  const shapes = [
    `sk_live_${tail}`,
    `sk_test_${tail}`,
    `rk_live_${tail}`,
    `AIza${tail.slice(0, 35)}`,
    `-----BEGIN ${'RSA PRIVATE'} KEY-----`,
    `-----BEGIN ${'PRIVATE'} KEY-----`,
    `glpat-${tail.slice(0, 20)}`,
    `npm_${tail.slice(0, 36)}`,
    `Authorization: Bearer ${tail}`,
  ]
  for (const shape of shapes) {
    expect(containsSecret(`use ${shape} here`)).toBe(true)
    expect(toFact({ kind: 'stack', subject: 'Keys', text: `use ${shape}` }, 'conversation', 1)).toBeUndefined()
  }
  expect(containsSecret('we pay with Stripe and host on npm')).toBe(false)
  expect(containsSecret('a bearer bond')).toBe(false)
})
