#!/usr/bin/env bash
set -euo pipefail

# List what 'uninstall' would remove from ~/.claude/settings.json.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck source=lib/settings.sh
source "$SCRIPT_DIR/lib/settings.sh"

require_jq
[ -f "$SETTINGS_FILE" ] || { echo "no settings file: $SETTINGS_FILE (nothing to remove)"; exit 0; }
require_valid_settings

echo "Hooks in $SETTINGS_FILE that 'uninstall' would remove:"
found=0
for name in "${OWN_HOOKS[@]}"; do
  if hook_present "${HOOK_NS}${name}" < "$SETTINGS_FILE"; then
    echo "  - ${HOOK_NS}${name}"
    found=1
  fi
done
[ "$found" -eq 1 ] || echo "  (none)"
