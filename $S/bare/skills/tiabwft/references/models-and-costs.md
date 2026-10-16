# Models, token spend and settings

Checked against the official docs on **2026-10-16**. Prices and limits change, so for an exact figure, check the source link (or the `claude-api` skill) before quoting it. Items marked *(unverified)* could not be confirmed.

## Which model
Sources: platform.claude.com/docs/en/models/overview, platform.claude.com/docs/en/about-claude/pricing

| Model | ID | $ per M tokens in / out | Batch in / out | Pick it for |
|---|---|---|---|---|
| Fable 5.1 | claude-fable-5-1 | 10 / 50 | 5 / 25 | the hardest reasoning and long agent runs, when Opus at high effort still falls short |
| Opus 5.5 | claude-opus-5-5 | 4 / 20 | 2 / 10 | the default: long agentic coding and knowledge work |
| Sonnet 5.5 | claude-sonnet-5-5 | 2 / 10 | 1 / 5 | everyday coding, smart subagents, about half the price of Opus |
| Haiku 5.5 | claude-haiku-5-5 | 0.10 / 0.50 (≤100K prompt), 0.50 / 2.50 above | 0.05 / 0.25 | bulk classification, extraction, routing, cheap subagents |

All four have a 1M context window, 128K max output, tools, images and adaptive thinking (which can't be turned off).

**Rules of thumb**
- Plan on a big model, execute on a cheaper one: `/model opusplan` uses Opus in plan mode and Sonnet for the work.
- Subagents inherit the main model unless their frontmatter sets `model: haiku` or `model: sonnet`. This is the biggest lever for agents that fan out.
- A quick edit or question on Fable or Opus is overkill: suggest `/model sonnet`. Something hard that keeps failing on Sonnet or Haiku: suggest Opus, or Opus at a higher effort.

## Spending fewer tokens in Claude Code
Source: code.claude.com/docs/en/costs

| Lever | How | When to suggest it |
|---|---|---|
| See spend | `/usage` (`/context` for what fills the window) | the user asks about cost or limits |
| New topic | `/clear` (`/rename` and `/resume` to come back later) | the conversation has moved on to unrelated work |
| Shrink context | `/compact <what to keep>` | over about 60% full and the same task continues. Compacting is itself a big request |
| Auto-compact point | `/autocompact 500k` or `"autoCompactWindow": 200000` (100K–1M) | long sessions |
| Effort | `/effort low`, or `"effortLevel": "medium"` (low to xhigh; max only per session) | simple work at high effort, or hard work at low effort |
| Fast mode | `/fast` | Opus 5.5 only, at $8 / $40 per M tokens: speed costs more. Subscriptions need usage credits |
| Subagents | the Agent tool with `model: haiku` / `sonnet` | research or fan-out work. Only the summary comes back into the main context |
| Explore agent | built-in, read-only, levels quick / medium / very thorough | broad searches of a codebase |
| CLAUDE.md | keep it under about 200 lines and move workflow details into skills (they load on demand) | CLAUDE.md is long |
| Connectors | `/mcp` to turn off servers you don't use; `MAX_MCP_OUTPUT_TOKENS` (default 25,000) | many MCP tools loaded |
| Plan mode | Shift+Tab | big changes: explore before editing |
| Output style | `/output-style concise` | the user wants short answers. Explanatory and Learning styles cost more |
| Hooks | a `PreToolUse` hook that trims noisy test output | test runs fill the context |

## Claude Code settings worth knowing
Sources: code.claude.com/docs/en/settings, /settings-reference, /permission-modes, /statusline

Precedence, highest first: managed settings, then `--settings`, then `.claude/settings.local.json`, then `.claude/settings.json`, then `~/.claude/settings.json`.

| Key | What it's for |
|---|---|
| `model`, `effortLevel`, `outputStyle`, `fastMode`, `autoCompactWindow` | defaults for the levers above |
| `permissions.allow` / `ask` / `deny` | for example `"Bash(npm run lint)"` in `allow` stops repeat prompts for safe commands. The `fewer-permission-prompts` skill builds this list from your history |
| `permissions.defaultMode` | `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`. Only recommend `bypassPermissions` inside a sandbox or a throwaway container |
| `statusLine` | `{"type":"command","command":"..."}`. It can show `cost.total_cost_usd`, `context_window.used_percentage` and `rate_limits.five_hour.used_percentage`, so the user sees spend all the time |
| `env`, `hooks` | environment variables and lifecycle hooks *(full schemas unverified; see the settings docs)* |
| `cleanupPeriodDays` | how long session history is kept (default 30) |
| `attribution.commit` / `attribution.pr` | commit and PR credit lines (replaces the deprecated `includeCoAuthoredBy`) |
| `sandbox.enabled` | sandboxed Bash; docs list macOS, Linux and WSL2 *(native Windows unverified)* |
| `disabledMcpjsonServers`, `disableClaudeAiConnectors` | switch off MCP servers or claude.ai connectors |

## When building on the API
Sources: platform.claude.com/docs/en/build-with-claude/prompt-caching, /batch-processing, /token-counting

- **Prompt caching**: writes cost 1.25× input (5-minute TTL) or 2× (1-hour TTL); reads cost 0.1× (0.05× on Opus and Sonnet 5.5, 0.025× on Fable 5.1). The minimum cacheable size is 512 tokens; there are at most 4 breakpoints. Order: tools, system, messages. A change early in that order invalidates everything after it, so keep varying text late.
- **Batch API**: 50% off; up to 100,000 requests or 256 MB per batch; most batches finish within an hour. Use it for anything that doesn't need an instant answer. *(Whether it stacks with caching is unverified.)*
- **Token counting**: `POST /v1/messages/count_tokens` is free (with its own rate limits). Count against the model you'll actually use.
- **Thinking**: on the 5.x models, use `thinking: {type: "adaptive"}` with an effort level. The old `budget_tokens` style returns an error.

## Which plan
Source: claude.com/pricing (check it for current prices)

| Plan | Roughly | Best for |
|---|---|---|
| Pro | $20/mo ($17/mo yearly) | light or part-time Claude Code use |
| Max (5× / 20×) | from $100/mo | all-day Claude Code use; keeps hitting Pro limits |
| Team Standard / Premium | $25 / $125 per seat per month ($20 / $100 yearly) | teams; Premium has 5× the usage |
| Enterprise | $20/seat plus usage at API rates, 20-seat minimum | larger organisations |
| API (pay per token) | per token | CI, scripts, batch jobs, products you ship |

When someone keeps hitting limits on Pro, compare: is Max cheaper than their overflow? Can a cheaper model or lower effort do the job?
