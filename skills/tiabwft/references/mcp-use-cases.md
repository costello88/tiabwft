# MCP use cases: what to connect, for which job

Checked on **2026-10-16**. **Hosted** means a hosted connector listed in the claude.ai MCP registry (usually one click: claude.ai › Settings › Connectors). **owner/repo** means a GitHub repo that was confirmed live and not archived. **[U]** means unconfirmed, so check before recommending. Always look at what the user already has connected first, and turn that into "use this".

## 1. Software development
| Job | Connect | Why it beats doing it by hand |
|---|---|---|
| Issue → branch → PR → review | GitHub (`github/github-mcp-server`, official); Linear (hosted); Atlassian Rovo (hosted, `atlassian/atlassian-mcp-server`) | the agent reads the ticket and the diff together, so there's no copy-pasting between tabs |
| Production error → fix | Sentry (hosted) → GitHub, plus Datadog (hosted) for logs | the stack trace, release and breadcrumbs arrive without pasting |
| Up-to-date library docs | Context7 (`upstash/context7`) | version-correct docs, far fewer made-up APIs |
| Browser testing and debugging | `microsoft/playwright-mcp`, `ChromeDevTools/chrome-devtools-mcp` | it drives a real page, reads console and network, and re-tests its own fix |
| Database queries and migrations | Supabase (`supabase/mcp`), Neon (`neondatabase/mcp-server-neon`), `googleapis/mcp-toolbox` (many databases), MongoDB (`mongodb-js/mongodb-mcp-server`) | it reads the live schema before writing SQL |
| Design → code | Figma (hosted); `GLips/Figma-Context-MCP` (community) | real layout and design tokens instead of a screenshot |

## 2. Sales and CRM
| Job | Connect | Why |
|---|---|---|
| New Stripe payment → HubSpot deal | Stripe (hosted) + HubSpot (hosted) | match customer to contact and create the deal in one pass |
| Pre-call brief | HubSpot or Salesforce (hosted) + Gmail/Calendar + Slack | CRM history, recent emails and internal chatter in one page |
| Lead enrichment and lists | Apollo.io, Clay (hosted), Exa (`exa-labs/exa-mcp-server`) | bulk enrichment written back to the CRM |
| Pipeline clean-up | Salesforce (hosted; has a read-only mode) | stale deals and empty fields found by query, not by eye |
| Contracts | DocuSign (hosted) | draft and send envelopes |

## 3. Marketing, SEO, ads and social
| Job | Connect | Why |
|---|---|---|
| SEO and AI-search visibility | Ahrefs (hosted), Similarweb (hosted) | live keyword, backlink and AI-citation data instead of exported CSVs |
| Cross-channel reports | Supermetrics, Amplitude (hosted), HubSpot analytics | many sources turned into one story |
| Social scheduling | Typefully, Metricool, Publora, Buffer-style schedulers | draft, queue and read analytics. Pick **one**; overlapping schedulers just cost context |
| Email campaigns | Mailchimp, Klaviyo, Braze (hosted) | build the campaign and read the results |
| Push / lifecycle messaging | Pushwoosh (hosted) | segments and journeys described in plain language |

## 4. Content creation
| Job | Connect | Why |
|---|---|---|
| Generate images, video and audio, then post | a media-generation connector + a scheduler (Typefully, Publora) | create and publish with no file shuffling |
| Branded designs and decks | Canva (hosted; autofill and export) | templates filled in bulk |
| Voice and dubbing | ElevenLabs (hosted). The old `elevenlabs/elevenlabs-mcp` repo is archived | |
| 3D | `ahujasid/mcp-for-blender` (community) | drives Blender directly |
| Diagrams | Figma (hosted, diagram tools) | editable output, not a flat picture |

## 5. Customer support
| Job | Connect | Why |
|---|---|---|
| Summarise conversations, spot themes | Intercom (hosted) | clusters real tickets instead of a sample |
| Replies grounded in the knowledge base | Intercom + Notion (hosted) | answers cite internal docs |
| Ticket → bug report | Intercom + Linear + Sentry | a linked issue with the error attached |
| Support inbox triage | Gmail | label and draft in bulk |
| Zendesk | [U] not found in the registry; check Zendesk's own docs | |

## 6. Ops, project management and docs
| Job | Connect | Why |
|---|---|---|
| Status roll-ups | Asana, Linear (hosted), ClickUp, monday.com | one query, a summary across projects |
| Wiki Q&A and updates | Notion (hosted, `makenotion/notion-mcp-server`), Atlassian Rovo | reads and writes pages |
| Meeting notes → tasks | Fireflies + Asana or Linear | action items become tickets by themselves |
| Files | Google Drive | search and read without leaving the session |
| Incidents | PagerDuty (hosted). The old open-source repo is archived | |

## 7. Finance, invoicing and payments
| Job | Connect | Why |
|---|---|---|
| Month-end P&L, cash flow | QuickBooks (hosted) | reports from the live books |
| Payments and refunds | Stripe (hosted; `stripe/ai`) | search docs, balances and objects |
| Expenses, payroll | Expensify, Gusto (hosted) | queried directly; payroll checked against the books |
| Others | Square (`square/square-mcp-server`), PayPal (`paypal/paypal-mcp-server`; small) | low adoption, so check before relying on them |

## 8. E-commerce
| Job | Connect | Why |
|---|---|---|
| Bulk catalogue edits, collections, discounts | Shopify (hosted) | bulk changes checked against the store's schema |
| Restock planning | Shopify inventory + analytics queries | sales speed compared with stock directly |
| Orders and customers | Shopify | answers from live data |
| Payout reconciliation | Stripe + QuickBooks | payouts matched to the ledger |

## 9. Data and analytics
| Job | Connect | Why |
|---|---|---|
| Warehouse Q&A | BigQuery (hosted), Snowflake (hosted) | SQL written against the real schema |
| Product analytics | Amplitude (hosted), Pendo | charts and metrics in the conversation |
| Transform layer | dbt (`dbt-labs/dbt-mcp`) | sees models, lineage and tests |
| Many databases at once | `googleapis/mcp-toolbox` | one config, many databases |

## 10. Personal productivity
| Job | Connect | Why |
|---|---|---|
| Inbox triage | Gmail | drafts only; nothing gets sent without you |
| Finding a meeting slot | Google Calendar | checks free time directly |
| Notes vault | Obsidian (`MarkusPfundstein/mcp-obsidian`; needs the Local REST API plugin in Obsidian) | searches and edits your notes locally |
| Notes and tasks | Notion, Asana | capture and follow-up in one place |

## 11. Research and the web
| Job | Connect | Why |
|---|---|---|
| Clean web search | Exa (`exa-labs/exa-mcp-server`), Tavily (`tavily-ai/tavily-mcp`) | results shaped for LLMs, not raw HTML |
| Scraping and crawling | Firecrawl (`firecrawl/firecrawl-mcp-server`), Bright Data (`brightdata/brightdata-mcp`) | handles JavaScript pages and bot walls |
| Multi-step research | Exa's agent tools | lists built and enriched without hand-holding |

## 12. Infrastructure and cloud
| Job | Connect | Why |
|---|---|---|
| AWS operations and docs | AWS (hosted; `awslabs/mcp`) | authenticated, scoped calls |
| Cloudflare Workers, KV | Cloudflare (hosted; `cloudflare/mcp-server-cloudflare`) | inspect and manage resources |
| Deploys | Vercel, Render (hosted) | a failed deploy diagnosed from its logs |
| Terraform | `hashicorp/terraform-mcp-server` | registry data, no guessed providers |
| Containers / Kubernetes | `docker/mcp-gateway`, `Flux159/mcp-server-kubernetes` (community) | cluster state in plain language |

## 13. Memory and context
| Job | Connect | Why |
|---|---|---|
| Memory that persists | Mem0 (hosted; the old `mem0ai/mem0-mcp` repo is archived) | preferences survive across sessions |
| Shared memory between agents | Vertiso Memory, Meko (hosted) | context shared across agents |
| Vector search over your docs | Qdrant (`qdrant/mcp-server-qdrant`) | semantic recall over your own corpus |
| Knowledge graph | Graphiti (`getzep/graphiti`; [U] its MCP server lives inside the repo) | tracks how facts relate over time |

## 14. Automation glue
| Job | Connect | Why |
|---|---|---|
| Thousands of apps | Zapier (hosted; `zapier/zapier-mcp`) | covers apps with no MCP server of their own |
| Run existing workflows | n8n, Make (hosted) | reuse logic you already built |
| Pipedream | [U] check the MCP endpoint first | |
| Build apps from chat | Lovable (hosted) | |

## Power combos
1. **Revenue loop**: Stripe → HubSpot → Slack → QuickBooks. A payment creates the deal, the team hears about it, the invoice gets reconciled.
2. **Bug to fix**: Sentry → GitHub → Playwright → Linear. Find the error, patch it, reproduce it in a browser, log it.
3. **Content engine**: Exa → media generation → Canva → a scheduler → analytics. Research, create, brand, schedule, measure.
4. **Month-end close**: QuickBooks + BigQuery → Google Drive → Gmail draft to the accountant.
5. **Support to engineering**: Intercom → Sentry → Linear → Slack. Cluster tickets, tie them to errors, file the issue, tell the channel.
6. **Launch checklist**: Supabase → Vercel → Cloudflare → Datadog. Migrate, deploy, set DNS, watch the metrics.

## Safety notes to pass on
- **Tool output is untrusted.** Emails, tickets, web pages and docs can carry text that tries to steer the agent. Writes and sends need the user's confirmation.
- **Avoid the "lethal trifecta"** in one session: private data + untrusted content + a way to send things out (for example Gmail + a scraper + a Slack poster).
- **Narrow tokens.** Prefer OAuth with minimal scopes and read-only modes; use separate keys per project; rotate them.
- **Community servers run with your credentials.** Check the owner, stars, last commit and archived status; pin versions; read the source.
- **Production data.** Point database and cloud servers at staging or read-only replicas. Destructive tools (database writes, AWS, Kubernetes, `terraform apply`) need a human's OK.
- **Tool sprawl costs context.** Some servers bring 100+ tools; enable only what the job needs.
- **Secrets** go in environment variables or a secret manager, never in config files in git or in chat.
