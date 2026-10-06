# TODO

## Migrar `statusline-reset` para mod

O hook `statusline-reset` (eventos `SessionStart` e `SessionEnd`, matcher `clear`) é instalado pela skill `setup-statusline` do repo [C0nanT/skills](https://github.com/C0nanT/skills), não por este projeto. Ele usa o mesmo marcador `# claude-hook:`.

Ficou de fora da migração para mods de propósito. A limpeza final da versão npm remove só os 5 hooks deste projeto, pelo nome, e deixa o `statusline-reset` intacto.

Depois: decidir se ele vira parte do plugin deste projeto ou ganha um mod próprio no repo de skills, e ajustar `skills/misc/setup-statusline/SKILL.md` e `docs/guides/pt-br/setup-statusline.md`.
