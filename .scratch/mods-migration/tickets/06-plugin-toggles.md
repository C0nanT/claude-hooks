# 06: Plugin: `/conan-mods` liga/desliga com persistência

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** O comando `/conan-mods` controla as funções do plugin.

- `/conan-mods` sem argumento lista `caveman`, `git-guard`, `dotenv-guard` e `sound`, cada um com `on` ou `off`.
- `/conan-mods <nome> on|off` muda o estado e responde com o novo estado.
- Qualquer outra entrada responde com o uso e os nomes válidos.
- O estado persiste entre sessões no mesmo PC (`$.store`). Valor ausente significa ligado.
- O estado também fica no estado de sessão (`$.state`), para os hooks e a faixa reagirem na hora.
- Neste ticket, o `git-guard` passa a respeitar o toggle: desligado, deixa tudo passar.
- Os outros nomes já aparecem e guardam estado. Cada ticket de função liga o próprio comportamento ao toggle.
- A interpretação dos argumentos fica numa função pura.

**Seams:**
- Plugin: `claude plugin test`, disparando `/conan-mods` e chamadas de ferramenta Bash.

**Blocked by:** 05 (Plugin: esqueleto + git-guard)

Status: ready-for-human

- [x] `/conan-mods` lista os 4 nomes, todos `on` numa instalação nova.
- [x] `/conan-mods git-guard off` faz um `git push` passar, e `on` volta a bloquear.
- [x] Nome ou valor inválido responde com o uso e os nomes válidos, sem mudar estado.
- [x] O estado persiste numa sessão nova.
- [x] O contrato de tipos declara os valores guardados, e `claude plugin validate` passa.
