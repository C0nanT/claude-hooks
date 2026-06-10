# Spec: Notification Hooks

Port `claude-notification` desktop alerts into `claude-hooks` as first-class installable hooks.

## Goals

- `claude-hooks install notify-done` → desktop notification + sound when Claude stops
- `claude-hooks install notify-attention` → desktop notification + sound when Claude needs input
- No external plugin system (`$CLAUDE_PLUGIN_ROOT`) required
- Scripts bundle alongside hook definitions in this repo
- Skill-safe: no-ops when scripts missing (consistent with existing hook pattern)

## Source

Logic comes from `../claude-notification/` (sibling repo). Key files to port:

```
claude-notification/hooks/notify-done.sh        → lib/notification/notify-done.sh
claude-notification/hooks/notify-attention.sh   → lib/notification/notify-attention.sh
claude-notification/lib/common.sh               → lib/notification/common.sh
```

These are stable and self-contained — copy, don't symlink.

## Hook definitions

### `hooks/notify-done.json`

```json
{
  "event": "Stop",
  "command": "f=\"$HOME/.claude/hooks-lib/notification/notify-done.sh\"; [ -f \"$f\" ] && exec bash \"$f\"; exit 0"
}
```

### `hooks/notify-attention.json`

```json
{
  "event": "Notification",
  "command": "f=\"$HOME/.claude/hooks-lib/notification/notify-attention.sh\"; [ -f \"$f\" ] && exec bash \"$f\"; exit 0"
}
```

## Script install path: `~/.claude/hooks-lib/notification/`

Rationale: existing hooks reference `~/.claude/skills/<name>/scripts/` because they delegate to separately-installed skills. Notification scripts are self-contained and owned by this package — a sibling `hooks-lib/` dir avoids conflating them with user skills.

```
~/.claude/hooks-lib/notification/
  common.sh
  notify-done.sh
  notify-attention.sh
```

Scripts source `common.sh` via `$(dirname "${BASH_SOURCE[0]}")/common.sh` (already the pattern in the source repo — no path changes needed).

## Changes to `install.sh`

When installing a notification hook, `install.sh` must also copy the bundled scripts to `~/.claude/hooks-lib/notification/`. Add a post-install step keyed on hook name:

```bash
# After writing hook into settings.json:
if [[ "$HOOK_NAME" == notify-done || "$HOOK_NAME" == notify-attention ]]; then
  DEST="$HOME/.claude/hooks-lib/notification"
  mkdir -p "$DEST"
  cp "$SCRIPT_DIR/lib/notification/"*.sh "$DEST/"
fi
```

`SCRIPT_DIR` = `$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)` — the repo root.

## Changes to `uninstall.sh`

Uninstalling the last notification hook should optionally remove `~/.claude/hooks-lib/notification/`. Safe approach: check whether both `notify-done` and `notify-attention` are absent after removal; if so, `rm -rf ~/.claude/hooks-lib/notification`. Leave `~/.claude/hooks-lib/` itself (other future hooks may use it).

## System deps

The notification scripts already handle missing deps gracefully (`command -v notify-send` etc.). No new dep-checking needed in `install.sh`. Optionally print a post-install hint:

```
notify-done installed.
Requires: notify-send (libnotify), paplay (pulseaudio-utils) or aplay (alsa-utils).
  sudo apt install libnotify-bin pulseaudio-utils
```

## Platform support

Inherited from source scripts:
- **Native Linux**: `notify-send` popup + `paplay`/`aplay` sound
- **WSL**: PowerShell WinRT toast + `[Console]::Beep()`

No changes required — `lib/notification/common.sh` already branches on `is_wsl()`.

## Deduplication

`common.sh:deduplicate_or_exit()` guards against the Claude Code double-fire bug (issue #3465). State files at `$XDG_RUNTIME_DIR/claude-notification/` (fallback `/tmp/claude-notification/`). 2-second debounce per `session_id + hook_event_name`. Already implemented — no changes needed.

## Files to create/modify

| Action | Path |
|--------|------|
| Add | `hooks/notify-done.json` |
| Add | `hooks/notify-attention.json` |
| Add | `lib/notification/common.sh` (copy from sibling repo) |
| Add | `lib/notification/notify-done.sh` (copy from sibling repo) |
| Add | `lib/notification/notify-attention.sh` (copy from sibling repo) |
| Modify | `install.sh` — add script-copy step for notification hooks |
| Modify | `uninstall.sh` — add cleanup step for last notification hook |

## Validation checklist

- [ ] `install notify-done` writes hook to `settings.json` + copies scripts to `~/.claude/hooks-lib/notification/`
- [ ] `install notify-attention` is idempotent (re-run doesn't duplicate, doesn't re-copy over self)
- [ ] `uninstall notify-done` removes hook from `settings.json`; scripts stay if `notify-attention` still installed
- [ ] `uninstall notify-done notify-attention` removes hook entries AND cleans up `~/.claude/hooks-lib/notification/`
- [ ] Script no-ops cleanly when `notify-send`/`paplay` absent
- [ ] Marker `# claude-hook:notify-done` present in installed command (namespace safe)
- [ ] `list` shows both hooks correctly
