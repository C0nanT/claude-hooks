#!/usr/bin/env bash
# Pure settings-mutation functions for claude-hooks.
# All functions read JSON from stdin and write JSON to stdout — no file I/O.
# Callers handle reading the settings file and writing the result back.

# upsert_hook <event> <matcher> <cmd> <marker>
# Removes any existing hook carrying <marker> from <event>, then appends a fresh group.
upsert_hook() {
  local event="$1" matcher="$2" cmd="$3" marker="$4"
  jq \
    --arg ev     "$event"   \
    --arg matcher "$matcher" \
    --arg cmd    "$cmd"     \
    --arg m      "$marker"  '
    (if $matcher == ""
       then {hooks: [{type: "command", command: $cmd}]}
       else {matcher: $matcher, hooks: [{type: "command", command: $cmd}]}
     end) as $group
    | .hooks[$ev] = [ ((.hooks[$ev] // [])[])
        | .hooks = [ .hooks[]
            | select((.command // "") | split("\n")[0] | startswith("# " + $m) | not) ]
        | select((.hooks | length) > 0) ]
    | .hooks[$ev] += [ $group ]
  '
}

# remove_hook <marker>
# Removes every hook whose first command line starts with "# <marker>", across all events.
# Prunes empty groups, events, and the hooks object itself.
remove_hook() {
  local marker="$1"
  jq --arg m "$marker" '
    if .hooks then
      .hooks |= (
        to_entries
        | map(.value |= [ .[]
            | .hooks = [ .hooks[]
                | select((.command // "") | split("\n")[0] | startswith("# " + $m) | not) ]
            | select((.hooks | length) > 0) ])
        | map(select((.value | length) > 0))
        | from_entries
      )
      | if (.hooks | length) == 0 then del(.hooks) else . end
    else . end
  '
}

# hook_present <marker>
# Exits 0 if any hook whose first command line starts with "# <marker>" exists in stdin JSON.
hook_present() {
  local marker="$1"
  jq -e --arg m "$marker" '
    .hooks // {} | to_entries[] | .value[] | .hooks[]
    | select((.command // "") | split("\n")[0] | startswith("# " + $m))
  ' >/dev/null 2>&1
}
