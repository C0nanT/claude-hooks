import { expect, test } from 'claude-code/testing'

// With no store mocked, every toggle read fails before `next`. When several guards watch the same
// tool, the first one registered answers: git-guard for Bash, dotenv-guard for the file tools.
test('git-guard: an error before next denies with the exact command message', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: 'ran', text: 'ran' }))
  const out = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(out.deny).toBe('conan-mods: git-guard failed, command blocked.')
})

test('dotenv-guard: an error before next denies with the exact call message', async ($, on) => {
  on('tool.call', { tool: 'Read' }, () => ({ result: 'ran', text: 'ran' }))
  const out = await $.tool.call({ tool: 'Read', file_path: '/project/a.txt' })
  expect(out.deny).toBe('conan-mods: dotenv-guard failed, call blocked.')
})
