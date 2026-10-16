# What stack to build X with

Researched on **2026-10-16**. **[V]** means several independent sources agree; **[U]** means unverified or from general knowledge. Prices move all the time, so tell the user to check the vendor's pricing page before they commit.

**Default rule:** use the least infrastructure that works. Write code only when you need custom tools or strict control, or when the thing is a product you'll sell. For models: Haiku for high-volume simple steps, Sonnet for most agents, Opus or Fable for hard reasoning (see models-and-costs.md).

## 1. Building agents
| Option | Pick when | Cost / effort | Watch out |
|---|---|---|---|
| Claude Agent SDK (Py/TS) | you want Claude Code's agent loop (tools, files, MCP, subagents) inside your own app | tokens only; medium; you host it | it needs a sandbox and long-running compute, so serverless timeouts bite |
| Claude Managed Agents | Anthropic hosts the loop and the sandbox | tokens plus about $0.08 per active session-hour [U]; low | Claude only; batch and fast-mode discounts reportedly don't apply [U]; check the docs for beta status |
| `claude -p` headless / GitHub Actions | work tied to a repo: PR review, triage, docs, codegen | tokens plus CI minutes; low | set explicit tool and permission allow-lists; never expose secrets to untrusted PRs |
| Scheduled cloud routines | recurring jobs that run without your laptop on (digests, monitoring) | part of the plan or API usage [U]; lowest | not for low-latency or per-user products |
| LangGraph | explicit stateful graphs, human-in-the-loop, checkpoints | free; high | more abstraction than most agents need |
| CrewAI | role-based multi-agent prototypes | free; medium | hard to debug in production |
| Mastra | a TypeScript team that wants workflows, memory and evals in one place | free, open source [U]; medium | younger ecosystem |
| OpenAI Agents SDK | you're already on OpenAI | free; medium | works best with OpenAI models [U] |
| Pydantic AI | a Python team that wants typed, validated outputs | free; medium | more code than the Claude SDK for coding-style agents |
| n8n | visual workflows with AI nodes, self-hostable | free self-hosted; cloud from about $20/mo [U]; low | complex branching gets messy; self-hosting means you own security |
| Make | visual app integrations | tiered pricing [U]; low | billed per operation, so loops get expensive |
| Zapier Agents | non-technical staff with simple triggers | billed per task [U]; lowest | costs climb with volume |
| Relevance AI, Lindy | business teams that want a packaged agent builder | credits [U]; low | lock-in, opaque costs |

**Code or no-code?** No-code when the flow is under about 10 steps, the data is low-risk and the owner isn't an engineer. Code when you need tests and version control, per-customer isolation or custom tools, or when the agent is the product. A good path: prototype in n8n, then move the flow that works to the Agent SDK or `claude -p`.

## 2. Where to host it
| Option | Pick when | Rough price | Watch out |
|---|---|---|---|
| Vercel | Next.js front-ends, short AI routes | Hobby free (non-commercial), Pro about $20/seat [V] | function time limits make it a poor fit for long agents |
| Cloudflare Workers / Agents | cheap edge APIs; stateful agents on Durable Objects | free about 100K requests/day, paid from $5/mo [V] | not full Node; filesystem-based tools are awkward |
| Railway | long-running back-ends and workers, deployed fast | Hobby about $5/mo including $5 of credit [V] | usage-based bills vary |
| Fly.io | containers close to users, GPUs, per-user VMs | pay as you go [U] | steeper ops learning curve |
| Render | predictable always-on apps | free tier sleeps (30–60 s to wake), paid from $7/mo [V] | a sleeping free app misses webhooks |
| AWS (Lambda / Bedrock / AgentCore) | enterprise compliance, already on AWS | pay as you go | heavy setup |
| Google Cloud Run / Vertex | containers that scale to zero; Google data stack | free quota [U] | cold starts, IAM complexity |
| Azure | Microsoft shops | pay as you go | pick it only if the org already runs on it |
| Modal | Python batch jobs, GPUs, sandboxed code | per-second billing, monthly free credits [U] | Python only |
| Supabase Edge Functions | webhooks and light logic next to the database | included with Supabase | short execution limits; Deno runtime |
| VPS (Hetzner, DigitalOcean) | cheapest for a steady load, full control | about $5–10/mo [U] | you handle patches, backups and uptime |

## 3. Memory and RAG
| Option | Pick when | Watch out |
|---|---|---|
| pgvector on Supabase | the default when you're already on Postgres (free tier, then Pro $25/mo plus compute [V]) | free projects pause after about a week idle |
| Pinecone | managed vector search at scale | another vendor and bill |
| Turbopuffer | huge, cheap, object-storage-backed search | newer; check latency |
| Chroma | local prototypes | not a production default |
| Qdrant | strong filtering, self-hosted or cloud | you run it yourself unless you pay |
| mem0 / Zep / Letta | long-term per-user memory | test recall before trusting it |
| Plain files / Obsidian | personal agents, small knowledge bases | no semantic search; doesn't scale |

**Often you don't need RAG at all.** If the data fits in the 1M-token context and gets queried again and again, put it in context with prompt caching. That's simpler and often more accurate. Use RAG when the data is huge, changes constantly or needs per-user permissions.

## 4. App builders vs real code
| Option | Pick when | Watch out |
|---|---|---|
| Lovable | fast full-stack prototypes (Supabase, Stripe, Resend built in) | credits; code sprawls; export to GitHub early |
| Bolt | quick browser-built apps | same as Lovable |
| v0 | UI and Next.js pages, deployed to Vercel | front-end first; you wire the back-end |
| Replit | code, host and agent in one place | hosting costs live inside the platform |
| Wix / Base44 | non-technical owners, sites and simple apps | lock-in |
| Claude Artifacts | single-file tools, calculators, dashboards | limited back-end |
| Claude Code + Next.js | real ownership, tests, long-term upkeep | needs some engineering |

Rule: validate the idea in a builder, then move to Claude Code + Next.js once real users arrive.

## 5. Voice, browser and documents
- **Voice / realtime:** a dedicated voice stack (OpenAI Realtime, ElevenLabs, Vapi, LiveKit) [U], with a fast model like Haiku in the loop to stay under about 1 second. Phone and per-minute costs dominate.
- **Browser automation:** first look for an API or MCP server. Use Playwright for stable pages, and computer use only for sites with no API, run in a sandbox. Anything that sends money or messages needs a human's OK.
- **Documents:** give Claude the PDF directly. Use OCR or parsing services (Mistral OCR, Unstructured, LlamaParse) for scanned or very large batches [U]. Always check extracted numbers.

## 6. Observability and evals
Langfuse (open source, self-hostable), Braintrust (eval-first, CI gates), LangSmith (LangChain users), Helicone (quick proxy logging and costs), Arize Phoenix (drift monitoring plus traces; heavy for an MVP), `claude plugin eval` (for Claude Code plugins). Start with 20–50 real examples and one pass/fail check each before you pay for a platform.

## 7. SaaS MVP defaults
| Layer | Default | Alternative |
|---|---|---|
| Database | Postgres on Supabase | Neon, plain Postgres |
| Auth | Supabase Auth, or Clerk for ready-made UI | Auth.js |
| Payments | Stripe Checkout + webhooks | Lemon Squeezy, Paddle (merchant of record) |
| Email | Resend | Postmark |
| Hosting | Vercel for the app | Railway or Render for workers |
| LLM | Sonnet 5.5, Haiku 5.5 for cheap steps | Opus 5.5 for hard ones |

Turn on Supabase row-level security from day one, verify Stripe webhooks, and set up SPF/DKIM before sending email.

## 8. Five starter stacks
1. **Solo SaaS MVP**: Next.js written with Claude Code, on Vercel; Supabase (DB, auth, pgvector); Stripe; Resend; Sonnet 5.5; an Agent SDK worker on Railway if it needs an agent; Langfuse. About $0–50/mo before customers [U].
2. **Internal business agent**: Managed Agents, or the Agent SDK on Cloud Run or a VPS; triggered by scheduled routines and Slack; MCP connectors to the company's tools; memory in files or Postgres; evals in Braintrust or Langfuse. A human approves anything that writes, sends or pays.
3. **Content / social automation**: n8n or scheduled routines; Sonnet for drafts, Haiku for variants; Airtable or Supabase for the content queue; Typefully or Metricool to publish; a human approves before posting. Mind platform rules on automated posting and AI disclosure.
4. **Customer-support agent**: the Agent SDK behind a webhook (Railway or Cloudflare); help articles in pgvector (or in cached context if small); Intercom or Zendesk via MCP; Haiku triages, Sonnet answers; hand off to a human on low confidence, refunds or legal topics; review failed conversations weekly in Langfuse.
5. **Data / reporting agent**: Postgres or BigQuery with a read-only role; `claude -p` or scheduled routines for daily and weekly reports; Modal for heavy Python; reports sent by Resend or posted to Slack; Sonnet, with Opus to explain anomalies. Numbers must come from queries, never from the model's memory, and every SQL statement gets logged.
