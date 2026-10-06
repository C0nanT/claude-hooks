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

# Labels used in the cleanup report (set by uninstall.sh / list.sh).
# remove_item <path>: report and delete a file or directory; no-op if absent.
# Honors $dry_run (true/false) and $found_label.
remove_item() {
  local path="$1"
  if [ -e "$path" ] || [ -L "$path" ]; then
    echo "  $found_label: $path"
    $dry_run || rm -rf -- "$path"
  else
    echo "  does not exist: $path"
  fi
}

# clean_dir <dir> <name>...: remove the named entries inside <dir>, then <dir>
# itself only if nothing else is left in it. Foreign entries are never touched.
clean_dir() {
  local dir="$1" name entry foreign=0
  shift
  for name in "$@"; do remove_item "$dir/$name"; done
  [ -d "$dir" ] || { echo "  does not exist: $dir"; return 0; }
  for entry in "$dir"/* "$dir"/.[!.]* "$dir"/..?*; do
    [ -e "$entry" ] || [ -L "$entry" ] || continue
    case " $* " in *" ${entry##*/} "*) continue ;; esac
    foreign=1
  done
  if [ "$foreign" -eq 1 ]; then
    echo "  kept (holds other files): $dir"
  else
    echo "  $found_label: $dir"
    $dry_run || rmdir -- "$dir" 2>/dev/null || true
  fi
}
