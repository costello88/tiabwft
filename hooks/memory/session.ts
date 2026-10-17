import type { Fact, Memory } from '../../types'
import { scanEnvironment } from './env-scan'
import { containsSecret, deleteFact, mergeFact, mergeMemories, mergeWithFile, normaliseSubject, replaceEnvFacts, toFact } from './facts'
import { runReader } from './reader'
import type { Complete } from './reader'
import {
  addSuggested, azureLoad, azureSave, leftOutOfAzure, loadLastSync, loadPersonal, loadProject, loadSuggested, projectFilePath, projectPartition,
  readGitConfig, saveLastSync, saveProject, savePersonal,
} from './store'
import type { AzureConfig, Fetch, Files, KV } from './store'

export type MemoryDeps = {
  root: string
  files: Files
  kv: KV
  now: () => number
  toolNames: () => Promise<string[]>
  complete: Complete
  azure?: { config: AzureConfig; fetch: Fetch; sleep: (ms: number) => Promise<void> }
}
export type MemoryOptions = { projectFile: 'commit' | 'ignore' }
// What a save needs to know about the project file: whether it exists, whether it
// couldn't be read (then it is never written), its unreadable lines (written back
// unchanged) and the text it holds now (an unchanged render is not written).
export type FileState = { existed: boolean; readFailed?: boolean; kept?: readonly string[]; text?: string }
export type Loaded = { personal: Memory; project: Memory; unreadable: number; file: FileState }

const AZURE_TIMEOUT_MS = 2000
const AZURE_SAVE_TIMEOUT_MS = 5000

const partitionFor = async (deps: MemoryDeps): Promise<string> =>
  projectPartition(deps.root, await readGitConfig(deps.files, deps.root))

export const loadAll = async (deps: MemoryDeps): Promise<Loaded> => {
  const now = deps.now()
  let personal = await loadPersonal(deps.kv)
  const file = await loadProject(deps.files, deps.root)
  let project = file.memory
  if (deps.azure !== undefined) {
    const { config, fetch, sleep } = deps.azure
    const fileRead = file.existed && file.readFailed !== true
    const partition = partitionFor(deps)
    const [remotePersonal, remoteProject, mtime, lastSync] = await Promise.all([
      azureLoad(fetch, config, 'personal', AZURE_TIMEOUT_MS, sleep),
      partition.then(p => azureLoad(fetch, config, p, AZURE_TIMEOUT_MS, sleep)),
      fileRead && deps.files.mtime !== undefined ? deps.files.mtime(projectFilePath(deps.root)).catch(() => undefined) : Promise.resolve(undefined),
      partition.then(p => loadLastSync(deps.kv, p, deps.root)),
    ])
    if (remotePersonal !== undefined) {
      personal = mergeMemories(personal, remotePersonal)
    }
    if (remoteProject !== undefined) {
      // With the file's time the file is the authority for what changed in it since this
      // machine's last sync; without it, the newest copy wins.
      project = mtime !== undefined && Number.isFinite(mtime) ? mergeWithFile(project, remoteProject, mtime, lastSync) : mergeMemories(project, remoteProject)
    }
  }
  const reader = { exists: (p: string) => deps.files.exists(`${deps.root}/${p}`), read: (p: string) => deps.files.read(`${deps.root}/${p}`) }
  const env = await scanEnvironment(reader, await deps.toolNames().catch(() => []), now)
  project = replaceEnvFacts(project, env)
  const suggested = new Set(await loadSuggested(deps.kv))
  for (const found of env) {
    if (suggested.has(normaliseSubject(found.subject))) {
      const worked = toFact({ kind: 'worked', scope: 'project', subject: found.subject, text: `suggested earlier, now ${found.text}` }, 'env', now)
      if (worked !== undefined) {
        project = mergeFact(project, worked)
      }
    }
  }
  return {
    personal,
    project,
    unreadable: file.unreadable,
    file: { existed: file.existed, readFailed: file.readFailed, kept: file.kept, text: file.text },
  }
}

// What a save leaves behind: the file state, for the next save to compare with, and how
// many facts the Azure cap left out of the upload (0 without Azure).
export type Persisted = { file: FileState; leftOut: number }

export const persistAll = async (deps: MemoryDeps, options: MemoryOptions, personal: Memory, project: Memory, file: FileState): Promise<Persisted> => {
  await savePersonal(deps.kv, personal).catch(() => undefined)
  let next = file
  const worthAFile = file.existed || project.facts.some(f => f.source !== 'env')
  // True once the file holds exactly what goes to Azure: written, or already the same text.
  // Without a file and nothing to put in one there is nothing to differ.
  let fileMatches = !worthAFile
  if (worthAFile && file.readFailed !== true) {
    const text = await saveProject(deps.files, deps.root, project, options.projectFile, file.kept ?? [], file.text).catch(() => undefined)
    if (text !== undefined) {
      next = { ...file, existed: true, text }
      fileMatches = true
    }
  }
  let leftOut = 0
  if (deps.azure !== undefined) {
    const { config, fetch, sleep } = deps.azure
    const bounded = (save: Promise<boolean>): Promise<boolean> =>
      Promise.race([save, sleep(AZURE_SAVE_TIMEOUT_MS).then(() => false)]).catch(() => false)
    leftOut = leftOutOfAzure(personal) + leftOutOfAzure(project)
    await Promise.all([
      bounded(azureSave(fetch, config, 'personal', personal)),
      bounded(partitionFor(deps).then(async partition => {
        const saved = await azureSave(fetch, config, partition, project)
        // Recorded only when Azure and the file both hold this memory, so every id in the
        // record is in the file: a fact missing from it later was removed from the file.
        // After a failed read or write the previous record stays.
        if (saved && fileMatches) {
          // What this checkout held when Azure last had all of it: the next load's cutoff.
          const ids = project.facts.filter(f => f.source !== 'env').map(f => f.id)
          await saveLastSync(deps.kv, partition, deps.root, { at: deps.now(), ids }).catch(() => undefined)
        }
        return saved
      })),
    ])
  }
  return { file: next, leftOut }
}

const place = (personal: Memory, project: Memory, facts: readonly Fact[]): { personal: Memory; project: Memory } => {
  let p = personal
  let j = project
  for (const f of facts) {
    if (f.scope === 'personal') {
      p = mergeFact(p, f)
    } else {
      j = mergeFact(j, f)
    }
  }
  return { personal: p, project: j }
}

export const learn = async (deps: MemoryDeps, prompt: string, answer: string, personal: Memory, project: Memory): Promise<{ personal: Memory; project: Memory; fresh: string[] }> => {
  const result = await runReader(deps.complete, prompt, answer, deps.now())
  if (result.suggested.length > 0) {
    await addSuggested(deps.kv, result.suggested).catch(() => undefined)
  }
  const placed = place(personal, project, result.facts)
  const kept = new Set([...placed.personal.facts, ...placed.project.facts].map(f => f.id))
  return { ...placed, fresh: result.facts.map(f => f.id).filter(id => kept.has(id)) }
}

// Merges only the freshly learned facts into the CURRENT memory, so a forget or another turn
// that finished while the reader was running is kept.
export const applyLearned = (
  current: { personal: Memory; project: Memory },
  learned: { personal: Memory; project: Memory; fresh: readonly string[] },
): { personal: Memory; project: Memory } => {
  const fresh = new Set(learned.fresh)
  let personal = current.personal
  let project = current.project
  for (const f of learned.personal.facts) {
    if (fresh.has(f.id)) {
      personal = mergeFact(personal, f)
    }
  }
  for (const f of learned.project.facts) {
    if (fresh.has(f.id)) {
      project = mergeFact(project, f)
    }
  }
  return { personal, project }
}

export const forgetMatching = (personal: Memory, project: Memory, text: string, now: number): { personal: Memory; project: Memory; removed: Fact[] } => {
  const needle = text.trim().toLowerCase()
  // Under 3 characters a needle matches almost everything, so it matches nothing.
  const hits = (m: Memory) => m.facts.filter(f => f.source !== 'env' && needle.length >= 3 && `${f.subject} ${f.text}`.toLowerCase().includes(needle))
  const removed = [...hits(personal), ...hits(project)]
  const drop = (m: Memory) => hits(m).reduce((acc, f) => deleteFact(acc, f.id, now), m)
  return { personal: drop(personal), project: drop(project), removed }
}

export const forgetById = (personal: Memory, project: Memory, id: string, now: number): { personal: Memory; project: Memory } => {
  const drop = (m: Memory) => (m.facts.some(f => f.id === id && f.source !== 'env') ? deleteFact(m, id, now) : m)
  return { personal: drop(personal), project: drop(project) }
}

export const rememberText = async (deps: MemoryDeps, text: string, personal: Memory, project: Memory): Promise<{ personal: Memory; project: Memory; added: Fact[] }> => {
  if (containsSecret(text)) {
    return { personal, project, added: [] }
  }
  const now = deps.now()
  const read = await runReader(deps.complete, `Remember this about me: ${text}`, '', now, true)
  let added: Fact[] = read.facts.map(f => ({ ...f, source: 'user' as const }))
  if (added.length === 0) {
    const subject = text.split(/\s+/).filter(w => w !== '').slice(0, 4).join(' ').replace(/:/g, '').trim().slice(0, 60).trim()
    const fallback = toFact({ kind: 'constraint', scope: 'personal', subject, text: text.trim().slice(0, 160) }, 'user', now)
    added = fallback === undefined ? [] : [fallback]
  }
  return { ...place(personal, project, added), added }
}
