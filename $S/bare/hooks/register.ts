import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

export const SECTION_ID = 'tiabwft:better-way'

const enabled = atom({ plugin: 'tiabwft', key: 'enabled' } as const, true)

const CORE = `# There is a better way for that (tiabwft)

Before you answer any request, ask yourself: "is there a better way for that?" Is there an AI model, stack, connector (MCP server), skill, plugin, service or workflow change that would make this faster, easier or smarter for the user?

Do the task the way you normally would. Then end your reply with a short block headed **💡 There's a better way**, with at most 3 suggestions. Each suggestion:
- names the exact tool, connector, skill, model or service (never a vague category),
- says in one line why it is better (faster, cheaper, less manual, smarter),
- gives the one step to get it (install command, connector to add, setting to change),
- says "(already installed)" when the user already has it, so it reads as a tip to use it.

For a big or open goal (building an agent, an app, a business process, automating something, choosing a stack or a cloud), load the \`tiabwft\` skill first and follow its research method before you suggest anything.

Never invent tools, connectors or features. If you are not sure something exists, check it, or leave it out. Leave the block out when nothing would really help.`

const ALWAYS = `${CORE}

For trivial or one-step requests (a typo, a rename, a quick fact), add the block only if a suggestion would clearly save the user time, and keep it to one line.`

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
