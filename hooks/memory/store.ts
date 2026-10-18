import type { Fact, Memory } from '../../types'
import { asLastSync, asMemory, emptyMemory, normaliseSubject } from './facts'
import type { LastSync } from './facts'
import { parseMemoryFile, renderMemoryFile } from './memfile'
import type { ParsedFile } from './memfile'

export const PROJECT_FILE = '.claude/tiabwft/memory.md'
export const PERSONAL_KEY = 'memory.personal'
export const SUGGESTED_KEY = 'memory.suggested'
export const LAST_SYNC_PREFIX = 'memory.lastSync.'
const IGNORE_LINE = '.claude/tiabwft/'

export type Files = {
  exists: (path: string) => Promise<boolean>
  read: (path: string) => Promise<string>
  write: (path: string, text: string) => Promise<void>
  /** When the file was last changed (epoch ms), or undefined when unknown. */
  mtime?: (path: string) => Promise<number | undefined>
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
  await kv.set(SUGGESTED_KEY, unique.slice(-300))
}

// The url of the "origin" remote in a .git/config, else of the first remote.
const remoteUrl = (gitConfig: string): string | undefined => {
  const urls: { remote: string; url: string }[] = []
  let remote: string | undefined
  for (const line of gitConfig.split(/\r?\n/)) {
    const section = line.match(/^\s*\[\s*([^\]\s"]+)(?:\s+"([^"]*)")?\s*\]/)
    if (section !== null) {
      remote = section[1]?.toLowerCase() === 'remote' ? section[2] ?? '' : undefined
      continue
    }
    const url = remote === undefined ? null : line.match(/^\s*url\s*=\s*(\S+)\s*$/)
    if (url?.[1] !== undefined && remote !== undefined) {
      urls.push({ remote, url: url[1] })
    }
  }
  return (urls.find(u => u.remote === 'origin') ?? urls[0])?.url
}

const PARTITION_MAX = 120

// "https://host/owner/repo(.git)", "ssh://git@host:22/owner/repo" or "git@host:owner/repo"
// as "host/owner/repo", lowercased, with any user, password and port dropped; "owner/repo"
// for github.com. Undefined for a local path or anything else without a host and a path.
export const remoteName = (url: string): string | undefined => {
  const withScheme = url.match(/^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/:]+)(?::\d*)?\/(.+)$/i)
  const scpLike = withScheme === null ? url.match(/^(?:[^@/:]+@)?([^/:]+):(?!\/)(.+)$/) : null
  const parts = withScheme ?? scpLike
  if (parts?.[1] === undefined || parts[2] === undefined) {
    return undefined
  }
  const host = parts[1].toLowerCase()
  const segments = parts[2].toLowerCase().replace(/\.git\/*$/, '').split('/')
    .map(seg => seg.replace(/[^a-z0-9._-]/g, '_'))
    .filter(seg => seg !== '' && seg !== '.' && seg !== '..')
  // A one-letter host is a Windows drive (C:\repo), a local path.
  if (segments.length < 1 || host.length < 2 || !/^[a-z0-9._-]+$/.test(host)) {
    return undefined
  }
  return host === 'github.com' ? segments.join('/') : [host, ...segments].join('/')
}

const shortHash = async (text: string): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  return [...digest.slice(0, 4)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// Forward slashes, no trailing slash, a lowercase drive letter: one folder, one hash.
export const normaliseRoot = (root: string): string =>
  root.replace(/\\/g, '/').replace(/\/+$/, '').replace(/^([A-Za-z]):/, (_, drive: string) => `${drive.toLowerCase()}:`)

// A git remote names the project the same on every machine. Without one: the folder
// name, cut to the characters the Azure function accepts, plus a hash of the full root,
// so two folders with the same name ("api", "web") never share a partition.
export const projectPartition = async (root: string, gitConfig?: string): Promise<string> => {
  const url = gitConfig === undefined ? undefined : remoteUrl(gitConfig)
  const name = url === undefined ? undefined : remoteName(url)
  if (name !== undefined) {
    // A name too long for the function keeps its start and gets a hash of the whole.
    return `project:${name.length <= PARTITION_MAX ? name : `${name.slice(0, PARTITION_MAX - 9)}-${await shortHash(name)}`}`
  }
  const normal = normaliseRoot(root)
  const folder = (normal.split('/').filter(Boolean).pop() ?? 'unknown').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 60)
  return `project:${folder}-${await shortHash(normal)}`
}

// Per partition and per checkout: this checkout's last successful Azure save (see LastSync
// in facts.ts). Two clones of one repo on one computer share a partition but not a file,
// so each keeps its own record, and a new clone's first sync is a plain merge.
export const lastSyncKey = async (partition: string, root: string): Promise<string> =>
  `${LAST_SYNC_PREFIX}${partition}@${await shortHash(normaliseRoot(root))}`

export const loadLastSync = async (kv: KV, partition: string, root: string): Promise<LastSync | undefined> =>
  asLastSync(await kv.get(await lastSyncKey(partition, root)).catch(() => undefined))

export const saveLastSync = async (kv: KV, partition: string, root: string, sync: LastSync): Promise<void> =>
  kv.set(await lastSyncKey(partition, root), sync)

const isAbsolute = (path: string): boolean => /^(?:[A-Za-z]:)?[\\/]/.test(path)

// path against base, with forward slashes and "." and ".." resolved.
const resolvePath = (base: string, path: string): string => {
  const full = (isAbsolute(path) ? path : `${base}/${path}`).replace(/\\/g, '/')
  const prefix = full.match(/^(?:[A-Za-z]:)?\/*/)?.[0] ?? ''
  const out: string[] = []
  for (const seg of full.slice(prefix.length).split('/')) {
    if (seg === '..') {
      out.pop()
    } else if (seg !== '' && seg !== '.') {
      out.push(seg)
    }
  }
  return `${prefix}${out.join('/')}`
}

// The repo's git config. In a worktree (or a submodule) .git is a file, "gitdir: <path>":
// the config is in the common git dir, named by <gitdir>/commondir, or for a worktree
// gitdir <repo>/.git/worktrees/<name> it is <repo>/.git. So all worktrees of a repo share
// its remote and so its partition.
export const readGitConfig = async (files: Files, root: string): Promise<string | undefined> => {
  const base = root.replace(/\\/g, '/').replace(/\/+$/, '')
  const direct = await files.read(`${base}/.git/config`).catch(() => undefined)
  if (direct !== undefined) {
    return direct
  }
  const pointer = await files.read(`${base}/.git`).catch(() => undefined)
  const gitdir = pointer?.match(/^\s*gitdir:\s*(.+?)\s*$/m)?.[1]
  if (gitdir === undefined) {
    return undefined
  }
  const dir = resolvePath(base, gitdir)
  const common = (await files.read(`${dir}/commondir`).catch(() => undefined))?.trim()
  const shared = common !== undefined && common !== '' ? resolvePath(dir, common) : dir.replace(/\/worktrees\/[^/]+$/, '')
  return files.read(`${shared}/config`).catch(() => undefined)
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

// The function takes at most 500 facts per PUT; the newest 450 keep sync working.
export const AZURE_FACT_MAX = 450

export const newestFacts = (facts: readonly Fact[]): Fact[] => [...facts].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, AZURE_FACT_MAX)

/** How many facts azureSave leaves out of the PUT because of the cap (the oldest ones). */
export const leftOutOfAzure = (memory: Memory): number => Math.max(0, memory.facts.length - AZURE_FACT_MAX)

export const azureSave = async (fetch: Fetch, config: AzureConfig, partition: string, memory: Memory, now: number = Date.now()): Promise<boolean> => {
  try {
    const response = await fetch(partitionUrl(config, partition), {
      method: 'PUT',
      headers: { 'x-tiabwft-key': config.key, 'content-type': 'application/json' },
      body: JSON.stringify({ facts: newestFacts(memory.facts), tombstones: recentTombstones(memory.tombstones, now) }),
    })
    return response.ok
  } catch {
    return false
  }
}
