import type { Memory } from '../../types'
import { asMemory, emptyMemory, normaliseSubject } from './facts'
import { parseMemoryFile, renderMemoryFile } from './memfile'
import type { ParsedFile } from './memfile'

export const PROJECT_FILE = '.claude/tiabwft/memory.md'
export const PERSONAL_KEY = 'memory.personal'
export const SUGGESTED_KEY = 'memory.suggested'
const IGNORE_LINE = '.claude/tiabwft/'

export type Files = {
  exists: (path: string) => Promise<boolean>
  read: (path: string) => Promise<string>
  write: (path: string, text: string) => Promise<void>
}
export type KV = {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<void>
}
export type Fetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; text: string }>
export type AzureConfig = { url: string; key: string }

const join = (root: string, path: string): string => `${root.replace(/[\\/]+$/, '')}/${path}`

export const loadPersonal = async (kv: KV): Promise<Memory> => asMemory(await kv.get(PERSONAL_KEY).catch(() => undefined))

export const savePersonal = (kv: KV, memory: Memory): Promise<void> => kv.set(PERSONAL_KEY, memory)

export const projectFilePath = (root: string): string => join(root, PROJECT_FILE)

// text: the file as it was read, so a save that would write the same text can skip the write.
export type LoadedFile = ParsedFile & { existed: boolean; readFailed?: boolean; text?: string }

export const loadProject = async (files: Files, root: string): Promise<LoadedFile> => {
  const path = projectFilePath(root)
  try {
    if (!(await files.exists(path))) {
      return { memory: emptyMemory(), unreadable: 0, kept: [], existed: false }
    }
    const text = await files.read(path)
    return { ...parseMemoryFile(text, Date.now()), existed: true, text }
  } catch {
    // The file may be there but unreadable: never report it as new.
    return { memory: emptyMemory(), unreadable: 1, kept: [], existed: true, readFailed: true }
  }
}

// Writes the file only when its text changes, and returns the text the file now holds.
export const saveProject = async (
  files: Files,
  root: string,
  memory: Memory,
  mode: 'commit' | 'ignore',
  kept: readonly string[] = [],
  previous?: string,
): Promise<string> => {
  const text = renderMemoryFile(memory, kept)
  if (text !== previous) {
    await files.write(projectFilePath(root), text)
  }
  if (mode !== 'ignore') {
    return text
  }
  const gitignore = join(root, '.gitignore')
  const current = (await files.exists(gitignore)) ? await files.read(gitignore) : ''
  if (!current.split(/\r?\n/).some(line => line.trim() === IGNORE_LINE)) {
    const glue = current === '' || current.endsWith('\n') ? '' : '\n'
    await files.write(gitignore, `${current}${glue}${IGNORE_LINE}\n`)
  }
  return text
}

export const loadSuggested = async (kv: KV): Promise<string[]> => {
  const value = await kv.get(SUGGESTED_KEY).catch(() => undefined)
  return Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string') : []
}

export const addSuggested = async (kv: KV, names: readonly string[]): Promise<void> => {
  const all = [...(await loadSuggested(kv)), ...names.map(normaliseSubject)]
  const unique = [...new Set(all.reverse())].reverse()
  await kv.set(SUGGESTED_KEY, unique.slice(-50))
}

export const projectPartition = (root: string, gitConfig?: string): string => {
  const m = gitConfig?.match(/url\s*=\s*\S*github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\s*$/m)
  const folder = root.split(/[\\/]/).filter(Boolean).pop() ?? 'unknown'
  return `project:${m?.[1] ?? folder}`
}

const partitionUrl = (config: AzureConfig, partition: string): string =>
  `${config.url}${config.url.includes('?') ? '&' : '?'}partition=${encodeURIComponent(partition)}`

export const azureLoad = async (
  fetch: Fetch,
  config: AzureConfig,
  partition: string,
  timeoutMs: number,
  sleep: (ms: number) => Promise<void>,
): Promise<Memory | undefined> => {
  try {
    const response = await Promise.race([
      fetch(partitionUrl(config, partition), { method: 'GET', headers: { 'x-tiabwft-key': config.key } }),
      sleep(timeoutMs).then(() => undefined),
    ])
    if (response === undefined || !response.ok) {
      return undefined
    }
    return asMemory(JSON.parse(response.text))
  } catch {
    return undefined
  }
}

const TOMBSTONE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000
const TOMBSTONE_MAX = 400

// Old deletions have long reached every machine; sending them all would one day
// exceed the function's 500-tombstone limit and stop sync for good.
export const recentTombstones = (tombstones: Record<string, number>, now: number): Record<string, number> =>
  Object.fromEntries(
    Object.entries(tombstones)
      .filter(([, at]) => now - at <= TOMBSTONE_MAX_AGE_MS)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOMBSTONE_MAX),
  )

export const azureSave = async (fetch: Fetch, config: AzureConfig, partition: string, memory: Memory, now: number = Date.now()): Promise<boolean> => {
  try {
    const response = await fetch(partitionUrl(config, partition), {
      method: 'PUT',
      headers: { 'x-tiabwft-key': config.key, 'content-type': 'application/json' },
      body: JSON.stringify({ facts: memory.facts, tombstones: recentTombstones(memory.tombstones, now) }),
    })
    return response.ok
  } catch {
    return false
  }
}
