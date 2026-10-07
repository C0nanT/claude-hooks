export const SECRET_FILE_TOOLS = ['Read', 'Edit', 'Write', 'MultiEdit'] as const

const SSH_ALLOWED = ['known_hosts', 'config']
const KEY_NAMES = ['id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519']
const KEY_EXTENSIONS = ['.pem', '.key', '.p12', '.pfx']
const TOOL_FILES = ['.npmrc', '.pypirc', '.netrc', '.git-credentials']

/** Resolves `~/`, `$HOME/` and `${HOME}/` with `home`, then folds `.` and `..` segments. */
function normalize(path: string, home: string): string {
  const expanded = path.replace(/^(~|\$HOME|\$\{HOME\})(?=\/|$)/, home)
  const parts: string[] = []
  for (const part of expanded.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return (expanded.startsWith('/') ? '/' : '') + parts.join('/')
}

/** The name of the secret rule the path matches, or undefined when it is not protected. */
export function matchSecretPath(path: string, home: string): string | undefined {
  const full = normalize(path, home)
  const base = full.split('/').pop() ?? ''
  const root = home === '' ? undefined : normalize(home, home)
  const under = (dir: string) => root !== undefined && full.startsWith(`${root}/${dir}/`)

  if (under('.ssh') && !SSH_ALLOWED.includes(base) && !base.endsWith('.pub')) return '~/.ssh'
  if (KEY_NAMES.includes(base)) return base
  if (root !== undefined && full === `${root}/.aws/credentials`) return '~/.aws/credentials'
  if (under('.config/gcloud')) return '~/.config/gcloud'
  if (under('.azure')) return '~/.azure'
  const extension = KEY_EXTENSIONS.find(ext => base.endsWith(ext))
  if (extension !== undefined) return `*${extension}`
  if (TOOL_FILES.includes(base)) return base
  if (root !== undefined && full === `${root}/.docker/config.json`) return '~/.docker/config.json'
  if (root !== undefined && full === `${root}/.config/gh/hosts.yml`) return '~/.config/gh/hosts.yml'
  return undefined
}

/** Every token in the command that matches a secret rule, with that rule, left to right. */
export function matchSecretCommand(command: string, home: string): { path: string; rule: string }[] {
  const matches: { path: string; rule: string }[] = []
  for (const token of command.split(/[\s;&|<>=()"'`,]+/)) {
    if (token === '') continue
    const rule = matchSecretPath(token, home)
    if (rule !== undefined) matches.push({ path: token, rule })
  }
  return matches
}

/**
 * True for the extension rules (a `.pem`, `.key`, `.p12` or `.pfx` file). In a command they also
 * match code such as `row.key`, so a Bash match on one blocks only when the token names a file that exists.
 */
export function isExtensionRule(rule: string): boolean {
  return rule.startsWith('*.')
}

/** The token as an absolute path: `~` and `$HOME` resolved, relative paths taken from `cwd`. */
export function resolveCommandPath(token: string, home: string, cwd: string): string {
  const expanded = normalize(token, home)
  return expanded.startsWith('/') || cwd === '' ? expanded : normalize(`${cwd}/${expanded}`, home)
}

export function secretBlockedMessage(path: string, rule: string): string {
  return `BLOCKED: '${path}' matches secret rule '${rule}'. The user has prevented you from reading credentials.`
}
