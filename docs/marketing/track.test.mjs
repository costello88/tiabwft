// Tests for track.mjs with a fake gh and an in-memory file system: no network, no real files.
// Run: node marketing/track.test.mjs
import assert from 'node:assert/strict'
import { join } from 'node:path'

import { COLUMNS, formatCsv, parseCsv, previousRow, run, summary, toRow, upsert } from './track.mjs'

let passed = 0
let failed = 0
const test = (name, fn) => {
  try {
    fn()
    passed++
    console.log(`PASS ${name}`)
  } catch (error) {
    failed++
    console.log(`FAIL ${name}\n  ${error.message}`)
  }
}

const REPO = 'costello88/tiabwft'

// A fake `gh api`: returns canned JSON per path, or throws like gh does on a 403.
const fakeApi = ({ stars = 10, traffic = true } = {}) => {
  const calls = []
  const api = path => {
    calls.push(path)
    if (path === `repos/${REPO}`) {
      return { stargazers_count: stars, forks_count: 2, watchers_count: stars, subscribers_count: 3, open_issues_count: 4 }
    }
    if (!traffic) throw new Error('gh: Must have push access to repository (HTTP 403)')
    if (path.endsWith('/traffic/views')) return { count: 120, uniques: 40, views: [{ timestamp: '2026-10-18T00:00:00Z', count: 9, uniques: 5 }] }
    if (path.endsWith('/traffic/clones')) return { count: 15, uniques: 7, clones: [] }
    if (path.endsWith('/traffic/popular/referrers')) {
      return [{ referrer: 'github.com', count: 5, uniques: 3 }, { referrer: 'news.ycombinator.com', count: 50, uniques: 30 }]
    }
    throw new Error(`unexpected path ${path}`)
  }
  return { api, calls }
}

// A tiny in-memory fs with the four calls run() uses.
const memFs = (initial = {}) => {
  const files = new Map(Object.entries(initial))
  return {
    files,
    existsSync: p => files.has(p),
    readFileSync: p => files.get(p),
    writeFileSync: (p, t) => files.set(p, t),
    mkdirSync: () => undefined,
  }
}

const CSV = join('growth', 'metrics.csv')

test('toRow maps repo info and traffic, with the top referrer by count', () => {
  const { api } = fakeApi()
  const row = toRow('2026-10-18', { info: api(`repos/${REPO}`), traffic: { views: api('x/traffic/views'), clones: api('x/traffic/clones'), referrers: api('x/traffic/popular/referrers') } })
  assert.deepEqual(row, {
    date: '2026-10-18', stars: 10, forks: 2, watchers: 3, open_issues: 4,
    views_14d: 120, unique_views_14d: 40, clones_14d: 15, unique_clones_14d: 7, top_referrer: 'news.ycombinator.com',
  })
})

test('first run writes a header, one row and the traffic JSON', () => {
  const fs = memFs()
  const { api } = fakeApi()
  const { text } = run({ csvPath: CSV, repo: REPO, date: '2026-10-18', api, fs })
  const lines = fs.files.get(CSV).trim().split('\n')
  assert.equal(lines[0], COLUMNS.join(','))
  assert.equal(lines.length, 2)
  assert.equal(lines[1], '2026-10-18,10,2,3,4,120,40,15,7,news.ycombinator.com')
  const traffic = JSON.parse(fs.files.get(join('growth', 'traffic-2026-10-18.json')))
  assert.equal(traffic.views.count, 120)
  assert.equal(traffic.referrers.length, 2)
  assert.match(text, /\(first row\)/)
  assert.equal(text.split('\n').length, 5)
})

test('running twice on the same day replaces that day, never duplicates it', () => {
  const fs = memFs()
  run({ csvPath: CSV, repo: REPO, date: '2026-10-18', api: fakeApi({ stars: 10 }).api, fs })
  run({ csvPath: CSV, repo: REPO, date: '2026-10-18', api: fakeApi({ stars: 12 }).api, fs })
  const rows = parseCsv(fs.files.get(CSV))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].stars, '12')
})

test('a new day appends and the summary shows the change since the previous row', () => {
  const fs = memFs()
  run({ csvPath: CSV, repo: REPO, date: '2026-10-18', api: fakeApi({ stars: 10 }).api, fs })
  const { text } = run({ csvPath: CSV, repo: REPO, date: '2026-10-19', api: fakeApi({ stars: 25 }).api, fs })
  const rows = parseCsv(fs.files.get(CSV))
  assert.deepEqual(rows.map(r => r.date), ['2026-10-18', '2026-10-19'])
  const lines = text.split('\n')
  assert.equal(lines.length, 5)
  assert.match(lines[0], /2026-10-19, compared with 2026-10-18/)
  assert.equal(lines[1], 'Stars: 25 (+15)')
})

test('a rerun of an earlier day compares with the day before it and keeps rows sorted', () => {
  const fs = memFs()
  for (const [date, stars] of [['2026-10-18', 1], ['2026-10-20', 5]]) {
    run({ csvPath: CSV, repo: REPO, date, api: fakeApi({ stars }).api, fs })
  }
  const { prev } = run({ csvPath: CSV, repo: REPO, date: '2026-10-19', api: fakeApi({ stars: 3 }).api, fs })
  assert.equal(prev.date, '2026-10-18')
  assert.deepEqual(parseCsv(fs.files.get(CSV)).map(r => r.date), ['2026-10-18', '2026-10-19', '2026-10-20'])
})

test('without push access the traffic columns stay empty and no traffic JSON is written', () => {
  const fs = memFs()
  const { text } = run({ csvPath: CSV, repo: REPO, date: '2026-10-18', api: fakeApi({ traffic: false }).api, fs })
  assert.equal(fs.files.get(CSV).trim().split('\n')[1], '2026-10-18,10,2,3,4,,,,,')
  assert.equal(fs.files.has(join('growth', 'traffic-2026-10-18.json')), false)
  assert.match(text, /Traffic: not available/)
})

test('dry run reads but writes nothing', () => {
  const fs = memFs()
  run({ csvPath: CSV, repo: REPO, date: '2026-10-18', api: fakeApi().api, fs, dryRun: true })
  assert.equal(fs.files.size, 0)
})

test('a failing repo call fails the run (gh missing or not logged in)', () => {
  const api = () => {
    throw new Error('gh: not logged in')
  }
  assert.throws(() => run({ csvPath: CSV, repo: REPO, date: '2026-10-18', api, fs: memFs() }), /not logged in/)
})

test('CSV round-trips quoted values with commas and quotes', () => {
  const row = { date: '2026-10-18', stars: 1, forks: 0, watchers: 0, open_issues: 0, views_14d: '', unique_views_14d: '', clones_14d: '', unique_clones_14d: '', top_referrer: 'a, "b"' }
  const back = parseCsv(formatCsv([row]))
  assert.equal(back[0].top_referrer, 'a, "b"')
  assert.equal(back[0].stars, '1')
})

test('parseCsv accepts Windows line endings and a trailing blank line', () => {
  const rows = parseCsv(`${COLUMNS.join(',')}\r\n2026-10-18,1,0,0,0,,,,,\r\n\r\n`)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].date, '2026-10-18')
})

test('upsert and previousRow work on unsorted input', () => {
  const rows = upsert([{ date: '2026-10-20' }, { date: '2026-10-18' }], { date: '2026-10-19' })
  assert.deepEqual(rows.map(r => r.date), ['2026-10-18', '2026-10-19', '2026-10-20'])
  assert.equal(previousRow(rows, '2026-10-18'), undefined)
  assert.equal(previousRow(rows, '2026-10-21').date, '2026-10-20')
})

test('summary shows negative changes', () => {
  const prev = { date: '2026-10-18', stars: '10', forks: '2', watchers: '3', open_issues: '6', views_14d: '' }
  const row = { date: '2026-10-19', stars: 10, forks: 2, watchers: 3, open_issues: 4, views_14d: '', top_referrer: '' }
  const lines = summary(row, prev).split('\n')
  assert.equal(lines[1], 'Stars: 10 (+0)')
  assert.equal(lines[3], 'Open issues and PRs: 4 (-2)')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
