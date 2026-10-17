# tiabwft: There Is A Better Way For That

A Claude Code plugin that changes how Claude works. Every time you ask something, Claude also asks itself **"is there a better way for that?"** It does your task as usual, then adds up to 3 concrete suggestions:

- which **AI model** or service fits the job best
- which **stack** or **cloud** to run it on
- which **connectors** (HubSpot, Obsidian, Gmail, Supabase…) to plug in
- which **skills and plugins** to install, including ones other people published on GitHub
- how to spend fewer **tokens**: the right model, effort, settings and plan
- how to make the whole process easier, faster and smarter

Example: you ask "I want to build an agent". Claude researches live (connector registry, plugin and skill search, the web) and checks what you already have. Then it answers with a recommended stack: model, where to run it, connectors, skills, and the one step to start with.

```
💡 There's a better way
1. Claude Agent SDK: a full agent loop with tools built in, no framework glue. → npm i @anthropic-ai/claude-agent-sdk
2. HubSpot connector: the agent reads and updates your CRM directly. → add it in claude.ai › Connectors
3. small-business:build-agent (already installed): walks you through the agent design. → /build-agent
```

## Install

```bash
/plugin install tiabwft --marketplace costello88/tiabwft
```

Answer `y` to add the marketplace, then pick a scope.

## Use

| Command | What it does |
|---|---|
| `/tiabwft` | shows whether it's on |
| `/tiabwft off` | mutes suggestions for this session |
| `/tiabwft on` | turns them back on |
| `/tiabwft panel` | opens the side panel with the latest suggestion |

The **Suggestion mode** setting (in the plugin's config) can be `always` (default), `big-asks-only` (only for goals like building or automating), or `off`.

## How it works

- `hooks/register.ts` adds a short instruction to Claude's system prompt on every turn, so the behavior is always on.
- `skills/tiabwft/SKILL.md` holds the full research method. Claude loads it for bigger goals.
- `skills/tiabwft/references/catalog.md` is a starter map from goals to connectors and skills. Edit it to add your favourites.
- `skills/tiabwft/references/community.md` maps what other people have built: the main plugin marketplaces, skill collections, awesome lists and MCP servers, plus `gh search` queries Claude runs live to find new ones.
- `skills/tiabwft/references/models-and-costs.md` covers which model to use, prices, token savers, Claude Code settings and plans.
- `skills/tiabwft/references/mcp-use-cases.md` lists jobs and the MCP servers for them in 14 domains (dev, sales, marketing, content, support, ops, finance, e-commerce, data, productivity, research, cloud, memory, automation), plus power combos and safety notes.
- `skills/tiabwft/references/build-stacks.md` is a decision guide for agent frameworks, hosting, memory/RAG, app builders and evals, with 5 ready starter stacks.
- `skills/tiabwft/references/trending-stacks.md` covers the stacks and workflows trending on YouTube and in the builder community, with hype and security warnings.

### Live session facts
Every turn, the hook also tells Claude which model is in use. It adds a tip when it's worth acting on: the context is over 60% full, the session has cost over $5, $20 or $50, over 70% of the plan's usage limit is used, or more than 80 connector tools are loaded. These lines only change when a threshold is crossed, so they don't break prompt caching.

**Note:** where an organization manages Claude Code, system-prompt hooks only run for plugins the organization lists in managed settings.

## Develop

Every PR to `main` runs [CI](.github/workflows/ci.yml). To run the same checks locally:

```bash
claude plugin validate . && claude plugin test .
npx markdownlint-cli2 && node scripts/check-references.mjs
```

`check-references.mjs` fetches every `Source:` URL in the references and fails on a 404, so a refresh can't cite a page that doesn't exist.

## Side panel

Next to the chat, the **💡 Better way** panel always shows the latest stack suggestion: its goal, the time and the full block, rendered as markdown. It opens when a session starts and updates after every answer that carries a 💡 block, so a tip stays visible after the chat has scrolled on. Reopen it with `/tiabwft panel`. Subagent replies and interrupted turns don't replace it.

## Memory

tiabwft learns, automatically, what you use, what you chose, what you don't want and your constraints, and uses that in every suggestion: it builds on what you have, never brings back a tool you turned down, and keeps picks within your budget.

- **Where:** this project's memory lives in `.claude/tiabwft/memory.md`, a readable file you can edit. Lines it can't read are never deleted: they move, unchanged, under a last heading `## Couldn't read (kept as written)`, which tiabwft doesn't parse. The file is only rewritten when its content changes. Your personal profile (budget, skill level, general preferences) is kept in the plugin's local storage on your computer, and only leaves it when you turn on Azure sync, which then stores both in your own Azure.
- **How:** at the start of a session it reads your connectors, `package.json`, Python files, compose files and the *names* in `.env.example`, never values. What it finds there is found again at every start, so it is never written to `memory.md`: the file holds only what you said or added, and doesn't list your connectors. After a turn with a prompt of 40 characters or more, or an answer with a 💡 block, a small model (Haiku) reads just your prompt and the final answer in the background and picks out facts worth keeping. That's roughly 3,000 tokens in and a few hundred out per turn, a fraction of a cent at Haiku prices.
- **When Claude sees it:** what tiabwft knows goes into Claude's instructions once, at the start of a session. What it learns in the background during a session updates the file and the panel right away, but reaches Claude's instructions at the next session: changing them mid-session would make Claude re-read the whole conversation at full price (it breaks prompt caching), and what you said this session is in the conversation anyway. Your own changes (`remember`, `forget`, `memory reset confirm`, ✕ in the panel) apply right away.
- **Control:** the panel's 🧠 What I know section (open it with `/tiabwft panel`) lists everything, with ✕ to delete. `/tiabwft memory`, `/tiabwft forget <text>`, `/tiabwft remember <text>`, `/tiabwft memory off` (pause for this session) and `/tiabwft memory reset`.
- **Settings:** `memory` (`on` by default, or `off`), `projectFile` (`commit` by default, or `ignore`, which adds the file to `.gitignore`), and optional Azure sync (`azureSyncUrl`, `azureSyncKey`; both empty by default; see `azure/README.md`). With sync on, your edits to `memory.md` win: a line you changed or deleted by hand stays that way, and only facts learned after the file was last changed come in from Azure.

## License

[MIT](LICENSE)
