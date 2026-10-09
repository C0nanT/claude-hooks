import { expect, test } from 'claude-code/testing'
import { matchSecretCommand, matchSecretPath, MISSING_HOME_RULE, secretBlockedMessage } from './secret-guard-rules'

test('with no home, home-anchored paths report the missing-home rule', () => {
  expect(matchSecretPath('~/.ssh/known_hosts', '')).toBe(MISSING_HOME_RULE)
  expect(matchSecretPath('${HOME}/.azure/x', '')).toBe(MISSING_HOME_RULE)
  expect(matchSecretPath('/home/a/.config/gh/hosts.yml', '')).toBe(MISSING_HOME_RULE)
})

test('with no home, home-independent rules answer first and ordinary paths pass', () => {
  expect(matchSecretPath('~/.ssh/id_rsa', '')).toBe(MISSING_HOME_RULE)
  expect(matchSecretPath('/anywhere/id_rsa', '')).toBe('id_rsa')
  expect(matchSecretPath('/p/.npmrc', '')).toBe('.npmrc')
  expect(matchSecretPath('/project/README.md', '')).toBeUndefined()
  expect(matchSecretCommand('echo hello', '')).toEqual([])
})

test('the missing-home message names HOME', () => {
  expect(secretBlockedMessage('~/.ssh/x', MISSING_HOME_RULE)).toContain('HOME could not be read')
})
