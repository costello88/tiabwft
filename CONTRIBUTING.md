# Contributing to tiabwft

Thanks for helping. Bug reports, better picks for the reference files, fixes and ideas are all welcome.

## Ways to help

- **Report a bug** with the bug report form. Leave out keys, `.env` values and private memory facts.
- **Suggest a better pick** for a reference file in `skills/tiabwft/references/`. Link the tool or repo: it must exist, be maintained and have readable source, and every new claim needs a `Source:` line.
- **Ask a question or share an idea** in [Discussions](https://github.com/costello88/tiabwft/discussions).
- **Security problems** go through [SECURITY.md](SECURITY.md), not public issues.

## Run the checks locally

You need Claude Code and Node 22.

```bash
# Plugin manifests, marketplace, SKILL.md front matter and hooks
claude plugin validate .

# Hook and memory tests (151 tests; must end with "0 fail")
claude plugin test .

# Reference tables and link syntax, then every Source: URL and relative link
npx --yes markdownlint-cli2@0.18.1
node scripts/check-references.mjs            # add --offline to skip the network

# Azure sync function (only if you touched azure/)
node azure/test/memory.test.mjs
```

### Evals

The eval suite in `evals/` runs real prompts with and without the plugin and grades the replies. It calls the model, so it costs money and takes a few minutes. See [evals/README.md](evals/README.md).

```bash
# Full run, two arms (with and without the plugin)
claude plugin eval . --trust-plugin --no-publish

# Quick single pass while iterating
claude plugin eval . --runs 1 --ablation none --trust-plugin --no-publish

# One group or one case
claude plugin eval . --tag memory --trust-plugin --no-publish
claude plugin eval . --case lead-capture-agent --trust-plugin --no-publish
```

Run the evals when you change the protocol in `hooks/register.tsx` or `skills/tiabwft/SKILL.md`, and say in the PR how the scores moved. Results land in `evals/results/` (git-ignored).

## Pull requests

1. Fork the repo and branch from `main` (`feature/...`, `fix/...`, `docs/...`).
2. Keep a PR to one change. Add or update tests in `hooks/**/*.test.ts` for behavior changes.
3. Run the checks above.
4. Open the PR against `main`. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs `claude plugin validate`, `claude plugin test`, markdownlint and the reference link check. It must be green before merge.
5. Labels decide where the PR lands in the release notes: `feature`/`enhancement`, `bug`/`fix`, `docs`/`documentation`, anything else under Other, and `skip-changelog` to leave it out.

## Releases

Maintainers bump `version` in `.claude-plugin/plugin.json`, merge to `main` and push a `v*` tag. The [release workflow](.github/workflows/release.yml) then creates the GitHub Release with generated notes.

## Ground rules

- Never add a tool, connector, repo or star count you can't link to.
- Don't add telemetry, and don't make the plugin read secret values or send data anywhere the README's Trust section doesn't name.
- Be kind in issues and reviews.

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE).
