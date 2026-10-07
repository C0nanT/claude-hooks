# 05: Repo de skills: setup-statusline e README

> **Difficulty:** Light: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Um PR no repo C0nanT/skills. A skill `setup-statusline` deixa de copiar scripts e gravar `statusLine`/hooks e passa a limpar o modelo antigo: remove do `settings.json` o `statusLine` que aponta para `statusline-command.sh` e as entradas com o marcador `claude-hook:statusline-reset` (`SessionStart`, `SessionEnd`, `UserPromptSubmit`), apaga `~/.claude/statusline-command.sh`, `~/.claude/statusline-reset-hook.sh` e `~/.claude/statusline-baseline.json`, e manda instalar o `conan-mods`. Os scripts bash da skill saem do repo. O guia `docs/guides/pt-br/setup-statusline.md` acompanha. A tabela de funções da seção "Hooks" do README passa a listar as 7 funções.

**Seams:** None (skill e documentação; validado pelo pre-push do repo de skills)

**Blocked by:** 01 (secret-guard), 02 (rm-guard), 03 (statusline no plugin)

Status: ready-for-agent

- [ ] A skill não copia scripts nem grava `statusLine` ou hooks.
- [ ] A skill remove o `statusLine` antigo, as entradas `claude-hook:statusline-reset` e os três arquivos em `~/.claude/`, preservando o resto do `settings.json`.
- [ ] A skill e o guia apontam para `/plugin install conan-mods --marketplace C0nanT/claude-hooks` e `/conan-mods statusline on|off`.
- [ ] Os scripts bash da skill foram removidos do repo.
- [ ] A tabela do README do repo de skills lista `caveman`, `git-guard`, `dotenv-guard`, `secret-guard`, `rm-guard`, `sound` e `statusline`.
- [ ] O pre-push do repo de skills passa.
- [ ] O PR foi aberto no repo de skills (confirmar com o dono antes do push).
