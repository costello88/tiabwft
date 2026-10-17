import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const here = path.dirname(fileURLToPath(import.meta.url))
process.env.TIABWFT_KEY = 'secret-key'
process.env.TIABWFT_STORAGE = 'mock'

const rows = new Map()
let writes = 0
let handler
const tableClient = {
  createTable: async () => undefined,
  async *listEntities() { for (const r of [...rows.values()]) yield r },
  upsertEntity: async e => { writes++; rows.set(`${e.partitionKey}|${e.rowKey}`, { ...e }) },
  deleteEntity: async (p, r) => { rows.delete(`${p}|${r}`) },
}
const origLoad = Module._load
Module._load = function (request, ...rest) {
  if (request === '@azure/functions') return { app: { http: (_n, o) => { handler = o.handler } } }
  if (request === '@azure/data-tables') return { TableClient: { fromConnectionString: () => tableClient } }
  return origLoad.call(this, request, ...rest)
}
require(path.join(here, '../src/functions/memory.js'))
Module._load = origLoad

const call = async ({ method = 'GET', key = 'secret-key', partition = 'personal', body } = {}) => {
  const headers = new Map()
  if (key !== null) headers.set('x-tiabwft-key', key)
  const request = {
    method,
    headers: { get: k => headers.get(k) ?? null },
    query: { get: k => (k === 'partition' ? partition : null) },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
  return handler(request, { error: () => undefined })
}

let pass = 0
let fail = 0
const check = (name, ok) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`) }
const reset = () => { rows.clear(); writes = 0 }

check('wrong key -> 401', (await call({ key: 'nope' })).status === 401)
check('missing key -> 401', (await call({ key: null })).status === 401)
check('bad partition -> 400', (await call({ partition: 'x/../y' })).status === 400)
check('folder partition with a hash -> 200', (await call({ partition: 'project:My_Project__-1a2b3c4d' })).status === 200)

reset()
check('tombstones null -> 400, nothing written', (await call({ method: 'PUT', body: { facts: [], tombstones: null } })).status === 400 && writes === 0)
check('bad JSON -> 400', (await call({ method: 'PUT', body: '{nope' })).status === 400)
check('invalid fact -> 400, nothing written', (await call({ method: 'PUT', body: { facts: [{ id: 'a', lastSeen: 1 }, { id: 'b', lastSeen: 'x' }], tombstones: {} } })).status === 400 && writes === 0)
check('oversized body -> 413', (await call({ method: 'PUT', body: 'x'.repeat(300000) })).status === 413)

reset()
const r = await call({ method: 'PUT', body: { facts: [{ id: 'a', lastSeen: 5 }], tombstones: { a: 5 } } })
const g = (await call()).jsonBody
check('fact + tombstone in one PUT -> fact not stored', r.status === 204 && g.facts.length === 0 && g.tombstones.a === 5)

reset()
await call({ method: 'PUT', body: { facts: [{ id: 'a', lastSeen: 10, v: 'new' }], tombstones: {} } })
await call({ method: 'PUT', body: { facts: [{ id: 'a', lastSeen: 3, v: 'old' }], tombstones: {} } })
const g2 = (await call()).jsonBody
check('older fact does not overwrite', g2.facts.length === 1 && g2.facts[0].v === 'new')

rows.set('personal|bad', { partitionKey: 'personal', rowKey: 'bad', kind: 'fact', fact: '{corrupt' })
const g3 = await call()
check('corrupt row skipped on GET', g3.status === 200 && g3.jsonBody.facts.length === 1)

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
