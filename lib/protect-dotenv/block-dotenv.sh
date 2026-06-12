#!/usr/bin/env bash
# Blocks Claude from reading or modifying .env files.
# Safe variants (.env.example, .env.sample, .env.dist, .env.template) are allowed.
set -euo pipefail

input="$(cat)"
tool_name="$(printf '%s' "$input" | jq -r '.tool_name // ""')"

block() {
  printf '{"decision":"block","reason":"%s"}\n' "$1"
  exit 2
}

is_blocked_env_path() {
  local path="$1"
  local base
  base="$(basename "$path")"
  case "$base" in
    .env.example|.env.sample|.env.dist|.env.template) return 1 ;;
    .env|.env.*) return 0 ;;
  esac
  return 1
}

case "$tool_name" in
  Read|Edit|Write|MultiEdit)
    file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')"
    if [[ -n "$file_path" ]] && is_blocked_env_path "$file_path"; then
      block "Access to $(basename "$file_path") is blocked — .env files may contain secrets. Read .env.example instead."
    fi
    ;;
  Bash)
    command_str="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"
    # Strip safe .env variants, then check if any .env reference remains
    stripped="$(printf '%s' "$command_str" | sed -E 's/\.env\.(example|sample|dist|template)//g')"
    if printf '%s' "$stripped" | grep -qE '\.env([^a-zA-Z_-]|$)'; then
      block "Bash command references a .env file which may contain secrets. Use .env.example instead."
    fi
    ;;
esac

exit 0
