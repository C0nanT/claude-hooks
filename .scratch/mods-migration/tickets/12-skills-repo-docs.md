# 12: Repo de skills: atualizar docs

> **Difficulty:** Light: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Um PR no repo C0nanT/skills que aponta para o plugin.

- A seção "Hooks" do README troca o `npx @c0nant/claude-hooks install` e a tabela dos 5 hooks pelo `/plugin install conan-mods --marketplace C0nanT/claude-hooks`, a tabela das 4 funções e o `/hooks`.
- Os guias `docs/guides/en/caveman.md` e `docs/guides/pt-br/caveman.md` deixam de citar o hook antigo.
- A skill caveman continua no repo de skills, sem mudança, porque o plugin lê ela de lá.
- O `remove-conan-hooks.sh` fica. A limpeza da Release A cobre o mesmo caso, e decidir removê-lo é com o dono.

**Seams:** None (só documentação)

**Blocked by:** 11 (Release B: virada para o plugin)

Status: ready-for-agent

- [ ] O README do repo de skills mostra o comando de instalação do plugin e o `/hooks`.
- [ ] Nenhuma menção a `npx @c0nant/claude-hooks install` resta nos guias.
- [ ] A skill caveman não foi alterada.
- [ ] O PR foi aberto no repo de skills (confirmar com o dono antes do push).
