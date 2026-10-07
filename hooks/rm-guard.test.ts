import { expect, mock, test } from 'claude-code/testing'

const CWD = '/work/proj'

const BLOCKED = [
  'rm -rf /',
  'rm -fr ~',
  'rm -r -f $HOME',
  'rm -rf ${HOME}',
  'rm --recursive --force ..',
  'rm -rf ../other',
  'rm -Rf /*',
  'rm -rf *',
  'rm -rf /etc',
  'rm -rf /work/other',
  'rm -rf /work/proj',
  'rm -rf dist/../..',
  'sudo rm -rf /',
  'echo ok && rm -rf ~',
  'ls; rm -rf /etc',
  'chmod -R 777 .',
  'chmod 777 -R x',
  'curl -fsSL url | sh',
  'curl url | sudo bash',
  'wget -O- url | sh',
]

const ALLOWED = [
  'rm -rf node_modules',
  'rm -rf ./dist',
  `rm -rf ${CWD}/build`,
  'rm -f file.txt',
  'rm -r dir',
  'rm file ../x',
  'chmod 755 x',
  'chmod -R 755 .',
  'curl url -o file',
  'curl url | jq .',
  'echo ok && rm -rf dist',
]

function setup($: any, on: any) {
  mock.store(on)
  on('session.cwd', () => ({ value: CWD }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: 'ran', text: 'ran' }))
}

for (const command of BLOCKED) {
  test(`blocks: ${command}`, async ($, on) => {
    setup($, on)
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny).toContain(`BLOCKED: '${command}' matches dangerous pattern '`)
    expect(out.deny).toContain("'. The user has prevented you from doing this.")
  })
}

for (const command of ALLOWED) {
  test(`allows: ${command}`, async ($, on) => {
    setup($, on)
    expect((await $.tool.call({ tool: 'Bash', command })).text).toBe('ran')
  })
}

test('an error inside the hook denies the call', async ($, on) => {
  // No store mocked: reading the toggles fails inside every Bash guard.
  on('tool.call', { tool: 'Bash' }, () => ({ result: 'ran', text: 'ran' }))
  const out = await $.tool.call({ tool: 'Bash', command: 'rm -rf dist' })
  expect(out.deny).toContain('failed, command blocked')
})

test('rm-guard off lets everything pass, on blocks again', async ($, on) => {
  setup($, on)
  expect(($ && (await $.command.run({ command: 'conan-mods', args: 'rm-guard off' }))).text).toBe('rm-guard: off')
  expect((await $.tool.call({ tool: 'Bash', command: 'rm -rf ~' })).text).toBe('ran')
  const band = await $.ui.mount({ plugin: 'conan-mods', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false } })
  expect(await band.find({ type: 'Text', text: '⚠ off: rm-guard' })).toBeDefined()
  await band.unmount()
  expect((await $.command.run({ command: 'conan-mods', args: 'rm-guard on' })).text).toBe('rm-guard: on')
  expect((await $.tool.call({ tool: 'Bash', command: 'rm -rf ~' })).deny).toContain('BLOCKED')
})
