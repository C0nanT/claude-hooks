# 07: Plugin: dotenv-guard

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** O plugin impede o Claude de ler ou mexer em arquivos `.env`, com as mesmas regras do `protect-dotenv` atual.

- **Read, Edit, Write e MultiEdit:** negados quando o nome do arquivo é `.env` ou `.env.*`, exceto `.env.example`, `.env.sample`, `.env.dist` e `.env.template`.
- **Bash:**
  - as variantes seguras são removidas do comando;
  - se ainda sobrar `.env` seguido de fim de texto ou de algo que não seja letra, `_` ou `-`, é negado.
- As mensagens de bloqueio são as atuais.
- `/hooks dotenv-guard off` deixa tudo passar.
- A decisão fica em funções puras.

**Seams:**
- Plugin: `claude plugin test`, disparando chamadas de Read/Edit/Write/MultiEdit/Bash e `/hooks`.

**Blocked by:** 06 (Plugin: `/hooks` liga/desliga com persistência)

Status: ready-for-agent

- [ ] Todos os casos atuais das seções "protect-dotenv: blocks .env reads", "allows safe variants" e "bash command detection" foram portados e passam.
- [ ] As mensagens de bloqueio são idênticas às atuais.
- [ ] Desligado pelo `/hooks`, nada é bloqueado. Religado, volta a bloquear.
- [ ] Ferramentas fora da lista (por exemplo Grep) não são afetadas, como hoje.
