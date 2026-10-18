# Launch plan

> **DRAFT for a human.** A plan, not a script: you write and post everything yourself. Dates assume today is Sunday 2026-10-18 and move if a gate isn't met. Read [rules.md](rules.md) first.

## Gates before launch day

Launch only when all of these are true:

- [x] PR #3 (side panel), PR #4 (memory) and PR #5 (v0.8.0) are merged into `main`.
- [x] `v0.8.0` is tagged on `main` and the release workflow created the GitHub Release.
- [x] CI is green on `main`; `claude plugin validate .` and `claude plugin test .` pass (152 tests, 0 fail).
- [x] The install line works on a clean machine (both forms tested 2026-10-18 with an empty config).
- [x] The demo GIF is in the README; the 25 s video (landscape + vertical) is on the v0.8.0 release.

If a gate slips, move launch day to the next Tuesday to Thursday.

## Week 0: prep (Mon 2026-10-19 to Fri 2026-10-23)

- [x] Merge #3, #4 and #5; tag `v0.8.0`.
- [x] Demo GIF in `docs/demo.gif`; 25 s video for X, LinkedIn and Shorts on the v0.8.0 release.
- [ ] Repo polish: description, topics (`claude-code`, `claude-code-plugin`, `claude-skills`, `mcp` are set; consider `agent-skills`), homepage, a social preview image.
- [ ] Enable GitHub Discussions (Settings → Features) so the issue-form link works; seed Q&A, Ideas, Show and tell; pin a welcome post.
- [ ] Create the labels the release notes use: `feature`, `enhancement`, `bug`, `fix`, `docs`, `documentation`, `skip-changelog`.
- [ ] Start `node docs/marketing/track.mjs` daily to get a baseline.
- [ ] Comment helpfully in r/ClaudeAI and r/ClaudeCode (no links) to build history; check your karma against the 50-karma showcase rule.
- [ ] Rewrite the drafts in this folder in your own words.

## Launch day: Tue 2026-10-27 (fallback Wed 28 or Thu 29), US morning

Clear the day. Times are US Eastern; Central Europe is 6 hours later (5 hours after US DST ends on 2026-11-01).

- [ ] ~08:00 ET: Show HN, posted by hand (title and first comment written by you, from the outline in [show-hn.md](show-hn.md)).
- [ ] ~09:00 ET: r/ClaudeAI post, or the "Built with Claude" megathread if under 50 karma ([reddit-claudeai.md](reddit-claudeai.md)).
- [ ] ~10:00 ET: X thread with the video ([x-thread.md](x-thread.md)).
- [ ] ~11:00 ET: LinkedIn post ([linkedin.md](linkedin.md)).
- [ ] All day: reply to every comment. Log bugs as issues, fix the quick ones the same day.
- [ ] Evening: run `track.mjs`, note what you posted and when.

## Days 2–14 (Wed 2026-10-28 to Mon 2026-11-09)

- [ ] Fix what people reported; ship small tagged releases (no empty releases).
- [ ] Reply publicly to issues and Discussions within a day.
- [ ] Submit to Anthropic's plugin directory through the developer portal ([directory-submissions.md](directory-submissions.md)).
- [ ] From **Fri 2026-10-30** (safer: Sat 31): submit to awesome-claude-code via its web form, by hand, once.
- [ ] One other subreddit (for example r/ClaudeCode), written fresh for that audience, a few days after r/ClaudeAI.
- [ ] Publish the dev.to tutorial ([devto-tutorial.md](devto-tutorial.md)); cross-post with a canonical URL.
- [ ] A follow-up X post with real results and what you changed.
- [ ] Offer a demo (not payment) to two or three creators who already cover Claude Code.
- [ ] Check one other awesome list per few days, per its CONTRIBUTING.

## Day 30 onward (from Thu 2026-11-26)

- [ ] Release-driven growth: a short changelog post per release (X, LinkedIn, a "what changed" comment where it fits).
- [ ] One tutorial per month on a specific job ("pick a CRM connector", "cut your Claude Code bill").
- [ ] Review `growth/metrics.csv` monthly: which posts moved stars, views and referrers.
- [ ] If a creator or newsletter spike happens, make sure the README and install line can take it.
- [ ] Add the "Mentioned in Awesome Claude Code" badge if accepted.

## Never

See [rules.md](rules.md): no bought stars, no vote requests, no AI-written HN text, no bulk "add my tool" PRs, no cross-posting the same text everywhere.
