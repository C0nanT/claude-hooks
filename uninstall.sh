#!/usr/bin/env bash
set -euo pipefail

# Remove the 5 hooks this project used to install from ~/.claude/settings.json,
# plus the leftovers old versions put on disk.
#
#   ./uninstall.sh             # remove them and print a report
#   ./uninstall.sh --dry-run   # print the same report, write nothing
#
# Each hook is matched by its exact "claude-hook:<name>" marker. Hooks from
# other projects (even with a "claude-hook:" marker) and unmarked hooks are
# left untouched. Emptied groups, events and the hooks object are pruned.
# Disk leftovers (hooks-lib folders, notification control files, previous-
# generation scripts) are removed; foreign files in those places survive.

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

if $dry_run; then
  found_label="would be removed"
else
  found_label="removed"
fi

print_next_step() {
  echo
  echo "Next: install the plugin with"
  echo "  $PLUGIN_INSTALL_CMD"
}

current=""
changed=false
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "$SETTINGS_FILE not found: nothing to clean in settings"
else
  require_valid_settings
  current="$(cat "$SETTINGS_FILE")"
  $dry_run && echo "Dry run: nothing will be written to $SETTINGS_FILE"

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

  for kind in caveman git; do
    case "$kind" in
      caveman) label="previous-generation hook: conan-caveman-autostart" ;;
      git)     label="previous-generation hook: conan-git-guardrails / block-dangerous-git" ;;
    esac
    if printf '%s' "$current" | legacy_present "$kind"; then
      echo "  $found_label: $label"
      current="$(printf '%s' "$current" | remove_legacy_hooks "$kind")"
      changed=true
    else
      echo "  does not exist: $label"
    fi
  done

  if $changed && ! $dry_run; then
    printf '%s\n' "$current" | write_settings
  fi
fi

clean_dir "$HOME/.claude/hooks-lib" git-guardrails notification protect-dotenv
remove_item "${XDG_RUNTIME_DIR:-/tmp}/claude-notification"
clean_dir "$HOME/.claude/hooks" conan-git-guardrails.sh block-dangerous-git.sh

if [ -n "$current" ]; then
  leftover="$(printf '%s' "$current" | marked_commands)"
  if [ -n "$leftover" ]; then
    echo
    echo "Commands that still carry the claude-hook: marker (not touched):"
    printf '%s\n' "$leftover" | sed 's/^/  - /'
  fi
fi

print_next_step
