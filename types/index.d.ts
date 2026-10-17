export type TiabwftMode = 'always' | 'big-asks-only' | 'off'

/** The latest "There's a better way" block, as the side panel shows it. */
export type Suggestion = {
  /** The block itself, as markdown, from its 💡 heading to the end of the reply. */
  markdown: string
  /** The block's Goal line, or a short fallback when it has none. */
  topic: string
  /** When the reply that carried it finished (epoch ms). */
  at: number
}

export type FactKind = 'stack' | 'decision' | 'rejection' | 'constraint' | 'worked'
export type FactScope = 'personal' | 'project'
export type FactSource = 'env' | 'conversation' | 'user'

/** One thing tiabwft remembers about the user or the project. */
export type Fact = {
  /** kind + ":" + normalised subject */
  id: string
  kind: FactKind
  scope: FactScope
  subject: string
  text: string
  reason?: string
  source: FactSource
  firstSeen: number
  lastSeen: number
}

/** A set of facts plus deletions (fact id → when it was deleted). */
export type Memory = {
  facts: Fact[]
  tombstones: Record<string, number>
}

declare module 'claude-code' {
  interface PluginState {
    tiabwft: {
      enabled: boolean
      latest: Suggestion | null
      /** How many blocks this session has produced, the latest included. */
      count: number
      personal: Memory
      project: Memory
      /** Ids of the facts learned in the last turn, highlighted in the panel. */
      fresh: string[]
      /** Learning paused for this session (/tiabwft memory off). */
      paused: boolean
      /** Lines of the project file that couldn't be read. */
      unreadable: number
    }
  }
}
