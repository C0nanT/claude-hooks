# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@c0nant/claude-hooks` — an npm-published CLI that installs/uninstalls/lists Claude Code hooks into `~/.claude/settings.json` (or `$CLAUDE_SETTINGS`). No build step. Requires `jq` at runtime.

Companion to [C0nanT/skills](https://github.com/C0nanT/skills) — hooks reference skill assets at `~/.claude/skills/<skill-name>/` and no-op gracefully when the skill is absent.

## Development setup

```bash
git config core.hooksPath .githooks   # enables pre-push hook: blocks push if tests fail
```

No `npm install` — zero dependencies. Requires `jq` installed.

## Commands

```bash
# Run locally
node bin/claude-hooks.js install
node bin/claude-hooks.js uninstall caveman
node bin/claude-hooks.js list

# Run test suite
bash test/run.sh

# Full dev environment reset (uninstalls hooks + removes ~/.agents/skills and ~/.claude/skills)
./reset-env.sh
```

There is no way to run a single test in isolation — `test/run.sh` runs all sections. Each `section "..."` block in the test file corresponds to one logical test group.

## Versioning and releases

See also `README.md` → **Development**.

### Day-to-day

- Branch/PR: push freely — CI only runs `test/run.sh` (`.github/workflows/test.yml`).
- `main`: every push triggers release pipeline (`.github/workflows/release.yml`).

### Patch (default)

Bugfix or small improvement — **do not** bump `package.json` locally. Merge to `main`:

```
git push origin main
# → tests → patch bump (0.1.11 → 0.1.12) → commit "[skip ci]" → tag → npm publish
```

### Minor / major

New feature or breaking change — CI always patches; bump semver manually first:

```bash
./release.sh minor   # or major — requires clean working tree
# npm version → commit → tag vX.Y.Z → push main --tags → CI publishes
```

### CI pipelines

| File | Runs when | Does |
|---|---|---|
| `test.yml` | Push to any branch except `main`, PRs | `test/run.sh` |
| `release.yml` | Push to `main` | Tests → patch bump → `npm publish` |

CI bump commits use `[skip ci]` to avoid infinite loops. Requires `NPM_TOKEN` in GitHub Actions secrets.

## Architecture

```
bin/claude-hooks.js     # CLI entry: dispatches to install.sh / uninstall.sh / list.sh
lib/common.sh           # Shared: HOOK_NS marker, SETTINGS_FILE resolution, jq helpers
lib/settings.sh         # Pure settings-mutation functions (upsert_hook, remove_hook, hook_present)
hooks/*.json            # Hook definitions: { event, matcher?, scripts_dir?, command }
install.sh              # Upserts hooks into settings.json (idempotent)
uninstall.sh            # Removes hooks by marker (surgical, namespace-safe)
list.sh                 # Lists installed hooks from settings.json
test/run.sh             # Test suite: unit tests (sourcing lib/settings.sh) + CLI integration tests
specs/                  # Design docs and specs for planned/in-progress features
```

### Hook definition format (`hooks/*.json`)

```json
{ "event": "SessionStart", "matcher": "Bash", "scripts_dir": "lib/notification", "command": "..." }
```

- `matcher` — optional, used for `PreToolUse`/`PostToolUse`
- `scripts_dir` — optional, path relative to repo root; contents are copied to `~/.claude/hooks-lib/<basename>/` on install and removed on uninstall when no hook with that `scripts_dir` remains
- `command` — shell string injected into `settings.json`

### Marker protocol

Every installed hook's command is prefixed with `# claude-hook:<name>` (defined as `HOOK_NS` in `lib/common.sh`). This marker is how install finds and replaces an existing hook (idempotent upsert) and how uninstall finds and removes it without touching anything else.

### Settings file targeting

`SETTINGS_FILE` defaults to `~/.claude/settings.json`. Set `CLAUDE_SETTINGS=.claude/settings.json` for project-scoped installs. All three scripts inherit this from `lib/common.sh`.

### Test structure

`test/run.sh` has two layers:
1. **Unit tests** — `source lib/settings.sh` directly and pipe JSON through `upsert_hook`/`remove_hook`/`hook_present`. No file I/O.
2. **CLI integration tests** — invoke `node bin/claude-hooks.js` with `CLAUDE_SETTINGS` pointed at a temp file, assert on the resulting JSON.

## Adding a new hook

1. Create `hooks/<name>.json` with `event`, optional `matcher`, and `command`.
2. Test: `node bin/claude-hooks.js install <name>` and verify `~/.claude/settings.json`.
3. Verify idempotency: run install again, confirm no duplicate.
4. Verify uninstall: `node bin/claude-hooks.js uninstall <name>`, confirm clean removal.
