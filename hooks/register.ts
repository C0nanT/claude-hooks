import type { Register } from 'claude-code'
import { blockedMessage, matchDangerous } from './git-guard-rules'

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    const pattern = matchDangerous(e.command)
    return pattern === undefined ? next(e) : { deny: blockedMessage(e.command, pattern) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `${$.plugin.name}: git-guard failed, command blocked.` }))
}
