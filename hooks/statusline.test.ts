import { expect, mock, test } from 'claude-code/testing'

const START = 1_000_000
const RESET = '2026-10-07T18:30:00Z'

type World = { lines: (string | undefined)[]; clock: any; usage: any; calls: string[][] }

function world(on: any, opts: { env?: Record<string, string>; stored?: Record<string, unknown>; rateLimits?: any[]; branch?: string; procVersion?: string; localtime?: string; powershell?: string; startedAt?: number } = {}): World {
  mock.store(on, opts.stored ?? {})
  mock.env(on, opts.env ?? {})
  const clock = mock.clock(on, { now: START + 23 * 60000 })
  const usage = {
    startedAt: opts.startedAt ?? START,
    context: { window: 200000, tokens: 28000, percent: 14 },
    rateLimits: opts.rateLimits ?? [{ kind: 'five_hour', percentUsed: 42, resetsAt: RESET }],
  }
  const lines: (string | undefined)[] = []
  const calls: string[][] = []
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('session.usage', () => ({ value: usage }))
  on('session.model', () => ({ value: 'opus' }))
  on('ui.status', (_$: any, e: any) => (lines.push(e.text), { value: undefined }))
  on('fs.read', (_$: any, e: any) => (e.path === '/proc/version' && opts.procVersion ? { value: opts.procVersion } : { deny: 'ENOENT' }))
  on('process.run', (_$: any, e: any) => {
    const argv = [...e.argv]
    calls.push(argv)
    const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '' } })
    const fail = { value: { exitCode: 1, stdout: '', stderr: '' } }
    if (argv[0] === 'git') return opts.branch === undefined ? fail : ok(`${opts.branch}\n`)
    if (argv[0] === 'timedatectl') return ok('')
    if (argv[0] === 'readlink') return opts.localtime === undefined ? fail : ok(opts.localtime)
    if (argv[0] === 'powershell.exe') return opts.powershell === undefined ? fail : ok(opts.powershell)
    return fail
  })
  return { lines, clock, usage, calls }
}

const MEASURE = { context: { window: 200000, tokens: 28000, percent: 14 }, rateLimits: [], changed: ['context'] }
const START_EVENT = { cwd: '/work', surface: 'terminal', isInteractive: true }

test('measure draws model, ctx, duration, limit in the local zone and branch', async ($, on) => {
  const w = world(on, { env: { STATUSLINE_TZ: 'America/Sao_Paulo' }, branch: 'main' })
  await $.session.measure(MEASURE)
  expect(w.lines.at(-1)).toBe('opus · ctx:14% 28k · 23m · limit:42% ↺ 15:30 · main')
})

test('session start draws too', async ($, on) => {
  const w = world(on, { env: { STATUSLINE_TZ: 'UTC' } })
  await $.session.start(START_EVENT)
  expect(w.lines.at(-1)).toContain('limit:42% ↺ 18:30')
})

test('over an hour reads 1h05m', async ($, on) => {
  const w = world(on)
  await w.clock.advance(42 * 60000)
  await $.session.measure(MEASURE)
  expect(w.lines.at(-1)).toContain('1h05m')
})

test('no rate limit and no repo: those fields are omitted', async ($, on) => {
  const w = world(on, { rateLimits: [] })
  await $.session.measure(MEASURE)
  expect(w.lines.at(-1)).toBe('opus · ctx:14% 28k · 23m')
})

test('a new session start after /clear restarts the duration', async ($, on) => {
  const w = world(on, { rateLimits: [] })
  await $.session.measure(MEASURE)
  expect(w.lines.at(-1)).toContain('23m')
  w.usage.startedAt = START + 23 * 60000
  await $.session.measure(MEASURE)
  expect(w.lines.at(-1)).toContain('0m')
  expect(w.lines.at(-1)).not.toContain('23m')
})

test('effort shows once a turn step reported it', async ($, on) => {
  const w = world(on, { rateLimits: [] })
  on('turn.step', async function* () {
    return { turnId: 't', index: 0, answer: '', toolUses: [] }
  })
  for await (const _chunk of $.turn.step({ turnId: 't', index: 0, model: 'opus', effort: 'high', messageCount: 1 })) void _chunk
  await $.session.measure(MEASURE)
  expect(w.lines.at(-1)).toContain('opus (high)')
})

test('STATUSLINE_TZ beats the host zone', async ($, on) => {
  const w = world(on, { env: { STATUSLINE_TZ: 'Asia/Tokyo' }, localtime: '/usr/share/zoneinfo/America/Sao_Paulo' })
  await $.session.measure(MEASURE)
  expect(w.lines.at(-1)).toContain('↺ 03:30')
})

test('host zone comes from the /etc/localtime link', async ($, on) => {
  const w = world(on, { localtime: '/usr/share/zoneinfo/America/Sao_Paulo' })
  await $.session.measure(MEASURE)
  expect(w.lines.at(-1)).toContain('↺ 15:30')
})

test('WSL with Linux in UTC takes the zone from PowerShell', async ($, on) => {
  const w = world(on, { env: { WSL_DISTRO_NAME: 'Ubuntu' }, localtime: '/usr/share/zoneinfo/UTC', powershell: 'E. South America Standard Time|-180' })
  await $.session.measure(MEASURE)
  expect(w.lines.at(-1)).toContain('↺ 15:30')
  expect(w.calls.some(c => c[0] === 'powershell.exe')).toBe(true)
})

test('the zone is resolved once per session', async ($, on) => {
  const w = world(on, { localtime: '/usr/share/zoneinfo/America/Sao_Paulo' })
  await $.session.measure(MEASURE)
  await $.session.measure(MEASURE)
  expect(w.calls.filter(c => c[0] === 'readlink')).toHaveLength(1)
})

test('off clears the line at once and stops drawing; on draws again', async ($, on) => {
  const w = world(on, { rateLimits: [] })
  await $.session.measure(MEASURE)
  await $.command.run({ command: 'conan-mods', args: 'statusline off' })
  expect(w.lines.at(-1)).toBeUndefined()
  const count = w.lines.length
  await $.session.measure(MEASURE)
  expect(w.lines).toHaveLength(count)
  await $.command.run({ command: 'conan-mods', args: 'statusline on' })
  expect(w.lines.at(-1)).toBe('opus · ctx:14% 28k · 23m')
})
