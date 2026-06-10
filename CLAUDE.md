# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@c0nant/claude-hooks` — an npm-published CLI that installs/uninstalls/lists Claude Code hooks into `~/.claude/settings.json` (or `$CLAUDE_SETTINGS`). No build step. Requires `jq` at runtime.

Companion to [C0nanT/skills](https://github.com/C0nanT/skills) — hooks reference skill assets at `~/.claude/skills/<skill-name>/` and no-op gracefully when the skill is absent.

## Commands

```bash
# Run locally without publishing
node bin/claude-hooks.js install
node bin/claude-hooks.js uninstall caveman
node bin/claude-hooks.js list

# Release (bumps package.json, commits, tags, pushes)
./release.sh [patch|minor|major]   # then: npm publish --access public

# Reset test environment
./reset-env.sh
```

No `npm install` needed — zero dependencies.

## Architecture

```
bin/claude-hooks.js     # CLI entry: dispatches to install.sh / uninstall.sh / list.sh
lib/common.sh           # Shared: HOOK_NS marker, SETTINGS_FILE resolution, jq helpers
hooks/*.json            # Hook definitions: { event, matcher?, command }
install.sh              # Upserts hooks into settings.json (idempotent)
uninstall.sh            # Removes hooks by marker (surgical, namespace-safe)
list.sh                 # Lists installed hooks from settings.json
```

### Hook definition format (`hooks/*.json`)

```json
{ "event": "SessionStart", "matcher": "Bash", "command": "..." }
```

`matcher` is optional (used for `PreToolUse`/`PostToolUse`). `command` is a shell string injected into `settings.json`.

### Marker protocol

Every installed hook's command is prefixed with `# claude-hook:<name>` (defined as `HOOK_NS` in `lib/common.sh`). This marker is how install finds and replaces an existing hook (idempotent upsert) and how uninstall finds and removes it without touching anything else.

### Settings file targeting

`SETTINGS_FILE` defaults to `~/.claude/settings.json`. Set `CLAUDE_SETTINGS=.claude/settings.json` for project-scoped installs. All three scripts inherit this from `lib/common.sh`.

## Adding a new hook

1. Create `hooks/<name>.json` with `event`, optional `matcher`, and `command`.
2. Test: `node bin/claude-hooks.js install <name>` and verify `~/.claude/settings.json`.
3. Verify idempotency: run install again, confirm no duplicate.
4. Verify uninstall: `node bin/claude-hooks.js uninstall <name>`, confirm clean removal.
