import { expect, mock, test } from 'claude-code/testing'

const BLOCKED = [
  'git push origin main',
  'git push --force origin main',
  'git reset --hard HEAD~1',
  'git clean -fd',
  'git clean -f',
  'git branch -D feature',
  'git checkout .',
  'git restore .',
  'git rm -rf file',
  'git -C /tmp push origin main',
  'git --no-pager reset --hard HEAD~1',
  'git --git-dir=/repo/.git push',
  'git -c user.name=y push',
]

const ALLOWED = [
  'git commit -m x',
  'git -c user.email=x -c user.name=y commit -m x',
  'git -C /tmp commit -m x',
  "grep -rn 'git commit' .",
  'git status',
  'git -C /tmp status',
  'git --no-pager log',
  'git diff',
]

for (const command of BLOCKED) {
  test(`blocks: ${command}`, async ($, on) => {
    mock.store(on)
    on('tool.call', { tool: 'Bash' }, () => ({ result: 'ran', text: 'ran' }))
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny).toContain(`BLOCKED: '${command}' matches dangerous pattern '`)
    expect(out.deny).toContain("'. The user has prevented you from doing this.")
  })
}

for (const command of ALLOWED) {
  test(`allows: ${command}`, async ($, on) => {
    mock.store(on)
    on('tool.call', { tool: 'Bash' }, () => ({ result: 'ran', text: 'ran' }))
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.text).toBe('ran')
  })
}

test('allows: a non-Bash tool whose input mentions a dangerous command', async ($, on) => {
  mock.store(on)
  on('tool.call', { tool: 'Read' }, () => ({ result: 'ran', text: 'ran' }))
  const out = await $.tool.call({ tool: 'Read', file_path: 'git push --force' })
  expect(out.text).toBe('ran')
})
