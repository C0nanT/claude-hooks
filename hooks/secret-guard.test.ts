import { expect, mock, test } from 'claude-code/testing'

const HOME = '/home/test'
const FILE_BLOCKED = [
  ['Read', `${HOME}/.ssh/id_ed25519`, '~/.ssh'],
  ['Edit', `${HOME}/.aws/credentials`, '~/.aws/credentials'],
  ['Write', '/project/server.pem', '*.pem'],
  ['MultiEdit', '/project/.npmrc', '.npmrc'],
  ['Read', '/project/certs/app.key', '*.key'],
  ['Read', `${HOME}/.docker/config.json`, '~/.docker/config.json'],
  ['Read', `${HOME}/.config/gh/hosts.yml`, '~/.config/gh/hosts.yml'],
  ['Read', '/anywhere/id_rsa', 'id_rsa'],
]
const FILE_ALLOWED = [
  `${HOME}/.ssh/known_hosts`,
  `${HOME}/.ssh/config`,
  `${HOME}/.ssh/id_ed25519.pub`,
  '/project/README.md',
]
const BASH_BLOCKED = [
  'cat ~/.ssh/id_rsa',
  'cat $HOME/.aws/credentials',
  'cat ${HOME}/.ssh/id_ed25519',
  `cat ${HOME}/.npmrc`,
  'cp server.pem /tmp/x',
  'cat certs/app.key',
  'echo hi && cat "$HOME/.ssh/id_rsa"',
]
const BASH_ALLOWED = [
  'cat ~/.ssh/known_hosts',
  'ls ~/.ssh',
  'cat ~/.ssh/id_ed25519.pub',
  'echo hello',
  // Extension rules block in Bash only when the file exists: code like `row.key` passes.
  "node -e 'rows.map(row => row.key)'",
  'cat missing.pem',
]
const CWD = '/project'
const EXISTING = [`${CWD}/server.pem`, `${CWD}/certs/app.key`]

async function setup($: any, on: any, store = {}) {
  mock.store(on, store)
  mock.env(on, { HOME })
  on('session.cwd', () => ({ value: CWD }))
  on('fs.exists', (_$: any, e: any) => ({ value: EXISTING.includes(e.path) }))
  on('tool.call', () => ({ result: 'ran', text: 'ran' }))
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', children: ['x'] }))
}

for (const [tool, file_path, rule] of FILE_BLOCKED) {
  test(`blocks: ${tool} ${file_path}`, async ($, on) => {
    await setup($, on)
    expect((await $.tool.call({ tool, file_path })).deny).toBe(
      `BLOCKED: '${file_path}' matches secret rule '${rule}'. The user has prevented you from reading credentials.`,
    )
  })
}

for (const file_path of FILE_ALLOWED) {
  test(`allows: Read ${file_path}`, async ($, on) => {
    await setup($, on)
    expect((await $.tool.call({ tool: 'Read', file_path })).text).toBe('ran')
  })
}

for (const command of BASH_BLOCKED) {
  test(`blocks bash: ${command}`, async ($, on) => {
    await setup($, on)
    expect((await $.tool.call({ tool: 'Bash', command })).deny).toContain('matches secret rule')
  })
}

for (const command of BASH_ALLOWED) {
  test(`allows bash: ${command}`, async ($, on) => {
    await setup($, on)
    expect((await $.tool.call({ tool: 'Bash', command })).text).toBe('ran')
  })
}

test('when the file check fails, an extension match in Bash still blocks', async ($, on) => {
  mock.store(on)
  mock.env(on, { HOME })
  on('session.cwd', () => ({ value: CWD }))
  on('fs.exists', () => ({ deny: 'EACCES' }))
  on('tool.call', () => ({ result: 'ran', text: 'ran' }))
  expect((await $.tool.call({ tool: 'Bash', command: 'cat unknown.key' })).deny).toContain('matches secret rule')
})

test('an error inside the hook denies the call', async ($, on) => {
  mock.env(on, { HOME })
  on('tool.call', () => ({ result: 'ran', text: 'ran' }))
  // No store is mocked, so reading the toggles fails inside the hook.
  const out = await $.tool.call({ tool: 'Read', file_path: '/project/a.txt' })
  expect(out.deny).toContain('failed')
})

test('/conan-mods secret-guard off lets it pass, on blocks again, band shows it', async ($, on) => {
  await setup($, on)
  const run = (args: string) => $.command.run({ command: 'conan-mods', args })
  expect((await run('secret-guard off')).text).toBe('secret-guard: off')
  expect((await $.tool.call({ tool: 'Read', file_path: `${HOME}/.ssh/id_rsa` })).text).toBe('ran')
  expect((await $.tool.call({ tool: 'Bash', command: 'cat ~/.ssh/id_rsa' })).text).toBe('ran')
  const ui = await $.ui.mount({ plugin: 'conan-mods', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false } })
  expect(await ui.find({ type: 'Text', text: '⚠ off: secret-guard' })).toBeDefined()
  await ui.unmount()
  expect((await run('secret-guard on')).text).toBe('secret-guard: on')
  expect((await $.tool.call({ tool: 'Read', file_path: `${HOME}/.ssh/id_rsa` })).deny).toContain('BLOCKED')
  expect((await run('')).text).toContain('secret-guard: on')
})
