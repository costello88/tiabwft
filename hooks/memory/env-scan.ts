import type { Fact } from '../../types'
import { toFact } from './facts'

export type EnvReader = {
  exists: (path: string) => Promise<boolean>
  read: (path: string) => Promise<string>
}

const NPM = new Map<string, string>(Object.entries({
  next: 'Next.js', react: 'React', vue: 'Vue', nuxt: 'Nuxt', svelte: 'Svelte', '@sveltejs/kit': 'SvelteKit',
  astro: 'Astro', express: 'Express', fastify: 'Fastify', '@supabase/supabase-js': 'Supabase', stripe: 'Stripe',
  '@stripe/stripe-js': 'Stripe', prisma: 'Prisma', '@prisma/client': 'Prisma', 'drizzle-orm': 'Drizzle',
  '@clerk/nextjs': 'Clerk', 'next-auth': 'Auth.js', resend: 'Resend', '@anthropic-ai/sdk': 'Anthropic API',
  '@anthropic-ai/claude-agent-sdk': 'Claude Agent SDK', openai: 'OpenAI API', langchain: 'LangChain',
  '@langchain/core': 'LangChain', tailwindcss: 'Tailwind CSS', '@sentry/nextjs': 'Sentry', '@sentry/node': 'Sentry',
  'posthog-js': 'PostHog', firebase: 'Firebase', mongoose: 'MongoDB', pg: 'Postgres', redis: 'Redis',
  ioredis: 'Redis', '@vercel/analytics': 'Vercel',
}))
const pyName = (raw: string): string => (/^[A-Za-z0-9_.-]+/.exec(raw)?.[0] ?? '').toLowerCase().replace(/[_.]/g, '-')
const PY = new Map<string, string>(Object.entries({
  django: 'Django', flask: 'Flask', fastapi: 'FastAPI', anthropic: 'Anthropic API', 'claude-agent-sdk': 'Claude Agent SDK',
  openai: 'OpenAI API', langchain: 'LangChain', supabase: 'Supabase', stripe: 'Stripe', sqlalchemy: 'SQLAlchemy',
  psycopg2: 'Postgres', psycopg: 'Postgres', pandas: 'pandas', streamlit: 'Streamlit',
}).map(([k, v]) => [pyName(k), v] as const))
const ENV_PREFIX: readonly (readonly [string, string])[] = [
  ['NEXT_PUBLIC_SUPABASE_', 'Supabase'], ['SUPABASE_', 'Supabase'], ['STRIPE_', 'Stripe'], ['OPENAI_', 'OpenAI API'],
  ['ANTHROPIC_', 'Anthropic API'], ['RESEND_', 'Resend'], ['HUBSPOT_', 'HubSpot'], ['SENTRY_', 'Sentry'],
  ['VERCEL_', 'Vercel'], ['AWS_', 'AWS'], ['AZURE_', 'Azure'], ['TWILIO_', 'Twilio'], ['CLERK_', 'Clerk'],
  ['POSTHOG_', 'PostHog'], ['SLACK_', 'Slack'], ['NOTION_', 'Notion'], ['SHOPIFY_', 'Shopify'], ['DATABASE_URL', 'Postgres'],
]
const COMPOSE = new Map<string, string>(Object.entries({
  postgres: 'Postgres', redis: 'Redis', mongo: 'MongoDB', mysql: 'MySQL', n8n: 'n8n', qdrant: 'Qdrant', minio: 'MinIO',
}))
// Known services only: a server name must be in this map (last name segment) to count as a stack fact.
const SERVICES = new Map<string, string>(Object.entries({
  gmail: 'Gmail', slack: 'Slack', github: 'GitHub', hubspot: 'HubSpot', notion: 'Notion', linear: 'Linear',
  'google-calendar': 'Google Calendar', 'google-drive': 'Google Drive', shopify: 'Shopify', supabase: 'Supabase',
  stripe: 'Stripe', sentry: 'Sentry', figma: 'Figma', asana: 'Asana', atlassian: 'Atlassian', jira: 'Jira',
  intercom: 'Intercom', canva: 'Canva', playwright: 'Playwright', postgres: 'Postgres', vercel: 'Vercel',
  cloudflare: 'Cloudflare', airtable: 'Airtable', zapier: 'Zapier', n8n: 'n8n', mailchimp: 'Mailchimp',
  klaviyo: 'Klaviyo', 'apollo-io': 'Apollo.io', clay: 'Clay', docusign: 'DocuSign', quickbooks: 'QuickBooks',
  'intuit-quickbooks': 'QuickBooks', gusto: 'Gusto', expensify: 'Expensify', 'monday-com': 'monday.com',
  clickup: 'ClickUp', typefully: 'Typefully', metricool: 'Metricool', exa: 'Exa', firecrawl: 'Firecrawl',
  context7: 'Context7',
}))

const unique = (items: readonly string[]): string[] => [...new Set(items)]
const isString = (v: string | undefined): v is string => v !== undefined

export const subjectsFromPackageJson = (text: string): string[] => {
  try {
    const pkg = JSON.parse(text) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
    return unique(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).map(name => NPM.get(name)).filter(isString))
  } catch {
    return []
  }
}

export const subjectsFromRequirements = (text: string): string[] =>
  unique(text.split(/\r?\n/)
    .map(line => line.trim().toLowerCase())
    .filter(line => line !== '' && !line.startsWith('#'))
    .map(line => PY.get(pyName(line)))
    .filter(isString))

export const subjectsFromPyproject = (text: string): string[] => {
  const names: string[] = []
  let table = ''
  let inArray = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!inArray) {
      const header = /^\[+\s*([^\]]+?)\s*\]+/.exec(line)
      if (header !== null) {
        table = header[1] ?? ''
        continue
      }
    }
    let rest: string | undefined
    if (inArray) {
      rest = line
    } else if (table === 'project') {
      rest = /^dependencies\s*=\s*\[(.*)$/.exec(line)?.[1]
    } else if (table === 'project.optional-dependencies') {
      rest = /^[A-Za-z0-9_.-]+\s*=\s*\[(.*)$/.exec(line)?.[1]
    } else if (table === 'tool.poetry.dependencies' || table === 'tool.poetry.dev-dependencies' || /^tool\.poetry\.group\.[^.]+\.dependencies$/.test(table)) {
      const key = /^([A-Za-z0-9_.-]+)\s*=/.exec(line)?.[1]
      if (key !== undefined) {
        names.push(pyName(key))
      }
    }
    if (rest !== undefined) {
      names.push(...[...rest.matchAll(/["']([^"']*)["']/g)].map(m => pyName(m[1] ?? '')))
      inArray = !rest.replace(/"[^"]*"|'[^']*'/g, '').includes(']')
    }
  }

  return unique(names.map(n => PY.get(n)).filter(isString))
}

export const subjectsFromCompose = (text: string): string[] =>
  unique([...text.matchAll(/^\s*image:\s*["']?([^\s"':]+)/gm)]
    .map(m => {
      const image = m[1]!.toLowerCase()
      return COMPOSE.get(image) ?? COMPOSE.get(image.split('/').pop() ?? '')
    })
    .filter(isString))

// Variable NAMES only: the value after "=" is never read into a subject.
export const subjectsFromEnvExample = (text: string): string[] =>
  unique(text.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^(?:export\s+)?[A-Z][A-Z0-9_]*\s*=/.test(line))
    .map(line => line.split('=')[0]!.trim().replace(/^export\s+/, ''))
    .map(name => ENV_PREFIX.find(([prefix]) => name.startsWith(prefix))?.[1])
    .filter(isString))

export const subjectsFromTools = (names: readonly string[]): { servers: string[]; connectorCount: number } => {
  const servers = new Set<string>()
  const connectors = new Set<string>()
  for (const name of names) {
    if (!name.startsWith('mcp__')) {
      continue
    }
    const server = name.slice('mcp__'.length).split('__')[0] ?? ''
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(server)) {
      connectors.add(server)
      continue
    }
    const display = SERVICES.get(server.replace(/^plugin_[^_]+_/, ''))
    if (display !== undefined) {
      servers.add(display)
    }
  }

  return { servers: [...servers], connectorCount: connectors.size }
}

const SOURCES: readonly (readonly [string, (text: string) => string[]])[] = [
  ['package.json', subjectsFromPackageJson],
  ['requirements.txt', subjectsFromRequirements],
  ['pyproject.toml', subjectsFromPyproject],
  ['docker-compose.yml', subjectsFromCompose],
  ['docker-compose.yaml', subjectsFromCompose],
  ['compose.yaml', subjectsFromCompose],
  ['compose.yml', subjectsFromCompose],
  ['.env.example', subjectsFromEnvExample],
]

export const scanEnvironment = async (reader: EnvReader, toolNames: readonly string[], now: number): Promise<Fact[]> => {
  const drafts: { subject: string; text: string }[] = []
  for (const [file, parse] of SOURCES) {
    try {
      if (await reader.exists(file)) {
        for (const subject of parse(await reader.read(file))) {
          drafts.push({ subject, text: `seen in ${file}` })
        }
      }
    } catch {
      // An unreadable file adds nothing.
    }
  }
  const tools = subjectsFromTools(toolNames)
  for (const subject of tools.servers) {
    drafts.push({ subject, text: 'connected as a connector' })
  }
  if (tools.connectorCount > 0) {
    drafts.push({ subject: 'claude.ai connectors', text: `${tools.connectorCount} connected` })
  }
  const byId = new Map<string, Fact>()
  for (const d of drafts) {
    const fact = toFact({ kind: 'stack', scope: 'project', ...d }, 'env', now)
    if (fact !== undefined && !byId.has(fact.id)) {
      byId.set(fact.id, fact)
    }
  }

  return [...byId.values()]
}
