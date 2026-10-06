import type { EngineInterface, Register } from 'claude-code'
import { BASH_BLOCKED_MESSAGE, bashReferencesEnv, DOTENV_FILE_TOOLS, fileBlockedMessage, isBlockedEnvPath } from './dotenv-guard-rules'
import { blockedMessage, matchDangerous } from './git-guard-rules'
import { listText, offBandText, parseHooksArgs, TOGGLE_NAMES, usageText } from './toggles'
import type { ToggleName, Toggles } from './toggles'

const toggles = { plugin: 'conan-mods', key: 'toggles' } as const

// These helpers stay in this file: `$` is only followed into functions declared here.

/** Every toggle: session state first, then the per-PC store; absent means on. */
async function readToggles($: EngineInterface): Promise<Toggles> {
  const { value } = await $.state.get(toggles)
  const result = {} as Toggles
  for (const name of TOGGLE_NAMES) {
    const held = value?.[name]
    result[name] = typeof held === 'boolean' ? held : (await $.store.get(name)) !== false
  }
  return result
}

async function setToggle($: EngineInterface, name: ToggleName, isOn: boolean): Promise<void> {
  const current = await readToggles($)
  await $.store.set(name, isOn)
  await $.state.set(toggles, { ...current, [name]: isOn })
  $.ui.invalidate('ui.render')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'hooks', description: 'List or switch the plugin functions: /hooks [<name> on|off]' })
    return next(e)
  })

  on('command.run', { command: 'hooks' }, async ($, e) => {
    const command = parseHooksArgs(e.args)
    if (command.kind === 'usage') return { text: usageText() }
    if (command.kind === 'list') return { text: listText(await readToggles($)) }
    await setToggle($, command.name, command.isOn)
    return { text: `${command.name}: ${command.isOn ? 'on' : 'off'}` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const text = offBandText(await readToggles($))
    if (text === undefined) return next(e)
    const { Text } = $.ui.resolve(e)
    return Text({ children: text })
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!(await readToggles($))['git-guard']) return next(e)
    const pattern = matchDangerous(e.command)
    return pattern === undefined ? next(e) : { deny: blockedMessage(e.command, pattern) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `${$.plugin.name}: git-guard failed, command blocked.` }))

  on('tool.call', { tool: [...DOTENV_FILE_TOOLS] }, async ($, e, next) => {
    if (!(await readToggles($))['dotenv-guard']) return next(e)
    const path = typeof e.file_path === 'string' ? e.file_path : ''
    return path !== '' && isBlockedEnvPath(path) ? { deny: fileBlockedMessage(path) } : next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `${$.plugin.name}: dotenv-guard failed, call blocked.` }))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!(await readToggles($))['dotenv-guard']) return next(e)
    return bashReferencesEnv(e.command) ? { deny: BASH_BLOCKED_MESSAGE } : next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `${$.plugin.name}: dotenv-guard failed, command blocked.` }))
}
