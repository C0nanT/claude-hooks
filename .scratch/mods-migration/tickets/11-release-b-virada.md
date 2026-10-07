# 11: Release B: virada para o plugin

> **Difficulty:** Heavy: **suggested model:** Opus (Claude Code) / Opus or the strongest reasoning model available (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** O repo passa a ser só o plugin `conan-mods`, e a instalação passa a ser `/plugin install conan-mods --marketplace C0nanT/claude-hooks`.

- Saem o CLI npm, os scripts de instalação, a biblioteca de mutação do `settings.json`, as definições de hooks em JSON, as pastas de scripts shell e o `test/run.sh`.
- O pipeline de release:
  - mantém a detecção do tipo de versão pelas mensagens de commit;
  - grava a versão no manifesto do plugin e na entrada do marketplace;
  - cria a tag;
  - **não publica no npm**.
- O CI de branch e o pre-push rodam `claude plugin validate` e `claude plugin test`, e o CI instala o Claude Code para isso.
- README e CLAUDE.md descrevem o plugin, a instalação, a atualização (`claude plugin update` + `/reload-plugins`), o `/conan-mods`, a faixa e o desenvolvimento local.
- O merge do branch `mods` na `main` usa um commit `feat!:`, levando a versão a `1.0.0`.

**Seams:**
- Plugin: `claude plugin test` rodando no CI e no pre-push.

**Blocked by:** 04 (Release A publicado), 07, 08, 09, 10

Status: ready-for-agent

- [x] O Release A já está publicado no npm antes deste merge.
- [x] Nenhum arquivo do instalador antigo resta no repo.
- [x] O CI de branch roda validate e test do plugin e falha se algum teste falhar.
- [x] O pipeline da `main` grava a versão no plugin, cria a tag e não roda `npm publish`.
- [x] O pre-push roda os testes do plugin.
- [ ] O merge com `feat!:` gera a versão `1.0.0` (confirmar o push com o dono antes).
- [ ] Num PC limpo pela Release A, `/plugin install conan-mods --marketplace C0nanT/claude-hooks` instala e as 4 funções funcionam.
- [x] README e CLAUDE.md atualizados. O `TODO.md` continua com o item do `statusline-reset`.
