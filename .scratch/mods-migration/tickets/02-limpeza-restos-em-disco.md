# 02: Limpeza: restos em disco

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** A limpeza também apaga os restos que as versões antigas deixaram no disco, e cada item aparece no relatório (`removido` / `não existia`, ou "seria removido" no `--dry-run`):

- as pastas `git-guardrails`, `notification` e `protect-dotenv` dentro de `~/.claude/hooks-lib/`, e a própria pasta se ficar vazia;
- a pasta de arquivos de controle `claude-notification` em `$XDG_RUNTIME_DIR`, ou em `/tmp` se a variável não existir;
- a geração anterior no `settings.json`: a marca `conan-caveman-autostart` e os comandos que citam `conan-git-guardrails` ou `block-dangerous-git` fora da marca `claude-hook:git-guardrails`;
- a geração anterior no disco: os scripts `conan-git-guardrails.sh` e `block-dangerous-git.sh` em `~/.claude/hooks/`, e a pasta se ficar vazia.

Arquivos e pastas alheios nesses lugares não são tocados.

**Seams:**
- Limpeza (Release A): `node bin/claude-hooks.js uninstall [--dry-run]` com `HOME` e `XDG_RUNTIME_DIR` apontando para pastas temporárias com restos falsos.

**Blocked by:** 01 (Limpeza: remover os 5 hooks do settings.json)

Status: ready-for-human

- [x] Remove as 3 pastas em `hooks-lib`, e a `hooks-lib` só se ficar vazia.
- [x] Remove a pasta de controle em `$XDG_RUNTIME_DIR` ou em `/tmp`.
- [x] Remove os hooks da geração anterior do `settings.json` sem tocar no `statusline-reset`.
- [x] Remove os scripts antigos de `~/.claude/hooks/`, e a pasta só se ficar vazia.
- [x] Um arquivo alheio colocado em `hooks-lib` ou em `~/.claude/hooks/` sobrevive, e a pasta fica.
- [x] `--dry-run` não apaga nada e lista tudo.
- [x] Todos os itens aparecem no relatório.
