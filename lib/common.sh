#!/usr/bin/env bash
# Shared helpers for the claude-hooks install/uninstall/list scripts.

# Namespace marker prefix. Hooks this tool used to install carry a
# "# claude-hook:<name>" comment as the FIRST line of their command; cleanup
# finds them by that marker.
HOOK_NS="claude-hook:"

# Settings file to manage: always the user-global Claude Code settings,
# resolved from HOME.
SETTINGS_FILE="$HOME/.claude/settings.json"

# The only hooks this tool ever installed (one marker each). Cleanup removes
# exactly these; other "claude-hook:" markers belong to other projects.
OWN_HOOKS=(caveman git-guardrails protect-dotenv notify-attention notify-done)

PLUGIN_INSTALL_CMD="/plugin install conan-mods --marketplace C0nanT/claude-hooks"

die() { echo "error: $*" >&2; exit 1; }

require_jq() {
  command -v jq >/dev/null 2>&1 || \
    die "jq is required but not installed. On Ubuntu/WSL: sudo apt-get install -y jq"
}

# Atomically replace the settings file with stdin.
write_settings() {
  local tmp
  tmp="$(mktemp "${SETTINGS_FILE}.XXXXXX")"
  cat > "$tmp"
  mv "$tmp" "$SETTINGS_FILE"
}

# Abort unless the settings file holds valid JSON (never overwrite a broken file).
require_valid_settings() {
  jq -e . "$SETTINGS_FILE" >/dev/null 2>&1 || die "$SETTINGS_FILE is not valid JSON; fix it by hand first"
}
