---
name: tiabwft
description: >-
  There Is A Better Way For That. Research and recommend the smartest setup for what the user wants to do: which AI model, stack, cloud or host, connectors (MCP servers), skills and plugins, and workflow changes would make it faster, easier or smarter. Use when the user wants to build an agent, app, automation or workflow, asks "what should I use", "what's the best way", "which stack/cloud/AI", or when a request clearly has a better setup than doing it by hand. Gives the whole stack: model, automation, connectors, skills and plugins, GitHub repos, data, cost and safety.
---

# There is a better way for that

The user doesn't only want the task done. They want the **easiest, fastest, smartest way** to do it. Your job is to be their stack advisor: spot the better way, check it really exists, and hand it over in a form they can act on in one step.

Keep doing the actual task too. Suggestions come **in addition to** the answer, not instead of it.

## Knowledge files
Read only the file the request needs. They're snapshots, so check anything time-sensitive live.

| File | Read it when |
|---|---|
| `references/catalog.md` | a quick first map from a goal to connectors and skills |
| `references/mcp-use-cases.md` | choosing connectors: 14 domains of jobs and the MCP servers for them, power combos, MCP safety |
| `references/build-stacks.md` | building an agent or app: frameworks, hosting, memory/RAG, app builders, evals, SaaS defaults, 5 starter stacks |
| `references/trending-stacks.md` | "what are people using", popular workflows, Claude Code tips, hype and security warnings |
| `references/community.md` | finding plugins, skills, marketplaces and MCP servers other people published; live `gh` searches |
| `references/models-and-costs.md` | model choice, prices, token savers, Claude Code settings, plans |

## Method

### 1. Name the real goal
Write one line for yourself: what is the user really trying to achieve? ("Wants leads from the website to land in a CRM automatically", not "asked about a form handler".) Suggest for that goal, not just the literal ask.

### 2. Check what they already have
Before you recommend anything, look at what is installed so you don't suggest it twice. Turn what's there into "use this":
- connected MCP servers and connectors (the tools in this session; the `mcp-registry` `list_connectors` tool if available)
- `ListPlugins` and `ListSkills` when available
- the project itself: package.json, requirements, config files, CLAUDE.md

### 3. Research live, not from memory
Tools, models and prices change fast. Use whatever of these this session has:
- **Connectors**: `mcp-registry` → `search_mcp_registry` / `suggest_connectors`
- **Plugins and skills**: `SearchPlugins`, `SearchSkills` (`SuggestPluginInstall` / `SuggestSkills` render an install card, so use them when a result fits)
- **AI models, clouds, services, pricing**: `WebSearch` (standard mode first). For Claude models and the Claude API / Agent SDK, use the `claude-api` skill or the `claude-code-guide` agent instead of guessing.
- **What other people built (GitHub)**: when `gh` is available, search the community live for plugins, skills, MCP servers and agent templates on the topic. Use the queries in `references/community.md` and prefer repos with real stars and a recent push. Read a repo's README before you recommend it, and link it rather than copying from it.
- `references/catalog.md` next to this file is a starting map of common goals, and `references/community.md` lists the known community marketplaces, skill collections and awesome lists. Treat both as hints to verify, not as the answer.

Never recommend something you couldn't confirm exists. Say so when a pick is your judgment rather than a checked fact. Only suggest installing code from a repo that is well known, maintained and has a readable source.

### 3b. Check the cost side
Every request has a cost side too: which model, how many tokens, which settings. The always-on section gives you **live session facts**: the model in use, and tips when the context fills up, the cost climbs or the usage limit gets close. Use them together with `references/models-and-costs.md` to suggest:
- a better-fitting model for this kind of work (and a cheaper one for subagents or bulk work),
- token savers (`/compact`, `/clear`, subagents, lower effort, fewer loaded connectors, a lean CLAUDE.md),
- settings that help this user (permissions allow-lists, a status line with cost, hooks, plan choice).
Only bring these up when they make a real difference for this request.

### 4. Pick the easiest path
Prefer, in this order:
1. something already installed that the user isn't using,
2. a one-click connector or plugin,
3. a managed service over self-hosting,
4. custom code only when nothing else fits.

Cover the layers that matter for this goal, and skip the rest:
| Layer | Examples of what to decide |
|---|---|
| AI / model | which Claude model (or other AI) fits the cost, speed and quality needed; what it will roughly cost |
| Cost / settings | effort level, caching, batch, subagent model, Claude Code settings, which plan |
| Where it runs | local Claude Code, Claude Agent SDK, Managed Agents, a cloud host, scheduled/cloud routines |
| Connectors | the CRM, notes, docs, email, calendar, database, payments it should talk to |
| Skills / plugins | packaged workflows that do this job already |
| Workflow | memory (Obsidian, an LLM wiki), automations, side sessions, hooks |

### 5. Hand it over: the whole stack
Never stop at one tool. Give the full stack that makes the job better end to end, in the user's language:

**💡 There's a better way**

**Goal:** <one line: what the user is really trying to achieve>

| Layer | Pick | Why | How to add | Status |
|---|---|---|---|---|
| 🤖 AI / model | … | … | … | … |
| ⚙️ Runs on / automation | … | … | … | … |
| 🔌 Connector: <system> | … (one row per system the job touches) | … | … | … |
| 🧩 Skill / plugin | … | … | … | … |
| 📦 From GitHub | owner/repo (★ stars, pushed month) | … | … | … |
| 🧠 Data / memory | … | … | … | … |
| 📊 Monitoring / cost | … | … | … | … |
| 🛡️ Safety | … | … | … | … |

Status is "already installed", "installed, needs login" or "new". Drop rows that don't matter for this goal; add rows for any other system the job touches.

**Flow:** <how the pieces chain: website form → automation → CRM → chat alert → weekly report>

**Alternatives:** <one line: the cheaper/simpler stack, and the bigger/pro one>

**Start here:** <the single first step to take now>

Fill every row from a lookup (registry, plugin and skill search, `gh search`) or the reference files. Render `suggest_connectors` / `SuggestPluginInstall` / `SuggestSkills` cards for the strongest new picks. Then carry on with the actual task, or offer to set up the first step.

## Rules
- One clear pick per row, with the reason. Cover the whole job, but skip padding: a row that doesn't help this goal goes.
- Be specific: "connect the HubSpot connector", not "use a CRM".
- Mark things the user already has as "(already installed)".
- Don't install, connect or buy anything without the user's yes. Suggest it, and offer to do it.
- No suggestion is better than a padded one. If the user's current way is already the best, say so in one line.
- Trending isn't the same as right. Recommend a popular stack only when it fits the user's goal, budget and skill level, and pass on the relevant safety warning (untrusted skills, broad tokens, unsandboxed agents).
