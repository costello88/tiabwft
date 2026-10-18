# Best Picks: ranked defaults for 45 categories

Researched 2026-10-18; [W] = third-party sources only, [U] = unverified; check prices live.

**How to read the tables**
- **Price**: read from the vendor's own page on 2026-10-18 unless tagged `[W]` (only third-party sources found) or `[U]` (unverified). Some pages were geo-localised, so currency varies (EUR vs USD). Treat prices as signals and recheck before buying.
- **Trust**: `V` = official vendor product. Open-source rows give GitHub stars (★) and last push date, both read with `gh api` on 2026-10-18. No repo listed is archived unless I say so. "Source-available" means the license field was not a standard SPDX id, so read the license before relying on it.
- **Fit**: S solo, T team, E enterprise, NC no-code, D developer.
- **Connector**: exact name in the claude.ai MCP registry (searched 2026-10-18). `—` means the registry search found nothing, which is not proof none exists. `[gh]` means an MCP repo exists on GitHub only.
- Several connectors need the user to authorise them first. Connectors marked "connected" were already live in this session.

## Scoring rubric

Score each candidate stack 1 to 5 on five axes. **Higher is always better**, so lock-in 5 means easy to leave. Weighted total = Fit x3 + Cost x2 + Effort x2 + Trust x2 + Lock-in x1, maximum 50. Reweight for the user: a solo founder might push Cost and Effort up, an enterprise pushes Trust up.

|Axis|1 (poor)|3 (okay)|5 (excellent)|
|-|-|-|-|
|Fit|Covers under half the stated need; workarounds required|Covers the core need; some gaps or manual steps|Covers the whole need, built for this user type and scale|
|Cost|Over 3x budget, or surprise usage bills likely|Within budget at today's scale; grows with usage|Free tier covers the need, or flat price below budget|
|Effort|Days of setup, custom code or migration|An afternoon: guided setup, a few integrations|Under an hour; Claude can drive it through a connector|
|Trust|Unknown vendor, abandoned repo, or no track record|Established, maintained, but a single point of failure|Official vendor or very active project (pushed within 30 days), strong adoption|
|Lock-in|Proprietary data, no export, hard to replace|Export exists but needs rework to move|Open format or open source; moves in under a day|

## 1. Sales, marketing, customer

### CRM
|#|Option: best at, fit|Price / trust|Connector|
|-|-|-|-|
|1|**HubSpot CRM**: all-round pipeline plus marketing; S/T/E, NC|Free for 2 users; Starter from $7/seat (list shows $20 struck through). V|HubSpot|
|2|**Attio**: flexible data model, modern UI; T, NC|Free 3 seats; Plus €39/user monthly (€31 annual). V|Attio|
|3|**Twenty**: self-hostable, customisable; T/D|OSS 58.5k★, pushed 2026-10-18, source-available. Cloud price [U]|—|

Pick #1 unless you need a custom data model (Attio), full code control (Twenty), or you already run Salesforce (connector "Salesforce") or Pipedrive (connector "Pipedrive").

### Email marketing
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Kit**: creators and newsletters, sequences; S/T, NC|Free to 10k subscribers, no automations; Creator $33/mo at 1k subs. V|Kit|
|2|**Brevo**: cheap volume, email plus SMS; S/T, NC|Free 300 emails/day [W]; Starter about $9/mo [W]. V|Brevo|
|3|**listmonk**: self-hosted newsletters; D|OSS AGPL-3.0, 23.8k★, pushed 2026-10-18. Free, you pay SMTP|—|

Pick #1 unless you sell products online (Klaviyo, connector "Klaviyo"), or want the Mailchimp ecosystem (connector "Intuit Mailchimp"), or want zero licence cost (listmonk).

### Transactional email
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Resend**: developer-first API, React email templates; S/T, D|Free 3,000/mo (100/day cap); Pro $20 for 50k. V|Resend; also resend/resend-mcp 576★, MIT, pushed 2026-10-16|
|2|**Postmark**: deliverability for strictly transactional mail; T/E, D|Free 100/mo; Basic $15 for 10k. V|—|
|3|**Amazon SES**: lowest cost at huge volume; D|Price [U]. V|"AWS MCP" (general AWS access)|

Pick #1 unless deliverability is mission-critical (Postmark) or volume is in the millions (SES).

### Forms
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Tally**: free unlimited forms, logic, payments; S/T, NC|Free with unlimited forms and submissions; Pro €20/mo. V|Tally|
|2|**Jotform**: large template library, approvals; T/E, NC|Price [U]. V|Jotform|
|3|**Formbricks**: in-product surveys, self-hostable; T, D|OSS 13.1k★, pushed 2026-10-17, source-available. Price [U]|—|

Pick #1 unless you need HIPAA-style compliance and approval workflows (Jotform) or in-app surveys on your own infrastructure (Formbricks).

### Scheduling / booking
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Calendly**: polished booking links, routing; S/T/E, NC|Free; Standard $10/seat. V|Calendly|
|2|**Cal.com**: embeddable, cheap, programmable; S/T, D|Free; Teams $12/user/mo. V. Production code went closed in April 2026 [W]; open fork `calcom/cal.diy` MIT, 49.1k★, pushed 2026-10-18|—|
|3|**Google Calendar appointment schedules**: zero extra tool; S, NC|Included in Google accounts; paid-tier limits [U]. V|Google Calendar (available in this session)|

Pick #1 unless you want to embed booking in your product or self-host (Cal.com / Cal.diy).

### Payments
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Stripe**: widest API, subscriptions, invoices; S/T/E, D and NC|EEA standard cards 1.5% + €0.25, no monthly fee. V|Stripe; also stripe/ai 2.0k★, MIT, pushed 2026-10-18|
|2|**Paddle**: merchant of record, handles global VAT and sales tax; S/T, SaaS|5% + $0.50 per checkout. V|—|
|3|**PayPal**: buyer trust, wallets; S/T/E, NC|Price [U]. V|PayPal|

Pick #1 unless you want someone else to own global tax and compliance (Paddle) or you are EU-only with local methods (Mollie, connector "Mollie").

### E-commerce
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Shopify**: complete store, apps, checkout; S/T/E, NC|Basic €28/mo (€21 annual); 3-day trial then €1/mo for 3 months. V|Shopify (connected)|
|2|**WooCommerce**: WordPress stores, full control; T, D|OSS 10.6k★, pushed 2026-10-18, source-available. Plugin free, hosting extra [U]|—|
|3|**Medusa**: headless, custom commerce logic; T/E, D|OSS 36.8k★, pushed 2026-10-17, source-available. Hosting [U]|—|

Pick #1 unless you already live on WordPress (Woo) or need bespoke commerce logic in code (Medusa).

### Helpdesk
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Help Scout**: shared inbox feel, small support teams; S/T, NC|Page shows a free plan (5 users) and Standard $25/user. V|—|
|2|**Intercom**: AI-first support and messaging; T/E|Essential $29/seat; Fin AI $0.99 per outcome. V|Intercom|
|3|**Chatwoot**: open-source omnichannel; T, D|OSS 37.9k★, pushed 2026-10-18. Cloud: free for 2 agents, Startups $19/agent|—|

Pick #1 unless you want AI to resolve most tickets (Intercom), need self-hosting (Chatwoot), or are enterprise (Zendesk: $19/agent annual, $25 monthly; registry found no connector).

### Live chat / chatbot
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Crisp**: website chat for small teams; S/T, NC|Free with 2 seats; Mini $45/workspace/mo. V|—|
|2|**Intercom (Fin)**: AI agent that answers from your help content; T/E|$0.99 per outcome plus seats. V|Intercom|
|3|**Chatbase**: train a bot on your docs and embed it; S/T, NC|Price [U]. V|Chatbase|

Pick #1 unless the bot should resolve tickets autonomously at volume (Intercom) or you only need a docs Q&A bot (Chatbase).

## 2. Analytics and growth

### Analytics (product)
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**PostHog**: analytics, replay, flags, experiments in one; T, D|1M events/mo free; then $0.00005/event [W via PostHog docs]. OSS 40.3k★, pushed 2026-10-18, source-available|PostHog|
|2|**Mixpanel**: fast funnels and retention; T/E, NC|Free 1M events, 10 flags; 1.5M events about $100/mo annual. V|Mixpanel|
|3|**Amplitude**: enterprise product analytics, experimentation; E|Free 2M events/mo; Plus starts at $0 then scales. V|Amplitude|

Pick #1 unless you are an enterprise with analysts already on Amplitude or Mixpanel.

### Web analytics
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Plausible**: simple, cookieless, EU-friendly; S/T, NC|$9/mo for 10k pageviews; 30-day trial. OSS AGPL, 29.5k★, pushed 2026-10-16|—|
|2|**Umami**: self-hosted privacy analytics; D|OSS MIT, 39.4k★, pushed 2026-10-17. Cloud price [U]|—|
|3|**Google Analytics 4**: free, ties to Google Ads; T/E|Free [U page not fetched]. V|via "Supermetrics Marketing Analytics"|

Pick #1 unless you need Google Ads attribution (GA4) or want to run it yourself free (Umami). Savri (connector "Savri") is a newer privacy option I could not vet.

### SEO
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Ahrefs**: backlinks, keywords, AI-search tracking; S/T|Starter €27, Lite €119/mo; free tier for your own site. V|Ahrefs|
|2|**Semrush**: SEO plus ads and social suite; T/E|Free tier; SEO €134/mo (€112.52 annual). V|Semrush|
|3|**Google Search Console**: free ground-truth on your own site; all|Free [U page not fetched]. V|via "Supermetrics Marketing Analytics" (not direct)|

Pick #1 unless you want an all-in-one marketing suite (Semrush). Start with Search Console either way; it costs nothing.

### Social scheduling
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Typefully**: writing-first for X, LinkedIn, Threads, Bluesky; S, NC|Price [U]. V|Typefully - Social Media Scheduler (connected)|
|2|**Buffer**: simple multi-network queue; S/T, NC|Free for 3 channels; $5 per channel. V|—|
|3|**Postiz**: open-source scheduler; D|OSS AGPL, 37.4k★, pushed 2026-10-17|—|

Pick #1 unless you manage many brands with analytics (Metricool, connector "Metricool Social Media Management", connected, price [U]) or want a plain generic queue (Buffer).

## 3. Creative and media

### Video creation
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Remotion**: programmatic video in React, templated at scale; D|OSS 64.9k★, pushed 2026-10-18, source-available. Free for individuals, nonprofits and for-profits up to 3 staff; company licence above that|—|
|2|**HeyGen**: AI avatars, translation, talking-head video; S/T, NC|Free 3 videos/mo; Creator $29 ($24 annual). V|HyperFrames by HeyGen (HTML motion graphics only; no avatar connector found)|
|3|**Runway**: generative clips and editing; S/T, NC|Free 125 one-time credits; Standard $12 annual, $15 monthly. V|Runway (registry lists no tools, so working scope is [U])|

Pick #1 unless you need avatars or generative footage (HeyGen, Runway). Multi-model generation also works through "higgsfield" (connected).

### Image generation
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**OpenAI GPT Image**: text in images, editing, API; S/T/E, D|About $0.005 to $0.165 per image by quality [W]. V|—|
|2|**Midjourney**: strongest house style and aesthetics; S, NC|Basic $10/mo [W]; no official API [W]. V|—|
|3|**ComfyUI** (with Flux or other open models): local, free, total control; D|OSS GPL-3.0, 138.1k★, pushed 2026-10-18. Free plus your GPU|—|

Pick #1 unless art direction is the goal (Midjourney) or you need offline, free, private generation (ComfyUI). Claude can use "higgsfield" (connected) for multi-model image jobs and "Canva" for layout. The `black-forest-labs/flux` repo was last pushed 2025-07-31.

### Voice / TTS
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**ElevenLabs**: most natural voices, cloning, voice agents; S/T/E|Free 10k credits/mo; Starter $6/mo. V|ElevenLabs (voice-agent scope). The repo `elevenlabs/elevenlabs-mcp` is archived; avoid it|
|2|**OpenAI TTS**: cheap API voices; D|Price [U]. V|—|
|3|**Kokoro**: small open model, runs locally; D|OSS Apache-2.0, 9.4k★, last push 2025-08-06 (stale)|—|

Pick #1 unless you need the lowest per-character cost (OpenAI) or offline use (Kokoro). "Speko" (calls, transcribe, narrate) is another connector I did not vet.

### Transcription
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Deepgram**: fast, accurate API, streaming; D|$200 free credit; Nova-3 pre-recorded $0.0043/min. V|—|
|2|**Whisper family** (faster-whisper, whisper.cpp): private, local, free; D|faster-whisper MIT 25.9k★ pushed 2026-10-16; whisper.cpp MIT 54.5k★ pushed 2026-10-12; openai/whisper 110.8k★ pushed 2026-08-31|—|
|3|**AssemblyAI**: API with strong add-ons; D|$50 free credit; $0.15 to $0.21/hr. V|—|

Pick #1 unless the audio is meetings (Fathom, connector "Fathom – Your Meeting Intelligence Layer"; Fireflies, connector "Fireflies"; Otter, connector "Otter.ai") or must stay on your machine (Whisper).

## 4. Knowledge and work management

### Notes / knowledge base
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Notion**: notes, docs, databases in one; S/T/E, NC|Free; Plus €9.50/member. V|Notion; also makenotion/notion-mcp-server 4.7k★, MIT, pushed 2026-09-20|
|2|**Obsidian**: local markdown, private, plugin-rich; S, D-friendly|App free; Sync $4/mo annual; Publish $8/site annual; commercial licence optional $50/user/yr. V|—|
|3|**Joplin**: open-source notes with sync; S|OSS 56.8k★, pushed 2026-10-18, source-available|—|

Pick #1 unless you want local files and privacy (Obsidian). Evernote has a connector ("Evernote"), price [U].

### Docs / wiki
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Notion**: team wiki plus docs; T, NC|Free; Plus €9.50/member. V|Notion|
|2|**Confluence**: structured wiki tied to Jira; T/E|Price [U]. V|Atlassian MCP|
|3|**Outline**: self-hostable team wiki; T, D|OSS 40.9k★, pushed 2026-10-18, source-available. Hosted price [U]|—|

Pick #1 unless your engineering org lives in Jira (Confluence) or you must self-host (Outline). Google Docs has a connector ("Google Docs") if you already use Workspace.

### Project management
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Asana**: clear tasks, goals, portfolios; T/E, NC|Free Personal for 1 to 2 people; Starter $10.99/user annual, $13.49 monthly. V|Asana|
|2|**ClickUp**: deepest features for the price; T, NC|Free; Unlimited $7/user annual, $10 monthly (page also shows Core $9). V|ClickUp|
|3|**Plane**: open-source Jira/Linear alternative; T, D|OSS AGPL, 61.0k★, pushed 2026-10-18|—|

Pick #1 unless you are a software team (use Linear below) or want the cheapest feature-rich tool (ClickUp). monday.com has a connector ("monday.com"), price [U].

### Issue tracking
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Linear**: fast, opinionated engineering tracker; T, D|Free to 250 issues; Basic $10/user annual. V|Linear|
|2|**GitHub Issues + Projects**: zero extra tool if code is on GitHub; S/T|Included with repos [U exact limits]. V|GitHub (plugin); github/github-mcp-server 33.7k★, MIT, pushed 2026-10-15|
|3|**Jira**: enterprise workflows and reporting; E|Free for up to 10 users; Standard about $7.91/user [W]. V|Atlassian MCP|

Pick #1 unless the team is under five people already on GitHub (Issues) or you need enterprise workflow and audit (Jira).

### Automation / iPaaS
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**n8n**: powerful, self-hostable, AI nodes; T, D|OSS fair-code, 207.9k★, pushed 2026-10-18. Cloud Starter €20/mo annual, no permanent free cloud; Community Edition free to self-host. V|n8n|
|2|**Zapier**: most app coverage, easiest; S/T/E, NC|Free 100 tasks; Pro $19.99 annual, $29.99 monthly. V|Zapier|
|3|**Make**: visual scenarios, good value; S/T, NC|Free 1,000 credits/mo; Core price [U]. V|Make|

Pick #1 unless the builder is non-technical or needs a rare integration (Zapier).

## 5. Build and run software

### Databases (SQL)
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Supabase**: Postgres plus auth, storage, realtime; S/T, D|Free 50k MAU, 500 MB; Pro $25/mo. OSS Apache-2.0, 111.7k★, pushed 2026-10-18|Supabase (connected)|
|2|**Neon**: serverless Postgres with branching; T, D|Free permanent; paid is usage-based ($0.106 per CU-hour, no minimum). OSS Apache-2.0, 23.2k★, pushed 2026-08-31|Neon|
|3|**PlanetScale**: Postgres and MySQL at scale; T/E, D|Price [U]. V|PlanetScale|

Pick #1 unless you want only Postgres with cheap branches and scale-to-zero (Neon) or need MySQL at heavy scale (PlanetScale).

### Vector DB
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**pgvector** (inside Postgres): no new system to run; S/T, D|OSS 23.4k★, pushed 2026-10-18. Free in Supabase or Neon|via Supabase / Neon|
|2|**Qdrant**: fast filtered search, self-host or cloud; T/E, D|OSS Apache-2.0, 35.1k★, pushed 2026-10-18. Free 1 GB cloud cluster|— ; [gh] qdrant/mcp-server-qdrant 1.6k★, Apache-2.0, pushed 2026-09-04|
|3|**Pinecone**: fully managed, zero ops; T/E|Free 2 GB; Standard $50/mo minimum. V|— ; [gh] pinecone-io/pinecone-mcp 72★, Apache-2.0, pushed 2026-10-17|

Pick #1 unless you will exceed tens of millions of vectors or need heavy filtering (Qdrant), or want fully managed with no ops (Pinecone).

### Auth
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Clerk**: fastest drop-in UI, orgs, billing; S/T, D|50k monthly retained users free; Pro $25/mo ($20 annual); then $0.02 per extra user. V|Clerk (docs and snippets only)|
|2|**Better Auth**: auth library you own; D|OSS MIT, 30.3k★, pushed 2026-10-18|—|
|3|**WorkOS**: enterprise SSO and SCIM; T/E, D|Price [U]. V|WorkOS|

Pick #1 unless lock-in and cost matter (Better Auth), you are on Supabase already (Supabase Auth, 50k MAU free), or B2B customers demand SSO (WorkOS).

### Hosting (frontend)
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Vercel**: best Next.js experience, previews; S/T/E, D|Hobby free but non-commercial only; Pro $20 per developer seat. V|Vercel|
|2|**Cloudflare Pages / Workers**: cheapest at scale, global edge; S/T/E, D|Workers free 100k requests/day; paid $5/mo minimum. V|Cloudflare Developer Platform; cloudflare/mcp-server-cloudflare 4.4k★, Apache-2.0, pushed 2026-10-09|
|3|**Netlify**: simple static and Jamstack hosting; S/T, D|Price [U]. V|Netlify|

Pick #1 unless the site is commercial on a tight budget or traffic-heavy (Cloudflare).

### Hosting (backend / workers)
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Railway**: containers plus databases, simplest deploys; S/T, D|$5 trial credit, then Free ($1 credits) or Hobby $5/mo. V|Railway|
|2|**Cloudflare Workers**: stateless APIs, cron, edge compute; D|Free 100k requests/day; Paid $5 minimum with 10M requests. V|Cloudflare Developer Platform|
|3|**Render**: managed web services, cron, Postgres; S/T, D|Price [U]. V|Render|

Pick #1 unless the workload is stateless and request-heavy (Workers) or you want to self-host (Coolify, Apache-2.0, 63.1k★, pushed 2026-10-18). For durable background jobs see Trigger.dev (Apache-2.0, 16.6k★, pushed 2026-10-17).

### Observability / LLM tracing
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Langfuse**: traces, evals, prompts; T/E, D|Hobby 50k units/mo free; Core $29/mo. OSS 36.0k★, pushed 2026-10-18, self-host free|—|
|2|**LangSmith**: best for LangChain / LangGraph apps; T/E, D|Developer free (5k traces); Plus $39/seat. V|—|
|3|**Arize Phoenix**: open-source tracing and eval; D|OSS 11.9k★, pushed 2026-10-17, source-available|—|

Pick #1 unless your stack is LangChain-centric (LangSmith).

### Error tracking
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Sentry**: errors, performance, replay; S/T/E, D|Developer free; Team $29/mo ($26 annual). OSS 45.6k★, pushed 2026-10-18, source-available|Sentry|
|2|**Honeybadger**: simple errors, uptime, check-ins; S/T, D|Price [U]. V|Honeybadger|
|3|**Datadog**: full-stack observability; E|Price [U]. V|Datadog|

Pick #1 unless you already pay for Datadog or want a simpler flat-rate tool (Honeybadger).

### Feature flags
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**PostHog**: flags bundled with analytics and experiments; S/T, D|Free allowances [U exact flag quota]. OSS 40.3k★, pushed 2026-10-18|PostHog|
|2|**GrowthBook**: flags plus warehouse-native experiments; T, D|Free up to 3 users; Pro $40/seat. OSS 8.5k★, pushed 2026-10-17|—|
|3|**LaunchDarkly**: enterprise governance and audit; E|Developer free; Foundation from $10 per service connection/mo (yearly). V|—|

Pick #1 unless you need enterprise approvals and audit trails (LaunchDarkly). Unleash is the open-source alternative (AGPL, 13.9k★, pushed 2026-10-16). "Wingify" (VWO) is a flags and A/B connector I did not vet.

### CMS
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Sanity**: structured content, real-time editing; T/E, D|Free with 20 seats; Growth $15/seat. OSS MIT, 6.4k★ (studio repo), pushed 2026-10-17|Sanity|
|2|**Payload**: code-first CMS inside your Next.js app; D|OSS MIT, 45.3k★, pushed 2026-10-17. Pricing page 404, so [U]|—|
|3|**Contentful**: enterprise headless CMS; E|Price [U]. V|Contentful MCP|

Pick #1 unless you want the CMS in your own repo and database (Payload) or a plain blog for non-technical authors (WordPress.com via connector "WordPress.com", or self-hosted Ghost, MIT, 55.6k★, pushed 2026-10-18).

### Website builder
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Framer**: design-grade marketing sites fast; S/T, NC|Free; Basic $10/mo; Pro $30/mo. V|—|
|2|**Webflow**: CMS-heavy and agency sites; T/E, NC|Free Starter; Basic about $15/mo annual [W]. V|Webflow|
|3|**Wix**: all-in-one with bookings and stores; S, NC|Price [U]. V|Wix|

Pick #1 unless the site is CMS-heavy or agency-run (Webflow) or you sell products (Shopify above).

### App builder (AI)
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Lovable**: prompt to full-stack app with backend; S/T, NC|Free daily credits (up to 30/mo); Pro price [U]. V|Lovable (connected)|
|2|**v0**: React/Next.js UI and apps on Vercel; S/T, D|Free 7 messages/day; Premium $30/user. V|v0|
|3|**Replit**: build, host and run in one place; S/T|Price [U]. V|Replit|

Pick #1 unless you want code that fits a Next.js and Vercel stack (v0) or an all-in-one runtime (Replit). Base44 ("Base44") is another connector I did not vet.

### Coding agent
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Claude Code**: agentic terminal and IDE coding; S/T/E, D|Pro $20/mo ($17 annual) includes it; Max from $100. V. anthropics/claude-code 152.2k★, pushed 2026-10-17, no license field|native; add GitHub MCP|
|2|**OpenAI Codex**: agentic CLI and cloud coding; S/T/E, D|OSS Apache-2.0, 129.7k★, pushed 2026-10-18. Plan price [U]|—|
|3|**Cursor**: IDE-first editing and autocomplete; S/T/E, D|Free tier; paid tiers from $8 up to $200 per the page (plan names unclear). V|—|

Pick #1 unless you prefer a full IDE with inline completions (Cursor) or want a model-agnostic open agent (OpenCode, MIT, 215.9k★, pushed 2026-10-18; Cline, Apache-2.0, 70.5k★).

### Browser automation
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Playwright (+ Playwright MCP)**: reliable scripted control; D|OSS Apache-2.0, 98.0k★, pushed 2026-10-17; MCP repo 38.3k★, pushed 2026-10-16. Free|[gh] microsoft/playwright-mcp|
|2|**browser-use**: LLM-driven agent for unknown sites; D|OSS MIT, 118.4k★, pushed 2026-10-17|—|
|3|**Browserbase (+ Stagehand)**: hosted browsers, anti-bot, scale; T/E, D|Free; Developer $20/mo. Stagehand MIT, 25.7k★, pushed 2026-10-17|— ; mcp-server-browserbase repo is archived|

Pick #1 unless the target sites change often (browser-use, Stagehand) or you need cloud scale and CAPTCHA-handling (Browserbase). "TinyFish" is a hosted alternative connector I did not vet.

### Web scraping
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Firecrawl**: URL to clean markdown, crawl, search; S/T, D|Free 1,000 credits; Hobby $16 annual, $19 monthly. OSS AGPL, 192.6k★, pushed 2026-10-18|Firecrawl; firecrawl-mcp-server 7.6k★, MIT, pushed 2026-10-18|
|2|**Crawl4AI**: free, self-hosted LLM crawler; D|OSS Apache-2.0, 85.8k★, pushed 2026-10-15|—|
|3|**Apify**: ready-made scrapers for specific sites; T, NC and D|Free $5 usage/mo; Starter $19/mo. V|—|

Pick #1 unless volume makes per-credit pricing hurt (Crawl4AI) or you need a premade scraper for one named site (Apify).

### Search API for LLMs
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Exa**: semantic search, strong for research; D|Free $10 credit monthly; $4 per 1k instant, $7 per 1k auto. V|Exa (connected); exa-mcp-server 5.1k★, MIT, pushed 2026-10-07|
|2|**Tavily**: search plus extract, crawl, research in one; D|1,000 free credits/mo; $0.008 per credit. V|Tavily; tavily-mcp 2.4k★, MIT, pushed 2026-10-15|
|3|**Brave Search API**: independent index, cheap, private; D|$5 free credit monthly; $5 per 1k searches. V|—|

Pick #1 unless you want an all-in-one search-and-extract agent toolkit (Tavily) or lowest cost with a broad web index (Brave). "Parallel Search" is a free connector I did not vet.

## 6. Business operations

### Spreadsheets
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Google Sheets**: collaboration, free, scriptable; all, NC|Free with a Google account. V|Google Sheets|
|2|**Airtable**: spreadsheet-database hybrid, forms and views; T, NC|Free; Team $20/user annual. V|Airtable|
|3|**NocoDB**: open-source Airtable-style layer over your SQL; T, D|OSS 65.3k★, pushed 2026-10-18, source-available|—|

Pick #1 unless the data is relational and needs views and forms (Airtable). Microsoft Excel suits Microsoft 365 shops; I found no registry connector and the price is [U].

### E-signature
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**DocuSign**: the legal-default for enterprise contracts; T/E, NC|Price [U] (redirect not read). V|Docusign|
|2|**DocuSeal**: open-source signing with API; S/T, D|OSS AGPL, 18.7k★, pushed 2026-10-12. Price [U]|DocuSeal|
|3|**Documenso**: open-source, cheap; S/T, D|Free 5 docs/mo; Individual $25, Teams $40/mo. OSS AGPL, 15.5k★, pushed 2026-10-18|—|

Pick #1 unless cost or self-hosting matters (DocuSeal / Documenso) or you need proposals with signing (PandaDoc, connector "PandaDoc").

### Accounting
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Xero**: bank feeds, multi-currency, accountant-friendly; S/T, NC|US Early $27, Growing $59, Established $97/mo (intro discount first 3 months). V|Xero|
|2|**QuickBooks Online**: US default for small business; S/T/E, NC|Simple Start $38, Essentials $85, Plus $140 regular (50% off first 3 months). V|Intuit QuickBooks|
|3|**Zoho Books**: low cost, strong if you use Zoho; S/T, NC|Price [U]. V|Zoho Books|

Pick #1 unless your US accountant requires QuickBooks. For EU books, confirm local e-invoicing and VAT support first [U]. Akaunting is an open-source option (source-available, 10.2k★, pushed 2026-10-08).

### Invoicing
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Stripe Invoicing**: invoices that collect payment; S/T, NC and D|Per-invoice fee [U]. V|Stripe|
|2|**FreshBooks**: freelancer invoicing, time, estimates; S, NC|Price [U]. V|FreshBooks|
|3|**Invoice Ninja**: open-source, self-hostable; S/T, D|OSS 10.3k★, pushed 2026-10-18, source-available|—|

Pick #1 unless your books already live in Xero or QuickBooks (use their invoicing) or you invoice from an EU business bank (Qonto, connector "Qonto").

### Payroll (US)
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Gusto**: SMB payroll, tax filing, benefits; S/T, NC|Simple $49/mo + $6 per employee [W; some sources say $40]. V|Gusto|
|2|**Deel (US PEO / contractors)**: mixed contractors and employees|Contractors $49/mo each; US PEO $125 per employee/mo. V|Deel|
|3|**Rippling**: payroll bundled with HR and IT; T/E|Price [U]. V|—|

Pick #1 unless you pay contractors abroad (Deel) or want HR and device management bundled (Rippling). Payroll moves money and files taxes, so keep a human approval step.

### Payroll (EU)
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Deel (EOR)**: hire in any EU country without an entity; T/E|EOR $599 per employee/mo; contractors $49. V|Deel|
|2|**Remote (EOR)**: similar EOR with a payroll connector; T/E|Price [U]. V|Remote|
|3|**Personio**: HR plus payroll for EU companies with their own entity; T/E|Sales-quoted, no reliable public price [U]. V|—|

Pick #1 unless you already have a local entity (use Personio or a local payroll provider/accountant) or EOR cost is too high. Rules differ per country, so confirm with a local adviser.

### File storage
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**Google Drive**: collaboration and sharing; S/T/E, NC|15 GB free; 2 TB shown at €9.99/mo bundled in a Google plan [U standalone]. V|Google Drive (connected)|
|2|**Dropbox**: reliable sync; S/T|2 GB free; Plus €9.99/mo for 2 TB. V|Dropbox|
|3|**Cloudflare R2**: app object storage with no egress fees; D|10 GB, 1M writes free; $0.015 per GB-month. V|Cloudflare Developer Platform|

Pick #1 unless you build apps needing S3-style storage (R2), run Microsoft 365 (OneDrive, no registry connector found), or need enterprise governance (Box, connector "Box").

### Password / secrets management
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**1Password**: team vaults plus developer secrets tooling; S/T/E, NC and D|Individual $3.99/mo regular ($2.99 promo, annual); Teams price not read [U]. V|—|
|2|**Bitwarden**: open-source, cheapest team vault; S/T|Free; Premium $19.80/yr; Teams $4/user/mo annual. clients 14.0k★, pushed 2026-10-17|[gh] bitwarden/mcp-server 280★, GPL-3.0, pushed 2026-10-13|
|3|**Infisical**: app and CI secrets for developers; T, D|Free 5 identities; Pro $20 per identity/mo annual. OSS 29.8k★, pushed 2026-10-17, source-available|[gh] Infisical/agent-vault 2.4k★|

Pick #1 unless budget or open source is key (Bitwarden) or you only need app/CI secrets (Infisical; HashiCorp Vault for enterprise, 36.4k★, source-available). Never paste secrets into a chat; use references or environment variables.

### CI/CD
|#|Option|Price / trust|Connector|
|-|-|-|-|
|1|**GitHub Actions**: native to GitHub repos; S/T/E, D|2,000 free private minutes (Free), 3,000 (Pro/Team); public repos free; Linux 2-core $0.006/min. V|GitHub (plugin); github/github-mcp-server|
|2|**GitLab CI**: built into GitLab, strong for self-managed; T/E, D|Price [U]. V|—|
|3|**CircleCI**: fast pipelines, mature caching; T/E, D|Price [U]. V|CircleCI|

Pick #1 unless your code is on GitLab (GitLab CI) or you ship mobile apps (Bitrise, connector "Bitrise MCP"; Expo, connector "Expo"). For portable pipelines see Dagger (Apache-2.0, 16.3k★, pushed 2026-10-18).

## Gaps to close before relying on this file
- `[U]` prices should be refreshed from vendor pages. `[W]` figures came from third-party sources only.
- Registry `—` entries mean the 2026-10-18 search found nothing, not that no connector exists.
- Cal.com's closure to open source and Webflow's May 2026 plan changes come from secondary sources.
