# Security policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue.

- Use GitHub's **private vulnerability reporting**: [open a security advisory](https://github.com/costello88/tiabwft/security/advisories/new).
- If that link doesn't work, open a public issue that only says you have a security report and asks for a private contact. Don't include details.

Include what you found, how to reproduce it, the tiabwft and Claude Code versions, and the impact you expect. You'll get an answer as soon as the maintainer can look at it, and credit in the release notes if you'd like.

Supported version: the latest release on `main`.

## What the plugin runs

tiabwft is a Claude Code plugin. It runs on your machine with Claude Code's permissions, so here is all of it:

- **One hook module**, `hooks/register.tsx` (loaded through `hooks/hooks.json`). It adds the tiabwft instruction and live session facts (model, context, cost and usage-limit tips) to Claude's system prompt, renders the side panel, handles `/tiabwft` commands and runs the memory feature.
- **A skill**, `skills/tiabwft/SKILL.md`, plus reference markdown files. These are instructions for Claude, not code.
- **No MCP server, no daemon, no install script, no package download** at install or run time.

## What it reads

- Your connector and tool names in the session.
- `package.json`, `requirements.txt`, `pyproject.toml`, docker compose files, and the variable **names** in `.env.example`. Never values, and never `.env`.
- Its own memory file, `.claude/tiabwft/memory.md`, and the plugin's local storage.

## What it sends, and where

- **Background fact reader:** after a substantial turn, your prompt and Claude's final answer are sent to Haiku through Claude Code's own model access, the same provider as the rest of your session. The reader is told to skip secrets and personal data, and secret-looking text is filtered out before anything is saved.
- **Optional Azure sync:** only when you set both `azureSyncUrl` and `azureSyncKey`, and only to an `https://` URL (anything else is ignored, so the key is never sent in clear). It sends memory facts to **your own** Azure Function (see `azure/README.md`), with the key in the `x-tiabwft-key` header. The key is stored as a sensitive plugin setting.
- **Nothing else.** No telemetry, analytics or crash reports.

Claude itself may run read-only lookups during a suggestion (connector registry, plugin and skill search, `gh search`), using tools and permissions you already have in the session. tiabwft's instructions tell Claude never to install, connect or buy anything without your yes.

## Things worth reporting

- Any path where the plugin reads a secret value, or where a secret ends up in `memory.md`, the panel or Azure.
- Prompt injection through memory facts or reference files that makes Claude act without the user's yes.
- The Azure sync sending data over plain http, or to a URL other than the configured one.
