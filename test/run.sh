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

# ── CLI cleanup (HOME points at a temp dir) ─────────────────────────────────
H="$TMPD/home"
SF="$H/.claude/settings.json"
CLI="node bin/claude-hooks.js"
# Keep the cleanup away from the real runtime dir.
export XDG_RUNTIME_DIR="$TMPD/run"
mkdir -p "$XDG_RUNTIME_DIR"

mkcmd() { printf '# claude-hook:%s\necho %s' "$1" "$1"; }

write_fixture() {
  mkdir -p "$H/.claude"
  jq -n \
    --arg cave "$(mkcmd caveman)" --arg gg "$(mkcmd git-guardrails)" \
    --arg dot "$(mkcmd protect-dotenv)" --arg na "$(mkcmd notify-attention)" \
    --arg nd "$(mkcmd notify-done)" --arg sl "$(mkcmd statusline-reset)" \
    --arg near "$(mkcmd caveman-v2)" '
    {model: "opus", permissions: {allow: ["Bash(ls)"]},
     hooks: {
      SessionStart: [{hooks: [{type: "command", command: $cave}]}],
      PreToolUse: [
        {matcher: "Bash", hooks: [{type: "command", command: $gg}]},
        {matcher: "Read", hooks: [{type: "command", command: $dot}, {type: "command", command: "echo unmarked"}]}],
      Notification: [{hooks: [{type: "command", command: $na}]}],
      Stop: [{hooks: [{type: "command", command: $nd}]}],
      SessionEnd: [{hooks: [{type: "command", command: $sl}, {type: "command", command: $near}]}]
     }}' > "$SF"
}

section "CLI uninstall: removes the 5 hooks, keeps others"
write_fixture
out="$(HOME="$H" $CLI uninstall)"
assert_eq "caveman removed"            "false" "$(hook_present claude-hook:caveman < "$SF" && echo true || echo false)"
assert_eq "SessionStart pruned"        "null"  "$(jq '.hooks.SessionStart' "$SF")"
assert_eq "Notification pruned"        "null"  "$(jq '.hooks.Notification' "$SF")"
assert_eq "Stop pruned"                "null"  "$(jq '.hooks.Stop' "$SF")"
assert_eq "emptied group pruned"       "0"     "$(jq '[.hooks.PreToolUse[] | select(.matcher=="Bash")] | length' "$SF")"
assert_eq "unmarked sibling kept"      "echo unmarked" "$(jq -r '.hooks.PreToolUse[0].hooks[0].command' "$SF")"
assert_eq "statusline-reset kept"      "1"     "$(jq '[.hooks.SessionEnd[0].hooks[] | select(.command | startswith("# claude-hook:statusline-reset"))] | length' "$SF")"
assert_eq "near-name marker kept"      "1"     "$(jq '[.hooks.SessionEnd[0].hooks[] | select(.command | startswith("# claude-hook:caveman-v2"))] | length' "$SF")"
assert_eq "other settings untouched"   '{"model":"opus","permissions":{"allow":["Bash(ls)"]}}' "$(jq -c 'del(.hooks)' "$SF")"

section "CLI uninstall: report"
assert_eq "lists removed"       "5" "$(echo "$out" | grep -c '  removed: claude-hook:')"
assert_eq "lists leftovers"     "1" "$(echo "$out" | grep -c -- '- claude-hook:statusline-reset')"
assert_eq "shows plugin command" "1" "$(echo "$out" | grep -c -F '/plugin install conan-mods --marketplace C0nanT/claude-hooks')"

section "CLI uninstall: second run is a no-op"
before="$(cat "$SF")"
out2="$(HOME="$H" $CLI uninstall)"
assert_eq "file unchanged"        "$before" "$(cat "$SF")"
assert_eq "all reported missing"  "5" "$(echo "$out2" | grep -c 'does not exist: claude-hook:')"

section "CLI uninstall: --dry-run"
write_fixture
before="$(cat "$SF")"
out3="$(HOME="$H" $CLI uninstall --dry-run)"
assert_eq "file unchanged"          "$before" "$(cat "$SF")"
assert_eq "reports would be removed" "5" "$(echo "$out3" | grep -c 'would be removed: claude-hook:')"
assert_eq "still lists leftovers"    "1" "$(echo "$out3" | grep -c -- '- claude-hook:statusline-reset')"

section "CLI uninstall: partial settings"
mkdir -p "$H/.claude"
jq -n --arg c "$(mkcmd caveman)" '{hooks:{SessionStart:[{hooks:[{type:"command",command:$c}]}]}}' > "$SF"
out4="$(HOME="$H" $CLI uninstall)"
assert_eq "hooks object pruned"  "{}" "$(jq -c . "$SF")"
assert_eq "1 removed"            "1"  "$(echo "$out4" | grep -c '  removed: claude-hook:')"
assert_eq "4 missing"            "4"  "$(echo "$out4" | grep -c 'does not exist: claude-hook:')"

section "CLI uninstall: no settings.json"
rm -f "$SF"
rc=0; out5="$(HOME="$H" $CLI uninstall 2>&1)" || rc=$?
assert_eq "exit 0"               "0" "$rc"
assert_eq "reports missing file" "1" "$(echo "$out5" | grep -c 'not found')"
assert_eq "file not created"     "false" "$([[ -e "$SF" ]] && echo true || echo false)"

# ── CLI cleanup: leftovers on disk ──────────────────────────────────────────
write_leftovers() {
  mkdir -p "$H/.claude/hooks-lib/"{git-guardrails,notification,protect-dotenv} \
           "$H/.claude/hooks" "$XDG_RUNTIME_DIR/claude-notification"
  touch "$H/.claude/hooks-lib/git-guardrails/a.sh" "$XDG_RUNTIME_DIR/claude-notification/lock" \
        "$H/.claude/hooks/conan-git-guardrails.sh" "$H/.claude/hooks/block-dangerous-git.sh"
  jq -n --arg gg "$(mkcmd git-guardrails)" --arg sl "$(mkcmd statusline-reset)" '
    {hooks: {
      SessionStart: [{hooks: [{type: "command", command: "# conan-caveman-autostart\necho hi"}]}],
      PreToolUse: [
        {matcher: "Bash", hooks: [{type: "command", command: "bash ~/.claude/hooks/conan-git-guardrails.sh"},
                                  {type: "command", command: $gg},
                                  {type: "command", command: "~/.claude/hooks/block-dangerous-git.sh"}]}],
      SessionEnd: [{hooks: [{type: "command", command: $sl}]}]}}' > "$SF"
}

section "CLI uninstall: leftovers on disk and previous generation"
write_leftovers
out6="$(HOME="$H" $CLI uninstall)"
assert_eq "hooks-lib gone (empty)"      "false" "$([[ -e "$H/.claude/hooks-lib" ]] && echo true || echo false)"
assert_eq "control dir gone"            "false" "$([[ -e "$XDG_RUNTIME_DIR/claude-notification" ]] && echo true || echo false)"
assert_eq "hooks dir gone (empty)"      "false" "$([[ -e "$H/.claude/hooks" ]] && echo true || echo false)"
assert_eq "legacy settings gone"        "null"  "$(jq '.hooks.SessionStart' "$SF")"
assert_eq "git-guardrails marker hook also removed" "null" "$(jq '.hooks.PreToolUse' "$SF")"
assert_eq "statusline-reset kept"       "1"     "$(jq '[.hooks.SessionEnd[0].hooks[]] | length' "$SF")"
assert_eq "report lists hooks-lib dirs" "3" "$(echo "$out6" | grep -c "  removed: $H/.claude/hooks-lib/")"
assert_eq "report lists control dir"    "1" "$(echo "$out6" | grep -c "  removed: $XDG_RUNTIME_DIR/claude-notification")"
assert_eq "report lists old scripts"    "2" "$(echo "$out6" | grep -c "  removed: $H/.claude/hooks/")"
assert_eq "report lists legacy hooks"   "2" "$(echo "$out6" | grep -c "removed: previous-generation hook")"
out7="$(HOME="$H" $CLI uninstall)"
assert_eq "second run: nothing removed" "0" "$(echo "$out7" | grep -c '  removed:')"

section "CLI uninstall: legacy git command without the marker is removed, marked one is the 5-hook path"
write_leftovers
jq '.hooks.PreToolUse[0].hooks = [.hooks.PreToolUse[0].hooks[] | select(.command | contains("conan-git-guardrails"))]' "$SF" > "$SF.n" && mv "$SF.n" "$SF"
HOME="$H" $CLI uninstall >/dev/null
assert_eq "legacy git hook removed" "null" "$(jq '.hooks.PreToolUse' "$SF")"

section "CLI uninstall: foreign files survive"
write_leftovers
touch "$H/.claude/hooks-lib/mine.sh" "$H/.claude/hooks/mine.sh"
mkdir -p "$H/.claude/hooks-lib/other"
HOME="$H" $CLI uninstall >/dev/null
assert_eq "foreign in hooks-lib kept"  "true"  "$([[ -e "$H/.claude/hooks-lib/mine.sh" && -d "$H/.claude/hooks-lib/other" ]] && echo true || echo false)"
assert_eq "own dirs gone from hooks-lib" "0" "$(ls -d "$H"/.claude/hooks-lib/{git-guardrails,notification,protect-dotenv} 2>/dev/null | wc -l)"
assert_eq "foreign in hooks kept"      "true"  "$([[ -e "$H/.claude/hooks/mine.sh" ]] && echo true || echo false)"
assert_eq "old scripts gone"           "0" "$(ls "$H"/.claude/hooks/{conan-git-guardrails.sh,block-dangerous-git.sh} 2>/dev/null | wc -l)"
rm -rf "$H/.claude/hooks-lib" "$H/.claude/hooks"

section "CLI uninstall: leftovers --dry-run"
write_leftovers
before="$(cat "$SF")"
out8="$(HOME="$H" $CLI uninstall --dry-run)"
assert_eq "settings unchanged"     "$before" "$(cat "$SF")"
assert_eq "disk untouched"         "true" "$([[ -e "$H/.claude/hooks-lib/git-guardrails/a.sh" && -e "$XDG_RUNTIME_DIR/claude-notification/lock" && -e "$H/.claude/hooks/block-dangerous-git.sh" ]] && echo true || echo false)"
assert_eq "lists dirs as would be removed" "3" "$(echo "$out8" | grep -c "would be removed: $H/.claude/hooks-lib/")"
assert_eq "lists parents and control dir"  "3" "$(echo "$out8" | grep -c -E "would be removed: ($H/.claude/hooks-lib|$H/.claude/hooks|$XDG_RUNTIME_DIR/claude-notification)\$")"
assert_eq "lists old scripts"      "2" "$(echo "$out8" | grep -c "would be removed: $H/.claude/hooks/")"
assert_eq "lists legacy settings"  "2" "$(echo "$out8" | grep -c "would be removed: previous-generation hook")"
rm -rf "$H/.claude/hooks-lib" "$H/.claude/hooks" "$XDG_RUNTIME_DIR/claude-notification"

section "CLI uninstall: no settings.json still cleans disk"
rm -f "$SF"; write_leftovers; rm -f "$SF"
HOME="$H" $CLI uninstall >/dev/null
assert_eq "control dir gone" "false" "$([[ -e "$XDG_RUNTIME_DIR/claude-notification" ]] && echo true || echo false)"

section "CLI uninstall: control dir falls back to /tmp without XDG_RUNTIME_DIR"
if [[ ! -e /tmp/claude-notification ]]; then
  mkdir /tmp/claude-notification
  env -u XDG_RUNTIME_DIR HOME="$H" $CLI uninstall >/dev/null
  assert_eq "/tmp control dir gone" "false" "$([[ -e /tmp/claude-notification ]] && echo true || echo false)"
else
  ok "skipped: /tmp/claude-notification belongs to a real session"
fi

section "CLI uninstall: ignores CLAUDE_SETTINGS"
write_fixture
echo '{}' > "$TMPD/other.json"
CLAUDE_SETTINGS="$TMPD/other.json" HOME="$H" $CLI uninstall >/dev/null
assert_eq "HOME file was cleaned"   "null" "$(jq '.hooks.SessionStart' "$SF")"

section "CLI install: refuses"
rc=0; err="$(HOME="$H" $CLI install 2>&1)" || rc=$?
assert_eq "non-zero exit"         "1" "$rc"
assert_eq "shows plugin command"  "1" "$(echo "$err" | grep -c -F '/plugin install conan-mods --marketplace C0nanT/claude-hooks')"

section "CLI list: shows what would be removed"
write_fixture
list_out="$(HOME="$H" $CLI list)"
assert_eq "lists caveman"         "1" "$(echo "$list_out" | grep -c 'claude-hook:caveman$')"
assert_eq "lists notify-done"     "1" "$(echo "$list_out" | grep -c 'claude-hook:notify-done')"
assert_eq "skips statusline-reset" "0" "$(echo "$list_out" | grep -c statusline-reset)"
assert_eq "skips near-name marker" "0" "$(echo "$list_out" | grep -c 'caveman-v2')"
assert_eq "list does not write"   "8" "$(jq '[.hooks[][] | .hooks[]] | length' "$SF")"

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

# ── git-guardrails script ────────────────────────────────────────────────────
BLOCK_SCRIPT="lib/git-guardrails/block-dangerous-git.sh"

section "git-guardrails: blocks dangerous commands"
assert_blocked "git push"                    "$(make_input Bash command 'git push origin main')"
assert_blocked "git reset --hard"            "$(make_input Bash command 'git reset --hard HEAD~1')"
assert_blocked "git rm"                      "$(make_input Bash command 'git rm -rf file')"

section "git-guardrails: blocks dangerous commands with global options"
assert_blocked "git -C dir push"             "$(make_input Bash command 'git -C /tmp push origin main')"
assert_blocked "git --no-pager reset --hard" "$(make_input Bash command 'git --no-pager reset --hard HEAD~1')"
assert_blocked "git --git-dir push"          "$(make_input Bash command 'git --git-dir=/repo/.git push')"

section "git-guardrails: allows safe commands"
assert_allowed "git commit"        "$(make_input Bash command 'git commit -m x')"
assert_allowed "git -c k=v commit" "$(make_input Bash command 'git -c user.email=x -c user.name=y commit -m x')"
assert_allowed "git -C dir commit" "$(make_input Bash command 'git -C /tmp commit -m x')"
assert_allowed "grep for commit"   "$(make_input Bash command "grep -rn 'git commit' .")"
assert_allowed "git status"        "$(make_input Bash command 'git status')"
assert_allowed "git -C dir status" "$(make_input Bash command 'git -C /tmp status')"
assert_allowed "git log"           "$(make_input Bash command 'git --no-pager log')"
assert_allowed "Unrelated tool"    "$(make_input SessionStart foo bar)"

# ── summary ──────────────────────────────────────────────────────────────────
echo
echo "────────────────────────────────"
printf "  %d passed" "$PASS"
[[ $FAIL -gt 0 ]] && printf ", %d FAILED" "$FAIL"
echo
[[ $FAIL -eq 0 ]] || exit 1
