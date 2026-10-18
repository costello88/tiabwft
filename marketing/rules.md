# Rules: what never to do

> **DRAFT for a human.** This kit was drafted with AI help. Read it, then write every public post and comment yourself, in your own words. Check each platform's current rules on the day you post; the ones below were read on 2026-10-18 and can change.

The one-line version: be useful, be honest, post once per place, answer everyone, and never touch ranking.

## Never

| Don't | Why |
|---|---|
| Buy stars, join star-for-star groups, or reward people for starring | Against GitHub's [Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies) (Spam and Inauthentic Activity). Repos with fake stars get deleted far more often, and the effect fades within two months ([arXiv 2412.13459](https://arxiv.org/abs/2412.13459)). |
| Ask anyone to upvote on HN, Reddit or Product Hunt, or share the link in a group "to get it going" | HN guidelines forbid soliciting votes; Reddit sitewide rules forbid vote manipulation. Posts get flagged, accounts get banned. |
| Post AI-generated or AI-edited text on Hacker News | The HN guidelines forbid it, and they forbid automated posting. The `show-hn.md` file is an outline on purpose. Write the title, the first comment and every reply by hand. |
| Paste this kit's drafts unchanged anywhere | Readers spot generated text and react badly. Use the drafts as notes. |
| Post the same text to many subreddits or Discords on the same day | Moderators read your history. One place at a time, each post written for that community. |
| Mass DM, @-mention people at random, or cold-post in every channel | Bans are by account and sometimes wider. Reputation lasts longer than the post. |
| Open "please add my tool" issues or PRs in other people's repos | GitHub bars promotional bulk content in other users' issues. One genuinely relevant PR is fine; a template sent to 50 repos is spam. |
| Submit to awesome-claude-code by script, CLI, PR or bot, or before the repo is 14 days old | Their rules: web issue form only, by a human, one resource at a time, at least 14 days of active development or 100 stars. Breaking them risks a restriction. |
| Use sock puppets or bot accounts to comment or star | GitHub ToS bans bot-registered accounts; HN and Reddit treat it as manipulation. |
| Overstate | No "10x" or "best plugin ever". State what the repo shows: 151 tests, CI, an eval suite with measured scores, what it reads and what it doesn't. |
| Tie the project to a token, airdrop or paid-promotion scheme | It buys attention and costs trust. |
| Bury the risk | It is a plugin that runs a hook on the user's machine. Say what runs, what's read, what's sent and where memory lives (the README's Trust section). |
| Hide that you built it | Always say "I built this" on Reddit, HN, X and LinkedIn. |

## Always

- Say you built it, in the first lines.
- Lead with the problem, then the mechanism, then a real number.
- Stay in the thread on launch day and reply to every comment, including the critical ones. Thank people for bugs and fix them quickly.
- Use the plain repo URL on Hacker News (no tracking parameters).
- Keep a human approval step between any draft and any post. Scheduling an approved post is fine; auto-posting generated text is not.
- Track what each post did (`marketing/track.mjs`) and write down what you posted when, so you can see which channel helped.

## Sources

- [Show HN rules](https://news.ycombinator.com/showhn.html) and [HN guidelines](https://news.ycombinator.com/newsguidelines.html)
- [awesome-claude-code CONTRIBUTING](https://github.com/hesreallyhim/awesome-claude-code/blob/main/CONTRIBUTING.md)
- [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)
- The research notes this kit is based on (launch-and-growth playbook, 2026-10-18).
