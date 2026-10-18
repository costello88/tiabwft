# X thread: how to get Claude to suggest a better stack

> **DRAFT for a human.** Drafted with AI help. Rewrite it in your voice before posting, and post it yourself (scheduling an approved, rewritten version is fine). Follow X's rules on automation and spam: no mass replies, no @-mentioning people at random, no buying engagement. Say you built the plugin.

Format: a thread that teaches something useful on its own, with the repo as the payoff at the end. Weekday, US morning. Each post is under 280 characters.

## Thread

**1/**
Claude does exactly what you ask.

That's the problem. It won't tell you there's a connector that already does half the job, or a cheaper model for the bulk step, unless you ask.

Here's how to make it tell you, every time. 🧵

**2/**
Step 1: ask for the goal, not the task.

"Add a form handler" gets a form handler.
"I want website leads to land in my CRM, qualified" gets a system.

Make Claude write the real goal in one line before it answers.

**3/**
Step 2: ask for the whole stack, one pick per layer.

Model. Where it runs. One connector per system it touches. Skills or plugins. A GitHub repo. Data. Cost. Safety.

One specific pick per row. "Use a CRM" isn't a pick. "HubSpot connector" is.

**4/**
Step 3: make it look things up, not remember them.

Connector registry, plugin and skill search, `gh search repos "<topic> mcp" --sort stars`.

And one hard rule: never name a tool or repo a lookup didn't confirm.

**5/**
Step 4: make it compare, not just pick.

Top 3 candidates per layer, scored 1–5 on fit, cost, effort, trust and lock-in. Runners-up in an "also considered" line, so you see what it passed on and why.

**6/**
Step 5: end with exactly one first step.

Not a list. Not "then". One command or one connector to add, right now.

Everything else goes in a flow line: form → automation → CRM → chat alert.

**7/**
Step 6: make it remember what you said no to.

Otherwise it suggests the same tool you rejected last week. Keep a small memory of your stack, decisions, rejections and budget, in a file you can read and edit.

**8/**
I got tired of typing all that, so I built it into a Claude Code plugin: tiabwft ("there is a better way for that").

[demo video here: 20–40 s screen recording of a prompt, the answer, and the 💡 table appearing]

Open source, MIT, 151 tests, no telemetry.

github.com/costello88/tiabwft

## Notes

- **Where the video goes:** attach the 20–40 second recording to post 8 (the one with the link). Optionally a still screenshot of the 💡 table on post 3.
- Tag the tools you build on only where it's natural (for example Claude Code), not people at random.
- A few days later, a follow-up post with real results: stars, issues, the most useful feedback, what you changed because of it.
