import type { Fact, Memory } from '../../types'
import { scanEnvironment } from './env-scan'
import { containsSecret, deleteFact, mergeFact, mergeMemories, normaliseSubject, replaceEnvFacts, toFact } from './facts'
import { runReader } from './reader'
import type { Complete } from './reader'
import {
  addSuggested, azureLoad, azureSave, loadPersonal, loadProject, loadSuggested, projectPartition, saveProject, savePersonal,
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
export type Loaded = { personal: Memory; project: Memory; unreadable: number; fileExisted: boolean; readFailed?: boolean }

const AZURE_TIMEOUT_MS = 2000
const AZURE_SAVE_TIMEOUT_MS = 5000

const partitionFor = async (deps: MemoryDeps): Promise<string> =>
  projectPartition(deps.root, await deps.files.read(`${deps.root}/.git/config`).catch(() => undefined))

export const loadAll = async (deps: MemoryDeps): Promise<Loaded> => {
  const now = deps.now()
  let personal = await loadPersonal(deps.kv)
  const file = await loadProject(deps.files, deps.root)
  let project = file.memory
  if (deps.azure !== undefined) {
    const { config, fetch, sleep } = deps.azure
    const [remotePersonal, remoteProject] = await Promise.all([
      azureLoad(fetch, config, 'personal', AZURE_TIMEOUT_MS, sleep),
      partitionFor(deps).then(partition => azureLoad(fetch, config, partition, AZURE_TIMEOUT_MS, sleep)),
    ])
    if (remotePersonal !== undefined) {
      personal = mergeMemories(personal, remotePersonal)
    }
    if (remoteProject !== undefined) {
      project = mergeMemories(project, remoteProject)
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
  return { personal, project, unreadable: file.unreadable, fileExisted: file.existed, readFailed: file.readFailed }
}

export const persistAll = async (deps: MemoryDeps, options: MemoryOptions, personal: Memory, project: Memory, fileExisted: boolean, readFailed = false): Promise<void> => {
  await savePersonal(deps.kv, personal).catch(() => undefined)
  const worthAFile = fileExisted || project.facts.some(f => f.source !== 'env')
  if (worthAFile && !readFailed) {
    await saveProject(deps.files, deps.root, project, options.projectFile).catch(() => undefined)
  }
  if (deps.azure !== undefined) {
    const { config, fetch, sleep } = deps.azure
    const bounded = (save: Promise<boolean>): Promise<boolean> =>
      Promise.race([save, sleep(AZURE_SAVE_TIMEOUT_MS).then(() => false)]).catch(() => false)
    await Promise.all([
      bounded(azureSave(fetch, config, 'personal', personal)),
      bounded(partitionFor(deps).then(partition => azureSave(fetch, config, partition, project))),
    ])
  }
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

export const forgetMatching = (personal: Memory, project: Memory, text: string, now: number): { personal: Memory; project: Memory; removed: Fact[] } => {
  const needle = text.trim().toLowerCase()
  const hits = (m: Memory) => m.facts.filter(f => f.source !== 'env' && needle !== '' && `${f.subject} ${f.text}`.toLowerCase().includes(needle))
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
