import type { Fact, FactKind, FactSource, Memory } from '../../types'
import { containsSecret, toFact } from './facts'

// A plain code-unit comparison: the same memory must render the same text on every machine.
const bySubject = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

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

// Lines that couldn't be read are written back unchanged under this last heading, and
// parsing skips everything below it, so a hand edit tiabwft doesn't understand is never lost.
export const KEPT_HEADING = "## Couldn't read (kept as written)"

// kept: the raw lines (headings included) that couldn't be read, in file order.
export type ParsedFile = { memory: Memory; unreadable: number; kept: string[] }

// Only project facts belong in the project file; personal facts live in $.store. Env
// facts are left out too: the scan finds them again at every start, and they differ per
// machine (connectors), so writing them would churn and publish a committed file.
export const renderMemoryFile = (memory: Memory, kept: readonly string[] = []): string => {
  const lines = [MEMORY_FILE_HEADER]
  for (const [kind, title] of SECTIONS) {
    const facts = memory.facts
      .filter(f => f.scope === 'project' && f.source !== 'env' && f.kind === kind)
      .sort((a, b) => a.firstSeen - b.firstSeen || bySubject(a.subject, b.subject))
    if (facts.length === 0) {
      continue
    }
    lines.push(`## ${title}`)
    for (const f of facts) {
      const body = f.reason === undefined ? f.text : `${f.text}; ${f.reason}`
      lines.push(`- ${f.subject}: ${body} (${SOURCE_WORD[f.source]}, ${day(f.firstSeen)})`)
    }
  }
  if (kept.length > 0) {
    lines.push(KEPT_HEADING, ...kept)
  }

  return `${lines.join('\n')}\n`
}

// A hand-edited line is untrusted input, so every fact is built through toFact, the
// same validator as facts from any other source. A line that fails any rule is counted
// as unreadable and kept as written (see KEPT_HEADING), as are unknown headings and
// comments other than the header. The file stores only the day a fact was seen, so
// firstSeen and lastSeen are both that day, and the time of day is not stored.
export const parseMemoryFile = (text: string, now: number): ParsedFile => {
  const facts: Fact[] = []
  const ids = new Set<string>()
  const kept: string[] = []
  let unreadable = 0
  let kind: FactKind | undefined
  const skip = (raw: string): void => {
    unreadable += 1
    kept.push(raw.trimEnd())
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line === MEMORY_FILE_HEADER) {
      continue
    }
    if (line === KEPT_HEADING) {
      kind = undefined
      continue
    }
    if (line.startsWith('<!--')) {
      kept.push(raw.trimEnd())
      continue
    }
    const heading = line.match(/^##\s+(.+)$/)
    if (heading !== null) {
      const title = heading[1]!.trim().toLowerCase()
      kind = SECTIONS.find(([, t]) => t.toLowerCase() === title)?.[0]
      if (kind === undefined) {
        kept.push(raw.trimEnd())
      }
      continue
    }
    const m = line.match(LINE)
    // The whole line is checked, so "password: x" is caught though neither part alone matches.
    if (kind === undefined || m === null || containsSecret(line)) {
      skip(raw)
      continue
    }
    const at = m[4] === undefined ? now : Date.parse(`${m[4]}T00:00:00Z`)
    if (!Number.isFinite(at)) {
      skip(raw)
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
      skip(raw)
      continue
    }
    ids.add(fact.id)
    facts.push(fact)
  }

  return { memory: { facts, tombstones: {} }, unreadable, kept }
}
