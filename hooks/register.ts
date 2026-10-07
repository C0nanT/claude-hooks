import type { EngineInterface, Register } from 'claude-code'
import { BASH_BLOCKED_MESSAGE, bashReferencesEnv, DOTENV_FILE_TOOLS, fileBlockedMessage, isBlockedEnvPath } from './dotenv-guard-rules'
import { blockedMessage, matchDangerous } from './git-guard-rules'
import { matchSecretCommand, matchSecretPath, SECRET_FILE_TOOLS, secretBlockedMessage } from './secret-guard-rules'
import { isWsl, SOUND_DEBOUNCE_MS, ubuntuCommands, wslCommand } from './sound-rules'
import { listText, offBandText, parseModsArgs, TOGGLE_NAMES, usageText } from './toggles'
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

const CAVEMAN_WARNING = 'caveman: skill não encontrada, rode `npx skills@latest add C0nanT/skills`'

/** The skill's text, or undefined when it cannot be read (missing, unreadable or empty). */
async function readCavemanSkill($: EngineInterface): Promise<string | undefined> {
  try {
    const home = await $.env.get('HOME')
    if (home === undefined || home === '') return undefined
    const text = await $.fs.read(`${home}/.claude/skills/caveman/SKILL.md`)
    return text.trim() === '' ? undefined : text
  } catch {
    return undefined
  }
}

/** True when the command ran and exited 0; a command that cannot start counts as failed. */
async function runs($: EngineInterface, argv: readonly string[]): Promise<boolean> {
  try {
    return (await $.process.run(argv)).exitCode === 0
  } catch {
    return false
  }
}

async function readProcVersion($: EngineInterface): Promise<string | undefined> {
  try {
    return await $.fs.read('/proc/version')
  } catch {
    return undefined
  }
}

/** HOME, or an empty string when it is unset or cannot be read. */
async function readHome($: EngineInterface): Promise<string> {
  try {
    return (await $.env.get('HOME')) ?? ''
  } catch {
    return ''
  }
}

async function playDone($: EngineInterface): Promise<void> {
  if (isWsl(await readProcVersion($), await $.env.get('WSL_DISTRO_NAME'))) {
    await runs($, wslCommand())
    return
  }
  for (const argv of ubuntuCommands()) if (await runs($, argv)) return
}

export const register: Register = on => {
  let isCavemanWarned = false
  let lastSoundAt: number | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'conan-mods', description: 'List or switch the conan-mods functions', argumentHint: '[<name> on|off]' })
    return next(e)
  })

  on('command.run', { command: 'conan-mods' }, async ($, e) => {
    const command = parseModsArgs(e.args)
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

  on('tool.call', { tool: [...SECRET_FILE_TOOLS] }, async ($, e, next) => {
    if (!(await readToggles($))['secret-guard']) return next(e)
    const path = typeof e.file_path === 'string' ? e.file_path : ''
    if (path === '') return next(e)
    const rule = matchSecretPath(path, await readHome($))
    return rule === undefined ? next(e) : { deny: secretBlockedMessage(path, rule) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `${$.plugin.name}: secret-guard failed, call blocked.` }))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!(await readToggles($))['secret-guard']) return next(e)
    const match = matchSecretCommand(e.command, await readHome($))
    return match === undefined ? next(e) : { deny: secretBlockedMessage(match.path, match.rule) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `${$.plugin.name}: secret-guard failed, command blocked.` }))

  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    if (!(await readToggles($)).caveman) return result
    const text = await readCavemanSkill($)
    if (text === undefined) {
      if (!isCavemanWarned) {
        isCavemanWarned = true
        $.ui.toast(CAVEMAN_WARNING, { timeoutMs: 10000 })
      }
      return result
    }
    return { sections: [...result.sections, { id: 'conan-mods:caveman', text, scope: 'session' }] }
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined || e.isAborted || !(await readToggles($)).sound) return result
    const now = await $.clock.now()
    if (lastSoundAt !== undefined && now - lastSoundAt < SOUND_DEBOUNCE_MS) return result
    lastSoundAt = now
    await playDone($)
    return result
  }).catch(($, e, next) => next(e))
}
