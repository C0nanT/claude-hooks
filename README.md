# claude-hooks

Claude Code hooks companion to [C0nanT/skills](https://github.com/C0nanT/skills). Wires the caveman and git-guardrails skills into `settings.json` automatically — no hand-editing.

## Prerequisites

**Install [C0nanT/skills](https://github.com/C0nanT/skills) first.** The hooks reference skill assets at runtime (`~/.claude/skills/caveman/`, `~/.claude/skills/git-guardrails-claude-code/`) — without the skills installed, the hooks no-op.

```bash
npx skills@latest add C0nanT/skills
```

Requires `jq`. On Ubuntu/WSL: `sudo apt-get install -y jq`

## Install

```bash
npx @c0nant/claude-hooks install
```

## Bundled hooks

| Hook | Event | What it does |
|------|-------|-------------|
| `caveman` | `SessionStart` | Injects the caveman ruleset as hidden context — agent starts in token-saving mode every session without typing `/caveman` |
| `git-guardrails` | `PreToolUse/Bash` | Blocks destructive git commands (`push`, `reset --hard`, `clean -f`, `branch -D`, `checkout .`, `restore .`) before execution |

Both hooks no-op gracefully if the skill is absent.

## Commands

```bash
npx @c0nant/claude-hooks install              # install all hooks
npx @c0nant/claude-hooks install git-guardrails  # one hook only
npx @c0nant/claude-hooks uninstall            # remove all
npx @c0nant/claude-hooks uninstall caveman    # remove one
npx @c0nant/claude-hooks list                 # show installed
```

Installs are idempotent — re-running syncs without duplicating. Uninstall is surgical — only touches what this tool added.

## Project-scoped install

```bash
CLAUDE_SETTINGS=.claude/settings.json npx @c0nant/claude-hooks install
```
