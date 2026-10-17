import type { Fact } from '../../types'
import { toFact } from './facts'

export type EnvReader = {
  exists: (path: string) => Promise<boolean>
  read: (path: string) => Promise<string>
}

const NPM: Record<string, string> = {
  next: 'Next.js', react: 'React', vue: 'Vue', nuxt: 'Nuxt', svelte: 'Svelte', '@sveltejs/kit': 'SvelteKit',
  astro: 'Astro', express: 'Express', fastify: 'Fastify', '@supabase/supabase-js': 'Supabase', stripe: 'Stripe',
  '@stripe/stripe-js': 'Stripe', prisma: 'Prisma', '@prisma/client': 'Prisma', 'drizzle-orm': 'Drizzle',
  '@clerk/nextjs': 'Clerk', 'next-auth': 'Auth.js', resend: 'Resend', '@anthropic-ai/sdk': 'Anthropic API',
  '@anthropic-ai/claude-agent-sdk': 'Claude Agent SDK', openai: 'OpenAI API', langchain: 'LangChain',
  '@langchain/core': 'LangChain', tailwindcss: 'Tailwind CSS', '@sentry/nextjs': 'Sentry', '@sentry/node': 'Sentry',
  'posthog-js': 'PostHog', firebase: 'Firebase', mongoose: 'MongoDB', pg: 'Postgres', redis: 'Redis',
  ioredis: 'Redis', '@vercel/analytics': 'Vercel',
}
const PY: Record<string, string> = {
  django: 'Django', flask: 'Flask', fastapi: 'FastAPI', anthropic: 'Anthropic API', 'claude-agent-sdk': 'Claude Agent SDK',
  openai: 'OpenAI API', langchain: 'LangChain', supabase: 'Supabase', stripe: 'Stripe', sqlalchemy: 'SQLAlchemy',
  psycopg2: 'Postgres', psycopg: 'Postgres', pandas: 'pandas', streamlit: 'Streamlit',
}
const ENV_PREFIX: readonly (readonly [string, string])[] = [
  ['NEXT_PUBLIC_SUPABASE_', 'Supabase'], ['SUPABASE_', 'Supabase'], ['STRIPE_', 'Stripe'], ['OPENAI_', 'OpenAI API'],
  ['ANTHROPIC_', 'Anthropic API'], ['RESEND_', 'Resend'], ['HUBSPOT_', 'HubSpot'], ['SENTRY_', 'Sentry'],
  ['VERCEL_', 'Vercel'], ['AWS_', 'AWS'], ['AZURE_', 'Azure'], ['TWILIO_', 'Twilio'], ['CLERK_', 'Clerk'],
  ['POSTHOG_', 'PostHog'], ['SLACK_', 'Slack'], ['NOTION_', 'Notion'], ['SHOPIFY_', 'Shopify'], ['DATABASE_URL', 'Postgres'],
]
const COMPOSE: Record<string, string> = {
  postgres: 'Postgres', redis: 'Redis', mongo: 'MongoDB', mysql: 'MySQL', n8n: 'n8n', qdrant: 'Qdrant', minio: 'MinIO',
}
// Servers that are part of Claude Code or this app, not a user's stack.
const INTERNAL = /^(ccd_|mcp-registry$|Claude_Browser$|claude-in-chrome$|terminal$|visualize$|scheduled-tasks$)/

const unique = (items: readonly string[]): string[] => [...new Set(items)]
const isString = (v: string | undefined): v is string => v !== undefined

export const subjectsFromPackageJson = (text: string): string[] => {
  try {
    const pkg = JSON.parse(text) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
    return unique(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).map(name => NPM[name]).filter(isString))
  } catch {
    return []
  }
}

export const subjectsFromRequirements = (text: string): string[] =>
  unique(text.split(/\r?\n/)
    .map(line => line.trim().toLowerCase())
    .filter(line => line !== '' && !line.startsWith('#'))
    .map(line => PY[line.split(/[<>=~![;\s]/)[0] ?? ''])
    .filter(isString))

export const subjectsFromPyproject = (text: string): string[] =>
  unique(Object.entries(PY)
    .filter(([name]) => new RegExp(`["']${name.replace(/[-.]/g, '\\$&')}(?:[<>=~!\\[ "']|$)`, 'im').test(text))
    .map(([, subject]) => subject))

export const subjectsFromCompose = (text: string): string[] =>
  unique([...text.matchAll(/^\s*image:\s*["']?([^\s"':]+)/gm)]
    .map(m => {
      const image = m[1]!.toLowerCase()
      return COMPOSE[image] ?? COMPOSE[image.split('/').pop() ?? '']
    })
    .filter(isString))

// Variable NAMES only: the value after "=" is never read into a subject.
export const subjectsFromEnvExample = (text: string): string[] =>
  unique(text.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^[A-Z][A-Z0-9_]*\s*=/.test(line))
    .map(line => line.split('=')[0]!.trim())
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
    if (server === '' || INTERNAL.test(server)) {
      continue
    }
    const last = server.startsWith('plugin_') ? server.split('_').pop() ?? server : server
    servers.add(last.charAt(0).toUpperCase() + last.slice(1))
  }

  return { servers: [...servers], connectorCount: connectors.size }
}

const SOURCES: readonly (readonly [string, (text: string) => string[]])[] = [
  ['package.json', subjectsFromPackageJson],
  ['requirements.txt', subjectsFromRequirements],
  ['pyproject.toml', subjectsFromPyproject],
  ['docker-compose.yml', subjectsFromCompose],
  ['compose.yaml', subjectsFromCompose],
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
