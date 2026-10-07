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

/** The line, fields left to right; a field with no data is left out. */
export function buildStatusLine(fields: StatusLineFields): string {
  const parts: string[] = []
  if (fields.model) parts.push(fields.effort === undefined ? fields.model : `${fields.model} (${fields.effort})`)
  if (fields.contextPercent !== undefined) {
    const tokens = fields.contextTokens === undefined ? '' : ` ${formatTokens(fields.contextTokens)}`
    parts.push(`ctx:${Math.round(fields.contextPercent)}%${tokens}`)
  }
  if (fields.durationMs !== undefined) parts.push(formatDuration(fields.durationMs))
  if (fields.fiveHourPercent !== undefined) {
    const reset = fields.fiveHourResetsAt === undefined ? undefined : formatResetTime(fields.fiveHourResetsAt, fields.timezone)
    parts.push(`limit:${Math.round(fields.fiveHourPercent)}%${reset === undefined ? '' : ` ↺ ${reset}`}`)
  }
  if (fields.branch) parts.push(fields.branch)
  return parts.join(' · ')
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
