import { expect, test } from 'claude-code/testing'

import type { Memory } from '../../types'
import { factId } from './facts'
import {
  addSuggested, azureLoad, azureSave, loadPersonal, loadProject, loadSuggested, projectPartition,
  PROJECT_FILE, saveProject, savePersonal,
} from './store'

const memFiles = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial))
  return {
    data,
    files: {
      exists: async (p: string) => data.has(p),
      read: async (p: string) => { const t = data.get(p); if (t === undefined) throw new Error('missing'); return t },
      write: async (p: string, t: string) => { data.set(p, t) },
    },
  }
}
const memKV = () => {
  const data = new Map<string, unknown>()
  return { data, kv: { get: async (k: string) => data.get(k), set: async (k: string, v: unknown) => { data.set(k, v) } } }
}
const one: Memory = {
  facts: [{ id: factId('decision', 'Vercel'), kind: 'decision', scope: 'project', subject: 'Vercel', text: 'team knows it', source: 'user', firstSeen: 0, lastSeen: 0 }],
  tombstones: {},
}

test('personal memory round-trips through the store', async () => {
  const { kv } = memKV()
  await savePersonal(kv, one)
  expect(await loadPersonal(kv)).toEqual(one)
})

test('a missing project file loads empty; a saved one round-trips', async () => {
  const { files, data } = memFiles()
  expect(await loadProject(files, '/repo')).toEqual({ memory: { facts: [], tombstones: {} }, unreadable: 0, existed: false })
  await saveProject(files, '/repo', one, 'commit')
  expect(data.has(`/repo/${PROJECT_FILE}`)).toBe(true)
  expect((await loadProject(files, '/repo')).memory.facts.map(f => f.subject)).toEqual(['Vercel'])
  expect(data.has('/repo/.gitignore')).toBe(false)
})

test('ignore mode adds the memory folder to .gitignore once', async () => {
  const { files, data } = memFiles({ '/repo/.gitignore': 'node_modules/\n' })
  await saveProject(files, '/repo', one, 'ignore')
  await saveProject(files, '/repo', one, 'ignore')
  expect(data.get('/repo/.gitignore')).toBe('node_modules/\n.claude/tiabwft/\n')
})

test('suggested names are normalised, unique and capped at 50', async () => {
  const { kv } = memKV()
  await addSuggested(kv, ['HubSpot', 'hubspot', 'Slack'])
  expect(await loadSuggested(kv)).toEqual(['hubspot', 'slack'])
  await addSuggested(kv, Array.from({ length: 60 }, (_, i) => `tool ${i}`))
  const all = await loadSuggested(kv)
  expect(all.length).toBe(50)
  expect(all.at(-1)).toBe('tool 59')
})

test('projectPartition prefers the GitHub repo, else the folder name', async () => {
  expect(projectPartition('C:\\Users\\me\\crm', '[remote "origin"]\n\turl = https://github.com/costello88/crm.git\n')).toBe('project:costello88/crm')
  expect(projectPartition('/home/me/shop', '[remote "origin"]\n\turl = git@github.com:me/shop\n')).toBe('project:me/shop')
  expect(projectPartition('/home/me/shop')).toBe('project:shop')
})

test('azureLoad: success, timeout and bad responses', async () => {
  const cfg = { url: 'https://x.azurewebsites.net/api/memory', key: 'k' }
  const seen: string[] = []
  const ok = await azureLoad(async (url, init) => { seen.push(`${init?.method} ${url} ${init?.headers?.['x-tiabwft-key']}`); return { ok: true, status: 200, text: JSON.stringify(one) } }, cfg, 'project:a/b', 2000, () => new Promise(() => {}))
  expect(ok).toEqual(one)
  expect(seen).toEqual(['GET https://x.azurewebsites.net/api/memory?partition=project%3Aa%2Fb k'])
  expect(await azureLoad(() => new Promise(() => {}), cfg, 'personal', 2000, async () => {})).toBeUndefined()
  expect(await azureLoad(async () => ({ ok: false, status: 401, text: '' }), cfg, 'personal', 2000, () => new Promise(() => {}))).toBeUndefined()
  expect(await azureLoad(async () => { throw new Error('offline') }, cfg, 'personal', 2000, () => new Promise(() => {}))).toBeUndefined()
})

test('azureSave sends the memory with PUT and reports success', async () => {
  let body = ''
  const saved = await azureSave(async (_url, init) => { body = init?.body ?? ''; return { ok: init?.method === 'PUT', status: 200, text: '' } }, { url: 'https://x/api/memory', key: 'k' }, 'personal', one)
  expect(saved).toBe(true)
  expect(JSON.parse(body)).toEqual(one)
  expect(await azureSave(async () => { throw new Error('offline') }, { url: 'https://x', key: 'k' }, 'personal', one)).toBe(false)
})

test('azureSave sends only the 400 newest tombstones from the last 180 days', async () => {
  const day = 24 * 60 * 60 * 1000
  const now = 1000 * day
  const tombstones: Record<string, number> = { old: now - 200 * day }
  for (let i = 0; i < 450; i++) tombstones[`t${i}`] = now - i
  let body = ''
  await azureSave(async (_url, init) => { body = init?.body ?? ''; return { ok: true, status: 204, text: '' } }, { url: 'https://x', key: 'k' }, 'personal', { facts: [], tombstones }, now)
  const sent = JSON.parse(body) as { tombstones: Record<string, number> }
  expect(Object.keys(sent.tombstones).length).toBe(400)
  expect('old' in sent.tombstones).toBe(false)
  expect('t0' in sent.tombstones).toBe(true)
  expect('t449' in sent.tombstones).toBe(false)
})
