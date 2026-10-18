const crypto = require('crypto')
const { app } = require('@azure/functions')
const { TableClient } = require('@azure/data-tables')

const TABLE = 'tiabwftmemory'
const PARTITION = /^(personal|project:[\w./-]{1,120})$/
const MAX_BODY = 256 * 1024
const MAX_ITEMS = 500
const MAX_ID = 200
const MAX_FACT = 4096
let ready

// Only remember the table as ready once it exists (created now, or 409 already exists).
const table = () => {
  const client = TableClient.fromConnectionString(process.env.TIABWFT_STORAGE, TABLE)
  if (!ready) {
    ready = client.createTable().then(
      () => undefined,
      error => {
        if (error?.statusCode !== 409) {
          ready = undefined
          throw error
        }
      },
    )
  }
  return ready.then(() => client)
}

// Table keys may not contain / \ # ?, so both keys are URI-encoded.
const pk = partition => encodeURIComponent(partition)
const rk = id => encodeURIComponent(id)

const digest = value => crypto.createHash('sha256').update(String(value)).digest()
const keyOk = provided => {
  const expected = process.env.TIABWFT_KEY
  if (!expected) return false
  return crypto.timingSafeEqual(digest(provided ?? ''), digest(expected))
}

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
// Table Storage limits a RowKey to 1 KiB; tombstone keys add a "t:" prefix.
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= MAX_ID && rk(id).length <= 400

// Returns a short reason string, or undefined when the whole body is valid.
const validate = body => {
  if (!isPlainObject(body)) return 'body'
  if (!Array.isArray(body.facts) || body.facts.length > MAX_ITEMS) return 'facts'
  if (!isPlainObject(body.tombstones)) return 'tombstones'
  const entries = Object.entries(body.tombstones)
  if (entries.length > MAX_ITEMS) return 'tombstones'
  for (const fact of body.facts) {
    if (!isPlainObject(fact) || !validId(fact.id) || !Number.isFinite(fact.lastSeen)) return 'fact'
    if (Buffer.byteLength(JSON.stringify(fact)) > MAX_FACT) return 'fact size'
  }
  for (const [id, deletedAt] of entries) {
    if (!validId(id) || !Number.isFinite(deletedAt)) return 'tombstone'
  }
  return undefined
}

const readAll = async (client, partition) => {
  const facts = []
  const tombstones = {}
  const filter = `PartitionKey eq '${pk(partition).replace(/'/g, "''")}'`
  for await (const row of client.listEntities({ queryOptions: { filter } })) {
    if (row.kind === 'tombstone') {
      try {
        tombstones[decodeURIComponent(row.rowKey.slice(2))] = row.deletedAt
      } catch {
        // skip a malformed row
      }
    } else {
      try {
        facts.push(JSON.parse(row.fact))
      } catch {
        // skip a corrupt row instead of failing the whole partition
      }
    }
  }
  return { facts, tombstones }
}

app.http('memory', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      if (!keyOk(request.headers.get('x-tiabwft-key'))) {
        return { status: 401 }
      }
      const partition = request.query.get('partition') ?? ''
      if (!PARTITION.test(partition)) {
        return { status: 400 }
      }

      let body
      if (request.method === 'PUT') {
        const declared = Number(request.headers.get('content-length'))
        if (Number.isFinite(declared) && declared > MAX_BODY) return { status: 413 }
        const text = await request.text()
        if (text.length > MAX_BODY) return { status: 413 }
        try {
          body = JSON.parse(text)
        } catch {
          return { status: 400 }
        }
        if (validate(body)) return { status: 400 }
      }

      const client = await table()
      const current = await readAll(client, partition)
      if (request.method === 'GET') {
        return { status: 200, jsonBody: current }
      }

      // Tombstones first, so a fact and its tombstone in one PUT never leave the fact behind.
      const known = new Map(current.facts.map(f => [f.id, f]))
      const tombstones = { ...current.tombstones }
      for (const [id, deletedAt] of Object.entries(body.tombstones)) {
        if ((tombstones[id] ?? -Infinity) >= deletedAt) continue
        tombstones[id] = deletedAt
        await client.upsertEntity({ partitionKey: pk(partition), rowKey: `t:${rk(id)}`, kind: 'tombstone', deletedAt }, 'Replace')
        const stored = known.get(id)
        if (stored && stored.lastSeen <= deletedAt) {
          known.delete(id)
          await client.deleteEntity(pk(partition), rk(id)).catch(() => undefined)
        }
      }
      for (const fact of body.facts) {
        if ((tombstones[fact.id] ?? -Infinity) >= fact.lastSeen) continue
        const seen = known.get(fact.id)
        if (seen && seen.lastSeen >= fact.lastSeen) continue
        await client.upsertEntity({ partitionKey: pk(partition), rowKey: rk(fact.id), kind: 'fact', fact: JSON.stringify(fact), lastSeen: fact.lastSeen }, 'Replace')
      }
      return { status: 204 }
    } catch (error) {
      // Short message only: never log the key or the body.
      context?.error?.(`memory request failed: ${error?.name ?? 'Error'}`)
      return { status: 500 }
    }
  },
})
