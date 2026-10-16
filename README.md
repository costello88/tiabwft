# tiabwft: There Is A Better Way For That

A Claude Code plugin that changes how Claude works. Every time you ask something, Claude also asks itself **"is there a better way for that?"** It does your task as usual, then adds up to 3 concrete suggestions:

- which **AI model** or service fits the job best
- which **stack** or **cloud** to run it on
- which **connectors** (HubSpot, Obsidian, Gmail, Supabase…) to plug in
- which **skills and plugins** to install
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

The **Suggestion mode** setting (in the plugin's config) can be `always` (default), `big-asks-only` (only for goals like building or automating), or `off`.

## How it works

- `hooks/register.ts` adds a short instruction to Claude's system prompt on every turn, so the behavior is always on.
- `skills/tiabwft/SKILL.md` holds the full research method. Claude loads it for bigger goals.
- `skills/tiabwft/references/catalog.md` is a starter map from goals to connectors and skills. Edit it to add your favourites.

**Note:** where an organization manages Claude Code, system-prompt hooks only run for plugins the organization lists in managed settings.

## Roadmap

- v2: a side panel that always shows the latest optimization suggestion.
