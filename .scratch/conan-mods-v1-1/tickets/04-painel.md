# 04: Painel do /conan-mods

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** `/conan-mods` sem argumento abre um pane `conan-mods` com foco, uma linha por função na ordem de `TOGGLE_NAMES` (nome, estado, botão). Apertar o botão alterna a função pelo mesmo caminho do comando em texto, e pane e faixa redesenham na hora. Esc fecha e devolve o prompt. A resposta do comando continua trazendo a lista em texto, para a transcrição e para onde o pane não abre. `/conan-mods <nome> on|off` não muda. Só elementos que existem em `terminal` e `vscode`. O pane lê `TOGGLE_NAMES`, então mostra as funções que existirem quando o ticket rodar. Seção `/conan-mods` do README deste repo atualizada.

**Seams:**
- Seam 1, plugin-level: `command.run` do `/conan-mods`, `ui.render` de `Pane` e `AbovePrompt`, montando o pane e apertando botões por key em loop sobre `terminal` e `vscode`

**Blocked by:** None (can start immediately)

Status: ready-for-human

- [x] `/conan-mods` sem argumento abre o pane e a resposta ainda traz a lista `nome: on|off`.
- [x] O pane mostra uma linha por nome de `TOGGLE_NAMES`, com o estado atual.
- [x] Apertar o botão de `git-guard` desliga a função: o pane mostra `off`, a faixa mostra `⚠ off: git-guard` e um `git push` passa. Apertar de novo religa.
- [x] O mesmo teste passa nas superfícies `terminal` e `vscode`.
- [x] `/conan-mods git-guard off` e entradas inválidas respondem como hoje.
- [x] README atualizado; `claude plugin validate .` e `claude plugin test .` passam.
