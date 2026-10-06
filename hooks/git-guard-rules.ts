// Global git options (-c k=v, -C dir, --git-dir=..., etc.) can appear between
// "git" and the subcommand, so patterns tolerate them instead of requiring
// "git" and the subcommand to be adjacent.
const GIT_OPT =
  '(-c\\s+\\S+|-C\\s+\\S+|--git-dir=\\S+|--work-tree=\\S+|--namespace=\\S+|--no-pager|--literal-pathspecs)'
const GIT_PREFIX = `git(\\s+${GIT_OPT})*\\s+`

export const DANGEROUS_PATTERNS: readonly string[] = [
  `${GIT_PREFIX}push`,
  `${GIT_PREFIX}reset --hard`,
  `${GIT_PREFIX}clean -fd`,
  `${GIT_PREFIX}clean -f`,
  `${GIT_PREFIX}branch -D`,
  `${GIT_PREFIX}checkout \\.`,
  `${GIT_PREFIX}restore \\.`,
  `${GIT_PREFIX}rm`,
  'push --force',
  'reset --hard',
]

/** The first dangerous pattern the command matches, or undefined when it is safe. */
export function matchDangerous(command: string): string | undefined {
  return DANGEROUS_PATTERNS.find(pattern => new RegExp(pattern).test(command))
}

export function blockedMessage(command: string, pattern: string): string {
  return `BLOCKED: '${command}' matches dangerous pattern '${pattern}'. The user has prevented you from doing this.`
}
