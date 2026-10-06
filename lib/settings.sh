#!/usr/bin/env bash
# Pure settings-mutation functions for claude-hooks.
# All functions read JSON from stdin and write JSON to stdout — no file I/O.
# Callers handle reading the settings file and writing the result back.

# A hook "carries" a marker when the first line of its command, with trailing
# whitespace trimmed, is exactly "# <marker>" (so "claude-hook:caveman" never
# matches "claude-hook:caveman-v2").
_JQ_MARKER_DEF='def has_marker($m): ((.command // "") | split("\n")[0] | sub("\\s+$"; "")) == ("# " + $m);'

# remove_hook <marker>
# Removes every hook carrying exactly <marker>, across all events.
# Prunes empty groups, events, and the hooks object itself.
remove_hook() {
  local marker="$1"
  jq --arg m "$marker" "$_JQ_MARKER_DEF"'
    if .hooks then
      .hooks |= (
        to_entries
        | map(.value |= [ .[]
            | .hooks = [ .hooks[] | select(has_marker($m) | not) ]
            | select((.hooks | length) > 0) ])
        | map(select((.value | length) > 0))
        | from_entries
      )
      | if (.hooks | length) == 0 then del(.hooks) else . end
    else . end
  '
}

# hook_present <marker>
# Exits 0 if any hook carrying exactly <marker> exists in stdin JSON.
hook_present() {
  local marker="$1"
  jq -e --arg m "$marker" "$_JQ_MARKER_DEF"'
    [ .hooks // {} | to_entries[] | .value[] | .hooks[] | select(has_marker($m)) ] | length > 0
  ' >/dev/null 2>&1
}

# marked_commands
# Prints the marker line of every command whose first line starts with "# claude-hook:".
marked_commands() {
  jq -r '
    .hooks // {} | to_entries[] | .value[]? | .hooks[]?
    | (.command // "") | split("\n")[0] | select(startswith("# claude-hook:"))
    | ltrimstr("# ")
  '
}
