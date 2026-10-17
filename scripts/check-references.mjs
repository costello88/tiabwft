// Checks the links in skills/tiabwft/references/*.md:
// - "Source:" / "Sources:" lines (bare doc URLs like platform.claude.com/docs/...,
//   with "/x" shorthands resolved against the previous URL's folder) must resolve
// - relative markdown links must point at a file that exists
// - markdown links to http(s) URLs must resolve
// Also flags a bold **YYYY-MM-DD** snapshot date that lies in the future.
// A 404 or 410 fails the check; timeouts and other statuses are only warned about.
// Usage: node scripts/check-references.mjs [--offline]
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

const DIR = 'skills/tiabwft/references'
const offline = process.argv.includes('--offline')
const errors = []
const warnings = []
const urls = new Map() // url -> first "file:line" that names it

const today = new Date().toISOString().slice(0, 10)

for (const name of readdirSync(DIR).filter(f => f.endsWith('.md'))) {
  const file = join(DIR, name)
  readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    const at = `${file}:${i + 1}`

    for (const [, date] of line.matchAll(/\*\*(\d{4}-\d{2}-\d{2})\*\*/g)) {
      if (date > today) errors.push(`${at}: snapshot date ${date} is in the future`)
    }

    const source = line.match(/^Sources?:\s*(.+)$/)
    if (source) {
      let base
      for (const raw of source[1].replace(/\(.*?\)/g, '').split(',').map(s => s.trim()).filter(Boolean)) {
        let url
        if (raw.startsWith('/')) {
          if (!base) { errors.push(`${at}: "${raw}" has no full URL before it to resolve against`); continue }
          url = base.slice(0, base.lastIndexOf('/')) + raw
        } else {
          url = /^https?:\/\//.test(raw) ? raw : `https://${raw}`
          base = url
        }
        if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(url)) { errors.push(`${at}: malformed source URL "${raw}"`); continue }
        if (!urls.has(url)) urls.set(url, at)
      }
    }

    for (const [, target] of line.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (/^https?:\/\//.test(target)) { if (!urls.has(target)) urls.set(target, at); continue }
      if (/^(mailto:|#)/.test(target)) continue
      const path = resolve(dirname(file), target.split('#')[0])
      if (!existsSync(path)) errors.push(`${at}: link target "${target}" does not exist`)
    }
  })
}

async function check(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: { 'user-agent': 'Mozilla/5.0 (tiabwft reference check)' },
      })
      // platform.claude.com answers unknown pages with 200 and a "Not Found" page
      if (res.ok) return /NEXT_HTTP_ERROR_FALLBACK;404|"Not Found - /.test(await res.text()) ? { fatal: true, msg: 'soft 404 (Not Found page)' } : null
      if (res.status === 404 || res.status === 410) return { fatal: true, msg: `HTTP ${res.status}` }
      if (attempt === 3) return { fatal: false, msg: `HTTP ${res.status}` }
    } catch (err) {
      if (attempt === 3) return { fatal: false, msg: err.name === 'TimeoutError' ? 'timed out' : err.message }
    }
    await new Promise(r => setTimeout(r, 2000 * attempt))
  }
}

if (!offline) {
  const results = await Promise.all([...urls].map(async ([url, at]) => [url, at, await check(url)]))
  for (const [url, at, problem] of results) {
    if (!problem) continue
    ;(problem.fatal ? errors : warnings).push(`${at}: ${url} -> ${problem.msg}`)
  }
}

for (const w of warnings) console.log(`::warning::${w}`)
for (const e of errors) console.log(`::error::${e}`)
console.log(`Checked ${urls.size} URL(s)${offline ? ' (offline: not fetched)' : ''}: ${errors.length} error(s), ${warnings.length} warning(s).`)
process.exit(errors.length ? 1 : 0)
