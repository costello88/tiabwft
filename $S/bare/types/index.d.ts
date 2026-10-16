export type TiabwftMode = 'always' | 'big-asks-only' | 'off'

declare module 'claude-code' {
  interface PluginState {
    tiabwft: { enabled: boolean }
  }
}
