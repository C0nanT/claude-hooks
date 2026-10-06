export const DOTENV_FILE_TOOLS = ['Read', 'Edit', 'Write', 'MultiEdit'] as const

const SAFE_NAMES = ['.env.example', '.env.sample', '.env.dist', '.env.template']
const SAFE_VARIANT = /\.env\.(example|sample|dist|template)/g
const ENV_REFERENCE = /\.env([^a-zA-Z_-]|$)/

/** True when the file's base name is `.env` or `.env.*`, except the safe variants. */
export function isBlockedEnvPath(path: string): boolean {
  const base = path.split('/').filter(Boolean).pop() ?? ''
  if (SAFE_NAMES.includes(base)) return false
  return base === '.env' || base.startsWith('.env.')
}

/** True when the command still references a .env file once the safe variants are removed. */
export function bashReferencesEnv(command: string): boolean {
  return ENV_REFERENCE.test(command.replace(SAFE_VARIANT, ''))
}

export function fileBlockedMessage(path: string): string {
  const base = path.split('/').filter(Boolean).pop() ?? ''
  return `Access to ${base} is blocked — .env files may contain secrets. Read .env.example instead.`
}

export const BASH_BLOCKED_MESSAGE =
  'Bash command references a .env file which may contain secrets. Use .env.example instead.'
