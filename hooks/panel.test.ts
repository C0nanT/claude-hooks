import { expect, mock, test } from 'claude-code/testing'

const NAMES = ['caveman', 'git-guard', 'dotenv-guard', 'secret-guard', 'rm-guard', 'sound', 'statusline', 'statusline-color']
const DEFAULT = 'engine default'

for (const surface of ['terminal', 'vscode'] as const) {
  test(`${surface}: the pane lists every function and a button switches git-guard off and on`, async ($, on) => {
    mock.store(on)
    on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', children: [DEFAULT] }))
    on('tool.call', { tool: 'Bash' }, () => ({ result: 'ran', text: 'ran' }))
    const out = await $.command.run({ command: 'conan-mods', args: '' })
    for (const name of NAMES) expect(out.text).toContain(`${name}: on`)

    const pane = await $.ui.mount({ plugin: 'conan-mods', surface, component: 'Pane', requestId: 'conan-mods', props: {} })
    const band = await $.ui.mount({ plugin: 'conan-mods', surface, component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false } })
    for (const name of NAMES) expect(await pane.find({ type: 'Text', text: `${name}: on ` })).toBeDefined()

    await pane.press({ key: 'git-guard' })
    expect(await pane.find({ type: 'Text', text: 'git-guard: off ' })).toBeDefined()
    expect(await band.find({ type: 'Text', text: '⚠ off: git-guard' })).toBeDefined()
    expect((await $.tool.call({ tool: 'Bash', command: 'git push origin main' })).text).toBe('ran')

    await pane.press({ key: 'git-guard' })
    expect(await pane.find({ type: 'Text', text: 'git-guard: on ' })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /off:/ })).toBeUndefined()
    expect((await $.tool.call({ tool: 'Bash', command: 'git push origin main' })).deny).toContain('BLOCKED')
    await pane.unmount()
    await band.unmount()
  })
}
