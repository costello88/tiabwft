# Make Claude Code suggest the best stack for every task

> **DRAFT for a human.** Drafted with AI help. Rewrite it in your own words, replace the example with one from your own session, and add your own screenshots before publishing. dev.to rules: disclose that you built the tool, follow the [dev.to terms and code of conduct](https://dev.to/code-of-conduct), and if you cross-post to Hashnode or Medium, set the canonical URL to the first copy. Don't pay for placement in a publication.

Suggested tags: `claude`, `ai`, `productivity`, `opensource`

---

Claude Code is very good at doing what you ask. It is less good at telling you that what you asked for isn't the best way to get what you want.

You ask for a webhook handler and get a webhook handler. Nobody mentions that a CRM connector already exists, that someone published a skill for exactly this, or that a cheaper model would do the bulk step just as well.

In this tutorial we'll set up Claude Code so that every answer ends with a short, scored "better way" stack: the right model, automation, connectors, skills, GitHub repos, data, cost and safety, with exactly one first step. I built the open-source plugin we'll use, [tiabwft](https://github.com/costello88/tiabwft) ("There Is A Better Way For That").

## What you'll need

- Claude Code
- Optional but useful: the GitHub CLI (`gh`) logged in, so Claude can run read-only `gh search` lookups for community repos
- Optional: connectors in claude.ai, if you want suggestions to account for what you already use

## Step 1: Install the plugin

In Claude Code:

```text
/plugin install tiabwft --marketplace costello88/tiabwft
```

Answer `y` to add the marketplace, then pick a scope (user, so it's on in every project, or just this project).

Check that it's on:

```text
/tiabwft
```

## Step 2: Ask for something real

Try a goal, not a one-line fix:

```text
Build me a lead-capture agent: people fill in a form on my website and I want
the leads qualified and followed up automatically. Where do I start?
```

Claude answers as it normally would: a plan, the steps, maybe some code. Then it adds a block headed **💡 There's a better way**. Here is a shortened one from a real run:

| Layer | Pick | Why | Status |
|---|---|---|---|
| 🤖 AI / model | Haiku for scoring, Sonnet for drafting replies | Scoring is high-volume and simple; drafts need better writing | already available |
| ⚙️ Automation | n8n | Visual, has AI nodes, takes a form webhook directly | new |
| 🔌 Connector: CRM | HubSpot | The agent creates and updates contacts and deals | new (needs login) |
| 🔌 Connector: email | Gmail | Creates drafts only, so nothing is sent without you | new (needs login) |
| 🧠 Data / memory | Postgres on Supabase | A raw lead log that survives a failed step | new |
| 🛡️ Safety | Draft-only emails, narrow OAuth scopes | Form text is untrusted input | new |

Followed by:

- **Flow:** website form → n8n webhook → Supabase → Haiku scores → HubSpot → Sonnet drafts → Gmail draft for approval → Slack alert
- **Alternatives:** the cheapest stack, a no-code stack and a pro/scale stack, in one line
- **Start here:** one action, such as "Write your 3–5 qualification criteria in a short note"

(Replace this with a screenshot from your own session. The current version also shows each pick's score, such as 22/25, in the Why column, and an **Also considered** line with the runners-up.)

## Step 3: Understand what just happened

Three pieces make this work:

1. **A hook adds a short protocol to the system prompt** on every turn (`hooks/register.tsx`). It tells Claude to do the task first, then append the block, and to stay quiet on trivial requests like fixing a typo.
2. **Claude looks things up instead of guessing.** Where the session has them, it searches the connector registry, plugin and skill search, and runs read-only `gh search repos "<topic> mcp" --sort stars` queries. It skips repos with very few stars or no recent push. The hard rule: never name a tool, repo or star count a lookup or the reference files didn't confirm.
3. **It compares before it picks.** For each layer it takes the top 3 real candidates and scores each 1–5 on fit, cost, effort, trust and lock-in. That score is Claude's judgment from what it found, so read it as a reasoned opinion, not a benchmark.

For bigger goals Claude also loads the plugin's skill (`skills/tiabwft/SKILL.md`), a fuller research method with reference files on models and costs, MCP use cases across 14 domains, build stacks and community marketplaces.

## Step 4: Turn it up or down

```text
/tiabwft off      # mute for this session
/tiabwft on       # back on
```

In the plugin's settings, **Suggestion mode** can be `always` (default), `big-asks-only` (only for building, automating, choosing tools) or `off`.

The **💡 Better way** side panel keeps the latest suggestion visible after the chat scrolls on. Open it with:

```text
/tiabwft panel
```

## Step 5: Let it remember you

A stack suggestion is only useful if it builds on what you have and doesn't bring back what you rejected. tiabwft keeps a memory per project.

- At session start it reads your connectors, `package.json`, `requirements.txt`, `pyproject.toml`, compose files and the variable *names* in `.env.example`. Never values.
- After a substantial turn, a small model (Haiku) reads just your prompt and the final answer in the background and picks out facts worth keeping: your stack, decisions, rejections and constraints like a budget. That's roughly 3,000 tokens in per turn.
- Project facts go into `.claude/tiabwft/memory.md`, a plain file you can read, edit and commit. Your personal profile (budget, skill level) stays in the plugin's local storage.

Try it:

```text
I don't want Zapier, we're self-hosting everything. Budget is $50 a month.
```

Then ask for another stack. Zapier stays out, and paid picks get monthly prices that add up to the budget.

Manage it:

```text
/tiabwft memory                 # list what it knows
/tiabwft remember We use Postgres on Neon
/tiabwft forget Zapier
/tiabwft memory off             # pause learning this session
/tiabwft memory reset           # clear (asks for confirmation)
```

What it learns during a session reaches Claude's instructions at the next session, not mid-session. Changing the system prompt mid-conversation would break prompt caching and make Claude re-read the whole conversation at full price.

Optional: if you work on several computers, you can sync memory through your own Azure Function (`azureSyncUrl`, `azureSyncKey`; https only). See `azure/README.md` in the repo.

## Step 6: Keep an eye on cost

The hook also adds live session facts: which model is in use, and a tip when the context is over 60% full, the session cost passes $5, $20 or $50, you're past 70% of the plan's usage limit, or more than 80 connector tools are loaded. Those lines only change when a threshold is crossed, so they don't break caching either.

## What it doesn't do

- It doesn't install, connect or buy anything without your yes.
- It sends no telemetry. Memory stays in your repo, your local plugin storage, or your own Azure.
- It adds a bit to every turn's prompt, and its picks can be wrong or out of date. Check a suggestion before you adopt it, and tell it when it's wrong; the rejection is remembered.

## Wrap-up

The repo is [costello88/tiabwft](https://github.com/costello88/tiabwft) (MIT), with 151 tests, CI, and an eval suite that runs each prompt with and without the plugin. Issues and PRs welcome, especially better picks for the reference files.

What's the one tool you wish Claude had told you about before you built the thing by hand?
