import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

export const SECTION_ID = 'tiabwft:better-way'

const enabled = atom({ plugin: 'tiabwft', key: 'enabled' } as const, true)

const CORE = `# There is a better way for that (tiabwft)

For every request, ask yourself: "is there a better way for that?" Which connector (MCP server), skill, plugin, GitHub repo, model or setting would make this faster, easier or smarter for the user?

Do the task the way you normally would. Then end your reply with a block headed **💡 There's a better way**, written in the user's language, with these slots:
- 🔌 **Connector**: an MCP server or claude.ai connector that lets Claude do this job directly, and how to add it.
- 🧩 **Skill / plugin**: an installable skill or plugin for this job, with its install command or the card from SuggestPluginInstall / SuggestSkills.
- 📦 **From GitHub**: a repo other people built for this (owner/repo, ★ stars): an MCP server, a template, a skill collection or a marketplace.
- ⚙️ **Setup** (only when it matters): a model, effort or settings tip.
Skip a slot only when nothing real fits it. Mark anything the user already has as "(already installed)", so it reads as a tip to use it.

Look them up; don't suggest from memory. Before writing the block:
1. Connectors: if a connector-registry tool exists (a tool name containing \`mcp-registry\`, such as \`suggest_connectors\` or \`search_mcp_registry\`), call it with the job's topic. Load deferred tools with ToolSearch first.
2. Skills and plugins: call \`SearchPlugins\` and \`SearchSkills\` when they exist; check \`ListPlugins\` / \`ListSkills\` for what's already installed.
3. GitHub: when the \`gh\` CLI works, run one read-only search, for example \`gh search repos "<topic> mcp" --sort stars --limit 5 --json fullName,stargazersCount,pushedAt\`. Skip repos under about 20 stars or with no push in 4 months.
4. With none of these available, use the tiabwft skill's reference files (catalog.md, mcp-use-cases.md, community.md).
Do the lookups once per topic, not every turn: when you already suggested for this topic in this conversation, add only something new, or leave the block out.

For a big or open goal (building an agent, an app, a business process, automating something, choosing a stack or a cloud), load the \`tiabwft\` skill and follow its research method for a full stack table.

Never invent tools, connectors, repos or star counts: name only what a lookup or the reference files confirmed. Never install, connect or buy anything without the user's yes.`

const ALWAYS = `${CORE}

For trivial requests (a typo, a rename, a greeting), skip the lookups and add at most one line, only if a tip would clearly save the user time.`

const BIG_ONLY = `${CORE}

Mode: big asks only. Add the block only for open goals and multi-step projects (building, automating, setting up, choosing tools). For everyday coding and quick questions, leave it out.`

export const protocolFor = (mode: unknown): string | undefined =>
  mode === 'off' ? undefined : mode === 'big-asks-only' ? BIG_ONLY : ALWAYS

type Facts = {
  model: string
  mcpTools: number
  contextPercent?: number
  costUsd?: number
  rateLimitPercent?: number
}

const COST_STEPS = [50, 20, 5]

// The section sits in the cached system prompt, so these lines change only when
// a threshold is crossed: a figure that moved every turn would bust the cache.
export const sessionFacts = (f: Facts): string => {
  const lines = [`- Model in use: ${f.model}. If this request needs less (or more) power, say which model fits better and why (\`/model <name>\`).`]
  if ((f.contextPercent ?? 0) >= 60) {
    lines.push('- The context window is over 60% full: suggest `/compact` (keep going) or `/clear` (new topic) when it fits.')
  }
  const step = COST_STEPS.find(usd => (f.costUsd ?? 0) >= usd)
  if (step !== undefined) {
    lines.push(`- This session has cost over $${step}: point out cheaper ways to finish (a smaller model, subagents on a cheaper model, lower effort).`)
  }
  if ((f.rateLimitPercent ?? 0) >= 70) {
    lines.push("- Over 70% of the plan's usage limit is used: suggest saving it (cheaper model, less effort, batching the work).")
  }
  if (f.mcpTools > 80) {
    lines.push(`- ${f.mcpTools} connector tools are loaded, which costs context on every turn: suggest turning off connectors this project doesn't use.`)
  }

  return `## Live session facts (for model, cost and settings tips)\n${lines.join('\n')}\nFor model, token-saving and settings advice, use the tiabwft skill's references/models-and-costs.md.`
}

export const register: Register = (on, options) => {
  const protocol = protocolFor(options.mode)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tiabwft',
      description: 'There is a better way for that: /tiabwft on, /tiabwft off, or /tiabwft to see the status',
    })

    return next(e)
  })

  on('command.run', { command: 'tiabwft' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'on' || arg === 'off') {
      await update($, enabled, () => arg === 'on')
    }
    const isOn = await read($, enabled)
    if (protocol === undefined) {
      return { text: 'tiabwft is set to "off" in the plugin settings. Change the mode there to turn it on.' }
    }

    return {
      text: isOn
        ? 'tiabwft is on: Claude will suggest a better way where one exists.'
        : 'tiabwft is off for this session. Turn it back on with /tiabwft on.',
    }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (protocol === undefined || !(await read($, enabled))) {
      return composed
    }
    const usage = await $.session.usage().catch(() => undefined)
    const facts = sessionFacts({
      model: e.model,
      mcpTools: e.tools.filter(name => name.startsWith('mcp__')).length,
      contextPercent: usage?.context.percent,
      costUsd: usage?.cost?.usd,
      rateLimitPercent: Math.max(0, ...(usage?.rateLimits ?? []).map(limit => limit.percentUsed)),
    })

    return {
      ...composed,
      sections: [...composed.sections, { id: SECTION_ID, text: `${protocol}\n\n${facts}`, scope: 'session' as const }],
    }
  })
}
