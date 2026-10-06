# 01: Limpeza: remover os 5 hooks do settings.json

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Transformar o CLI npm numa ferramenta de limpeza.

- `uninstall` remove do `settings.json` os 5 hooks deste projeto pela marca exata de cada nome: `caveman`, `git-guardrails`, `protect-dotenv`, `notify-attention` e `notify-done`.
- Hooks de outros projetos com a mesma marca, como o `statusline-reset`, e hooks sem marca ficam intactos.
- Grupos, eventos e o objeto `hooks` que ficarem vazios são podados.
- No fim, um relatório lista cada item como `removido` ou `não existia`, mostra os comandos que ainda têm a marca `claude-hook:` e mostra o comando `/plugin install conan-mods --marketplace C0nanT/claude-hooks`.
- `--dry-run` mostra o mesmo relatório como "seria removido", sem escrever nada.
- `install` recusa com saída diferente de zero e mostra o comando novo.
- `list` mostra o que a limpeza encontraria.
- O suporte a `CLAUDE_SETTINGS` sai: o alvo é sempre `~/.claude/settings.json`, resolvido a partir de `HOME`.

**Seams:**
- Limpeza (Release A): `node bin/claude-hooks.js uninstall [--dry-run]`, `install` e `list` com `HOME` apontando para uma pasta temporária.

**Blocked by:** None (can start immediately)

Status: ready-for-human

- [x] `uninstall` remove os 5 hooks pelo nome e preserva `statusline-reset` e hooks sem marca.
- [x] Grupos, eventos e `hooks` vazios são podados, e o resto do `settings.json` fica igual.
- [x] O relatório lista removidos, os que não existiam e os que ainda têm a marca `claude-hook:`.
- [x] `--dry-run` não altera o arquivo e imprime o mesmo relatório como "seria removido".
- [x] A segunda execução não muda nada e não dá erro.
- [x] Sem `settings.json`, a limpeza termina sem erro e relata isso.
- [x] `install` sai com código diferente de zero e mostra o comando `/plugin install` novo.
- [x] `list` mostra o que seria removido.
- [x] Os testes de instalação do `test/run.sh` são trocados por testes desses comportamentos.
