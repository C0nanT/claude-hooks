#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$COMMAND" ] && exit 0

# Global git options (-c k=v, -C dir, --git-dir=..., etc.) can appear between
# "git" and the subcommand, so patterns must tolerate them instead of requiring
# "git" and the subcommand to be adjacent.
GIT_OPT='(-c[[:space:]]+[^[:space:]]+|-C[[:space:]]+[^[:space:]]+|--git-dir=[^[:space:]]+|--work-tree=[^[:space:]]+|--namespace=[^[:space:]]+|--no-pager|--literal-pathspecs)'
GIT_PREFIX="git([[:space:]]+${GIT_OPT})*[[:space:]]+"

DANGEROUS_PATTERNS=(
  "${GIT_PREFIX}push"
  "${GIT_PREFIX}commit"
  "${GIT_PREFIX}reset --hard"
  "${GIT_PREFIX}clean -fd"
  "${GIT_PREFIX}clean -f"
  "${GIT_PREFIX}branch -D"
  "${GIT_PREFIX}checkout \."
  "${GIT_PREFIX}restore \."
  "${GIT_PREFIX}rm"
  "${GIT_PREFIX}mv"
  "push --force"
  "reset --hard"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if printf '%s' "$COMMAND" | grep -qE -- "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this." >&2
    exit 2
  fi
done

exit 0
