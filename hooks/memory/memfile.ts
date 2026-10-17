import type { Fact, FactKind, FactSource, Memory } from '../../types'
import { containsSecret, factId, LIMITS } from './facts'

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

export const parseMemoryFile = (text: string, now: number): ParsedFile => {
  const facts: Fact[] = []
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
    if (kind === undefined || m === null) {
      unreadable += 1
      continue
    }
    const subject = m[1]!.trim()
    const body = m[2]!.trim()
    if (subject.length > LIMITS.subject || body.length > LIMITS.text + LIMITS.reason + 2 || containsSecret(`${subject} ${body}`)) {
      unreadable += 1
      continue
    }
    const source: FactSource = m[3] === 'env' ? 'env' : m[3] === 'said' ? 'conversation' : 'user'
    const at = m[4] === undefined ? now : Date.parse(`${m[4]}T00:00:00Z`)
    facts.push({ id: factId(kind, subject), kind, scope: 'project', subject, text: body, source, firstSeen: at, lastSeen: at })
  }

  return { memory: { facts, tombstones: {} }, unreadable }
}
