# Show HN

> **DRAFT for a human. Do not paste any of this into Hacker News.** HN's guidelines forbid AI-generated or AI-edited posts and comments, and automated posting. Everything below is an outline: title ideas to pick from and rewrite, and bullet points for a first comment you write yourself, by hand, in your own voice. Rules: [Show HN](https://news.ycombinator.com/showhn.html), [guidelines](https://news.ycombinator.com/newsguidelines.html). Never ask anyone to upvote or comment.

## Before you post

- [ ] PRs #3 and #4 merged, `v0.8.0` tagged, and the GitHub Release exists (the release workflow makes it).
- [ ] Fresh install tested on a clean machine with the README's install line.
- [ ] Demo GIF recorded and in the README (replace the `docs/demo.gif` placeholder).
- [ ] A free day: you need to be in the thread for most of it.

## Title options

Plain, no caps, no exclamation marks, no adjectives like "powerful". Pick one and adjust it in your own words:

1. `Show HN: tiabwft – a Claude Code plugin that suggests a better stack for each task`
2. `Show HN: Tiabwft, Claude Code proposes the tool stack it would use, scored and looked up live`
3. `Show HN: A Claude Code plugin that asks "is there a better way for that?" on every prompt`
4. `Show HN: Tiabwft – open-source plugin that adds a scored stack table to Claude Code answers`

URL: `https://github.com/costello88/tiabwft` (the plain repo URL, no tracking parameters).

## First comment: outline only

Write this yourself. These are the points to cover, in roughly this order. Keep it short; HN readers skim.

- **Why you built it.** Your own story in two or three sentences: the moment you realised Claude did exactly what you asked but you only learned later that a connector or a skill already existed for it. Be specific, it is your experience.
- **What it does, mechanically.** One hook adds a short instruction to the system prompt. Claude does the task, then appends a table: one pick per layer (model, automation, connectors, skills/plugins, GitHub repos, data, cost, safety), each scored 1–5 on fit, cost, effort, trust and lock-in, plus a flow line, three alternatives and one first step.
- **Where the picks come from.** Live lookups (connector registry, plugin and skill search, read-only `gh search`) plus reference files in the repo. Rule: never name a tool, repo or star count a lookup didn't confirm. Say honestly that the score is the model's judgment from what it found, not a benchmark.
- **Memory.** Remembers stack, decisions, rejections and constraints per project in a plain `memory.md` in the repo; a small model (Haiku) extracts facts in the background (about 3,000 tokens in per turn). Optional sync to your own Azure Function.
- **What it reads and sends.** Names in `.env.example`, never values; no telemetry; nothing installed without a yes. Link the README's Trust section.
- **What it doesn't do / limits.** Adds tokens to every turn; suggestions can be wrong or stale; quiet on trivial tasks; `/tiabwft off` or `big-asks-only` mode if it is too chatty. Name any known rough edge honestly.
- **How you tested it.** 151 hook tests, CI, an eval suite run with and without the plugin (for example the lead-capture case: 0.25 without, 0.92 with, in the 2026-10-17 run). Say what the evals can't cover (no live research in the sandbox).
- **How to try it.** The one install line from the README. Open source, MIT.
- **A real question for readers.** For example: which layer do they most often get wrong when they start a project, or which suggestion would they want it to stop making.

## Timing

- Tuesday to Thursday, early US morning (roughly 7–9 am US Eastern, which is 13:00–15:00 in Central Europe). Secondary guides, not HN's own rule.
- Post once. If it sinks, don't repost the same thing the next day. A later Show HN is fair only after a substantial change.
- Plan for either outcome: some Show HNs get hundreds of stars, ccusage's got no comments.

## In the thread

- Reply to every comment, by hand, including sceptical ones. Thank people for bug reports and fix fast; link the fix commit.
- Don't argue about hype. Answer with mechanism and numbers.
- Don't post the link anywhere asking for votes, and don't ask friends to comment.
