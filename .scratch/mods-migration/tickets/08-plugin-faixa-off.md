# 08: Plugin: faixa "off" acima do prompt

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Enquanto qualquer função estiver desligada, uma faixa de uma linha acima do prompt mostra `⚠ off: <nomes>`.

- Os nomes aparecem na ordem fixa `git-guard · dotenv-guard · caveman · sound`, só os desligados.
- Com tudo ligado, a faixa não desenha nada e devolve o desenho padrão.
- A faixa atualiza na hora em que o `/hooks` muda algo.
- Usa a faixa acima do prompt, e não a linha de status, para não conflitar com a linha de status própria do usuário.

**Seams:**
- Plugin: `claude plugin test`, disparando o desenho da faixa antes e depois de `/hooks`.

**Blocked by:** 06 (Plugin: `/hooks` liga/desliga com persistência)

Status: ready-for-agent

- [ ] Com tudo ligado, nada é desenhado.
- [ ] Com `git-guard` e `sound` desligados, mostra `⚠ off: git-guard · sound`, nessa ordem.
- [ ] Depois de `/hooks <nome> on|off`, o desenho seguinte reflete a mudança.
- [ ] Testado manualmente num terminal com a linha de status própria ativa: as duas aparecem.
