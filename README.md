# claude-hooks

Portable, removable Claude Code hooks. Install and remove them across machines (Ubuntu, WSL) without ever hand-editing `settings.json`.

```bash
npx @c0nant/claude-hooks install    # install all hooks
npx @c0nant/claude-hooks list       # show what's installed
npx @c0nant/claude-hooks uninstall  # remove all hooks this tool installed
```

## Related projects

This project is one half of a two-part setup. The hooks reference skill assets installed by the companion skills repo:

| Project | Purpose |
|---------|---------|
| **[C0nanT/skills](https://github.com/C0nanT/skills)** (`npx skills@latest`) | Installs the skill assets (`caveman`, `git-guardrails-claude-code`) that these hooks read at runtime |
| **[C0nanT/claude-hooks](https://github.com/C0nanT/claude-hooks)** (`npx @c0nant/claude-hooks`) | Wires the hooks into `settings.json` so the agent runs those skills automatically |

Install order: skills first, then hooks.

```bash
npx skills@latest add C0nanT/skills
npx @c0nant/claude-hooks install
```

The hooks no-op gracefully if a skill is absent, so order only matters for full functionality.

## Requirements

- `bash` and `jq`. On Ubuntu/WSL: `sudo apt-get install -y jq`

## How it works

Each hook is defined in `hooks/*.json`. Every installed hook carries a unique
marker comment (`# claude-hook:<name>`) in its command — that makes installs
**idempotent** (re-running syncs instead of duplicating) and removals
**surgical** (only touches what this tool put there, leaves the rest of
`settings.json` intact).

## Bundled hooks

- **`caveman`** (`SessionStart`) — injects the caveman ruleset from
  `~/.claude/skills/caveman/SKILL.md` as hidden session context, so the agent
  starts in token-saving mode every session without typing `/caveman`. Requires
  the [caveman skill](https://github.com/C0nanT/skills). No-ops if absent.

- **`git-guardrails`** (`PreToolUse/Bash`) — runs
  `~/.claude/skills/git-guardrails-claude-code/scripts/block-dangerous-git.sh`
  to block destructive git commands before the agent executes them: `git push`,
  `git commit`, `git reset --hard`, `git clean -f`, `git branch -D`,
  `git checkout .`, `git restore .`. Blocked commands exit `2` with a message;
  safe commands pass through. Requires the
  [git-guardrails-claude-code skill](https://github.com/C0nanT/skills). No-ops
  if absent.

Both hooks are **live**: they reference skill assets by path, so updating a
skill (via `npx skills@latest`) takes effect next session — no reinstall needed.

## Selective install/uninstall

```bash
npx @c0nant/claude-hooks install git-guardrails    # one hook only
npx @c0nant/claude-hooks uninstall caveman          # remove one
```

## Project-scoped hooks

```bash
CLAUDE_SETTINGS=.claude/settings.json npx @c0nant/claude-hooks install
```

## Adding your own hooks

One `.json` per hook in `hooks/`. Fields:

```json
{
  "event": "PreToolUse",
  "matcher": "Bash",
  "command": "your shell command here (reads event JSON from stdin; exit 2 to block)"
}
```

Valid events: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Notification`,
`Stop`, `SubagentStop`, `SessionStart`, `SessionEnd`, `PreCompact`.

Re-run `install` after editing a hook definition to sync it to `settings.json`.
