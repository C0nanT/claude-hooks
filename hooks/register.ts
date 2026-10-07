import type { EngineInterface, Register } from 'claude-code'
import { BASH_BLOCKED_MESSAGE, bashReferencesEnv, DOTENV_FILE_TOOLS, fileBlockedMessage, isBlockedEnvPath } from './dotenv-guard-rules'
import { blockedMessage, matchDangerous } from './git-guard-rules'
import { matchRmDangerous, rmBlockedMessage } from './rm-guard-rules'
import { isExtensionRule, matchSecretCommand, matchSecretPath, resolveCommandPath, SECRET_FILE_TOOLS, secretBlockedMessage } from './secret-guard-rules'
import { isWsl, SOUND_DEBOUNCE_MS, ubuntuCommands, wslCommand } from './sound-rules'
import { buildStatusSegments, chooseTimezone, parseWindowsTimezone, pickHostTimezone, SEGMENT_SEPARATOR, TONE_COLORS } from './statusline-rules'
import type { StatusSegment } from './statusline-rules'
import { listText, offBandText, parseModsArgs, TOGGLE_NAMES, usageText } from './toggles'
import type { ToggleName, Toggles } from './toggles'

const PANE_ID = 'conan-mods'
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

/** Switches one function by the path the text command and the pane's buttons share. */
async function applyToggle($: EngineInterface, state: StatusLineState, name: ToggleName, isOn: boolean): Promise<void> {
  await setToggle($, name, isOn)
  if (name !== 'statusline' && name !== 'statusline-color') return
  if ((await readToggles($)).statusline) await drawStatusLine($, state)
  else clearStatusLine($, state)
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

/** Whether the path exists; a failed check counts as existing, so the guard stays closed. */
async function pathExists($: EngineInterface, path: string): Promise<boolean> {
  try {
    return await $.fs.exists(path)
  } catch {
    return true
  }
}

/** The session's directory, or an empty string when it cannot be read. */
async function readCwd($: EngineInterface): Promise<string> {
  try {
    return await $.session.cwd()
  } catch {
    return ''
  }
}

type StatusLineState = {
  effort?: string | number
  /** What the coloured band draws; undefined while the plain line is in use or nothing was drawn. */
  segments?: StatusSegment[]
  timezone?: string
  isTimezoneResolved: boolean
}

/** Trimmed stdout of a command that exited 0; undefined when it failed or cannot start. */
async function outputOf($: EngineInterface, argv: readonly string[]): Promise<string | undefined> {
  try {
    const result = await $.process.run(argv)
    return result.exitCode === 0 ? result.stdout.trim() : undefined
  } catch {
    return undefined
  }
}

async function readText($: EngineInterface, path: string): Promise<string | undefined> {
  try {
    return await $.fs.read(path)
  } catch {
    return undefined
  }
}

/** The zone the reset time is drawn in, read once per session: STATUSLINE_TZ, the host, then Windows under WSL. */
async function resolveTimezone($: EngineInterface, state: StatusLineState): Promise<string | undefined> {
  if (state.isTimezoneResolved) return state.timezone
  const override = await $.env.get('STATUSLINE_TZ')
  let host: string | undefined
  let windows: string | undefined
  if ((override ?? '').trim() === '') {
    host = pickHostTimezone([
      await outputOf($, ['timedatectl', 'show', '-p', 'Timezone', '--value']),
      await readText($, '/etc/timezone'),
      await outputOf($, ['readlink', '/etc/localtime']),
    ])
    if (host === undefined && isWsl(await readProcVersion($), await $.env.get('WSL_DISTRO_NAME'))) {
      const output = await outputOf($, ['powershell.exe', '-NoProfile', '-Command', "[TimeZoneInfo]::Local.Id + '|' + [TimeZoneInfo]::Local.BaseUtcOffset.TotalMinutes"])
      windows = output === undefined ? undefined : parseWindowsTimezone(output)
    }
  }
  state.timezone = chooseTimezone(override, host, windows)
  state.isTimezoneResolved = true
  return state.timezone
}

/** Clears both places the status line can be drawn. */
function clearStatusLine($: EngineInterface, state: StatusLineState): void {
  $.ui.status(undefined)
  if (state.segments === undefined) return
  state.segments = undefined
  $.ui.invalidate('ui.render')
}

/**
 * Draws the status line from the session's usage: in colour in the band above the prompt when
 * statusline-color is on, else as the plain line under it. Leaves the line as it was when anything throws.
 */
async function drawStatusLine($: EngineInterface, state: StatusLineState): Promise<void> {
  try {
    const usage = await $.session.usage()
    const fiveHour = usage.rateLimits.find(limit => limit.kind === 'five_hour')
    const branch = await outputOf($, ['git', 'branch', '--show-current'])
    const segments = buildStatusSegments({
      model: await $.session.model(),
      effort: state.effort,
      contextPercent: usage.context.percent,
      contextTokens: usage.context.tokens,
      durationMs: (await $.clock.now()) - usage.startedAt,
      fiveHourPercent: fiveHour?.percentUsed,
      fiveHourResetsAt: fiveHour?.resetsAt,
      timezone: fiveHour?.resetsAt === undefined ? undefined : await resolveTimezone($, state),
      branch,
    })
    if ((await readToggles($))['statusline-color']) {
      $.ui.status(undefined)
      state.segments = segments
      $.ui.invalidate('ui.render')
    } else {
      $.ui.status(segments.map(segment => segment.text).join(SEGMENT_SEPARATOR))
      if (state.segments !== undefined) {
        state.segments = undefined
        $.ui.invalidate('ui.render')
      }
    }
  } catch {
    // A failed measurement keeps the previous line.
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
  const statusLine: StatusLineState = { isTimezoneResolved: false }

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'conan-mods', description: 'List or switch the conan-mods functions', argumentHint: '[<name> on|off]' })
    const result = await next(e)
    if ((await readToggles($)).statusline) await drawStatusLine($, statusLine)
    return result
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    if ((await readToggles($)).statusline) await drawStatusLine($, statusLine)
    return result
  }).catch(($, e, next) => next(e))

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) statusLine.effort = e.effort
    return yield* next(e)
  })

  on('command.run', { command: 'conan-mods' }, async ($, e) => {
    const command = parseModsArgs(e.args)
    if (command.kind === 'usage') return { text: usageText() }
    if (command.kind === 'list') {
      try {
        await $.ui.open({ id: PANE_ID, title: 'conan-mods', focus: true, closeOnEscape: true })
      } catch {
        // Where the pane cannot open, the text list below is the answer.
      }
      return { text: listText(await readToggles($)) }
    }
    await applyToggle($, statusLine, command.name, command.isOn)
    return { text: `${command.name}: ${command.isOn ? 'on' : 'off'}` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const current = await readToggles($)
    return Box({
      flexDirection: 'column',
      children: TOGGLE_NAMES.map(name =>
        Box({
          key: `row-${name}`,
          children: [
            Text({ children: `${name}: ${current[name] ? 'on' : 'off'} ` }),
            Button({ key: name, label: current[name] ? 'turn off' : 'turn on', onPress: async () => applyToggle($, statusLine, name, !(await readToggles($))[name]) }),
          ],
        }),
      ),
    })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await readToggles($)
    const text = offBandText(current)
    const segments = current.statusline && current['statusline-color'] ? statusLine.segments : undefined
    if (text === undefined && (segments === undefined || segments.length === 0)) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const offBand = text === undefined ? undefined : Text({ key: 'off-band', children: text })
    if (segments === undefined || segments.length === 0) return offBand
    const status = Box({
      key: 'status',
      children: segments.flatMap((segment, index) => [
        ...(index === 0 ? [] : [Text({ key: `sep-${index}`, dimColor: true, children: SEGMENT_SEPARATOR })]),
        Text({ key: `seg-${index}`, color: TONE_COLORS[segment.tone], bold: segment.tone === 'model', children: segment.text }),
      ]),
    })
    return Box({ flexDirection: 'column', children: offBand === undefined ? [status] : [status, offBand] })
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
    const home = await readHome($)
    for (const match of matchSecretCommand(e.command, home)) {
      if (isExtensionRule(match.rule) && !(await pathExists($, resolveCommandPath(match.path, home, await readCwd($))))) continue
      return { deny: secretBlockedMessage(match.path, match.rule) }
    }
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `${$.plugin.name}: secret-guard failed, command blocked.` }))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!(await readToggles($))['rm-guard']) return next(e)
    const pattern = matchRmDangerous(e.command, await readCwd($))
    return pattern === undefined ? next(e) : { deny: rmBlockedMessage(e.command, pattern) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `${$.plugin.name}: rm-guard failed, command blocked.` }))

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
