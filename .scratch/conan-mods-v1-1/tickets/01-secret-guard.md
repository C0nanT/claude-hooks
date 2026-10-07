# 01: secret-guard

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Uma função nova, `secret-guard`, que impede o Claude de ler ou editar arquivos de credencial (chaves SSH, credenciais de nuvem, `.pem`/`.key`/`.p12`/`.pfx`, `.npmrc`, `.pypirc`, `.netrc`, `.git-credentials`, config do Docker e do `gh`) por Read, Edit, Write, MultiEdit e Bash, com a lista e as exceções da seção "secret-guard" do spec. A função entra em `TOGGLE_NAMES`, começa ligada, liga e desliga por `/conan-mods secret-guard on|off` e aparece na faixa de desligados na posição definida pelo spec. A tabela de funções do README deste repo ganha a linha nova.

**Seams:**
- Seam 1, plugin-level: `tool.call` em Read/Edit/Write/MultiEdit/Bash, `command.run` do `/conan-mods`, `ui.render` de `AbovePrompt`
- Seam 2, módulos puros: as regras do secret-guard e `toggles`

**Blocked by:** None (can start immediately)

Status: ready-for-human

- [x] Read/Edit/Write/MultiEdit em `~/.ssh/id_ed25519`, `~/.aws/credentials`, `server.pem` e `.npmrc` são negados com a mensagem que nomeia caminho e regra.
- [x] `~/.ssh/known_hosts`, `~/.ssh/config` e `~/.ssh/id_ed25519.pub` passam.
- [x] Um comando Bash que cita um arquivo bloqueado (incluindo nas formas `~/` e `$HOME/`) é negado.
- [x] Um erro dentro do hook nega a chamada, como nos guards atuais.
- [x] `/conan-mods secret-guard off` deixa tudo passar e a faixa mostra `secret-guard` na ordem do spec; `on` volta a bloquear.
- [x] `/conan-mods` lista `secret-guard` e o uso o aceita como nome válido.
- [x] README atualizado; `claude plugin validate .` e `claude plugin test .` passam.
