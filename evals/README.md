# tiabwft evals

Run with [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals). Each case is a folder with a `prompt.md` (the user prompt) and `graders/*.md` (what a good reply looks like).

| Folder | What it checks |
|---|---|
| `triggering/` | Big asks (an agent, a stack, a connector) load the `tiabwft` skill and get the full hand-over: a Goal, a full stack table (4+ specific rows), a Flow line and a "Start here" line. |
| `negative/` | Plain tasks (a typo, a regex) don't load the skill and get no block, or a one-line tip at most. |
| `memory/` | Remembered rejections, known stack and budget constraints shape the stack. |
| `rules/` | Things the user already has are marked "(already installed)", and nothing is installed or connected without a yes. |

## Run it

```bash
claude plugin eval . --trust-plugin --no-publish
```

Quick single pass while iterating (one run per case, no no-plugin baseline):

```bash
claude plugin eval . --runs 1 --ablation none --trust-plugin --no-publish
```

Filter with `--tag triggering`, `--tag negative`, `--tag rules`, or `--case <name>`. Results land in `evals/results/<timestamp>/` (git-ignored).

The default run has two arms: with the plugin and without it. The difference shows what the plugin adds. Turning a case's `skill-fired` grader to `arm: both` makes the skill loading count toward the score in both arms.

## What the suite can't cover yet

- **Suggestion modes.** `claude plugin eval` has no way to set a plugin's `userConfig` (the `mode` option) per case, so `big-asks-only` and `off` are covered by the unit tests in `hooks/register.test.ts`, not here. The no-plugin baseline arm is effectively what `off` looks like.
- **Live research.** Runs use only `Read`, `Glob`, `Grep` and `Skill`: no web search, plugin search or connector registry. That tests the "never invent" rule under the worst case. Grant more with `--allow-tools` to test the full research path.
- **Real installed connectors.** The sandbox loads no other plugins or connectors, so "(already installed)" is tested by the user saying what they have.
