# Trending stacks: what builders are using right now

Snapshot from **2026-10-16**, built from YouTube titles and descriptions, blogs, dev.to and partial Reddit coverage. The videos themselves weren't watched. "Signal" means how often a pattern showed up across sources, not measured popularity. Star counts, security incidents and usage figures come from those sources and weren't independently verified. Use this to know what people are talking about, then judge for the user's actual goal. Trending isn't the same as right for them.

## Stacks that keep showing up
| Stack | For | What each piece does | Signal |
|---|---|---|---|
| **Claude Code as orchestrator + Codex as executor + Cursor for inline review** ("staff a team") | professional devs | Claude plans and hands off; Codex runs closed tasks in a sandbox; Cursor does completions and diffs | very high |
| **Claude Code + a skills framework** (obra/superpowers, GSD, gstack, often combined) | devs, vibe coders | Superpowers enforces TDD; GSD fights context rot with specs; gstack sets role and stack guardrails | high |
| **Claude Code + Supabase + Vercel (+ Stripe)** for SaaS MVPs | indie hackers, founders | Claude builds; Supabase handles auth and the database; Vercel deploys; Stripe takes payments | high, evergreen |
| **Claude Code + the core MCP set**: GitHub, Context7, Playwright, Supabase/Postgres, Figma | devs | PRs and issues; current docs; browser tests; database; design to code | high; every "best MCP servers" list has it |
| **Obsidian + Claude Code "second brain"** (Karpathy-style LLM wiki) | knowledge workers, creators | raw sources, then wiki pages, plus a CLAUDE.md of rules; commands ingest links and transcripts | high, with growing "overengineered" pushback |
| **Always-on personal agent** (Hermes Agent or OpenClaw on a cheap VPS, used through WhatsApp, Telegram or Slack) | solo builders, ops | scheduled reports, memory, chat channels | very high; see the security warnings below |
| **Claude Code routines, scheduled tasks and `/goal`** ("proactive agents") | devs, ops | cloud or scheduled runs that triage issues, open PRs and fix CI; Remote Control from a phone | rising |
| **Dynamic workflows**: one prompt fanned out to parallel agents with a coordinator | intermediate to advanced | | new, medium |
| **A custom subagent "team"** (planner, reviewer, tester, researcher) | devs | separate context windows; read-only explorers on cheaper models | high |
| **n8n for fixed pipelines + Claude for judgment** | automation agencies | n8n handles volume, triggers and integrations; Claude does the reasoning | medium-high ("is n8n dead?" debate) |
| **Claude Code + ElevenLabs + a video renderer + the YouTube API** for AI video | creators | script, voice, render, upload | niche |
| **Faceless YouTube automation** (Claude + ElevenLabs + a video tool + n8n, about $50–150/mo) | creators | | medium; mostly affiliate content |
| **One portable SKILL.md folder** shared by Claude Code, Codex and other agents | power users | write a skill once, link it into every tool | rising |
| **AGENTS.md next to CLAUDE.md** in repos that use two tools | teams | Codex reads AGENTS.md; Claude Code can fall back to it | medium |
| **Parallel agents in git worktrees** (Claude Code desktop, Cursor, Codex, Conductor and others) | devs | one agent per worktree; run tests before merging | rising, near-standard |
| **Open or multi-model harnesses** (OpenCode, Codex CLI, Gemini CLI, Qwen Code, goose) | cost-conscious devs | coding agents that work with any provider | medium-high |
| **Issue-driven dispatch** (a ticket becomes a workspace, then a PR: Cursor cloud agents, Copilot delegation) | teams | | emerging |

## Claude Code tips creators repeat
- **Put each thing where it belongs.** CLAUDE.md holds what Claude must always know (build commands, conventions). Skills hold on-demand know-how. Hooks hold rules that must always hold (never touch `.env`, lint after edits). Subagents take noisy research and return a summary. MCP connects external systems.
- **Keep CLAUDE.md lean**: it loads every session. Keep skills under about 500 lines and split detail into reference files.
- **Plan mode first**, and give Claude a way to check its own work (tests, UI checks). Verification is the biggest quality lever.
- **Route models and effort.** Default to Sonnet and save Opus for hard work. Read-only exploration goes on a cheaper model. Use medium effort for simple edits and high effort for cross-file changes. Ten parallel agents burn quota about ten times as fast.
- **Worktrees** for parallel sessions, with tests or lint run before merging.
- **MCP picks**: GitHub, Context7, Playwright, Supabase. A filesystem MCP is mostly redundant inside Claude Code.
- **Newer features worth knowing**: routines and scheduled tasks, Remote Control, `/goal`, mods (TypeScript plugins), and managed settings that pin or deny models.
- **Long-running agents**: hand off context through memory files.
- Tip collections: ykdojo/claude-code-tips on GitHub, plus monthly "Claude Code cheat sheet" posts on dev.to.

## Rising and falling
- **Rising:** Hermes Agent and OpenClaw (always-on agents), OpenCode and other multi-model CLIs, Codex as the "executor", skills frameworks and portable skills, multi-agent worktree apps, "harness engineering" as a named discipline.
- **Falling or stalling:** Aider (community maintenance), Gemini CLI's free tier (ended for individuals in June), standalone n8n tutorials (people are moving to Claude Code, though hybrids remain), paying for a separate AI editor when most diffs come from CLIs, elaborate second-brain setups.
- **Switching:** people who hit Claude's 5-hour or weekly limits often overflow to Codex. That's a reason to suggest cheaper models, lower effort and fewer parallel agents before suggesting a second subscription.

## Hype and safety warnings to pass on
- **Skill and plugin supply chain.** Hundreds of malicious skills were reportedly found on an OpenClaw skills marketplace. Treat "paste this setup command" skills from any marketplace as untrusted, and read the source first.
- **Untrusted repos can attack agents.** Researchers reported in September that a repo's own git config could make several coding agents (Claude Code among them) run commands outside their sandbox. Open unknown repos in isolation.
- **Always-on agents with broad access** (OpenClaw-style gateways) have a long list of security advisories, and some ran without a sandbox by default. Recommend a sandbox, narrow tokens and no delete rights.
- **Stars aren't quality**, and many "which should you run" comparisons come from companies selling one of the options or hosting for it.
- **Funnel content.** Many build-an-app and faceless-channel videos lead into paid communities or affiliate stacks, and "10×" and "$X a month" claims are unverified.
- **Cost reality.** Running the newest top model all day, or many agents in parallel, burns through plan limits fast. Size the stack to the budget.
- **Secondhand statistics** (share of GitHub commits written by AI, and so on) are often quoted without a source. Don't repeat them as fact.
