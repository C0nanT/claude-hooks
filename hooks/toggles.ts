export const TOGGLE_NAMES = ['caveman', 'git-guard', 'dotenv-guard', 'sound'] as const
export type ToggleName = (typeof TOGGLE_NAMES)[number]
export type Toggles = Record<ToggleName, boolean>

export type HooksCommand =
  | { kind: 'list' }
  | { kind: 'set'; name: ToggleName; isOn: boolean }
  | { kind: 'usage' }

/** Interprets the argument text of `/hooks`. */
export function parseHooksArgs(args: string): HooksCommand {
  const words = args.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { kind: 'list' }
  const [name, value, ...rest] = words
  const toggle = TOGGLE_NAMES.find(known => known === name)
  if (toggle === undefined || rest.length > 0 || (value !== 'on' && value !== 'off')) return { kind: 'usage' }
  return { kind: 'set', name: toggle, isOn: value === 'on' }
}

export function usageText(): string {
  return `Usage: /hooks [<name> on|off]\nValid names: ${TOGGLE_NAMES.join(', ')}`
}

export function listText(toggles: Toggles): string {
  return TOGGLE_NAMES.map(name => `${name}: ${toggles[name] ? 'on' : 'off'}`).join('\n')
}
