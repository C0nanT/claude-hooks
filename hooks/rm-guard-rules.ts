const PIPE_TO_SHELL = /\b(curl|wget)\b[^|;&\n]*\|\s*(sudo\s+)?(sh|bash|zsh)\b/

const PATTERN_RM = 'rm -rf <dangerous target>'
const PATTERN_CHMOD = 'chmod -R 777'
const PATTERN_PIPE = 'curl|wget ... | sh'

const WRAPPERS = ['sudo', 'command', 'env', 'exec', 'nohup']

/** Folds `.` and `..` segments of an absolute path; `..` above the root stays at the root. */
function fold(path: string): string {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return `/${parts.join('/')}`
}

/** The words of one simple command, quotes removed, leading `VAR=x`, `sudo` and the like skipped. */
function words(segment: string): string[] {
  const all = segment.trim().split(/\s+/).filter(Boolean).map(word => word.replace(/^["']|["']$/g, ''))
  let start = 0
  while (start < all.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(all[start]) || WRAPPERS.includes(all[start]))) start++
  return all.slice(start)
}

function flagLetters(args: readonly string[]): string {
  return args.filter(arg => /^-[^-]/.test(arg)).map(arg => arg.slice(1)).join('')
}

function isDangerousTarget(target: string, cwd: string): boolean {
  if (/^(\/|\/\*|~\/?|\$HOME\/?|\$\{HOME\}\/?|\.\.|\*)$/.test(target)) return true
  if (target.startsWith('../') || /^(~|\$HOME|\$\{HOME\})\//.test(target)) return true
  if (target.startsWith('/')) {
    const full = fold(target)
    const root = fold(cwd === '' ? '/' : cwd)
    return cwd === '' || !full.startsWith(root === '/' ? '/' : `${root}/`) || full === root
  }
  if (cwd !== '' && target.includes('..')) return !fold(`${cwd}/${target}`).startsWith(`${fold(cwd)}/`)
  return false
}

function matchSegment(segment: string, cwd: string): string | undefined {
  const [program, ...args] = words(segment)
  if (program === 'rm') {
    const flags = flagLetters(args)
    const isRecursive = args.includes('--recursive') || /[rR]/.test(flags)
    const isForced = args.includes('--force') || /f/.test(flags)
    if (!isRecursive || !isForced) return undefined
    const targets = args.filter(arg => !arg.startsWith('-'))
    return targets.some(target => isDangerousTarget(target, cwd)) ? PATTERN_RM : undefined
  }
  if (program === 'chmod') {
    const isRecursive = args.includes('--recursive') || /R/.test(flagLetters(args))
    return isRecursive && args.includes('777') ? PATTERN_CHMOD : undefined
  }
  return undefined
}

/** The pattern a destructive part of the command matches, or undefined when it is safe. */
export function matchRmDangerous(command: string, cwd: string): string | undefined {
  if (PIPE_TO_SHELL.test(command)) return PATTERN_PIPE
  for (const segment of command.split(/&&|\|\||[;|&\n]/)) {
    const pattern = matchSegment(segment, cwd)
    if (pattern !== undefined) return pattern
  }
  return undefined
}

export function rmBlockedMessage(command: string, pattern: string): string {
  return `BLOCKED: '${command}' matches dangerous pattern '${pattern}'. The user has prevented you from doing this.`
}
