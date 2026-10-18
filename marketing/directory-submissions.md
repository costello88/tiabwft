# Directory and list submissions

> **DRAFT for a human.** Every submission below is made by you, by hand, through the venue's own form. Don't script any of them. Rewrite the suggested text in your own words, and re-read each venue's rules on the day; these were read on 2026-10-18.

## 1. Anthropic's plugin directory

The link `https://clau.de/plugin-directory-submission` now redirects to [Publish to the directory](https://claude.com/docs/directory/publish). The old Claude Console form is no longer supported; submissions go through the **developer portal** at [claude.ai/directory/manage](https://claude.ai/directory/manage).

### Who can submit

A paid claude.ai plan (Pro, Max, Team or Enterprise). On Team/Enterprise, an Owner (or a member with the Directory permission). Your GitHub account must be connected in that claude.ai organization and able to push to `costello88/tiabwft`. The first organization to submit a repo folder owns the listing, so submit from the account that should own it long term.

### Before you open the portal

- [ ] `claude plugin validate .` passes.
- [ ] Read the [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist). Points that matter for this repo:
  - README of 40+ words in the plugin folder (repo root): yes. LICENSE: yes (MIT).
  - Name `tiabwft`: lowercase, distinctive, not a reserved word. Fine.
  - Every non-image file under 256 KiB, 512 files or fewer, no `.DS_Store`/`Thumbs.db`.
  - No `package.json` plus lockfile at the plugin root (there is none; `azure/` has its own `package.json` without a lockfile).
  - Readable source, no minified code.
  - **Describe in the README everything the plugin runs, sends or fetches.** The README's "Trust and privacy" section covers it, including the optional Azure sync and the Haiku background reader. The security scan flags undisclosed destinations.
  - The `marketing/`, `.github/` and `evals/` folders are inside the plugin folder and ship with it. That's allowed, but consider whether you want them in installs.
- [ ] Raise `version` in `plugin.json` with every release.

### Portal steps and what to enter

1. **Submit new** → **What would you like to submit?** → **Plugin bundle**.
2. **Source**
   - **Repository:** `costello88/tiabwft`
   - **Plugin path (optional):** leave empty (the plugin is at the repo root).
   - **Branch or tag (optional):** leave empty to follow `main`, or a release tag such as `v0.8.0` if you want each listed version to be an explicit tag.
   - Select **Validate**. Fix anything marked **Blocking**, push, then **Re-validate**.
3. **Listing details:** read from `plugin.json` and the README. To change the name or short description, edit those files and validate again. Current `plugin.json` description:
   "There Is A Better Way For That: on every prompt Claude also suggests the smarter stack, AI, connectors and skills for the job."
4. **Data handling:** answer honestly. Suggested answers to check against the code:
   - *Reads or stores personal data?* It stores facts the user states about their stack, decisions, rejections and constraints (for example a budget) in `.claude/tiabwft/memory.md` and in the plugin's local storage. The background reader is instructed to skip secrets and personal data, and secret-looking text is filtered out.
   - *Sends data to services other than its declared connectors?* Only if the user configures the optional Azure sync, which sends memory facts to the user's own Azure Function over https. The background fact extraction uses Claude Code's own model access (Haiku). No telemetry.
   - *How long is data kept?* Until the user deletes it (`/tiabwft forget`, `/tiabwft memory reset`, editing `memory.md`). Azure holds the newest 450 facts per project.
   - *Intended for people under 18?* No.
5. **Compliance:** check the contact email, select the four acknowledgements (read them first).
6. **Review and submit:** confirm details. Under **How new versions reach the directory**, keep **GitHub push webhook** (default) or choose **Scheduled check only**. Decide on **Auto-publish passing versions**. Select **Submit for review**.

Review time isn't fixed; follow the status under **Submissions** in the portal.

## 2. awesome-claude-code (hesreallyhim)

Rules from [CONTRIBUTING.md](https://github.com/hesreallyhim/awesome-claude-code/blob/main/CONTRIBUTING.md) and the issue form:

- The resource needs **at least 14 days of active development since the first commit**, or 100+ stars. The repo was created on 2026-10-16 (first commit 2026-10-16 20:26 +02:00), so the **earliest date is 2026-10-30**. Keep committing in between. Submitting on 2026-10-31 avoids any time-zone doubt.
- **Web issue form only** ("Recommend a Resource"). No PR, no CLI, no script; other routes risk a temporary restriction.
- **Submitted by a human**, even if the project was built with an agent.
- **One resource at a time.**
- Description: factual, one to three sentences, no sales language, doesn't address the reader, no emojis.
- No guaranteed review. After approval you may add the "Mentioned in Awesome Claude Code" badge.

### Form fields and suggested text

| Field | Suggested value |
|---|---|
| Display Name | `tiabwft` |
| Category | `Skills` or `Multi-Purpose` (read the list first and pick where similar plugins sit) |
| Link | `https://github.com/costello88/tiabwft` |
| Author Name | `costello88` |
| Author Link | `https://github.com/costello88` |
| Description | Claude Code plugin that appends a stack recommendation to each answer: one pick per layer (model, automation, connectors, skills, GitHub repos, data, cost, safety), found through connector registry, plugin and GitHub lookups and scored on fit, cost, effort, trust and lock-in. Keeps a per-project memory of the user's stack, decisions and rejections in a plain markdown file. |
| Checklist | Tick only what you have really done. Read every box: the last one is a trap meant to stay **unchecked**. |

## 3. Other lists and places to check

Read each one's CONTRIBUTING first, send one PR or form per list, in the right category and format, spread over days, not all at once.

| Where | What to check |
|---|---|
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | Whether plugins (not only skills) are accepted, and the entry format. |
| GitHub search for `awesome-claude-plugins` and `awesome-claude-code-plugins` | Active lists with recent merges; skip abandoned ones. |
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | External plugins come in through the directory portal above, not PRs. |
| The README's own marketplace | Already works: `/plugin install tiabwft --marketplace costello88/tiabwft`. Keep it in every post. |
| skills.sh and similar skill indexes | Whether they list plugin bundles and how installs are counted. |
| Official MCP Registry | Not applicable: tiabwft ships no MCP server. |
