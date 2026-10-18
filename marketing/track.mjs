#!/usr/bin/env node
// Daily growth snapshot for the repo, through the gh CLI. No dependencies, read-only on GitHub.
//
// Usage: node marketing/track.mjs [csv-path] [--repo=owner/name] [--date=YYYY-MM-DD] [--dry-run]
//   csv-path   default ./growth/metrics.csv (growth/ is git-ignored: traffic data is private)
//   --repo     default costello88/tiabwft
//   --date     the row's date, default today (UTC)
//   --dry-run  print the summary, write nothing
//
// Appends one row per date to the CSV, replacing that date's row when run again the same day.
// Traffic (views, clones, referrers) needs push access and GitHub keeps only 14 days of it,
// so the raw JSON is saved next to the CSV as traffic-<date>.json. Without access those
// columns stay empty and the run still succeeds.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const COLUMNS = [
  'date', 'stars', 'forks', 'watchers', 'open_issues',
  'views_14d', 'unique_views_14d', 'clones_14d', 'unique_clones_14d', 'top_referrer',
]

// Runs `gh api <path>` and returns the parsed JSON. Throws when gh fails (no access, offline).
export const ghApi = path => JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))

// Reads the repo and, when permitted, its traffic. `api` is ghApi or a fake in tests.
export const collect = (api, repo) => {
  const info = api(`repos/${repo}`)
  const tryApi = path => {
    try {
      return api(path)
    } catch {
      return null
    }
  }
  return {
    info,
    traffic: {
      views: tryApi(`repos/${repo}/traffic/views`),
      clones: tryApi(`repos/${repo}/traffic/clones`),
      referrers: tryApi(`repos/${repo}/traffic/popular/referrers`),
    },
  }
}

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : '')

export const toRow = (date, { info, traffic }) => {
  const top = Array.isArray(traffic.referrers) && traffic.referrers.length > 0
    ? [...traffic.referrers].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))[0].referrer ?? ''
    : ''
  return {
    date,
    stars: num(info.stargazers_count),
    forks: num(info.forks_count),
    // watchers_count mirrors stars in the REST API; subscribers_count is the real watcher count.
    watchers: num(info.subscribers_count),
    open_issues: num(info.open_issues_count),
    views_14d: num(traffic.views?.count),
    unique_views_14d: num(traffic.views?.uniques),
    clones_14d: num(traffic.clones?.count),
    unique_clones_14d: num(traffic.clones?.uniques),
    top_referrer: top,
  }
}

const escape = v => {
  const s = String(v ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Splits one CSV line, honouring quotes. Our rows never contain line breaks.
const splitLine = line => {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        cur += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

export const parseCsv = text => {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return []
  const header = splitLine(lines[0])
  return lines.slice(1).map(line => {
    const cells = splitLine(line)
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']))
  })
}

export const formatCsv = rows =>
  [COLUMNS.join(','), ...rows.map(r => COLUMNS.map(c => escape(r[c])).join(','))].join('\n') + '\n'

// Replaces the row for row.date (idempotent per day) and keeps rows sorted by date.
export const upsert = (rows, row) =>
  [...rows.filter(r => r.date !== row.date), row].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

// The newest row before `date`, for the change since last time.
export const previousRow = (rows, date) => rows.filter(r => r.date < date).at(-1)

const delta = (now, before) => {
  if (now === '' || now === undefined || before === undefined || before === '') return ''
  const d = Number(now) - Number(before)
  return ` (${d >= 0 ? '+' : ''}${d})`
}

export const summary = (row, prev) => {
  const d = key => delta(row[key], prev?.[key])
  const traffic = row.views_14d === ''
    ? 'Traffic: not available (needs push access to the repo)'
    : `Traffic, last 14 days: ${row.views_14d}${d('views_14d')} views (${row.unique_views_14d} unique), ${row.clones_14d}${d('clones_14d')} clones (${row.unique_clones_14d} unique)`
  return [
    `Growth snapshot ${row.date}${prev ? `, compared with ${prev.date}` : ' (first row)'}`,
    `Stars: ${row.stars}${d('stars')}`,
    `Forks: ${row.forks}${d('forks')} | Watchers: ${row.watchers}${d('watchers')}`,
    `Open issues and PRs: ${row.open_issues}${d('open_issues')}`,
    `${traffic}${row.top_referrer ? ` | top referrer: ${row.top_referrer}` : ''}`,
  ].join('\n')
}

// One full run. `api` and `fs` are injectable so the test runs without network or real files.
export const run = ({ csvPath, repo, date, dryRun = false, api = ghApi, fs = { existsSync, mkdirSync, readFileSync, writeFileSync } }) => {
  const data = collect(api, repo)
  const row = toRow(date, data)
  const rows = fs.existsSync(csvPath) ? parseCsv(fs.readFileSync(csvPath, 'utf8')) : []
  const prev = previousRow(rows, date)
  const text = summary(row, prev)
  if (!dryRun) {
    const dir = dirname(csvPath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(csvPath, formatCsv(upsert(rows, row)))
    if (data.traffic.views || data.traffic.clones || data.traffic.referrers) {
      fs.writeFileSync(join(dir, `traffic-${date}.json`), JSON.stringify({ repo, date, ...data.traffic }, null, 2) + '\n')
    }
  }
  return { row, prev, text }
}

const parseArgs = argv => {
  const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.slice(2).split('=')
    return [k, v.length ? v.join('=') : true]
  }))
  const positional = argv.filter(a => !a.startsWith('--'))
  const date = typeof flags.date === 'string' ? flags.date : new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`--date must be YYYY-MM-DD, got ${date}`)
  return {
    csvPath: resolve(positional[0] ?? './growth/metrics.csv'),
    repo: typeof flags.repo === 'string' ? flags.repo : 'costello88/tiabwft',
    date,
    dryRun: flags['dry-run'] === true,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2))
    const { text } = run(options)
    console.log(text)
    if (!options.dryRun) console.error(`Wrote ${options.csvPath}`)
  } catch (error) {
    console.error(`track.mjs: ${error.message}`)
    process.exit(1)
  }
}
