# 09: Plugin: caveman

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Toda sessão começa em modo caveman, lendo a skill instalada pelo repo de skills.

- O conteúdo de `~/.claude/skills/caveman/SKILL.md` entra como uma seção das instruções da sessão (`prompt.compose`).
- Se o arquivo não existir:
  - a seção não entra;
  - aparece um aviso **uma vez por sessão**: "caveman: skill não encontrada, rode `npx skills@latest add C0nanT/skills`".
- `/hooks caveman off` tira a seção na montagem seguinte, e `on` a coloca de volta, sem reiniciar a sessão.
- O plugin não carrega cópia própria da skill.

**Seams:**
- Plugin: `claude plugin test`, disparando a montagem das instruções com e sem a skill presente, e `/hooks`.

**Blocked by:** 06 (Plugin: `/hooks` liga/desliga com persistência)

Status: ready-for-agent

- [ ] Com a skill presente e ligada, a seção contém o texto da skill.
- [ ] Desligada, a seção não entra. Religada, volta na montagem seguinte.
- [ ] Sem a skill, a seção não entra e o aviso aparece uma única vez na sessão, mesmo com várias montagens.
- [ ] Um erro de leitura não quebra a sessão.
