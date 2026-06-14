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

## Development

### Setup

```bash
git config core.hooksPath .githooks   # pre-push runs tests
bash test/run.sh                      # requires jq
```

No `npm install` — zero runtime dependencies beyond Node ≥18 and `jq`.

### Day-to-day workflow

| Where you push | What happens |
|----------------|--------------|
| Branch or PR | CI runs `test/run.sh` only — no version bump, no npm publish |
| `main` | CI runs tests → bumps **patch** → publishes to npm |

Work on a branch, open a PR (or push directly if solo), merge to `main` when green.

### Releasing

**Patch** (bugfix, small improvement) — just merge/push to `main`. CI handles everything:

```
push to main → tests → 0.1.11 → 0.1.12 → npm publish
```

Do **not** bump `package.json` manually for patch releases.

**Minor or major** (new feature, breaking change) — bump locally first, then CI publishes on push:

```bash
./release.sh minor   # or major — working tree must be clean
```

The script bumps `package.json`, commits, tags `vX.Y.Z`, and pushes `main` + tags. Requires `NPM_TOKEN` in GitHub Actions secrets.
