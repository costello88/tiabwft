import { expect, test } from 'claude-code/testing'

import {
  scanEnvironment, subjectsFromCompose, subjectsFromEnvExample, subjectsFromPackageJson,
  subjectsFromPyproject, subjectsFromRequirements, subjectsFromTools,
} from './env-scan'

test('package.json dependencies map to known subjects', async () => {
  const pkg = JSON.stringify({ dependencies: { next: '15', '@supabase/supabase-js': '2', 'left-pad': '1' }, devDependencies: { tailwindcss: '4' } })
  expect(subjectsFromPackageJson(pkg).sort()).toEqual(['Next.js', 'Supabase', 'Tailwind CSS'])
  expect(subjectsFromPackageJson('not json')).toEqual([])
})

test('python requirement and pyproject files', async () => {
  expect(subjectsFromRequirements('fastapi==0.110\nanthropic>=0.40\n# comment\nleftpad\n').sort()).toEqual(['Anthropic API', 'FastAPI'])
  expect(subjectsFromPyproject('[project]\ndependencies = ["django>=5", "stripe"]\n').sort()).toEqual(['Django', 'Stripe'])
})

test('compose images and .env.example names, never values', async () => {
  expect(subjectsFromCompose('services:\n  db:\n    image: postgres:16\n  flow:\n    image: "n8nio/n8n:latest"\n').sort()).toEqual(['Postgres', 'n8n'])
  const subjects = subjectsFromEnvExample('STRIPE_SECRET_KEY=sk_live_should_never_appear\nNEXT_PUBLIC_SUPABASE_URL=\n# HUBSPOT_TOKEN=\nRANDOM_THING=1\n')
  expect(subjects.sort()).toEqual(['Stripe', 'Supabase'])
  expect(JSON.stringify(subjects)).not.toContain('sk_live')
})

test('tool names give readable servers and count claude.ai connectors', async () => {
  const r = subjectsFromTools([
    'mcp__plugin_small-business_gmail__search_threads',
    'mcp__plugin_small-business_gmail__get_thread',
    'mcp__2b908a20-cb61-4ce8-b2dd-06288ef35973__get-product',
    'mcp__875dee50-9b3f-452b-af8c-fbc839966273__get_crm_objects',
    'mcp__ccd_session__start_session',
    'mcp__mcp-registry__search_mcp_registry',
    'Bash',
  ])
  expect(r.servers).toEqual(['Gmail'])
  expect(r.connectorCount).toBe(2)
})

test('scanEnvironment builds env stack facts from files and tools', async () => {
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ dependencies: { stripe: '17' } }),
    '.env.example': 'SUPABASE_URL=\n',
  }
  const facts = await scanEnvironment(
    { exists: async p => p in files, read: async p => files[p] ?? '' },
    ['mcp__plugin_small-business_gmail__search_threads', 'mcp__875dee50-9b3f-452b-af8c-fbc839966273__x'],
    9,
  )
  expect(facts.map(f => `${f.subject}|${f.text}|${f.source}|${f.kind}|${f.scope}`).sort()).toEqual([
    'Gmail|connected as a connector|env|stack|project',
    'Stripe|seen in package.json|env|stack|project',
    'Supabase|seen in .env.example|env|stack|project',
    'claude.ai connectors|1 connected|env|stack|project',
  ])
})

test('scanEnvironment survives unreadable files', async () => {
  const facts = await scanEnvironment({ exists: async () => true, read: async () => { throw new Error('nope') } }, [], 1)
  expect(facts).toEqual([])
})
