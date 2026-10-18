# LinkedIn post

> **DRAFT for a human.** Drafted with AI help. Rewrite it in your own words and post it yourself. Follow LinkedIn's Professional Community Policies: no engagement pods, no tagging people who aren't involved, and say that you built it.

Template (the one claude-mem used): name the pain, show how it works in a few bullets, give real numbers, end with the install lines and a question.

## Draft

> Claude does what you ask. It doesn't tell you there was a better way to do it.
>
> I kept finding out after the fact: a connector that already did half the job, a skill someone had published, a cheaper model for the bulk step. So I built a Claude Code plugin that asks "is there a better way for that?" on every prompt.
>
> It's called tiabwft. How it works:
>
> 🎯 Claude does your task as usual, then names the real goal in one line
> 🧱 It proposes the full stack: model, automation, connectors, skills and plugins, GitHub repos, data, cost and safety, one pick per layer
> 🔎 Picks come from live lookups (connector registry, plugin and skill search, GitHub), with a ranked list of 45 categories as fallback, and the top 3 per layer are scored on fit, cost, effort, trust and lock-in
> 🧠 It remembers your stack, decisions, rejections and budget per project, in a plain file in your repo
> ➡️ It ends with exactly one first step
>
> The numbers so far:
>
> • 152 automated tests and CI on every pull request
> • An eval suite that runs each prompt with and without the plugin: on the "build me a lead-capture agent" case, 0.25 without and 0.92 with
> • The memory reader costs roughly 3,000 tokens in per turn, a fraction of a cent
> • No telemetry. It reads variable names in .env.example, never values
>
> Try it in Claude Code:
>
> /plugin install tiabwft --marketplace costello88/tiabwft
>
> Open source (MIT): github.com/costello88/tiabwft
>
> What's the one tool you wish someone had told you about before you built the thing by hand?

## Notes

- Attach the 25-second demo video (`tiabwft-demo.mp4` on the [v0.8.0 release](https://github.com/costello88/tiabwft/releases/tag/v0.8.0); a vertical 9:16 cut is there too). Native video does better on LinkedIn than a link.
- Put the repo link in the post body; don't hide it in the first comment.
- Replace "the numbers so far" with real usage numbers once you have them (installs, stars, issues fixed).
