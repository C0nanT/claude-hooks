# 05: Plugin: esqueleto + git-guard

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** O plugin `conan-mods` nasce instalável e já bloqueia comandos git destrutivos.

- O repo ganha um marketplace com uma única entrada, `conan-mods`, cuja fonte é o próprio repo, e um hooks module.
- Bash com `git push` (incluindo `--force`), `reset --hard`, `clean -f`/`-fd`, `branch -D`, `checkout .`, `restore .` ou `git rm` é negado, inclusive com opções globais do git antes do subcomando.
- `git commit`, `status`, `diff`, `log` e outros comandos seguros passam.
- A mensagem de bloqueio é a atual: `BLOCKED: '<comando>' matches dangerous pattern '<padrão>'. The user has prevented you from doing this.`
- A decisão de bater um comando contra as regras fica numa função pura.
- O trabalho do plugin (05 a 10) acontece num branch `mods` e só entra na `main` no ticket 11. Push na `main` dispara publicação.

**Seams:**
- Plugin: `claude plugin test` sobre o plugin inteiro, disparando chamadas de ferramenta Bash.

**Blocked by:** None (can start immediately, no branch `mods`)

Status: ready-for-agent

- [ ] `claude plugin validate` passa e o plugin passa no type-check.
- [ ] Todos os casos atuais das seções "git-guardrails: blocks dangerous commands", "blocks dangerous commands with global options" e "allows safe commands" foram portados e passam.
- [ ] Os comandos bloqueados recebem a mensagem atual, com comando e padrão.
- [ ] O plugin carrega localmente pela pasta do repo (`--plugin-dir`, ou marketplace local).
- [ ] O README do branch tem uma seção curta de desenvolvimento local.
