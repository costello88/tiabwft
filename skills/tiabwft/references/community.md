# What other people built: community map

Snapshot checked on GitHub on **2026-10-18** (stars rounded). Repos get renamed, archived or abandoned, so re-check stars and the last push live before you recommend one (see "Search live" at the bottom). Link to repos; don't copy their content.

## Where to look first
| Need | Go-to source | Notes |
|---|---|---|
| Any MCP server | punkpeye/awesome-mcp-servers (97k) | biggest curated list; also modelcontextprotocol/servers (official reference) and modelcontextprotocol/registry |
| Skills | anthropics/skills (182k, official), obra/superpowers (301k, dev-process skills), ComposioHQ/awesome-claude-skills (77k), VoltAgent/awesome-agent-skills (36k, skills that work across agents) | |
| Claude Code tips, hooks, commands | hesreallyhim/awesome-claude-code (56k) | very active |
| Subagent definitions | VoltAgent/awesome-claude-code-subagents (26k) | grouped by role |
| Agent starters | anthropics/claude-agent-sdk-demos, claude-quickstarts (19k), claude-cookbooks (54k), claude-agent-sdk-python / -typescript | official |
| Installable templates | davila7/claude-code-templates (33k) | uses its own CLI (`npx claude-code-templates`), not a marketplace |

Skip these: appcypher/awesome-mcp-servers (archived), GongRzhe/Gmail-MCP-Server (archived), HubSpot/mcp-server (stub; use HubSpot's hosted server instead).

## Plugin marketplaces
Add a marketplace with `/plugin marketplace add <owner/repo>`, then install a plugin with `/plugin install <plugin>@<marketplace-name>`.

| owner/repo | Marketplace name | Plugins | Stars |
|---|---|---|---|
| anthropics/claude-plugins-official | claude-plugins-official | 315 | 42k |
| anthropics/knowledge-work-plugins | knowledge-work-plugins (business roles) | 123 | 30k |
| anthropics/claude-code | claude-code-plugins (examples) | 13 | 152k |
| anthropics/skills | anthropic-agent-skills | 5 | 182k |
| wshobson/agents | claude-code-workflows | 94 | 41k |
| obra/superpowers-marketplace | superpowers-marketplace | 10 | 1.3k |
| jeremylongshore/tons-of-skills-marketplace | claude-code-plugins-plus | 434 | 2.8k |
| ananddtyagi/cc-marketplace | cc-marketplace (quiet since 2026-01) | 119 | 0.7k |
| addyosmani/agent-skills | addy-agent-skills (engineering skills) | 1 | 108k |
| thedotmack/claude-mem | thedotmack (session memory) | 2 | 102k |

## MCP servers by category (prefer official ones)
| Category | Pick | Alternatives / notes |
|---|---|---|
| GitHub | github/github-mcp-server (official, 34k) | |
| Browser automation | microsoft/playwright-mcp (38k) | ChromeDevTools/chrome-devtools-mcp (54k, official, for debugging and performance; also a marketplace, `chrome-devtools-plugins`) |
| Notion | makenotion/notion-mcp-server (official) | |
| Obsidian | MarkusPfundstein/mcp-obsidian (4.5k) | cyanheads/obsidian-mcp-server; both need Obsidian's Local REST API plugin; Ar9av/obsidian-wiki for a wiki-style vault |
| HubSpot | HubSpot's hosted MCP server / claude.ai connector | shinzo-labs/hubspot-mcp (small, quiet since 2025-11) |
| Salesforce | salesforcecli/mcp (official) | tsmztech/mcp-server-salesforce |
| Linear | Linear's hosted MCP server / claude.ai connector | jerhadf/linear-mcp-server (quiet since 2025-05) |
| Sentry | getsentry/toolkit (official) | |
| Library docs | upstash/context7 (63k) | up-to-date library docs; also a marketplace, `context7-marketplace` |
| Code navigation | oraios/serena (30k) | semantic code search and edits |
| Postgres | crystaldba/postgres-mcp (3.4k) | the old reference server is archived |
| Supabase | supabase/mcp (official) | |
| Web search | exa-labs/exa-mcp-server, brave/brave-search-mcp-server | |
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
- Before suggesting an install, read the README and skim the source. Third-party plugins and MCP servers run code on the user's machine.
