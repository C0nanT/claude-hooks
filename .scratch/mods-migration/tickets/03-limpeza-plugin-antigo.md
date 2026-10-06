# 03: Limpeza: plugin antigo `claude-notification`

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** A limpeza remove o plugin antigo `claude-notification`, que toca as mesmas notificações, para não ter som em dobro depois do plugin novo.

- Usa os comandos oficiais `claude plugin uninstall` e `claude plugin marketplace remove`, sem editar arquivos internos do Claude Code.
- Se o `claude` não estiver no `PATH`, ou se o plugin ou o marketplace não existirem, isso aparece no relatório e a limpeza segue sem falhar.
- No `--dry-run`, o `claude` não é chamado e o relatório diz o que seria feito.

**Seams:**
- Limpeza (Release A): `node bin/claude-hooks.js uninstall [--dry-run]` com um `claude` falso no `PATH` que registra as chamadas e devolve sucesso ou erro conforme o cenário.

**Blocked by:** 01 (Limpeza: remover os 5 hooks do settings.json)

Status: ready-for-agent

- [ ] Chama `claude plugin uninstall` para `claude-notification` e `claude plugin marketplace remove` para o marketplace dele.
- [ ] Sem `claude` no `PATH`: relata "claude não encontrado" e termina com sucesso.
- [ ] Com o plugin ausente (o `claude` falso devolve erro): relata e segue.
- [ ] `--dry-run` não chama o `claude`.
- [ ] O resultado aparece no relatório.
