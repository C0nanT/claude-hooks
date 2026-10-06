# 10: Plugin: som de fim de tarefa

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Quando o Claude termina a tarefa (o equivalente ao `Stop` de hoje), toca um som, sem notificação visual e sem toast.

- **WSL** (detectado por `microsoft` em `/proc/version` ou por `WSL_DISTRO_NAME`): roda PowerShell com a sequência de bipes atual da tarefa concluída (523/120, 659/120, 784/180).
- **Ubuntu:**
  - roda `paplay` no volume atual com o som `complete.oga` do sistema;
  - cai para `bell.oga` se falhar;
  - por último usa `aplay` com o som padrão do ALSA.
- Os comandos rodam por `$.process`, e uma falha nunca interrompe a sessão.
- Dois disparos na mesma sessão dentro de 2 segundos tocam uma vez só. O controle fica em memória, sem arquivos em disco.
- `/conan-mods sound off` cala só este som.

**Seams:**
- Plugin: `claude plugin test`, disparando o fim de tarefa com ambiente WSL e Ubuntu simulados e conferindo os comandos chamados.

**Blocked by:** 06 (Plugin: `/conan-mods` liga/desliga com persistência)

Status: ready-for-agent

- [ ] No ambiente WSL simulado, chama PowerShell com os bipes atuais e não chama `paplay`.
- [ ] No Ubuntu simulado, chama `paplay` com `complete.oga`. Se falhar, tenta `bell.oga`.
- [ ] Desligado, nenhum comando é chamado.
- [ ] Dois disparos em menos de 2 s geram uma chamada só.
- [ ] Nenhum arquivo de controle é criado em disco.
- [ ] Testado manualmente nos 4 ambientes (Ubuntu, Cursor, WSL, Cursor+WSL), ou registrado quais ficaram pendentes.
