import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Fact, Memory, Suggestion } from '../types'
import { combine, deleteFact, emptyMemory, mergeFact } from './memory/facts'
import { renderMemorySection } from './memory/inject'
import { applyLearned, forgetMatching, learn, loadAll, persistAll, rememberText } from './memory/session'
import type { FileState, MemoryDeps, MemoryOptions } from './memory/session'
import { AZURE_FACT_MAX } from './memory/store'
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
// How many facts the last save left out of the Azure upload because of its cap.
const azureLeftOutAtom = atom({ plugin: 'tiabwft', key: 'azureLeftOut' } as const, 0)

// The user's prompt per main-loop turn, for the reader. Lost on reload, which only skips one read.
const prompts = new Map<string, string>()
// The project file as last loaded or saved (see FileState). Until a load succeeds it
// counts as unreadable, so nothing overwrites a file that may exist unread.
let fileState: FileState = { existed: false, readFailed: true }

const memoryDeps = async ($: EngineInterface, options: Record<string, unknown>): Promise<MemoryDeps> => {
  // Only https: an http:// URL would send the key in clear, so it means no sync.
  const given = typeof options.azureSyncUrl === 'string' ? options.azureSyncUrl.trim() : ''
  const url = /^https:\/\//i.test(given) ? given : ''
  const key = typeof options.azureSyncKey === 'string' ? options.azureSyncKey : ''
  return {
    root: await $.session.root(),
    files: {
      exists: p => $.fs.exists(p),
      read: p => $.fs.read(p),
      write: (p, t) => $.fs.write(p, t),
      mtime: async p => (await $.fs.stat(p)).mtimeMs,
    },
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
2. **Full stack**: a table with columns Layer | Pick | Why | How to add | Status. Cover every layer the job touches, with as many rows as it needs (often 8–15), for example:
   - 🤖 AI / model (which model, and a cheaper one for bulk or subagent work)
   - ⚙️ Where it runs / automation (scheduled routine, n8n, Zapier, Agent SDK, hosting)
   - 🔌 Connectors: one row per system the job touches (CRM, forms, email, calendar, chat, database, payments, docs…)
   - 🧩 Skills / plugins (installed ones first, then new ones)
   - 📦 From GitHub (owner/repo, ★ stars): MCP servers, templates, skill collections
   - 🧠 Data / memory (where facts and history live)
   - 📊 Monitoring / cost / settings
   - 🛡️ Safety (approvals, narrow tokens, what not to automate)
   Status is "already installed", "installed, needs login" or "new". One specific pick per row (the runners-up go under Also considered); for things the user already has, How to add says "already connected", never a step to add it again.
   For each layer compare the top 3 real candidates (from the lookups, or the reference files when a lookup finds none; never anything under "Never suggest") and pick the best by a short score, your own judgment from what you found: fit, cost, effort, trust and lock-in, each 1–5. Show the pick's total in the Why cell (for example "22/25"). Aim for the best stack, not the first one that works.
   After the table add a line: **Also considered:** <layer: option (why not)>; … listing the runners-up.
3. **Flow**: one line showing how the pieces chain together (A → B → C).
4. **Alternatives**: one line with three options: the cheapest stack, the no-code stack and the pro/scale stack.
5. **Start here**: exactly one concrete action the user can take right now (connect X, run this command). One action: no "then", no list, no question. Questions for the user go on their own line after it.

Look everything up; don't suggest from memory. Before writing the block:
1. Connectors: if a connector-registry tool exists (a tool name containing \`mcp-registry\`, such as \`search_mcp_registry\` and \`suggest_connectors\`), search it once per layer the job touches (CRM, forms, email, chat…). Load deferred tools with ToolSearch first. Show the best unconnected ones with \`suggest_connectors\`.
2. Skills and plugins: call \`SearchPlugins\` and \`SearchSkills\` when they exist; check \`ListPlugins\` / \`ListSkills\` and the session's skill list for what's already installed.
3. GitHub: when the \`gh\` CLI works, run read-only searches, for example \`gh search repos "<topic> mcp" --sort stars --limit 5 --json fullName,stargazersCount,pushedAt\` and the same with \`--topic=claude-skills\` and \`--topic=claude-code-plugin\`. Skip repos under about 20 stars or with no push in 4 months.
4. Use the tiabwft skill's reference files for layers the lookups don't cover: build-stacks.md (frameworks, hosting, starter stacks), mcp-use-cases.md (power combos), models-and-costs.md, best-picks.md (the top 3 per category with a scoring rubric).
Do the lookups once per topic, not every turn: when you already gave a stack for this topic in this conversation, add only what's new, or leave the block out.

For a big or open goal (building an agent, an app, a business process, automating something, choosing a stack or a cloud), load the \`tiabwft\` skill first and follow its full research method and research deeper: run the registry search for each layer, the GitHub topic searches and a web search for the current best-in-class, and read best-picks.md.

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
  const saved = await persistAll(await memoryDeps($, options), memoryOptions, personal, project, fileState).catch(() => undefined)
  if (saved !== undefined) {
    fileState = saved.file
    await update($, azureLeftOutAtom, () => saved.leftOut)
  }
}

type MemoryPair = { personal: Memory; project: Memory }

// True only after a session-start load succeeded. Until then nothing may be written: the files may exist unread.
let memoryLoaded = false

// The memory section of the system prompt, as a snapshot. A changed system prompt
// rewrites the whole cached conversation, so the section is taken once at session start
// and refreshed only by an explicit user change (remember, forget, reset, a ✕ press).
// Background learning reaches the prompt at the next session; this session already
// holds the user's words.
let memorySection: string | undefined

// Every memory change runs one after another on this chain, so two changes never overwrite each other.
let memoryQueue: Promise<unknown> = Promise.resolve()

export const mutateMemory = (
  $: EngineInterface,
  options: Record<string, unknown>,
  change: (personal: Memory, project: Memory) => MemoryPair | Promise<MemoryPair>,
  refreshPrompt = false,
): Promise<MemoryPair | undefined> => {
  const run = async (): Promise<MemoryPair | undefined> => {
    if (!memoryLoaded) {
      return undefined
    }
    try {
      const before = { personal: await read($, personalAtom), project: await read($, projectAtom) }
      const next = await change(before.personal, before.project)
      await saveMemory($, options, next.personal, next.project)
      // A change that changed nothing (a forget that matched nothing, a remember of a fact
      // already known word for word) keeps the snapshot, and so the prompt cache.
      if (refreshPrompt && (next.personal !== before.personal || next.project !== before.project)) {
        memorySection = renderMemorySection(next.personal, next.project)
      }

      return next
    } catch {
      return undefined
    }
  }
  const result = memoryQueue.then(run, run)
  memoryQueue = result

  return result
}

// The same fact, word for word: merging it again would change nothing the user sees.
const sameFact = (a: Fact, b: Fact): boolean =>
  a.kind === b.kind && a.scope === b.scope && a.subject === b.subject && a.text === b.text && a.reason === b.reason && a.source === b.source

const MAX_SHOWN = 100
const FORGET_MIN = 3
const MAX_LISTED = 150

const sourceLabel = (f: Fact): string => {
  if (f.source === 'env') {
    return f.text
  }
  let date = ''
  try {
    date = new Date(f.firstSeen).toISOString().slice(0, 10)
  } catch {
    date = ''
  }
  const label = f.source === 'user' ? 'you added' : 'you said'

  return date === '' ? label : `${label}, ${date}`
}

export const register: Register = (on, options) => {
  const protocol = protocolFor(options.mode)
  const memoryOn = options.memory !== 'off'

  on('session.start', async ($, e, next) => {
    // Every session starts unloaded, whichever branch below runs.
    memoryLoaded = false
    memorySection = undefined
    await $.command.register({
      name: 'tiabwft',
      description: 'There is a better way for that: /tiabwft on|off|panel, /tiabwft memory [off|on|reset], /tiabwft forget <text>, /tiabwft remember <text>',
    })
    if (protocol !== undefined) {
      void $.ui.open({ id: PANE, title: PANE_TITLE }).catch(() => undefined)
    }
    if (memoryOn && protocol !== undefined) {
      // Until a load succeeds, never write the project file: it may exist unread.
      fileState = { existed: false, readFailed: true }
      memoryLoaded = false
      try {
        const loaded = await loadAll(await memoryDeps($, options))
        fileState = loaded.file
        await update($, unreadableAtom, () => loaded.unreadable)
        await update($, personalAtom, () => loaded.personal)
        await update($, projectAtom, () => loaded.project)
        memorySection = renderMemorySection(loaded.personal, loaded.project)
        memoryLoaded = true
        // Saves what the load merged (Azure, the env scan); the file is written only if
        // its text changed. The persist may wait on Azure for seconds; session start does not.
        void mutateMemory($, options, (personal, project) => ({ personal, project }))
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
    let prompt = ''
    if (e.agentId === undefined) {
      prompt = prompts.get(e.turnId) ?? ''
      prompts.delete(e.turnId)
    }
    const done = await next(e)
    if (e.agentId === undefined && !e.isAborted) {
      const found = extractSuggestion(e.answer, Date.now())
      if (found !== undefined) {
        await update($, latest, () => found)
        await update($, count, n => n + 1)
      }
      if (memoryOn && protocol !== undefined) {
        const answer = e.answer
        void (async () => {
          try {
            // Paused (/tiabwft memory off) or tiabwft muted (/tiabwft off): no reader call.
            if ((await read($, pausedAtom)) || !(await read($, enabled))) {
              return
            }
            const deps = await memoryDeps($, options)
            const learned = await learn(deps, prompt, answer, await read($, personalAtom), await read($, projectAtom))
            if (learned.fresh.length > 0) {
              await mutateMemory($, options, (personal, project) => applyLearned({ personal, project }, learned))
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
    const { Box, Text, Markdown, Button } = $.ui.resolve(e)
    const shown = await read($, latest)
    const total = await read($, count)
    const isOn = protocol !== undefined && (await read($, enabled))
    const known = memoryOn ? combine(await read($, personalAtom), await read($, projectAtom)) : []
    const fresh = new Set(await read($, freshAtom))
    const unreadable = await read($, unreadableAtom)
    const azureLeftOut = await read($, azureLeftOutAtom)
    const memoryPart = !memoryOn ? (
      <Text key="mem-off" dimColor>🧠 Memory is off (tiabwft setting: memory).</Text>
    ) : (
      <Box key="memory" flexDirection="column">
        <Text key="mem-title">🧠 What I know</Text>
        {known.length === 0 && <Text key="mem-empty" dimColor>Nothing yet. Tell me what you use or want, and it lands here.</Text>}
        {known.slice(0, MAX_SHOWN).map(f => (
          <Box key={`fact-${f.id}`} flexDirection="row">
            <Text key={`text-${f.id}`}>{`${fresh.has(f.id) ? '✨ ' : ''}${f.scope === 'personal' ? '👤' : '🗂️'} ${f.subject}: ${f.text}`}</Text>
            <Text key={`src-${f.id}`} dimColor>{` · ${sourceLabel(f)} `}</Text>
            {f.source === 'env' ? (
              <Text key={`lock-${f.id}`} dimColor>🔒</Text>
            ) : (
              <Button
                key={`forget-${f.id}`}
                plain
                onPress={() => {
                  void mutateMemory($, options, (personal, project) =>
                    f.scope === 'personal'
                      ? { personal: deleteFact(personal, f.id, Date.now()), project }
                      : { personal, project: deleteFact(project, f.id, Date.now()) },
                  true)
                }}
              >
                ✕
              </Button>
            )}
          </Box>
        ))}
        {known.length > MAX_SHOWN && <Text key="mem-more" dimColor>{`+${known.length - MAX_SHOWN} more (see /tiabwft memory)`}</Text>}
        {azureLeftOut > 0 && <Text key="mem-azure-cap" dimColor>{`Azure sync holds the newest ${AZURE_FACT_MAX} facts; ${azureLeftOut} older one(s) stay on this computer only.`}</Text>}
        {unreadable > 0 && <Text key="mem-unreadable" dimColor>{`${unreadable} line(s) in .claude/tiabwft/memory.md couldn't be read. They are kept as written at the end of the file.`}</Text>}
      </Box>
    )
    if (shown === null) {
      return (
        <Box flexDirection="column">
          <Text dimColor>{isOn ? 'No suggestion yet. Ask something and the latest stack tip lands here.' : 'tiabwft is off. Turn it on with /tiabwft on.'}</Text>
          {memoryPart}
        </Box>
      )
    }
    const time = new Date(shown.at).toTimeString().slice(0, 5)

    return (
      <Box flexDirection="column">
        <Text key="meta" dimColor>{`${time} · ${shown.topic}${total > 1 ? ` · ${total} this session` : ''}`}</Text>
        <Markdown key="block" text={shown.markdown} />
        {!isOn && <Text key="off" dimColor>tiabwft is off now; this is the last tip from before.</Text>}
        {memoryPart}
      </Box>
    )
  })

  on('command.run', { command: 'tiabwft' }, async ($, e) => {
    const raw = e.args.trim().split(/\s+/).join(' ')
    const arg = raw.toLowerCase()
    const isMemoryCommand = arg === 'memory' || arg.startsWith('memory ') || arg === 'forget' || arg.startsWith('forget ') || arg === 'remember' || arg.startsWith('remember ')
    if (isMemoryCommand) {
      if (!memoryOn) {
        return { text: 'Memory is off in the tiabwft settings (memory: off).' }
      }
      if (!memoryLoaded) {
        return { text: "tiabwft memory isn't loaded in this session (tiabwft is off, memory is off, or loading failed)." }
      }
      const failed = { text: "Couldn't save that change just now. Nothing was changed." }
      if (arg === 'memory') {
        const known = combine(await read($, personalAtom), await read($, projectAtom))
        const lines = known.slice(0, MAX_LISTED).map(f => `${f.scope === 'personal' ? '\u{1F464}' : '\u{1F5C2}\uFE0F'} [${f.kind}] ${f.subject}: ${f.text}`)
        if (known.length > MAX_LISTED) {
          lines.push(`+${known.length - MAX_LISTED} more`)
        }

        return { text: known.length === 0 ? 'tiabwft remembers nothing yet.' : lines.join('\n') }
      }
      if (arg === 'memory off' || arg === 'memory on') {
        await update($, pausedAtom, () => arg === 'memory off')

        return { text: arg === 'memory off' ? 'Learning is paused for this session. What tiabwft already knows is still used.' : 'Learning is on again.' }
      }
      if (arg === 'memory reset') {
        return { text: 'This deletes everything tiabwft remembers about this project. Type /tiabwft memory reset confirm to go ahead.' }
      }
      if (arg === 'memory reset confirm') {
        const now = Date.now()
        const done = await mutateMemory($, options, (personal, project) => ({
          personal,
          project: project.facts.filter(f => f.source !== 'env').reduce((m, f) => deleteFact(m, f.id, now), project),
        }), true)

        return done === undefined ? failed : { text: "This project's memory is deleted. Facts found in your files come back at the next start." }
      }
      if (arg.startsWith('memory ')) {
        return { text: 'Usage: /tiabwft memory [off|on|reset]' }
      }
      // A needle of 1 or 2 characters would match almost everything, for good.
      if (arg === 'forget' || (arg.startsWith('forget ') && raw.slice('forget '.length).trim().length < FORGET_MIN)) {
        return { text: 'Usage: /tiabwft forget <text>' }
      }
      if (arg === 'remember') {
        return { text: 'Usage: /tiabwft remember <text>' }
      }
      if (arg.startsWith('forget ')) {
        const needle = raw.slice('forget '.length)
        let removed: Fact[] = []
        const done = await mutateMemory($, options, (personal, project) => {
          const r = forgetMatching(personal, project, needle, Date.now())
          removed = r.removed

          return { personal: r.personal, project: r.project }
        }, true)
        if (done === undefined) {
          return failed
        }

        return { text: removed.length === 0 ? 'Nothing matched.' : `Forgotten: ${removed.map(f => f.subject).join(', ')}` }
      }
      let added: Fact[] = []
      try {
        const r = await rememberText(await memoryDeps($, options), raw.slice('remember '.length), await read($, personalAtom), await read($, projectAtom))
        added = r.added
      } catch {
        return failed
      }
      if (added.length === 0) {
        return { text: "Couldn't save that (too long, or it looked like a secret)." }
      }
      const done = await mutateMemory($, options, (personal, project) => {
        let p = personal
        let j = project
        for (const f of added) {
          const target = f.scope === 'personal' ? p : j
          if (target.facts.some(known => known.id === f.id && sameFact(known, f))) {
            continue
          }
          if (f.scope === 'personal') {
            p = mergeFact(p, f)
          } else {
            j = mergeFact(j, f)
          }
        }

        return { personal: p, project: j }
      }, true)

      return done === undefined ? failed : { text: `Remembered: ${added.map(f => `[${f.kind}] ${f.subject}`).join(', ')}` }
    }
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

    const text = [protocol, facts, memoryOn ? memorySection : undefined].filter((part): part is string => part !== undefined).join('\n\n')

    return {
      ...composed,
      sections: [...composed.sections, { id: SECTION_ID, text, scope: 'session' as const }],
    }
  })
}
