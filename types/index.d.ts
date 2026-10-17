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

declare module 'claude-code' {
  interface PluginState {
    tiabwft: {
      enabled: boolean
      latest: Suggestion | null
      /** How many blocks this session has produced, the latest included. */
      count: number
    }
  }
}
