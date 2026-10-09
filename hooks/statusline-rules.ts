export type StatusLineFields = {
  model?: string
  effort?: string | number
  contextPercent?: number
  contextTokens?: number
  /** Milliseconds since the session began. */
  durationMs?: number
  fiveHourPercent?: number
  /** ISO 8601 time the five-hour window resets. */
  fiveHourResetsAt?: string
  /** IANA zone the reset time is drawn in; the process's own zone when absent. */
  timezone?: string
  branch?: string
}

/** `23m` under an hour, `1h05m` from there on. */
export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60000))
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

/** Thousands, rounded: 28400 becomes `28k`. */
export function formatTokens(tokens: number): string {
  return `${Math.round(tokens / 1000)}k`
}

function isValidTimezone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/** `HH:MM` of an ISO timestamp in the zone; undefined when the timestamp is not a date. */
export function formatResetTime(iso: string, timezone: string | undefined): string | undefined {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const timeZone = timezone !== undefined && isValidTimezone(timezone) ? timezone : undefined
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date)
}

/** What a segment shows, which picks its colour in the band. */
export type StatusTone = 'model' | 'duration' | 'usage-low' | 'usage-mid' | 'usage-high' | 'branch'
export type StatusSegment = { text: string; tone: StatusTone }

/** Theme colours per tone; ctx and the rate limit go green under 50%, yellow to 79%, red from 80%. */
export const TONE_COLORS: Record<StatusTone, string> = {
  model: 'claude',
  duration: 'subtle',
  'usage-low': 'success',
  'usage-mid': 'warning',
  'usage-high': 'error',
  branch: 'merged',
}

/** The Nerd Font git-branch glyph, drawn before the branch; needs a Nerd Font in the terminal. */
export const BRANCH_ICON = '\ue0a0'

/** How each effort level is written next to the model. */
export const EFFORT_TAGS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'XHigh', max: 'Max' }

/**
 * The effort the user's settings.json names for the model: `modelSettings[model].effortLevel`,
 * else the top-level `effortLevel`. Non-string values are ignored; undefined when none applies.
 */
export function settingsEffort(settings: unknown, model: string | undefined): string | undefined {
  if (typeof settings !== 'object' || settings === null) return undefined
  const record = settings as Record<string, unknown>
  const perModel = model === undefined ? undefined : (record.modelSettings as Record<string, unknown> | null | undefined)?.[model]
  const own = typeof perModel === 'object' && perModel !== null ? (perModel as Record<string, unknown>).effortLevel : undefined
  if (typeof own === 'string') return own
  return typeof record.effortLevel === 'string' ? record.effortLevel : undefined
}

/** The model with its effort tag on the right, as `[High]`; an effort with no tag is shown as `(value)`. */
export function formatModel(model: string, effort: string | number | undefined): string {
  if (effort === undefined) return model
  const tag = typeof effort === 'string' ? EFFORT_TAGS[effort] : undefined
  return tag === undefined ? `${model} (${effort})` : `${model} [${tag}]`
}

/** The tone for a usage percentage, shared by ctx and the rate limit. */
export function usageTone(percent: number): StatusTone {
  if (percent < 50) return 'usage-low'
  return percent < 80 ? 'usage-mid' : 'usage-high'
}

/** The segments, fields left to right; a field with no data is left out. */
export function buildStatusSegments(fields: StatusLineFields): StatusSegment[] {
  const segments: StatusSegment[] = []
  if (fields.model) segments.push({ text: formatModel(fields.model, fields.effort), tone: 'model' })
  if (fields.contextPercent !== undefined) {
    const tokens = fields.contextTokens === undefined ? '' : ` ${formatTokens(fields.contextTokens)}`
    const percent = Math.round(fields.contextPercent)
    segments.push({ text: `ctx:${percent}%${tokens}`, tone: usageTone(percent) })
  }
  if (fields.durationMs !== undefined) segments.push({ text: formatDuration(fields.durationMs), tone: 'duration' })
  if (fields.fiveHourPercent !== undefined) {
    const reset = fields.fiveHourResetsAt === undefined ? undefined : formatResetTime(fields.fiveHourResetsAt, fields.timezone)
    const percent = Math.round(fields.fiveHourPercent)
    segments.push({ text: `limit:${percent}%${reset === undefined ? '' : ` ↺ ${reset}`}`, tone: usageTone(percent) })
  }
  if (fields.branch) segments.push({ text: `${BRANCH_ICON} ${fields.branch}`, tone: 'branch' })
  return segments
}

export const SEGMENT_SEPARATOR = ' · '

/** The plain line: the segments' text joined. */
export function buildStatusLine(fields: StatusLineFields): string {
  return buildStatusSegments(fields)
    .map(segment => segment.text)
    .join(SEGMENT_SEPARATOR)
}

const UNHELPFUL_ZONES = new Set(['', 'UTC', 'Etc/UTC', 'Etc/UCT', 'UCT', 'Etc/Universal', 'Universal', 'Etc/Zulu', 'Zulu'])

/** An IANA zone from a `/usr/share/zoneinfo/...` link target or a plain name; undefined when it is empty, plain UTC or unknown. */
export function normalizeZone(raw: string | undefined): string | undefined {
  const zone = (raw ?? '').trim().replace(/^.*\/zoneinfo\//, '')
  return UNHELPFUL_ZONES.has(zone) || !isValidTimezone(zone) ? undefined : zone
}

/** The first host source that names a real zone; plain UTC counts as no answer. */
export function pickHostTimezone(candidates: readonly (string | undefined)[]): string | undefined {
  for (const candidate of candidates) {
    const zone = normalizeZone(candidate)
    if (zone !== undefined) return zone
  }
  return undefined
}

/**
 * The zone from PowerShell's `Id|BaseUtcOffsetMinutes` line: the Id when it is an IANA name,
 * else the whole-hour offset as an `Etc/GMT` zone (Windows ids such as `E. South America Standard Time` are not IANA).
 */
export function parseWindowsTimezone(output: string): string | undefined {
  const [id = '', minutes = ''] = output.trim().split('|')
  const named = normalizeZone(id)
  if (named !== undefined) return named
  const hours = Number(minutes) / 60
  if (minutes.trim() === '' || !Number.isInteger(hours) || hours === 0 || Math.abs(hours) > 12) return undefined
  return `Etc/GMT${hours > 0 ? '-' : '+'}${Math.abs(hours)}`
}

/** `STATUSLINE_TZ` wins; then the host's zone; the Windows zone only when neither answers. */
export function chooseTimezone(override: string | undefined, host: string | undefined, windows: string | undefined): string | undefined {
  const forced = (override ?? '').trim()
  return forced !== '' ? forced : (host ?? windows)
}
