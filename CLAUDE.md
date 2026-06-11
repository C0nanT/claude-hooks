# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@c0nant/claude-hooks` — an npm-published CLI that installs/uninstalls/lists Claude Code hooks into `~/.claude/settings.json` (or `$CLAUDE_SETTINGS`). No build step. Requires `jq` at runtime.

Companion to [C0nanT/skills](https://github.com/C0nanT/skills) — hooks reference skill assets at `~/.claude/skills/<skill-name>/` and no-op gracefully when the skill is absent.

## Development setup

```bash
git config core.hooksPath .githooks   # ativa pre-push: bloqueia push se testes falharem
```

Sem `npm install` — zero dependências. Requer `jq` instalado.

## Commands

```bash
# Testar localmente
node bin/claude-hooks.js install
node bin/claude-hooks.js uninstall caveman
node bin/claude-hooks.js list

# Rodar suite de testes
bash test/run.sh

# Resetar ambiente de dev
./reset-env.sh
```

## Versionamento e releases

**Patch (bugfix/melhoria pequena):** só fazer push na `main`. O CI bumpa automaticamente e publica no npm.

```
git push origin main
# → testa → bumpa patch (0.1.6 → 0.1.7) → publica @c0nant/claude-hooks@0.1.7
```

**Minor ou major (breaking change / feature grande):** usar o script manual antes do push.

```bash
./release.sh minor   # ou major
# bumpa versão, commita, cria tag, faz push — CI publica automaticamente
```

### Pipelines CI (`.github/workflows/`)

| Arquivo | Quando roda | O que faz |
|---|---|---|
| `test.yml` | Push em qualquer branch (exceto `main`), PRs | Roda `test/run.sh` |
| `release.yml` | Push na `main` | Testa → bumpa patch → `npm publish` |

O commit de bump gerado pelo CI tem `[skip ci]` no título para evitar loop.

### Segredo necessário no GitHub

`NPM_TOKEN` em `Settings → Secrets and variables → Actions` — token de automação do npmjs.com.

## Architecture

```
bin/claude-hooks.js     # CLI entry: dispatches to install.sh / uninstall.sh / list.sh
lib/common.sh           # Shared: HOOK_NS marker, SETTINGS_FILE resolution, jq helpers
lib/settings.sh         # Pure settings-mutation functions (upsert_hook, remove_hook, hook_present)
hooks/*.json            # Hook definitions: { event, matcher?, scripts_dir?, command }
install.sh              # Upserts hooks into settings.json (idempotent)
uninstall.sh            # Removes hooks by marker (surgical, namespace-safe)
list.sh                 # Lists installed hooks from settings.json
test/run.sh             # Test suite (no deps beyond jq and node)
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

## Adding a new hook

1. Create `hooks/<name>.json` with `event`, optional `matcher`, and `command`.
2. Test: `node bin/claude-hooks.js install <name>` and verify `~/.claude/settings.json`.
3. Verify idempotency: run install again, confirm no duplicate.
4. Verify uninstall: `node bin/claude-hooks.js uninstall <name>`, confirm clean removal.
