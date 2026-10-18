#!/usr/bin/env node
// Collects live GitHub data for skills/tiabwft/references/community.md:
// stars, last push, archived/renamed state for every repo the file names,
// plus search results for new candidates. Writes JSON for the weekly
// cloud routine, which can't call the GitHub API itself.
//
// Usage: GITHUB_TOKEN=... node scripts/community-scan.mjs [out.json]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const SOURCE = 'skills/tiabwft/references/community.md'
const OUT = process.argv[2] ?? 'data/community-scan.json'
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
const MIN_STARS = 200
const MAX_AGE_DAYS = 120

if (!TOKEN) {
  console.error('Set GITHUB_TOKEN (or GH_TOKEN).')
  process.exit(1)
}

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'tiabwft-community-scan',
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function gh(path, { retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.github.com${path}`, { headers })
    if (res.status === 404) return { status: 404 }
    if ((res.status === 403 || res.status === 429) && attempt < retries) {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000
      const wait = Number(res.headers.get('retry-after')) * 1000 || Math.max(reset - Date.now(), 0) + 1000 || 60_000
      await sleep(Math.min(wait, 120_000))
      continue
    }
    if (!res.ok) return { status: res.status, error: (await res.text()).slice(0, 200) }
    return { status: res.status, body: await res.json() }
  }
}

// Repo names in the file, outside the "Search live" section (its owner/repo are placeholders).
function listedRepos(md) {
  const body = md.split(/^## Search live/m)[0]
  const repos = new Set()
  for (const line of body.split('\n')) {
    let lastOwner = null
    for (const m of line.matchAll(/(?<![\w./-])([A-Za-z0-9][\w-]*)\/([A-Za-z0-9][\w.-]*[\w])(?![\w/])/g)) {
      if (m[1] === 'owner') continue // the table header "owner/repo"
      repos.add(`${m[1]}/${m[2]}`)
      lastOwner = m[1]
    }
    // Bare names with a star count, like "claude-cookbooks (54k)", inherit the line's last owner.
    if (lastOwner) {
      for (const m of line.matchAll(/(?<![\w./-])([a-z][\w.-]*) \(\d[\d.]*k?\b/g)) {
        if (!line.includes(`/${m[1]}`)) repos.add(`${lastOwner}/${m[1]}`)
      }
    }
  }
  return [...repos].sort()
}

async function pluginCount(fullName) {
  const r = await gh(`/repos/${fullName}/contents/.claude-plugin/marketplace.json`)
  if (r.status !== 200) return null
  try {
    const json = JSON.parse(Buffer.from(r.body.content, 'base64').toString('utf8'))
    return { name: json.name ?? null, plugins: Array.isArray(json.plugins) ? json.plugins.length : null }
  } catch {
    return { name: null, plugins: null }
  }
}

const slim = b => ({
  full_name: b.full_name,
  stars: b.stargazers_count,
  pushed_at: b.pushed_at,
  archived: b.archived,
  fork: b.fork,
  description: b.description,
  topics: b.topics ?? [],
  html_url: b.html_url,
})

async function checkListed(names) {
  const out = []
  for (const name of names) {
    const r = await gh(`/repos/${name}`)
    if (r.status === 404) {
      out.push({ listed_as: name, status: 'not_found' })
      continue
    }
    if (!r.body) {
      out.push({ listed_as: name, status: 'error', error: `${r.status} ${r.error ?? ''}`.trim() })
      continue
    }
    const info = slim(r.body)
    out.push({
      listed_as: name,
      status: info.archived ? 'archived' : info.full_name.toLowerCase() !== name.toLowerCase() ? 'renamed' : 'ok',
      ...info,
      marketplace: await pluginCount(info.full_name),
    })
  }
  return out
}

async function search(listed) {
  const since = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString().slice(0, 10)
  const filter = `stars:>=${MIN_STARS} pushed:>=${since} archived:false fork:false`
  const queries = [
    'topic:claude-code-plugin',
    'topic:claude-code-plugins',
    'topic:claude-skills',
    'topic:agent-skills',
    'topic:claude-code',
    'topic:mcp-server',
    'claude code plugin marketplace in:name,description',
    'claude skills in:name,description',
    'claude code subagents in:name,description',
    'mcp server in:name,description',
  ]
  const known = new Set(listed.flatMap(l => [l.listed_as, l.full_name].filter(Boolean).map(s => s.toLowerCase())))
  const found = new Map()
  const errors = []
  for (const q of queries) {
    const r = await gh(`/search/repositories?q=${encodeURIComponent(`${q} ${filter}`)}&sort=stars&order=desc&per_page=30`)
    await sleep(2500) // search API allows 30 requests a minute
    if (!r.body) {
      errors.push({ query: q, error: `${r.status} ${r.error ?? ''}`.trim() })
      continue
    }
    for (const item of r.body.items) {
      const key = item.full_name.toLowerCase()
      if (known.has(key)) continue
      const entry = found.get(key) ?? { ...slim(item), matched_queries: [] }
      entry.matched_queries.push(q)
      found.set(key, entry)
    }
  }
  const candidates = [...found.values()].sort((a, b) => b.stars - a.stars).slice(0, 60)
  for (const c of candidates) c.marketplace = await pluginCount(c.full_name)
  return { filter, queries, candidates, errors }
}

const md = readFileSync(SOURCE, 'utf8')
const listed = await checkListed(listedRepos(md))
const searched = await search(listed)
const result = {
  generated_at: new Date().toISOString(),
  source: SOURCE,
  criteria: { min_stars: MIN_STARS, pushed_within_days: MAX_AGE_DAYS },
  listed,
  search: searched,
}
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`)
const counts = listed.reduce((a, l) => ({ ...a, [l.status]: (a[l.status] ?? 0) + 1 }), {})
console.log(`Wrote ${OUT}: ${listed.length} listed repos ${JSON.stringify(counts)}, ${searched.candidates.length} candidates, ${searched.errors.length} search errors.`)
