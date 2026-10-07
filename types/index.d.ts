/** Whether each plugin function is on; a name never written counts as on. */
export type StoredToggles = {
  caveman?: boolean
  'git-guard'?: boolean
  'dotenv-guard'?: boolean
  'secret-guard'?: boolean
  'rm-guard'?: boolean
  sound?: boolean
  statusline?: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'conan-mods': { toggles: StoredToggles }
  }
}
