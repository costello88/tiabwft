import { expect, test } from 'claude-code/testing'

import type { Memory } from '../../types'
import { factId } from './facts'
import {
  addSuggested, azureLoad, azureSave, lastSyncKey, leftOutOfAzure, loadLastSync, loadPersonal, loadProject, loadSuggested, projectPartition,
  PROJECT_FILE, readGitConfig, saveLastSync, saveProject, savePersonal,
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
  expect(await loadProject(files, '/repo')).toEqual({ memory: { facts: [], tombstones: {} }, unreadable: 0, kept: [], existed: false })
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

test('suggested names are normalised, unique and capped at 300', async () => {
  const { kv } = memKV()
  await addSuggested(kv, ['HubSpot', 'hubspot', 'Slack'])
  expect(await loadSuggested(kv)).toEqual(['hubspot', 'slack'])
  await addSuggested(kv, Array.from({ length: 320 }, (_, i) => `tool ${i}`))
  const all = await loadSuggested(kv)
  expect(all.length).toBe(300)
  expect(all.at(-1)).toBe('tool 319')
})

test('projectPartition prefers the GitHub repo, else the folder name plus a hash of the root', async () => {
  expect(await projectPartition('C:\\Users\\me\\crm', '[remote "origin"]\n\turl = https://github.com/costello88/crm.git\n')).toBe('project:costello88/crm')
  expect(await projectPartition('/home/me/shop', '[remote "origin"]\n\turl = git@github.com:me/shop\n')).toBe('project:me/shop')
  expect(await projectPartition('/home/me/shop')).toMatch(/^project:shop-[0-9a-f]{8}$/)
  expect(await projectPartition('/home/me/shop')).toBe(await projectPartition('/home/me/shop'))
})

const remote = (url: string, name = 'origin'): string => `[core]\n\tbare = false\n[remote "${name}"]\n\turl = ${url}\n\tfetch = +refs/heads/*:refs/remotes/${name}/*\n`
const AZURE_PARTITION = /^(personal|project:[\w./-]{1,120})$/

test('projectPartition names any git host: host/owner/repo, lowercased, user, password and port dropped', async () => {
  expect(await projectPartition('/a', remote('https://gitlab.com/Group/Sub-Group/My.Repo.git'))).toBe('project:gitlab.com/group/sub-group/my.repo')
  expect(await projectPartition('/a', remote('git@gitlab.example.com:team/api.git'))).toBe('project:gitlab.example.com/team/api')
  expect(await projectPartition('/a', remote('ssh://git@git.example.com:2222/team/api.git'))).toBe('project:git.example.com/team/api')
  expect(await projectPartition('/a', remote('https://user:s3cret@dev.azure.com/org/proj/_git/repo'))).toBe('project:dev.azure.com/org/proj/_git/repo')
  // github.com keeps the old owner/repo shape; https and ssh give the same partition.
  expect(await projectPartition('/a', remote('https://github.com/Costello88/CRM.git'))).toBe('project:costello88/crm')
  expect(await projectPartition('/a', remote('git@github.com:costello88/crm.git'))).toBe('project:costello88/crm')
  // origin wins over a remote listed before it.
  expect(await projectPartition('/a', remote('https://gitlab.com/fork/api') + remote('https://gitlab.com/team/api'))).toBe('project:gitlab.com/fork/api')
  expect(await projectPartition('/a', remote('https://gitlab.com/up/api', 'upstream') + remote('https://gitlab.com/team/api'))).toBe('project:gitlab.com/team/api')
  for (const url of ['https://gitlab.com/Group/Sub-Group/My.Repo.git', 'https://user:s3cret@dev.azure.com/org/proj/_git/repo', `https://h.example.com/${'x'.repeat(200)}`]) {
    const p = await projectPartition('/a', remote(url))
    expect(AZURE_PARTITION.test(p)).toBe(true)
    expect(p.includes('s3cret')).toBe(false)
  }
})

test('projectPartition: a local or file remote falls back to the folder name and a hash', async () => {
  for (const url of ['C:\\src\\shared.git', '/srv/git/shared.git', 'file:///srv/git/shared.git', '../shared']) {
    expect(await projectPartition('/home/me/shop', remote(url))).toMatch(/^project:shop-[0-9a-f]{8}$/)
  }
})

test('projectPartition normalises the root before hashing', async () => {
  const p = await projectPartition('C:\\Users\\me\\shop')
  expect(await projectPartition('c:\\Users\\me\\shop\\')).toBe(p)
  expect(await projectPartition('C:/Users/me/shop/')).toBe(p)
  expect(await projectPartition('C:\\Users\\me\\Shop')).not.toBe(p)
})

test('leftOutOfAzure counts the facts past the cap', async () => {
  const facts = Array.from({ length: 460 }, (_, i) => ({ ...one.facts[0]!, id: factId('decision', `tool ${i}`), subject: `tool ${i}` }))
  expect(leftOutOfAzure({ facts, tombstones: {} })).toBe(10)
  expect(leftOutOfAzure(one)).toBe(0)
})

test('the last sync round-trips per partition and checkout, and rejects bad values', async () => {
  const { kv, data } = memKV()
  await saveLastSync(kv, 'project:a/b', '/work/one', { at: 5, ids: ['stack:x'] })
  expect(await loadLastSync(kv, 'project:a/b', '/work/one')).toEqual({ at: 5, ids: ['stack:x'] })
  // The same root written another way is the same checkout.
  expect(await loadLastSync(kv, 'project:a/b', '/work/one/')).toEqual({ at: 5, ids: ['stack:x'] })
  // Another clone of the same repo, or another repo in the same folder: no record.
  expect(await loadLastSync(kv, 'project:a/b', '/work/two')).toBeUndefined()
  expect(await loadLastSync(kv, 'project:c/d', '/work/one')).toBeUndefined()
  expect([...data.keys()]).toEqual([await lastSyncKey('project:a/b', '/work/one')])
  expect(await lastSyncKey('project:a/b', '/work/one')).toMatch(/^memory\.lastSync\.project:a\/b@[0-9a-f]{8}$/)
  data.set(await lastSyncKey('project:c/d', '/work/one'), { at: 'soon', ids: [] })
  expect(await loadLastSync(kv, 'project:c/d', '/work/one')).toBeUndefined()
})

const CONFIG = '[core]\n\tbare = false\n[remote "origin"]\n\turl = git@github.com:Costello88/shop.git\n'

test('readGitConfig follows a worktree .git file to the shared config', async () => {
  const { files } = memFiles({
    '/src/shop/.git/config': CONFIG,
    // git worktree add: the gitdir has a commondir file pointing back at the repo's .git.
    '/src/shop-review/.git': 'gitdir: /src/shop/.git/worktrees/shop-review\n',
    '/src/shop/.git/worktrees/shop-review/commondir': '../..\n',
    // A worktree whose gitdir has no commondir: <repo>/.git/worktrees/<name> means <repo>/.git.
    '/src/shop-fix/.git': 'gitdir: ../shop/.git/worktrees/shop-fix',
    // Windows paths, with the gitdir written with backslashes.
    'C:/code/shop/.git/config': CONFIG,
    'C:/code/shop-win/.git': 'gitdir: C:\\code\\shop\\.git\\worktrees\\shop-win\r\n',
    // A submodule: its own git dir holds its own config.
    '/src/shop/lib/.git': 'gitdir: ../.git/modules/lib\n',
    '/src/shop/.git/modules/lib/config': '[remote "origin"]\n\turl = https://gitlab.com/team/lib.git\n',
    '/src/broken/.git': 'not a pointer\n',
  })
  expect(await readGitConfig(files, '/src/shop')).toBe(CONFIG)
  expect(await readGitConfig(files, '/src/shop-review')).toBe(CONFIG)
  expect(await readGitConfig(files, '/src/shop-fix/')).toBe(CONFIG)
  expect(await readGitConfig(files, 'C:\\code\\shop-win')).toBe(CONFIG)
  expect(await readGitConfig(files, '/src/shop/lib')).toContain('gitlab.com/team/lib')
  expect(await readGitConfig(files, '/src/broken')).toBeUndefined()
  expect(await readGitConfig(files, '/src/none')).toBeUndefined()
  // So every worktree of the repo lands in the repo's partition.
  const main = await projectPartition('/src/shop', await readGitConfig(files, '/src/shop'))
  expect(main).toBe('project:costello88/shop')
  expect(await projectPartition('/src/shop-review', await readGitConfig(files, '/src/shop-review'))).toBe(main)
  expect(await projectPartition('/src/shop-fix', await readGitConfig(files, '/src/shop-fix'))).toBe(main)
})

test('projectPartition: same-named folders differ, and spaces or other characters never reach the partition', async () => {
  const a = await projectPartition('/work/client-a/api')
  const b = await projectPartition('/work/client-b/api')
  expect(a).not.toBe(b)
  const spaced = await projectPartition('C:\\Users\\me\\My Project é')
  expect(spaced).toMatch(/^project:My_Project__-[0-9a-f]{8}$/)
  expect(spaced.includes(' ')).toBe(false)
  // The Azure function's own partition rule.
  for (const p of [a, b, spaced, await projectPartition(`/x/${'n'.repeat(100)}`)]) {
    expect(/^(personal|project:[\w./-]{1,120})$/.test(p)).toBe(true)
  }
  expect(await projectPartition(`/x/${'n'.repeat(100)}`)).toMatch(/^project:n{60}-[0-9a-f]{8}$/)
})

test('azureSave sends at most the 450 newest facts', async () => {
  const facts = Array.from({ length: 500 }, (_, i) => ({ ...one.facts[0]!, id: factId('decision', `tool ${i}`), subject: `tool ${i}`, lastSeen: i }))
  let body = ''
  await azureSave(async (_url, init) => { body = init?.body ?? ''; return { ok: true, status: 204, text: '' } }, { url: 'https://x', key: 'k' }, 'project:a/b', { facts, tombstones: {} })
  const sent = (JSON.parse(body) as { facts: { lastSeen: number }[] }).facts
  expect(sent.length).toBe(450)
  expect(Math.min(...sent.map(f => f.lastSeen))).toBe(50)
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
