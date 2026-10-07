import { expect, test } from 'claude-code/testing'
import { buildStatusLine, chooseTimezone, formatDuration, formatResetTime, formatTokens, parseWindowsTimezone, pickHostTimezone } from './statusline-rules'

test('duration: minutes under an hour, 1h05m from there', () => {
  expect(formatDuration(0)).toBe('0m')
  expect(formatDuration(23 * 60000)).toBe('23m')
  expect(formatDuration(59 * 60000 + 59000)).toBe('59m')
  expect(formatDuration(65 * 60000)).toBe('1h05m')
  expect(formatDuration(135 * 60000)).toBe('2h15m')
})

test('tokens are thousands, rounded', () => {
  expect(formatTokens(28000)).toBe('28k')
  expect(formatTokens(28400)).toBe('28k')
  expect(formatTokens(28600)).toBe('29k')
})

test('reset time is drawn in the given zone', () => {
  expect(formatResetTime('2026-10-07T18:30:00Z', 'America/Sao_Paulo')).toBe('15:30')
  expect(formatResetTime('2026-10-07T18:30:00Z', 'UTC')).toBe('18:30')
  expect(formatResetTime('2026-10-07T00:05:00Z', 'UTC')).toBe('00:05')
  expect(formatResetTime('nonsense', 'UTC')).toBeUndefined()
})

test('the full line, left to right', () => {
  const line = buildStatusLine({
    model: 'opus',
    effort: 'high',
    contextPercent: 14,
    contextTokens: 28000,
    durationMs: 23 * 60000,
    fiveHourPercent: 42,
    fiveHourResetsAt: '2026-10-07T18:30:00Z',
    timezone: 'America/Sao_Paulo',
    branch: 'main',
  })
  expect(line).toBe('opus (high) · ctx:14% 28k · 23m · limit:42% ↺ 15:30 · main')
})

test('a field with no data is omitted', () => {
  expect(buildStatusLine({ model: 'opus', contextPercent: 14, contextTokens: 28000, durationMs: 60000 })).toBe('opus · ctx:14% 28k · 1m')
  expect(buildStatusLine({})).toBe('')
})

test('host zone skips empty, UTC and unknown names and reads zoneinfo links', () => {
  expect(pickHostTimezone([undefined, 'UTC', 'Etc/UTC\n', '/usr/share/zoneinfo/America/Sao_Paulo'])).toBe('America/Sao_Paulo')
  expect(pickHostTimezone(['Not/AZone', ''])).toBeUndefined()
  expect(pickHostTimezone(['UTC'])).toBeUndefined()
})

test('Windows zone: IANA id, else whole-hour offset', () => {
  expect(parseWindowsTimezone('America/Sao_Paulo|-180')).toBe('America/Sao_Paulo')
  expect(parseWindowsTimezone('E. South America Standard Time|-180')).toBe('Etc/GMT+3')
  expect(parseWindowsTimezone('X|330')).toBeUndefined()
  expect(parseWindowsTimezone('UTC|0')).toBeUndefined()
})

test('STATUSLINE_TZ beats host, host beats Windows', () => {
  expect(chooseTimezone('Asia/Tokyo', 'America/Sao_Paulo', 'Etc/GMT+3')).toBe('Asia/Tokyo')
  expect(chooseTimezone(' ', 'America/Sao_Paulo', 'Etc/GMT+3')).toBe('America/Sao_Paulo')
  expect(chooseTimezone(undefined, undefined, 'Etc/GMT+3')).toBe('Etc/GMT+3')
})
