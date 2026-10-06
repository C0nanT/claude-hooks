import { expect, mock, test } from 'claude-code/testing'

const NAMES = ['caveman', 'git-guard', 'dotenv-guard', 'sound']

async function hooks($: any, args = '') {
  return $.command.run({ command: 'hooks', args })
}

test('/hooks lists the four names, all on, on a fresh install', async ($, on) => {
  mock.store(on)
  const out = await hooks($)
  for (const name of NAMES) expect(out.text).toContain(`${name}: on`)
})

test('/hooks git-guard off lets git push pass, on blocks again', async ($, on) => {
  mock.store(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: 'ran', text: 'ran' }))
  expect((await hooks($, 'git-guard off')).text).toBe('git-guard: off')
  expect((await $.tool.call({ tool: 'Bash', command: 'git push origin main' })).text).toBe('ran')
  expect((await hooks($, 'git-guard on')).text).toBe('git-guard: on')
  expect((await $.tool.call({ tool: 'Bash', command: 'git push origin main' })).deny).toContain('BLOCKED')
})

for (const args of ['nope on', 'git-guard maybe', 'git-guard', 'git-guard on extra']) {
  test(`invalid input '${args}' answers usage and changes nothing`, async ($, on) => {
  mock.store(on)
    const out = await hooks($, args)
    expect(out.text).toContain('Usage: /hooks')
    for (const name of NAMES) expect(out.text).toContain(name)
    expect((await hooks($)).text).not.toContain('off')
  })
}

test('a stored off survives into a new session', async ($, on) => {
  mock.store(on, { sound: false })
  const text = (await hooks($)).text
  expect(text).toContain('sound: off')
  expect(text).toContain('caveman: on')
})
