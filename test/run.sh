#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

PASS=0; FAIL=0; _section=""

section() { _section="$1"; echo; echo "── $1"; }
ok()      { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail()    { echo "  ✗ $1"; echo "    $2"; FAIL=$((FAIL + 1)); }

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then ok "$desc"
  else fail "$desc" "expected: $expected  got: $actual"
  fi
}

TMPD="$(mktemp -d)"
trap 'rm -rf "$TMPD"' EXIT

# ── Load pure functions under test ──────────────────────────────────────────
# shellcheck source=../lib/settings.sh
source lib/settings.sh

NS="claude-hook:"
M_CAVE="${NS}caveman"
M_FOO="${NS}foo"
CMD_CAVE=$'# claude-hook:caveman\necho hi'
CMD_FOO=$'# claude-hook:foo\necho foo'
CMD_CAVE_V2=$'# claude-hook:caveman\necho updated'

# ── upsert_hook ─────────────────────────────────────────────────────────────
section "upsert_hook: basic install"
r="$(echo '{}' | upsert_hook "SessionStart" "" "$CMD_CAVE" "$M_CAVE")"
assert_eq "creates SessionStart entry"   "1"         "$(echo "$r" | jq '.hooks.SessionStart | length')"
assert_eq "stores command"               "$CMD_CAVE"  "$(echo "$r" | jq -r '.hooks.SessionStart[0].hooks[0].command')"
assert_eq "no matcher on matcherless"    "null"       "$(echo "$r" | jq '.hooks.SessionStart[0].matcher')"

section "upsert_hook: with matcher"
r="$(echo '{}' | upsert_hook "PreToolUse" "Bash" "$CMD_FOO" "$M_FOO")"
assert_eq "stores matcher"  "Bash"  "$(echo "$r" | jq -r '.hooks.PreToolUse[0].matcher')"
assert_eq "stores command"  "$CMD_FOO" "$(echo "$r" | jq -r '.hooks.PreToolUse[0].hooks[0].command')"

section "upsert_hook: idempotency"
once="$(echo '{}' | upsert_hook "SessionStart" "" "$CMD_CAVE" "$M_CAVE")"
twice="$(echo "$once" | upsert_hook "SessionStart" "" "$CMD_CAVE" "$M_CAVE")"
assert_eq "no duplicate on second install"  "1"  "$(echo "$twice" | jq '.hooks.SessionStart | length')"

section "upsert_hook: updates definition"
updated="$(echo "$once" | upsert_hook "SessionStart" "" "$CMD_CAVE_V2" "$M_CAVE")"
assert_eq "command updated"            "$CMD_CAVE_V2"  "$(echo "$updated" | jq -r '.hooks.SessionStart[0].hooks[0].command')"
assert_eq "still one entry after update"  "1"          "$(echo "$updated" | jq '.hooks.SessionStart | length')"

section "upsert_hook: preserves unmanaged hooks"
base='{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"# user-hook\necho user"}]}]}}'
with_user="$(echo "$base" | upsert_hook "SessionStart" "" "$CMD_CAVE" "$M_CAVE")"
assert_eq "unmanaged hook preserved"  "2"  "$(echo "$with_user" | jq '.hooks.SessionStart | length')"

# ── remove_hook ─────────────────────────────────────────────────────────────
section "remove_hook: removes target"
with_cave="$(echo '{}' | upsert_hook "SessionStart" "" "$CMD_CAVE" "$M_CAVE")"
removed="$(echo "$with_cave" | remove_hook "$M_CAVE")"
assert_eq "hooks key pruned after removal"  "null"  "$(echo "$removed" | jq '.hooks')"

section "remove_hook: leaves sibling events"
with_both="$(echo '{}' \
  | upsert_hook "SessionStart" "" "$CMD_CAVE" "$M_CAVE" \
  | upsert_hook "PreToolUse"   "Bash" "$CMD_FOO" "$M_FOO")"
after="$(echo "$with_both" | remove_hook "$M_CAVE")"
assert_eq "sibling event remains"        "1"     "$(echo "$after" | jq '.hooks.PreToolUse | length')"
assert_eq "removed event is pruned"      "null"  "$(echo "$after" | jq '.hooks.SessionStart')"

section "remove_hook: namespace removal"
ns_removed="$(echo "$with_both" | remove_hook "$NS")"
assert_eq "all hooks gone via namespace"  "null"  "$(echo "$ns_removed" | jq '.hooks')"

section "remove_hook: noop on empty settings"
noop="$(echo '{}' | remove_hook "$M_CAVE")"
assert_eq "noop returns valid object"  "{}"  "$noop"

section "remove_hook: preserves unmanaged hooks"
base='{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"# user-hook\necho user"}]}]}}'
managed_plus_user="$(echo "$base" | upsert_hook "SessionStart" "" "$CMD_CAVE" "$M_CAVE")"
after_remove="$(echo "$managed_plus_user" | remove_hook "$M_CAVE")"
assert_eq "unmanaged hook survives removal"  "1" \
  "$(echo "$after_remove" | jq '.hooks.SessionStart | length')"

# ── hook_present ────────────────────────────────────────────────────────────
section "hook_present"
with_cave="$(echo '{}' | upsert_hook "SessionStart" "" "$CMD_CAVE" "$M_CAVE")"
if echo "$with_cave" | hook_present "$M_CAVE"; then ok "returns 0 when present"
else fail "returns 0 when present" "exited non-zero"; fi

if ! echo '{}' | hook_present "$M_CAVE" 2>/dev/null; then ok "returns 1 when absent"
else fail "returns 1 when absent" "exited zero"; fi

# ── CLI integration ──────────────────────────────────────────────────────────
section "CLI: install"
SF="$TMPD/settings.json"
CLAUDE_SETTINGS="$SF" node bin/claude-hooks.js install caveman >/dev/null
assert_eq "creates 1 SessionStart entry"  "1"  "$(jq '.hooks.SessionStart | length' "$SF")"

section "CLI: idempotency"
CLAUDE_SETTINGS="$SF" node bin/claude-hooks.js install caveman >/dev/null
assert_eq "still 1 entry after re-install"  "1"  "$(jq '.hooks.SessionStart | length' "$SF")"

section "CLI: second hook in different event"
CLAUDE_SETTINGS="$SF" node bin/claude-hooks.js install git-guardrails >/dev/null
assert_eq "git-guardrails in PreToolUse"  "1"  "$(jq '.hooks.PreToolUse | length' "$SF")"
assert_eq "caveman still present"          "1"  "$(jq '.hooks.SessionStart | length' "$SF")"

section "CLI: list"
list_out="$(CLAUDE_SETTINGS="$SF" node bin/claude-hooks.js list)"
assert_eq "list shows caveman"        "1"  "$(echo "$list_out" | grep -c caveman)"
assert_eq "list shows git-guardrails" "1"  "$(echo "$list_out" | grep -c git-guardrails)"

section "CLI: surgical uninstall"
CLAUDE_SETTINGS="$SF" node bin/claude-hooks.js uninstall caveman >/dev/null
assert_eq "git-guardrails remains"     "1"     "$(jq '.hooks.PreToolUse | length' "$SF")"
assert_eq "SessionStart pruned"        "null"  "$(jq '.hooks.SessionStart' "$SF")"

section "CLI: full uninstall"
CLAUDE_SETTINGS="$SF" node bin/claude-hooks.js uninstall >/dev/null
assert_eq "settings empty after full uninstall"  "{}"  "$(jq . "$SF")"

# ── scripts_dir lifecycle ────────────────────────────────────────────────────
section "scripts_dir: copied on install"
SF2="$TMPD/settings2.json"
FAKE_HOME="$TMPD/home"
DEST="$FAKE_HOME/.claude/hooks-lib/notification"
CLAUDE_SETTINGS="$SF2" HOME="$FAKE_HOME" node bin/claude-hooks.js install notify-done >/dev/null
assert_eq "scripts dir created"  "true"  "$([[ -d "$DEST" ]] && echo true || echo false)"

section "scripts_dir: kept while sibling installed"
CLAUDE_SETTINGS="$SF2" HOME="$FAKE_HOME" node bin/claude-hooks.js install notify-attention >/dev/null
CLAUDE_SETTINGS="$SF2" HOME="$FAKE_HOME" node bin/claude-hooks.js uninstall notify-done >/dev/null
assert_eq "scripts kept when notify-attention still installed"  "true" \
  "$([[ -d "$DEST" ]] && echo true || echo false)"

section "scripts_dir: removed when last hook gone"
CLAUDE_SETTINGS="$SF2" HOME="$FAKE_HOME" node bin/claude-hooks.js uninstall notify-attention >/dev/null
assert_eq "scripts dir removed after last hook uninstalled"  "false" \
  "$([[ -d "$DEST" ]] && echo true || echo false)"

# ── protect-dotenv script ────────────────────────────────────────────────────
BLOCK_SCRIPT="lib/protect-dotenv/block-dotenv.sh"

make_input() {
  local tool="$1" key="$2" val="$3"
  printf '{"tool_name":"%s","tool_input":{"%s":"%s"}}' "$tool" "$key" "$val"
}

assert_blocked() {
  local desc="$1" input="$2"
  local rc=0
  printf '%s' "$input" | bash "$BLOCK_SCRIPT" >/dev/null 2>&1 || rc=$?
  if [[ $rc -eq 2 ]]; then ok "$desc"
  else fail "$desc" "expected exit 2, got $rc"; fi
}

assert_allowed() {
  local desc="$1" input="$2"
  local rc=0
  printf '%s' "$input" | bash "$BLOCK_SCRIPT" >/dev/null 2>&1 || rc=$?
  if [[ $rc -eq 0 ]]; then ok "$desc"
  else fail "$desc" "expected exit 0, got $rc"; fi
}

section "protect-dotenv: blocks .env reads"
assert_blocked "Read .env"             "$(make_input Read file_path /project/.env)"
assert_blocked "Edit .env"             "$(make_input Edit file_path /project/.env)"
assert_blocked "Write .env"            "$(make_input Write file_path /project/.env)"
assert_blocked "Read .env.local"       "$(make_input Read file_path /project/.env.local)"
assert_blocked "Read .env.production"  "$(make_input Read file_path /project/.env.production)"

section "protect-dotenv: allows safe variants"
assert_allowed "Read .env.example"   "$(make_input Read  file_path /project/.env.example)"
assert_allowed "Edit .env.example"   "$(make_input Edit  file_path /project/.env.example)"
assert_allowed "Read .env.sample"    "$(make_input Read  file_path /project/.env.sample)"
assert_allowed "Read .env.dist"      "$(make_input Read  file_path /project/.env.dist)"
assert_allowed "Read .env.template"  "$(make_input Read  file_path /project/.env.template)"
assert_allowed "Unrelated tool"      "$(make_input SessionStart foo bar)"

section "protect-dotenv: bash command detection"
assert_blocked "cat .env"               "$(make_input Bash command 'cat .env')"
assert_blocked "source .env"            "$(make_input Bash command 'source .env')"
assert_blocked "cat /app/.env"          "$(make_input Bash command 'cat /app/.env')"
assert_allowed "cat .env.example"       "$(make_input Bash command 'cat .env.example')"
assert_allowed "echo .env.example path" "$(make_input Bash command 'echo .env.example')"
assert_allowed "grep in .env.example"   "$(make_input Bash command 'grep KEY .env.example')"

# ── summary ──────────────────────────────────────────────────────────────────
echo
echo "────────────────────────────────"
printf "  %d passed" "$PASS"
[[ $FAIL -gt 0 ]] && printf ", %d FAILED" "$FAIL"
echo
[[ $FAIL -eq 0 ]] || exit 1
