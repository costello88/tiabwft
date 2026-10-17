import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Memory, Suggestion } from '../types'
import { emptyMemory } from './memory/facts'
import { renderMemorySection } from './memory/inject'
import { learn, loadAll, persistAll } from './memory/session'
import type { MemoryDeps, MemoryOptions } from './memory/session'
import { extractSuggestion } from './suggestion'
export { extractSuggestion } from './suggestion'

export const SECTION_ID = 'tiabwft:better-way'
export const PANE = 'tiabwft'
const PANE_TITLE = '💡 Better way'

const enabled = atom({ plugin: 'tiabwft', key: 'enabled' } as const, true)
const latest = atom({ plugin: 'tiabwft', key: 'latest' } as const, null as Suggestion | null)
const count = atom({ plugin: 'tiabwft', key: 'count' } as const, 0)
const personalAtom = atom({ plugin: 'tiabwft', key: 'personal' } as const, emptyMemory() as Memory)
const projectAtom = atom({ plugin: 'tiabwft', key: 'project' } as const, emptyMemory() as Memory)
const freshAtom = atom({ plugin: 'tiabwft', key: 'fresh' } as const, [] as string[])
const pausedAtom = atom({ plugin: 'tiabwft', key: 'paused' } as const, false)
const unreadableAtom = atom({ plugin: 'tiabwft', key: 'unreadable' } as const, 0)

// The user's prompt per main-loop turn, for the reader. Lost on reload, which only skips one read.
const prompts = new Map<string, string>()
// Whether the project file existed at load, so persistAll knows if writing it is new.
let fileExisted = false
// Whether the project file existed but could not be read, so persistAll never overwrites it.
let readFailed = false

const memoryDeps = async ($: EngineInterface, options: Record<string, unknown>): Promise<MemoryDeps> => {
  const url = typeof options.azureSyncUrl === 'string' ? options.azureSyncUrl.trim() : ''
  const key = typeof options.azureSyncKey === 'string' ? options.azureSyncKey : ''
  return {
    root: await $.session.root(),
    files: { exists: p => $.fs.exists(p), read: p => $.fs.read(p), write: (p, t) => $.fs.write(p, t) },
    kv: { get: k => $.store.get(k), set: (k, v) => $.store.set(k, v) },
    now: () => Date.now(),
    toolNames: async () => (await $.tool.list()).map(t => t.name),
    complete: request => $.model.complete(request),
    ...(url === '' || key === ''
      ? {}
      : { azure: { config: { url, key }, fetch: (u, init) => $.http.fetch(u, init), sleep: ms => $.clock.sleep(ms) } }),
  }
}

const CORE = `# There is a better way for that (tiabwft)

For every request, ask yourself: "is there a better way for that?" Don't stop at one tool: think about the **whole stack** that would make this job faster, easier, smarter and more automatic for the user.

Do the task the way you normally would. Then end your reply with a block headed **💡 There's a better way**, written in the user's language:

1. **Goal**: one line naming what the user is really trying to achieve.
2. **Full stack**: a table with columns Layer | Pick | Why | How to add | Status. Cover every layer that matters for this goal (usually 5–9 rows), for example:
   - 🤖 AI / model (which model, and a cheaper one for bulk or subagent work)
   - ⚙️ Where it runs / automation (scheduled routine, n8n, Zapier, Agent SDK, hosting)
   - 🔌 Connectors: one row per system the job touches (CRM, forms, email, calendar, chat, database, payments, docs…)
   - 🧩 Skills / plugins (installed ones first, then new ones)
   - 📦 From GitHub (owner/repo, ★ stars): MCP servers, templates, skill collections
   - 🧠 Data / memory (where facts and history live)
   - 📊 Monitoring / cost / settings
   - 🛡️ Safety (approvals, narrow tokens, what not to automate)
   Status is "already installed", "installed, needs login" or "new". One specific pick per row (other options go under Alternatives); for things the user already has, How to add says "already connected", never a step to add it again.
3. **Flow**: one line showing how the pieces chain together (A → B → C).
4. **Alternatives**: one line with the simpler/cheaper stack and the bigger one.
5. **Start here**: exactly one concrete action the user can take right now (connect X, run this command). One action: no "then", no list, no question. Questions for the user go on their own line after it.

Look everything up; don't suggest from memory. Before writing the block:
1. Connectors: if a connector-registry tool exists (a tool name containing \`mcp-registry\`, such as \`search_mcp_registry\` and \`suggest_connectors\`), search it once per layer the job touches (CRM, forms, email, chat…). Load deferred tools with ToolSearch first. Show the best unconnected ones with \`suggest_connectors\`.
2. Skills and plugins: call \`SearchPlugins\` and \`SearchSkills\` when they exist; check \`ListPlugins\` / \`ListSkills\` and the session's skill list for what's already installed.
3. GitHub: when the \`gh\` CLI works, run read-only searches, for example \`gh search repos "<topic> mcp" --sort stars --limit 5 --json fullName,stargazersCount,pushedAt\` and the same with \`--topic=claude-skills\` and \`--topic=claude-code-plugin\`. Skip repos under about 20 stars or with no push in 4 months.
4. Use the tiabwft skill's reference files for layers the lookups don't cover: build-stacks.md (frameworks, hosting, starter stacks), mcp-use-cases.md (power combos), models-and-costs.md.
Do the lookups once per topic, not every turn: when you already gave a stack for this topic in this conversation, add only what's new, or leave the block out.

For a big or open goal (building an agent, an app, a business process, automating something, choosing a stack or a cloud), load the \`tiabwft\` skill first and follow its full research method.

Never invent tools, connectors, repos or star counts: name only what a lookup or the reference files confirmed. Never install, connect or buy anything without the user's yes.`

const ALWAYS = `${CORE}

For trivial requests (a typo, a rename, a greeting, a quick fact), skip the lookups and the stack: add at most one line, only if a tip would clearly save the user time.`

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

const saveMemory = async ($: EngineInterface, options: Record<string, unknown>, personal: Memory, project: Memory) => {
  const memoryOptions: MemoryOptions = { projectFile: options.projectFile === 'ignore' ? 'ignore' : 'commit' }
  await update($, personalAtom, () => personal)
  await update($, projectAtom, () => project)
  await persistAll(await memoryDeps($, options), memoryOptions, personal, project, fileExisted, readFailed).catch(() => undefined)
  fileExisted = fileExisted || project.facts.some(f => f.source !== 'env')
}

export const register: Register = (on, options) => {
  const protocol = protocolFor(options.mode)
  const memoryOn = options.memory !== 'off'

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tiabwft',
      description: 'There is a better way for that: /tiabwft on, /tiabwft off, /tiabwft panel, or /tiabwft to see the status',
    })
    if (protocol !== undefined) {
      void $.ui.open({ id: PANE, title: PANE_TITLE })
    }
    if (memoryOn && protocol !== undefined) {
      try {
        const loaded = await loadAll(await memoryDeps($, options))
        fileExisted = loaded.fileExisted
        readFailed = loaded.readFailed === true
        await update($, unreadableAtom, () => loaded.unreadable)
        await saveMemory($, options, loaded.personal, loaded.project)
      } catch {
        // Memory is best effort: tiabwft works without it.
      }
    }

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      prompts.set(e.turnId, e.text)
    }

    return next(e)
  })

  // Keeps the latest 💡 block of the main loop for the side panel.
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined && !e.isAborted) {
      const found = extractSuggestion(e.answer, Date.now())
      if (found !== undefined) {
        await update($, latest, () => found)
        await update($, count, n => n + 1)
      }
      const prompt = prompts.get(e.turnId) ?? ''
      prompts.delete(e.turnId)
      if (memoryOn && protocol !== undefined && !(await read($, pausedAtom))) {
        const answer = e.answer
        void (async () => {
          try {
            const deps = await memoryDeps($, options)
            const learned = await learn(deps, prompt, answer, await read($, personalAtom), await read($, projectAtom))
            if (learned.fresh.length > 0) {
              await saveMemory($, options, learned.personal, learned.project)
            }
            await update($, freshAtom, () => learned.fresh)
          } catch {
            // A failed read is skipped; the next turn tries again.
          }
        })()
      }
    }

    return done
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Markdown } = $.ui.resolve(e)
    const shown = await read($, latest)
    const total = await read($, count)
    const isOn = protocol !== undefined && (await read($, enabled))
    if (shown === null) {
      return (
        <Box flexDirection="column">
          <Text dimColor>{isOn ? 'No suggestion yet. Ask something and the latest stack tip lands here.' : 'tiabwft is off. Turn it on with /tiabwft on.'}</Text>
        </Box>
      )
    }
    const time = new Date(shown.at).toTimeString().slice(0, 5)

    return (
      <Box flexDirection="column">
        <Text key="meta" dimColor>{`${time} · ${shown.topic}${total > 1 ? ` · ${total} this session` : ''}`}</Text>
        <Markdown key="block" text={shown.markdown} />
        {!isOn && <Text key="off" dimColor>tiabwft is off now; this is the last tip from before.</Text>}
      </Box>
    )
  })

  on('command.run', { command: 'tiabwft' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'panel') {
      const { isPlaced } = await $.ui.open({ id: PANE, title: PANE_TITLE })

      return { text: isPlaced ? 'The tiabwft panel is open.' : 'The tiabwft panel is ready, but this surface has no room to show a pane.' }
    }
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

    const memorySection = memoryOn ? renderMemorySection(await read($, personalAtom), await read($, projectAtom)) : undefined
    const text = [protocol, facts, memorySection].filter((part): part is string => part !== undefined).join('\n\n')

    return {
      ...composed,
      sections: [...composed.sections, { id: SECTION_ID, text, scope: 'session' as const }],
    }
  })
}
