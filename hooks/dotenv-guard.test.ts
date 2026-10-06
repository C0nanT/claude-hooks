import { expect, mock, test } from 'claude-code/testing'

const FILE_BLOCKED = [
  ['Read', '/project/.env'],
  ['Edit', '/project/.env'],
  ['Write', '/project/.env'],
  ['MultiEdit', '/project/.env'],
  ['Read', '/project/.env.local'],
  ['Read', '/project/.env.production'],
]
const FILE_ALLOWED = [
  ['Read', '/project/.env.example'],
  ['Edit', '/project/.env.example'],
  ['Read', '/project/.env.sample'],
  ['Read', '/project/.env.dist'],
  ['Read', '/project/.env.template'],
]
const BASH_BLOCKED = ['cat .env', 'source .env', 'cat /app/.env']
const BASH_ALLOWED = ['cat .env.example', 'echo .env.example', 'grep KEY .env.example']

for (const [tool, file_path] of FILE_BLOCKED) {
  test(`blocks: ${tool} ${file_path}`, async ($, on) => {
    mock.store(on)
    on('tool.call', { tool }, () => ({ result: 'ran', text: 'ran' }))
    const out = await $.tool.call({ tool, file_path })
    expect(out.deny).toBe(
      `Access to ${file_path.split('/').pop()} is blocked — .env files may contain secrets. Read .env.example instead.`,
    )
  })
}

for (const [tool, file_path] of FILE_ALLOWED) {
  test(`allows: ${tool} ${file_path}`, async ($, on) => {
    mock.store(on)
    on('tool.call', { tool }, () => ({ result: 'ran', text: 'ran' }))
    expect((await $.tool.call({ tool, file_path })).text).toBe('ran')
  })
}

for (const command of BASH_BLOCKED) {
  test(`blocks bash: ${command}`, async ($, on) => {
    mock.store(on)
    on('tool.call', { tool: 'Bash' }, () => ({ result: 'ran', text: 'ran' }))
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny).toBe('Bash command references a .env file which may contain secrets. Use .env.example instead.')
  })
}

for (const command of BASH_ALLOWED) {
  test(`allows bash: ${command}`, async ($, on) => {
    mock.store(on)
    on('tool.call', { tool: 'Bash' }, () => ({ result: 'ran', text: 'ran' }))
    expect((await $.tool.call({ tool: 'Bash', command })).text).toBe('ran')
  })
}

test('allows: a tool outside the list (Grep)', async ($, on) => {
  mock.store(on)
  on('tool.call', { tool: 'Grep' }, () => ({ result: 'ran', text: 'ran' }))
  expect((await $.tool.call({ tool: 'Grep', file_path: '/project/.env' })).text).toBe('ran')
})

test('/hooks dotenv-guard off lets everything pass, on blocks again', async ($, on) => {
  mock.store(on)
  on('tool.call', { tool: 'Read' }, () => ({ result: 'ran', text: 'ran' }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: 'ran', text: 'ran' }))
  await $.command.run({ command: 'hooks', args: 'dotenv-guard off' })
  expect((await $.tool.call({ tool: 'Read', file_path: '/p/.env' })).text).toBe('ran')
  expect((await $.tool.call({ tool: 'Bash', command: 'cat .env' })).text).toBe('ran')
  await $.command.run({ command: 'hooks', args: 'dotenv-guard on' })
  expect((await $.tool.call({ tool: 'Read', file_path: '/p/.env' })).deny).toContain('is blocked')
  expect((await $.tool.call({ tool: 'Bash', command: 'cat .env' })).deny).toContain('references a .env')
})
