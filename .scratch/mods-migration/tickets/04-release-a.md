# 04: Release A: publicar a limpeza e marcar deprecated

> **Difficulty:** Heavy: **suggested model:** Opus (Claude Code) / Opus or the strongest reasoning model available (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Publicar no npm a última versão do `@c0nant/claude-hooks`, que só faz a limpeza, e depois marcar o pacote como deprecated.

- O README passa a explicar a migração em cada PC:
  1. `npx @c0nant/claude-hooks@latest uninstall --dry-run`;
  2. o mesmo comando sem `--dry-run`;
  3. `/plugin install conan-mods --marketplace C0nanT/claude-hooks`.
- O CLAUDE.md deixa de descrever a instalação de hooks.
- O push na `main` dispara o pipeline atual, que publica no npm.
- Depois de publicado, `npm deprecate` aponta para o plugin. É um passo manual do dono e precisa de confirmação antes.
- Este push precisa entrar na `main` **antes** do Release B, num push separado.
- O `/plugin install` ainda não funciona neste momento. O README deve avisar que o passo 3 vale a partir do Release B.

**Seams:** None (só documentação e release; o comportamento já é testado em 01–03)

**Blocked by:** 01, 02, 03

Status: ready-for-agent

- [x] O README descreve os 3 passos da migração e avisa sobre o passo 3.
- [x] O CLAUDE.md está coerente com o CLI de limpeza.
- [x] `test/run.sh` passa.
- [ ] A versão foi publicada no npm pelo pipeline (confirmar o push com o dono antes).
- [ ] Rodar `--dry-run` no PC de desenvolvimento e mostrar o relatório ao dono antes da limpeza real.
- [ ] `npm deprecate` executado com mensagem apontando para o plugin (confirmar com o dono antes).
