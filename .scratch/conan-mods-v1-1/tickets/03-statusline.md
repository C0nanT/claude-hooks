# 03: statusline no plugin

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Uma função nova, `statusline`, que desenha a linha de status do plugin com modelo, effort, `ctx:<pct>% <tokens>k`, duração, `limit:<pct>% ↺ HH:MM` da janela de 5 horas no fuso local e branch do git, omitindo o campo sem dado. A duração conta do início da sessão que o engine informa e zera no `/clear` sem arquivo. A linha atualiza ao abrir a sessão e a cada medição da sessão. O fuso segue a ordem do spec (`STATUSLINE_TZ`, host, PowerShell no WSL). A função entra em `TOGGLE_NAMES`, começa ligada, some na hora quando desligada e aparece na faixa na posição do spec. Primeiro passo do ticket: confirmar se o engine expõe modelo e effort a um mod e se a linha de status aceita cor, e registrar a resposta neste ticket. README deste repo atualizado. O item do `statusline-reset` sai do `TODO.md`.

**Seams:**
- Seam 1, plugin-level: `session.start` e `session.measure` com uso mockado, `command.run` do `/conan-mods`, relógio mockado, `$.process` mockado para git e PowerShell
- Seam 2, módulos puros: as regras da statusline (montagem da linha, formatação de duração/tokens/hora, escolha do fuso) e `toggles`

**Blocked by:** None (can start immediately)

Status: ready-for-agent

- [ ] Com uso `ctx 14%`, 28k tokens, sessão de 23 min e `five_hour` em 42% com reset `18:30Z` em `America/Sao_Paulo`, a linha contém `ctx:14% 28k`, `23m` e `limit:42% ↺ 15:30`.
- [ ] Duração acima de uma hora sai como `1h05m`.
- [ ] Sem rate limit, sem effort ou fora de repo git, o campo correspondente não aparece.
- [ ] Depois de um `/clear` (novo início de sessão), a duração recomeça do zero.
- [ ] `STATUSLINE_TZ` vence a detecção; no WSL com Linux em UTC, o fuso vem do PowerShell.
- [ ] `/conan-mods statusline off` limpa a linha na hora e a faixa mostra `statusline`; `on` volta a desenhar.
- [ ] Resposta sobre modelo, effort e cor registrada neste ticket.
- [ ] README e `TODO.md` atualizados; `claude plugin validate .` e `claude plugin test .` passam.
