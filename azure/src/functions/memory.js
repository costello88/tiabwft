const { app } = require('@azure/functions')
const { TableClient } = require('@azure/data-tables')

const TABLE = 'tiabwftmemory'
const PARTITION = /^(personal|project:[\w./-]{1,120})$/
let ready

const table = () => {
  const client = TableClient.fromConnectionString(process.env.TIABWFT_STORAGE, TABLE)
  ready ??= client.createTable().catch(() => undefined)
  return ready.then(() => client)
}

// Table keys may not contain / \ # ?, so both keys are URI-encoded.
const pk = partition => encodeURIComponent(partition)
const rk = id => encodeURIComponent(id)

const readAll = async (client, partition) => {
  const facts = []
  const tombstones = {}
  for await (const row of client.listEntities({ queryOptions: { filter: `PartitionKey eq '${pk(partition)}'` } })) {
    if (row.kind === 'tombstone') {
      tombstones[decodeURIComponent(row.rowKey.slice(2))] = row.deletedAt
    } else {
      facts.push(JSON.parse(row.fact))
    }
  }
  return { facts, tombstones }
}

app.http('memory', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  handler: async request => {
    if (!process.env.TIABWFT_KEY || request.headers.get('x-tiabwft-key') !== process.env.TIABWFT_KEY) {
      return { status: 401 }
    }
    const partition = request.query.get('partition') ?? ''
    if (!PARTITION.test(partition)) {
      return { status: 400 }
    }
    const client = await table()
    const current = await readAll(client, partition)
    if (request.method === 'GET') {
      return { status: 200, jsonBody: current }
    }
    const body = await request.json().catch(() => null)
    if (!body || !Array.isArray(body.facts) || typeof body.tombstones !== 'object') {
      return { status: 400 }
    }
    const known = new Map(current.facts.map(f => [f.id, f]))
    for (const fact of body.facts.slice(0, 500)) {
      if (typeof fact?.id !== 'string' || typeof fact.lastSeen !== 'number') continue
      const seen = known.get(fact.id)
      if (seen && seen.lastSeen >= fact.lastSeen) continue
      if ((current.tombstones[fact.id] ?? -1) >= fact.lastSeen) continue
      await client.upsertEntity({ partitionKey: pk(partition), rowKey: rk(fact.id), kind: 'fact', fact: JSON.stringify(fact), lastSeen: fact.lastSeen }, 'Replace')
    }
    for (const [id, deletedAt] of Object.entries(body.tombstones).slice(0, 500)) {
      if (typeof deletedAt !== 'number' || (current.tombstones[id] ?? -1) >= deletedAt) continue
      await client.upsertEntity({ partitionKey: pk(partition), rowKey: `t:${rk(id)}`, kind: 'tombstone', deletedAt }, 'Replace')
      const fact = known.get(id)
      if (fact && fact.lastSeen <= deletedAt) {
        await client.deleteEntity(pk(partition), rk(id)).catch(() => undefined)
      }
    }
    return { status: 204 }
  },
})
