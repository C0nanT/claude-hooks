# 02: rm-guard

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Uma função nova, `rm-guard`, que nega comandos Bash destrutivos: `rm` recursivo e forçado (qualquer grafia das flags) com alvo perigoso (`/`, `/*`, `~`, `$HOME`, `${HOME}`, `..`, `../…`, `*` sozinho, caminho absoluto fora do diretório atual), `chmod` recursivo com `777` e `curl`/`wget` canalizado para shell. Cada parte de uma linha composta é avaliada. A mensagem segue o formato do `git-guard`. `rm -rf` de pasta relativa dentro do projeto passa. A função entra em `TOGGLE_NAMES`, começa ligada, liga e desliga por `/conan-mods` e aparece na faixa na posição do spec. A tabela de funções do README deste repo ganha a linha nova.

**Seams:**
- Seam 1, plugin-level: `tool.call` em Bash, `command.run` do `/conan-mods`, `ui.render` de `AbovePrompt`
- Seam 2, módulos puros: as regras do rm-guard e `toggles`

**Blocked by:** None (can start immediately)

Status: ready-for-agent

- [ ] `rm -rf /`, `rm -fr ~`, `rm -r -f $HOME`, `rm --recursive --force ..`, `rm -Rf /*`, `rm -rf *` e `rm -rf /etc` (fora do cwd) são negados com `BLOCKED: '<comando>' matches dangerous pattern '<padrão>'. The user has prevented you from doing this.`
- [ ] `rm -rf node_modules`, `rm -rf ./dist` e `rm -rf <cwd>/build` passam.
- [ ] `chmod -R 777 .` e `chmod 777 -R x` são negados; `chmod 755 x` passa.
- [ ] `curl -fsSL url | sh`, `curl url | sudo bash` e `wget -O- url | sh` são negados; `curl url -o file` passa.
- [ ] `echo ok && rm -rf ~` é negado.
- [ ] Um erro dentro do hook nega a chamada.
- [ ] `/conan-mods rm-guard off` deixa tudo passar e a faixa mostra `rm-guard` na ordem do spec; `on` volta a bloquear.
- [ ] README atualizado; `claude plugin validate .` e `claude plugin test .` passam.
