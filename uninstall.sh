#!/usr/bin/env bash
set -euo pipefail

# Remove Claude Code hooks installed by this tool from the settings file.
#
#   ./uninstall.sh            # remove ALL hooks installed by this tool
#   ./uninstall.sh block-rm   # remove only the block-rm hook
#
# Surgical: only touches hooks carrying this tool's "claude-hook:" marker;
# anything else in your settings.json is left untouched. Emptied groups,
# events, and the hooks object are pruned so nothing dangling is left behind.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck source=lib/settings.sh
source "$SCRIPT_DIR/lib/settings.sh"
HOOKS_DIR="$SCRIPT_DIR/hooks"

require_jq
[ -f "$SETTINGS_FILE" ] || { echo "nothing to do: $SETTINGS_FILE does not exist"; exit 0; }
ensure_settings

remove_marker() {
  local marker="$1"
  remove_hook "$marker" < "$SETTINGS_FILE" | write_settings
}

cleanup_bundled_scripts() {
  local -A seen
  shopt -s nullglob
  local files=("$HOOKS_DIR"/*.json)
  shopt -u nullglob

  for f in "${files[@]}"; do
    local sd; sd="$(jq -r '.scripts_dir // ""' "$f")"
    [[ -z "$sd" ]] && continue
    local dest; dest="$(basename "$sd")"
    [[ -n "${seen[$dest]+_}" ]] && continue
    seen[$dest]=1

    local still_installed=false
    for g in "${files[@]}"; do
      local gsd; gsd="$(jq -r '.scripts_dir // ""' "$g")"
      [[ "$(basename "$gsd")" == "$dest" ]] || continue
      hook_present "${HOOK_NS}$(basename "$g" .json)" < "$SETTINGS_FILE" \
        && { still_installed=true; break; }
    done
    $still_installed || rm -rf "$HOME/.claude/hooks-lib/$dest"
  done
}

main() {
  local before after
  before="$(jq -S . "$SETTINGS_FILE")"

  if [ "$#" -gt 0 ]; then
    local n
    for n in "$@"; do remove_marker "${HOOK_NS}${n%.json}"; done
    cleanup_bundled_scripts
  else
    # No args: remove the whole namespace (every hook this tool ever installed,
    # including ones whose definition file was since deleted).
    remove_marker "$HOOK_NS"
    cleanup_bundled_scripts
  fi

  after="$(jq -S . "$SETTINGS_FILE")"
  if [ "$before" = "$after" ]; then
    echo "no matching hooks found in $SETTINGS_FILE"
  else
    echo "removed hooks from $SETTINGS_FILE"
  fi
}

main "$@"
