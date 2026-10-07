# Migrating a PC to the `conan-mods` plugin

Run this on every PC that had the old `@c0nant/claude-hooks` hooks. It takes a
couple of minutes and is safe to repeat.

## Before you start

- Node ≥18 and `jq` (Ubuntu/WSL: `sudo apt-get install -y jq`).
- **Always pin `@0.4.0`.** `0.3.0` and older are the *old installer*: their
  `uninstall` ignores `--dry-run` and removes **every** `claude-hook:` hook,
  including `statusline-reset` from C0nanT/skills. `@latest` can still resolve
  to an old version through the npx cache or registry lag.
- Run the commands **one at a time**. Pasting the dry-run and the real cleanup
  together runs both before you can read the report.

## 1. Check you have the cleanup tool

```bash
npx @c0nant/claude-hooks@0.4.0 --help | head -1
```

Expected: `claude-hooks — cleanup tool for the old claude-hooks settings.json hooks`.
Anything else means you got an old version: stop. An `npm warn deprecated …
Package no longer supported` line is expected: the whole package is
deprecated, and the cleanup still runs.

## 2. Preview

```bash
npx @c0nant/claude-hooks@0.4.0 uninstall --dry-run
```

Writes nothing and never calls `claude`. Check the report:

- the first line is `Dry run: nothing will be written to …/settings.json`;
- `would be removed` / `does not exist` for each of the 5 old hooks
  (`caveman`, `git-guardrails`, `protect-dotenv`, `notify-attention`,
  `notify-done`), the `hooks-lib` folders, the notification control files and
  the `claude-notification` plugin;
- if the PC uses the custom status line, `claude-hook:statusline-reset` shows up
  under **"not touched"**.

## 3. Clean up

```bash
npx @c0nant/claude-hooks@0.4.0 uninstall
```

Same report, with `removed` instead of `would be removed`. Lines like
`failed (plugin or marketplace may not exist): old plugin …` followed by
`not found` just mean `claude-notification` was never installed on this PC.

Run it a second time if you want proof: everything reads `does not exist`.

## 4. Install the plugin

Inside Claude Code:

```
/plugin install conan-mods --marketplace C0nanT/claude-hooks
```

## Recovery: an old version (≤0.3.0) ran `uninstall`

Symptom: `no matching hooks found` / `removed hooks from …/settings.json`, and
`jq '.hooks' ~/.claude/settings.json` no longer shows `statusline-reset` (it may
print `null`).

1. Restore the `statusline-reset` hook (step 3 of the `setup-statusline` skill).
   Needs `~/.claude/statusline-reset-hook.sh`; if it is missing, rerun the
   `setup-statusline` skill instead.

   ```bash
   SETTINGS="$HOME/.claude/settings.json"
   HOOK_CMD='# claude-hook:statusline-reset
   f="$HOME/.claude/statusline-reset-hook.sh"; [ -f "$f" ] && exec bash "$f"; exit 0'
   jq --arg cmd "$HOOK_CMD" '
     .hooks = (.hooks // {})
     | .hooks.SessionEnd = ((.hooks.SessionEnd // []) + [{"matcher":"clear","hooks":[{"type":"command","command":$cmd}]}])
     | .hooks.SessionStart = ((.hooks.SessionStart // []) + [{"matcher":"clear","hooks":[{"type":"command","command":$cmd}]}])
   ' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
   ```

   Run it once: each run appends another copy. Check with
   `jq '.hooks' ~/.claude/settings.json`: one `clear` group under `SessionEnd`
   and one under `SessionStart`.

2. Continue from step 2 above with `@0.4.0`. The old version left the
   notification control files, previous-generation scripts and the old
   `claude-notification` plugin behind; the new cleanup removes them.
