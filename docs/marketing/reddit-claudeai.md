# r/ClaudeAI post

> **DRAFT for a human.** Drafted with AI help. Rewrite it in your own words before posting; Reddit communities react badly to posts that read as generated. Read the subreddit's sidebar rules on the day (especially Rule 7 on showcases, which could not be read when this was drafted) and say that you built it.

## Rules to check first

- **50-karma rule.** A mod post from April 2026 says a showcase post on the main feed needs the author to have at least 50 total karma. Below that, it belongs in the **"Built with Claude" project showcase megathread** instead. Check your karma and the current megathread before posting.
- **Rule 7** sets the showcase requirements. Read it in the sidebar and follow it exactly (the research could not read it; verify).
- New accounts may be blocked from posting for a few days (unverified secondary source).
- **Build some comment history first.** Spend a week or two answering questions in r/ClaudeAI and r/ClaudeCode, with no links to your repo.
- **One subreddit at a time.** Don't cross-post the same text the same day. If you post to r/ClaudeCode later, write it again for that audience.
- **Disclose.** "I built this" in the first lines. No vote requests anywhere.

## Title options

- `I kept learning about the right connector after I'd built the thing by hand, so I made Claude Code tell me first`
- `Built a Claude Code plugin that adds a scored "better stack" table to every answer (open source)`
- `Claude does what you ask. I wanted it to also tell me the better way, so I built a plugin for that`

## Post draft

> I built this, so take it with that in mind.
>
> **The problem:** Claude Code does exactly what I ask. But I kept finding out afterwards that there was a better way: a connector that already did half the job, a skill someone had published, a cheaper model for the bulk step. Nobody tells you unless you ask the right question.
>
> **What I made:** tiabwft ("there is a better way for that"), a Claude Code plugin. Claude still does the task. Then it adds a short block: the real goal in one line, a table with one pick per layer (model, automation, connectors, skills/plugins, GitHub repos, data, cost, safety), a flow line, three alternatives (cheapest, no-code, pro) and exactly one first step.
>
> [the demo GIF (`docs/demo.gif`) or the 25-second demo video (`tiabwft-demo.mp4` on the [v0.8.0 release](https://github.com/costello88/tiabwft/releases/tag/v0.8.0); a vertical 9:16 cut is there too)]
>
> **How the picks are found:** live lookups where the session has them (connector registry, plugin and skill search, read-only `gh search`), plus reference files in the repo. It compares the top 3 candidates per layer and scores them on fit, cost, effort, trust and lock-in. It won't name a tool or repo it couldn't confirm, and it never installs or connects anything without a yes.
>
> **Memory:** it remembers your stack, what you chose, what you turned down and your budget, in a readable `.claude/tiabwft/memory.md` in your repo, so it doesn't keep suggesting the thing you already said no to. Optional sync to your own Azure. No telemetry; it reads names in `.env.example`, never values.
>
> **Testing:** 152 hook tests, CI, and an eval suite that runs each prompt with and without the plugin.
>
> Install:
>
> ```text
> /plugin install tiabwft --marketplace costello88/tiabwft
> ```
>
> Repo: <https://github.com/costello88/tiabwft> (MIT)
>
> It's quiet on trivial tasks, and `/tiabwft off` or the `big-asks-only` mode turns it down. I'd really like to hear where its suggestions are wrong, or which layer you'd want it to skip.

## After posting

- Reply to every comment for the first day.
- Edit the post with fixes that came out of the comments ("Edit: fixed X, thanks u/…").
- Note the time and link in your launch log so `track.mjs` numbers can be matched to it.
