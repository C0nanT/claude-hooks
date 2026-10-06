/** Whether each plugin function is on; a name never written counts as on. */
export type StoredToggles = {
  caveman?: boolean
  'git-guard'?: boolean
  'dotenv-guard'?: boolean
  sound?: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'conan-mods': { toggles: StoredToggles }
  }
}
