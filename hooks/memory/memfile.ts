import type { Fact, FactKind, FactSource, Memory } from '../../types'
import { containsSecret, toFact } from './facts'

export const MEMORY_FILE_HEADER = '<!-- tiabwft memory: edit freely, one fact per line -->'

const SECTIONS: readonly (readonly [FactKind, string])[] = [
  ['stack', 'Stack'],
  ['decision', 'Decisions'],
  ['rejection', 'Rejected'],
  ['constraint', 'Constraints'],
  ['worked', 'What worked'],
]
const SOURCE_WORD: Record<FactSource, string> = { env: 'env', conversation: 'said', user: 'you' }
const LINE = /^-\s+([^:]+?):\s+(.+?)(?:\s+\((env|said|you),\s*(\d{4}-\d{2}-\d{2})\))?\s*$/

const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

export type ParsedFile = { memory: Memory; unreadable: number }

// Only project facts belong in the project file; personal facts live in $.store.
export const renderMemoryFile = (memory: Memory): string => {
  const lines = [MEMORY_FILE_HEADER]
  for (const [kind, title] of SECTIONS) {
    const facts = memory.facts
      .filter(f => f.scope === 'project' && f.kind === kind)
      .sort((a, b) => a.firstSeen - b.firstSeen || a.subject.localeCompare(b.subject))
    if (facts.length === 0) {
      continue
    }
    lines.push(`## ${title}`)
    for (const f of facts) {
      const body = f.reason === undefined ? f.text : `${f.text}; ${f.reason}`
      lines.push(`- ${f.subject}: ${body} (${SOURCE_WORD[f.source]}, ${day(f.firstSeen)})`)
    }
  }

  return `${lines.join('\n')}\n`
}

// A hand-edited line is untrusted input, so every fact is built through toFact, the
// same validator as facts from any other source. A line that fails any rule is counted
// as unreadable. The file stores only the day a fact was seen, so firstSeen and
// lastSeen are both that day, and lastSeen and the time of day are not stored.
export const parseMemoryFile = (text: string, now: number): ParsedFile => {
  const facts: Fact[] = []
  const ids = new Set<string>()
  let unreadable = 0
  let kind: FactKind | undefined
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line.startsWith('<!--')) {
      continue
    }
    const heading = line.match(/^##\s+(.+)$/)
    if (heading !== null) {
      const title = heading[1]!.trim().toLowerCase()
      kind = SECTIONS.find(([, t]) => t.toLowerCase() === title)?.[0]
      continue
    }
    const m = line.match(LINE)
    // The whole line is checked, so "password: x" is caught though neither part alone matches.
    if (kind === undefined || m === null || containsSecret(line)) {
      unreadable += 1
      continue
    }
    const at = m[4] === undefined ? now : Date.parse(`${m[4]}T00:00:00Z`)
    if (!Number.isFinite(at)) {
      unreadable += 1
      continue
    }
    // The renderer writes "text; reason", so the first "; " separates the two.
    const body = m[2]!.trim()
    const sep = body.indexOf('; ')
    const source: FactSource = m[3] === 'env' ? 'env' : m[3] === 'said' ? 'conversation' : 'user'
    const fact = toFact(
      { kind, scope: 'project', subject: m[1], text: sep === -1 ? body : body.slice(0, sep), reason: sep === -1 ? undefined : body.slice(sep + 2) },
      source,
      at,
    )
    if (fact === undefined || ids.has(fact.id)) {
      unreadable += 1
      continue
    }
    ids.add(fact.id)
    facts.push(fact)
  }

  return { memory: { facts, tombstones: {} }, unreadable }
}
