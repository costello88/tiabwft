# What other people built: community map

Snapshot checked on GitHub on **2026-11-23** (stars rounded). Repos get renamed, archived or abandoned, so re-check stars and the last push live before you recommend one (see "Search live" at the bottom). Link to repos; don't copy their content.

## Where to look first
| Need | Go-to source | Notes |
|---|---|---|
| Any MCP server | punkpeye/awesome-mcp-servers (98k) | biggest curated list; also modelcontextprotocol/servers (official reference) and modelcontextprotocol/registry |
| Skills | anthropics/skills (199k, official), obra/superpowers (325k, dev-process skills), ComposioHQ/awesome-claude-skills (80k), VoltAgent/awesome-agent-skills (37k, skills that work across agents) | |
| Claude Code tips, hooks, commands | hesreallyhim/awesome-claude-code (59k) | very active |
| Subagent definitions | VoltAgent/awesome-claude-code-subagents (27k) | grouped by role |
| Agent starters | anthropics/claude-agent-sdk-demos, claude-quickstarts (21k), claude-cookbooks (55k), claude-agent-sdk-python / -typescript | official |
| Installable templates | davila7/claude-code-templates (34k) | uses its own CLI (`npx claude-code-templates`), not a marketplace |

Skip these: appcypher/awesome-mcp-servers (archived), GongRzhe/Gmail-MCP-Server (archived), salesforcecli/mcp (archived), HubSpot/mcp-server (stub; use HubSpot's hosted server instead).

## Plugin marketplaces
Add a marketplace with `/plugin marketplace add <owner/repo>`, then install a plugin with `/plugin install <plugin>@<marketplace-name>`.

| owner/repo | Marketplace name | Plugins | Stars |
|---|---|---|---|
| anthropics/claude-plugins-official | claude-plugins-official | 315 | 48k |
| anthropics/knowledge-work-plugins | knowledge-work-plugins (business roles) | 123 | 37k |
| anthropics/claude-code | claude-code-plugins (examples) | 13 | 157k |
| anthropics/skills | anthropic-agent-skills | 5 | 199k |
| wshobson/agents | claude-code-workflows | 94 | 43k |
| obra/superpowers-marketplace | superpowers-marketplace | 10 | 1.3k |
| jeremylongshore/tons-of-skills-marketplace | claude-code-plugins-plus | 434 | 2.9k |
| ananddtyagi/cc-marketplace | cc-marketplace (quiet since 2026-01) | 119 | 0.7k |
| thedotmack/claude-mem | thedotmack (session memory) | 2 | 119k |
| addyosmani/agent-skills | addy-agent-skills (engineering skills) | 1 | 120k |
| trailofbits/skills-curated | skills-curated (community-vetted, by a security firm) | 29 | 0.5k |
| alirezarezvani/claude-skills | claude-code-skills (broad mix: engineering, product, marketing, exec roles) | 121 | 30k |
| coreyhaines31/marketingskills | marketingskills (copy, SEO, conversion and growth work) | 1 | 62k |
| obsidianmd/obsidian-skills | obsidian-skills (official; vault file formats for agents) | 1 | 54k |

## MCP servers by category (prefer official ones)
| Category | Pick | Alternatives / notes |
|---|---|---|
| GitHub | github/github-mcp-server (official, 35k) | |
| Browser automation | microsoft/playwright-mcp (40k) | |
| Notion | makenotion/notion-mcp-server (official) | |
| Obsidian | MarkusPfundstein/mcp-obsidian (4.5k) | cyanheads/obsidian-mcp-server; both need Obsidian's Local REST API plugin; Ar9av/obsidian-wiki for a wiki-style vault |
| HubSpot | HubSpot's hosted MCP server / claude.ai connector | shinzo-labs/hubspot-mcp (small, quiet since 2025-11) |
| Salesforce | tsmztech/mcp-server-salesforce | community-built; the official salesforcecli/mcp is archived |
| Linear | Linear's hosted MCP server / claude.ai connector | jerhadf/linear-mcp-server (quiet since 2025-05) |
| Sentry | getsentry/toolkit (official) | |
| Library docs | upstash/context7 (65k, vendor) | up-to-date docs for coding agents; also has a marketplace |
| Chrome debugging | ChromeDevTools/chrome-devtools-mcp (59k, official) | DevTools access for agents; also has a marketplace |
| Code navigation | oraios/serena (32k) | semantic code search and edits via language servers |
| Postgres | crystaldba/postgres-mcp (3.5k) | the old reference server is archived |
| Supabase | supabase/mcp (official) | |
| Web search | exa-labs/exa-mcp-server, brave/brave-search-mcp-server | |
| Web scraping | firecrawl/firecrawl-mcp-server (official, 7.9k) | apify/apify-mcp-server (18k, official) for ready-made scrapers per site |
| Slack | korotovsky/slack-mcp-server | or the claude.ai Slack connector |
| Gmail / Google Workspace | taylorwilsdon/google_workspace_mcp | or the claude.ai Gmail / Drive / Calendar connectors |

When a claude.ai connector exists for a service, it's usually the easiest option: one click, no local server to run.

## Search live
Run these with `gh` (read-only). Replace `<topic>` with what the user needs.

```bash
gh search repos "<topic>" --topic=claude-code-plugin --sort stars --limit 10 --json fullName,stargazersCount,pushedAt,description
gh search repos "<topic>" --topic=claude-skills --sort stars --limit 10 --json fullName,stargazersCount,pushedAt,description
gh search repos "<topic>" --topic=agent-skills --sort stars --limit 10 --json fullName,stargazersCount,pushedAt,description
gh search repos "<topic>" --topic=mcp-server --sort stars --limit 10 --json fullName,stargazersCount,pushedAt,description
gh search repos "<topic> mcp" --sort stars --limit 10 --json fullName,stargazersCount,pushedAt,description
```

- Filter: drop repos under about 20 stars or with no push in the last 4 months. Topic searches return many tiny repos.
- Check that a repo really is a marketplace: `gh api repos/<owner>/<repo>/contents/.claude-plugin/marketplace.json`.
- Don't use `gh search code --filename marketplace.json`: it returns lots of unrelated results.
- Topics with the most repos: mcp-server, agent-skills, claude-skills, claude-code-plugin. claude-code-subagents has too few repos to be useful.
- Prefer vetted sources when they cover the need: the official Anthropic marketplaces first, then curated ones like trailofbits/skills-curated, then raw search results.
- Before suggesting an install, read the README and skim the source. Third-party plugins and MCP servers run code on the user's machine.
