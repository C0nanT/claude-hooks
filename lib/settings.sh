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

# Previous-generation hooks: a command that carries the "conan-caveman-autostart"
# marker, or cites conan-git-guardrails / block-dangerous-git without the
# current "claude-hook:git-guardrails" marker.
_JQ_LEGACY_DEF='def is_legacy_caveman: (.command // "") | contains("conan-caveman-autostart");
  def is_legacy_git: ((.command // "") | (contains("conan-git-guardrails") or contains("block-dangerous-git")))
    and (has_marker("claude-hook:git-guardrails") | not);'

# _remove_hooks_where <jq predicate over a hook object>
# Removes every hook matching the predicate; prunes empty groups, events, and hooks.
_remove_hooks_where() {
  jq "$_JQ_MARKER_DEF $_JQ_LEGACY_DEF"'
    if .hooks then
      .hooks |= (
        to_entries
        | map(.value |= [ .[]
            | .hooks = [ .hooks[] | select(('"$1"') | not) ]
            | select((.hooks | length) > 0) ])
        | map(select((.value | length) > 0))
        | from_entries
      )
      | if (.hooks | length) == 0 then del(.hooks) else . end
    else . end
  '
}

# _hooks_present_where <jq predicate over a hook object>
_hooks_present_where() {
  jq -e "$_JQ_MARKER_DEF $_JQ_LEGACY_DEF"'
    [ .hooks // {} | to_entries[] | .value[] | .hooks[] | select('"$1"') ] | length > 0
  ' >/dev/null 2>&1
}

# remove_legacy_hooks <caveman|git>   /   legacy_present <caveman|git>
remove_legacy_hooks() { _remove_hooks_where "is_legacy_$1"; }
legacy_present()      { _hooks_present_where "is_legacy_$1"; }
