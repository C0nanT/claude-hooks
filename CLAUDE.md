# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@c0nant/claude-hooks` — an npm-published CLI, now **deprecated**. Its last version is only a cleanup tool: `uninstall [--dry-run]` removes everything older versions put in `~/.claude/settings.json` and on disk; `install` refuses and prints the replacement, `/plugin install conan-mods --marketplace C0nanT/claude-hooks`. No build step. Requires `jq` at runtime.

The cleanup always targets `~/.claude/settings.json` resolved from `HOME`; `CLAUDE_SETTINGS` is no longer read.

## Development setup

```bash
git config core.hooksPath .githooks   # enables pre-push hook: blocks push if tests fail
```

No `npm install` — zero dependencies. Requires `jq` installed.

## Commands

```bash
# Run locally
node bin/claude-hooks.js uninstall --dry-run
node bin/claude-hooks.js uninstall
node bin/claude-hooks.js list
node bin/claude-hooks.js install   # exits non-zero, prints the plugin command

# Run test suite
bash test/run.sh

# Full dev environment reset (runs the cleanup + removes ~/.agents/skills and ~/.claude/skills)
./reset-env.sh
```

There is no way to run a single test in isolation — `test/run.sh` runs all sections. Each `section "..."` block in the test file corresponds to one logical test group.

## Versioning and releases

See also `README.md` → **Development**.

### Day-to-day

- Branch/PR: push freely — CI only runs `test/run.sh` (`.github/workflows/test.yml`).
- `main`: every push triggers release pipeline (`.github/workflows/release.yml`), which infers the bump type (patch/minor/major) from commit messages since the last tag and publishes automatically. **Never bump `package.json` manually.**

### Commit message convention drives the bump

See `CONTRIBUTING.md` for the full convention. Summary: CI scans `git log <last-tag>..HEAD` subjects/bodies:

| Commit prefix | Bump |
|---|---|
| `fix:` or no prefix | patch |
| `feat:` | minor |
| `feat!:` / `fix!:` / any `!:` after the type, or a `BREAKING CHANGE` footer | major |

If multiple qualifying commits landed since the last tag, the highest bump wins.

```
git push origin main
# → tests → detect bump from commits → npm version <bump> → commit "[skip ci]" → tag → npm publish
```

`./release.sh [patch|minor|major]` still exists as a manual override (requires clean working tree) but is no longer needed for normal releases.

### CI pipelines

| File | Runs when | Does |
|---|---|---|
| `test.yml` | Push to any branch except `main`, PRs | `test/run.sh` |
| `release.yml` | Push to `main` | Tests → detect bump from commits → version bump → `npm publish` |

CI bump commits use `[skip ci]` to avoid infinite loops. Requires `NPM_TOKEN` in GitHub Actions secrets.

## Architecture

```
bin/claude-hooks.js     # CLI entry: dispatches to install.sh / uninstall.sh / list.sh
lib/common.sh           # Shared: HOOK_NS marker, OWN_HOOKS list, SETTINGS_FILE, report/removal helpers
lib/settings.sh         # Pure settings-mutation functions (remove_hook, hook_present, legacy-hook matchers)
install.sh              # Refuses (exit 1) and prints the plugin install command
uninstall.sh            # The cleanup: settings.json, disk leftovers, old claude-notification plugin, report
list.sh                 # Lists which of the 5 old hooks are still in settings.json
test/run.sh             # Test suite: unit tests (sourcing lib/settings.sh) + CLI integration tests
```

`hooks/*.json` and the script folders under `lib/` are what old versions installed; nothing reads them anymore.

### Marker protocol

Every hook old versions installed carries `# claude-hook:<name>` (prefix `HOOK_NS` in `lib/common.sh`) as the first line of its command. The cleanup removes only the exact markers in `OWN_HOOKS` (`caveman`, `git-guardrails`, `protect-dotenv`, `notify-attention`, `notify-done`) — never by prefix, because other projects reuse the marker (e.g. `statusline-reset` from C0nanT/skills, which must survive).

### Test structure

`test/run.sh` has two layers:
1. **Unit tests** — `source lib/settings.sh` directly and pipe JSON through the settings functions. No file I/O.
2. **CLI integration tests** — invoke `node bin/claude-hooks.js` with `HOME` pointed at a temp dir seeded with fake leftovers and a fake `claude` on `PATH` that logs its calls; assert on the resulting files, report and logged calls.
