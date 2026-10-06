#!/usr/bin/env bash
set -euo pipefail

# Remove the 5 hooks this project used to install from ~/.claude/settings.json.
#
#   ./uninstall.sh             # remove them and print a report
#   ./uninstall.sh --dry-run   # print the same report, write nothing
#
# Each hook is matched by its exact "claude-hook:<name>" marker. Hooks from
# other projects (even with a "claude-hook:" marker) and unmarked hooks are
# left untouched. Emptied groups, events and the hooks object are pruned.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck source=lib/settings.sh
source "$SCRIPT_DIR/lib/settings.sh"

dry_run=false
for a in "$@"; do
  case "$a" in
    --dry-run) dry_run=true ;;
    *) die "unknown argument: $a (usage: uninstall [--dry-run])" ;;
  esac
done

require_jq

print_next_step() {
  echo
  echo "Next: install the plugin with"
  echo "  $PLUGIN_INSTALL_CMD"
}

if [ ! -f "$SETTINGS_FILE" ]; then
  echo "$SETTINGS_FILE not found: nothing to clean"
  print_next_step
  exit 0
fi
require_valid_settings

current="$(cat "$SETTINGS_FILE")"
if $dry_run; then
  echo "Dry run: nothing will be written to $SETTINGS_FILE"
  found_label="would be removed"
else
  found_label="removed"
fi

changed=false
for name in "${OWN_HOOKS[@]}"; do
  marker="${HOOK_NS}${name}"
  if printf '%s' "$current" | hook_present "$marker"; then
    echo "  $found_label: $marker"
    current="$(printf '%s' "$current" | remove_hook "$marker")"
    changed=true
  else
    echo "  does not exist: $marker"
  fi
done

if $changed && ! $dry_run; then
  printf '%s\n' "$current" | write_settings
fi

leftover="$(printf '%s' "$current" | marked_commands)"
if [ -n "$leftover" ]; then
  echo
  echo "Commands that still carry the claude-hook: marker (not touched):"
  printf '%s\n' "$leftover" | sed 's/^/  - /'
fi

print_next_step
