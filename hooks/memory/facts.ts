import type { Fact, FactKind, FactScope, FactSource, Memory } from '../../types'

export const KINDS: readonly FactKind[] = ['stack', 'decision', 'rejection', 'constraint', 'worked']
export const LIMITS = { subject: 60, text: 160, reason: 120 } as const

const SECRET_PATTERNS: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  /\b[sr]k_(?:live|test)_[A-Za-z0-9]{10,}/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bglpat-[A-Za-z0-9_-]{20,}/,
  /\bnpm_[A-Za-z0-9]{30,}/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/i,
  /password\s*[=:]/i,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
]

export const emptyMemory = (): Memory => ({ facts: [], tombstones: {} })

export const normaliseSubject = (subject: string): string => subject.trim().toLowerCase().replace(/\s+/g, ' ')

export const factId = (kind: FactKind, subject: string): string => `${kind}:${normaliseSubject(subject)}`

export const containsSecret = (text: string): boolean => SECRET_PATTERNS.some(pattern => pattern.test(text))

const isKind = (value: unknown): value is FactKind => typeof value === 'string' && (KINDS as readonly string[]).includes(value)

const sameSubject = (a: Fact, b: Fact): boolean => normaliseSubject(a.subject) === normaliseSubject(b.subject)

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F\u0085\u2028\u2029]/

export const hasControlChars = (text: string): boolean => CONTROL_CHARS.test(text)

// Validates anything that claims to be a fact (the reader's JSON, a stored row) and
// returns a clean Fact, or undefined when any rule fails.
export const toFact = (draft: unknown, source: FactSource, now: number, defaultScope: FactScope = 'project'): Fact | undefined => {
  if (typeof draft !== 'object' || draft === null) {
    return undefined
  }
  const d = draft as Record<string, unknown>
  // Facts become single lines in memory.md and the prompt: a line break or other
  // control character would let untrusted input forge new lines or headings.
  if ([d.subject, d.text, d.reason].some(v => typeof v === 'string' && hasControlChars(v))) {
    return undefined
  }
  const subject = typeof d.subject === 'string' ? d.subject.trim() : ''
  const text = typeof d.text === 'string' ? d.text.trim() : ''
  const reason = typeof d.reason === 'string' && d.reason.trim() !== '' ? d.reason.trim() : undefined
  const scope: FactScope = d.scope === 'personal' || d.scope === 'project' ? d.scope : defaultScope
  if (!isKind(d.kind)) {
    return undefined
  }
  // memory.md lines read "subject: text", so a subject may not hold a colon.
  if (subject.length < 1 || subject.length > LIMITS.subject || subject.includes(':') || text.length < 1 || text.length > LIMITS.text) {
    return undefined
  }
  if (reason !== undefined && reason.length > LIMITS.reason) {
    return undefined
  }
  // Also the line as memory.md writes it: "password" + "hunter2" is only a secret together.
  const asLine = `${subject}: ${text}${reason === undefined ? '' : `; ${reason}`}`
  if ([subject, text, reason ?? '', asLine].some(containsSecret)) {
    return undefined
  }

  return {
    id: factId(d.kind, subject),
    kind: d.kind,
    scope,
    subject,
    text,
    ...(reason === undefined ? {} : { reason }),
    source,
    firstSeen: now,
    lastSeen: now,
  }
}

export const mergeFact = (memory: Memory, fact: Fact): Memory => {
  const deletedAt = memory.tombstones[fact.id]
  if (deletedAt !== undefined && deletedAt >= fact.lastSeen) {
    return memory
  }
  let facts = memory.facts
  const rejection = facts.find(f => f.kind === 'rejection' && sameSubject(f, fact))
  if (fact.kind !== 'rejection' && rejection !== undefined) {
    if (fact.source === 'conversation') {
      return memory
    }
    facts = facts.filter(f => f !== rejection)
  }
  if (fact.kind === 'rejection') {
    facts = facts.filter(f => !(sameSubject(f, fact) && f.kind !== 'rejection' && f.source !== 'env'))
  }
  const existing = facts.find(f => f.id === fact.id)
  const merged: Fact = existing === undefined
    ? fact
    : { ...existing, ...fact, firstSeen: Math.min(existing.firstSeen, fact.firstSeen), lastSeen: Math.max(existing.lastSeen, fact.lastSeen) }

  return { ...memory, facts: [...facts.filter(f => f.id !== fact.id), merged] }
}

export const deleteFact = (memory: Memory, id: string, now: number): Memory => ({
  facts: memory.facts.filter(f => f.id !== id),
  tombstones: { ...memory.tombstones, [id]: now },
})

export const replaceEnvFacts = (memory: Memory, envFacts: readonly Fact[]): Memory => {
  const found = new Set(envFacts.map(f => f.id))
  const kept: Memory = { ...memory, facts: memory.facts.filter(f => f.source !== 'env' || found.has(f.id)) }

  return envFacts.reduce(mergeFact, kept)
}

// Sync merge: per fact the highest lastSeen wins, per id the latest tombstone wins.
export const mergeMemories = (a: Memory, b: Memory): Memory => {
  const tombstones: Record<string, number> = { ...a.tombstones }
  for (const [id, at] of Object.entries(b.tombstones)) {
    tombstones[id] = Math.max(at, tombstones[id] ?? 0)
  }
  const byId = new Map<string, Fact>()
  for (const f of [...a.facts, ...b.facts]) {
    const seen = byId.get(f.id)
    if (seen === undefined || f.lastSeen > seen.lastSeen) {
      byId.set(f.id, f)
    }
  }
  const facts = [...byId.values()].filter(f => (tombstones[f.id] ?? -1) < f.lastSeen)

  return { facts, tombstones }
}

// Sync merge when the project file exists: the file is the authority. Its facts count
// as seen when the file was last changed (mtime), so a hand edit beats an older remote
// copy. A remote fact missing from the file is taken only when it is newer than the
// file; otherwise it was deleted by hand and gets a tombstone at mtime, so it doesn't
// come back. Remote env facts are left out: the env scan finds them again.
export const mergeWithFile = (file: Memory, remote: Memory, mtime: number): Memory => {
  const local: Memory = { ...file, facts: file.facts.map(f => ({ ...f, lastSeen: Math.max(f.lastSeen, mtime) })) }
  const inFile = new Set(local.facts.map(f => f.id))
  const tombstones: Record<string, number> = { ...remote.tombstones }
  const facts: Fact[] = []
  for (const f of remote.facts) {
    if (f.source === 'env') {
      continue
    }
    if (inFile.has(f.id) || f.lastSeen > mtime) {
      facts.push(f)
    } else {
      tombstones[f.id] = Math.max(mtime, tombstones[f.id] ?? 0)
    }
  }
  return mergeMemories(local, { facts, tombstones })
}

// What applies inside the current project: project facts, plus personal facts
// about subjects the project says nothing about.
export const combine = (personal: Memory, project: Memory): Fact[] => {
  const covered = new Set(project.facts.map(f => normaliseSubject(f.subject)))

  return [...project.facts, ...personal.facts.filter(f => !covered.has(normaliseSubject(f.subject)))]
}

// A stored fact (from $.store or Azure) rebuilt from its validated parts, so a bad
// scope, source or date, or an unknown extra property, never gets through.
const storedFact = (value: unknown): Fact | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const f = value as Record<string, unknown>
  const scope = f.scope
  const source = f.source
  if ((scope !== 'personal' && scope !== 'project') || (source !== 'env' && source !== 'conversation' && source !== 'user')) {
    return undefined
  }
  const clean = toFact(f, source, 0, scope)
  const { firstSeen, lastSeen } = f
  if (clean === undefined || f.id !== clean.id || typeof firstSeen !== 'number' || typeof lastSeen !== 'number' || !Number.isFinite(firstSeen) || !Number.isFinite(lastSeen)) {
    return undefined
  }

  return { ...clean, firstSeen, lastSeen }
}

export const asMemory = (value: unknown): Memory => {
  if (typeof value !== 'object' || value === null) {
    return emptyMemory()
  }
  const v = value as { facts?: unknown; tombstones?: unknown }
  const facts = Array.isArray(v.facts) ? v.facts.map(storedFact).filter((f): f is Fact => f !== undefined) : []
  const tombstones: Record<string, number> = {}
  if (typeof v.tombstones === 'object' && v.tombstones !== null) {
    for (const [id, at] of Object.entries(v.tombstones as Record<string, unknown>)) {
      if (typeof at === 'number' && Number.isFinite(at)) {
        tombstones[id] = at
      }
    }
  }

  return { facts, tombstones }
}
