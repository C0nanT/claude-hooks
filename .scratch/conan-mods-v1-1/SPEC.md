# conan-mods v1.1: statusline, secret-guard, rm-guard e painel

Status: ready-for-agent

## Problem Statement

O `conan-mods` 1.0 trouxe quatro funções (`caveman`, `git-guard`, `dotenv-guard`, `sound`) para dentro do Claude Code. Ainda há lacunas:

- **A linha de status continua no modelo antigo.** A skill `setup-statusline` do repo C0nanT/skills copia um script bash para `~/.claude/`, grava `statusLine` no `settings.json` e instala o hook shell `statusline-reset` (`SessionStart`/`SessionEnd` com matcher `clear`). Ele depende de `jq`, de um arquivo de baseline em `~/.claude/statusline-baseline.json` e de heurísticas para descobrir que houve `/clear`. É o último hook shell com marcador `# claude-hook:` que sobrou nos PCs.
- **Segredos fora do `.env` não estão protegidos.** O Claude pode ler `~/.ssh/id_rsa`, `~/.aws/credentials`, arquivos `.pem` ou um `.npmrc` com token sem nenhum bloqueio.
- **Comandos de shell destrutivos passam.** O `git-guard` só cobre git. Um `rm -rf ~`, `rm -rf /`, `chmod -R 777` ou `curl … | sh` roda sem barreira.
- **O `/conan-mods` é só texto.** Para ver e mudar o estado é preciso digitar o nome de cada função.

## Solution

O `conan-mods` ganha três funções novas e um painel:

| Função | Comportamento |
|---|---|
| `statusline` | Desenha a linha de status (modelo, effort, contexto, duração, rate limit, branch) dentro do plugin, sem bash, `jq`, arquivo de baseline nem hook shell. A duração zera no `/clear` sozinha. |
| `secret-guard` | Bloqueia leitura e edição de arquivos de credencial (`~/.ssh/*`, `~/.aws/credentials`, `*.pem`, `id_rsa`, `.npmrc` etc.) pelas ferramentas de arquivo e pelo Bash. |
| `rm-guard` | Bloqueia comandos de shell destrutivos: `rm -rf` em alvos perigosos (`/`, `~`, `$HOME`, `..`, `/*`, `*` sozinho, caminho absoluto fora do diretório atual), `chmod -R 777` e download canalizado para shell (`curl … \| sh`). |

Cada função nova tem toggle próprio no `/conan-mods`, como as quatro atuais.

`/conan-mods` sem argumento abre um painel com um botão de liga/desliga por função. `/conan-mods <nome> on|off` continua igual. Onde o painel não puder ser aberto, a resposta continua sendo a lista em texto.

No repo C0nanT/skills, a skill `setup-statusline` deixa de instalar o script e o hook e passa a remover o `statusLine` e o `statusline-reset` antigos do `settings.json` e apontar para o plugin.

## User Stories

### statusline

1. Como usuário, quero ver na linha de status o modelo da sessão, para saber com qual modelo estou falando.
2. Como usuário, quero ver o nível de effort entre parênteses quando houver, para saber quanto raciocínio está sendo gasto.
3. Como usuário, quero ver o uso do contexto em porcentagem e em tokens (`ctx:14% 28k`), para saber quando compactar.
4. Como usuário, quero ver a duração da sessão (`23m`, `1h05m`), para acompanhar quanto tempo estou numa tarefa.
5. Como usuário, quero que a duração zere quando eu rodo `/clear`, sem arquivo de baseline nem heurística, para que o número sempre reflita a conversa atual.
6. Como usuário, quero ver o uso da janela de 5 horas do rate limit com a hora de reset (`limit:42% ↺ 14:30`), para planejar quando vou bater no limite.
7. Como usuário no Brasil, quero que a hora de reset apareça no fuso local da máquina e não em UTC, para não fazer conta de cabeça.
8. Como usuário no WSL, quero o mesmo fuso local correto, mesmo quando o Linux reporta UTC.
9. Como usuário, quero poder forçar o fuso com `STATUSLINE_TZ`, para quando a detecção errar.
10. Como usuário, quero ver a branch do git quando estou dentro de um repo, e nada fora dele, para saber onde estou commitando.
11. Como usuário, quero que um campo que o Claude Code não informa (rate limit fora de assinatura, effort em modelo sem effort) seja omitido, e não mostrado como zero.
12. Como usuário, quero que a linha atualize depois de cada turno e quando o rate limit muda, sem eu fazer nada.
13. Como usuário, quero desligar a linha de status com `/conan-mods statusline off` e que ela suma na hora.
14. Como usuário, quero religar com `/conan-mods statusline on` e que ela volte na hora.
15. Como dono dos PCs, quero que a skill `setup-statusline` remova o `statusLine` e o hook `statusline-reset` antigos do `settings.json` e os arquivos copiados, para não ter duas linhas de status nem resto em disco.
16. Como dono dos PCs, quero que a skill `setup-statusline` me diga para instalar o `conan-mods`, para ter um caminho único.

### secret-guard

17. Como usuário, quero que o Claude seja impedido de ler ou editar chaves SSH (`~/.ssh/*`, `id_rsa`, `id_ed25519` e afins), para proteger meu acesso a servidores e ao GitHub.
18. Como usuário, quero que `~/.ssh/known_hosts`, `~/.ssh/config` e chaves públicas (`*.pub`) continuem liberados, para o Claude conseguir diagnosticar problemas de conexão.
19. Como usuário, quero que credenciais de nuvem (`~/.aws/credentials`, `~/.config/gcloud/` com credenciais, `~/.azure/`) sejam bloqueadas.
20. Como usuário, quero que arquivos de chave privada e certificado com chave (`*.pem`, `*.key`, `*.p12`, `*.pfx`) sejam bloqueados.
21. Como usuário, quero que arquivos de token de ferramentas (`.npmrc`, `.pypirc`, `.netrc`, `~/.docker/config.json`, `~/.config/gh/hosts.yml`, `~/.git-credentials`) sejam bloqueados.
22. Como usuário, quero que o bloqueio valha para Read, Edit, Write e MultiEdit, para que nenhuma ferramenta de arquivo vaze o conteúdo.
23. Como usuário, quero que comandos Bash que mencionem esses arquivos também sejam bloqueados, para que o bloqueio não seja contornado pelo terminal.
24. Como usuário, quero que a mensagem de bloqueio diga qual arquivo e qual regra bateram, para o Claude entender e me pedir se precisar.
25. Como usuário, quero desligar o secret-guard com `/conan-mods secret-guard off` quando eu decidir conscientemente.

### rm-guard

26. Como usuário, quero que `rm -rf /`, `rm -rf ~`, `rm -rf $HOME` e `rm -rf ..` sejam bloqueados, para não perder a máquina ou a pasta pai por um comando errado.
27. Como usuário, quero que o bloqueio valha para todas as grafias das flags (`-rf`, `-fr`, `-r -f`, `-Rf`, `--recursive --force`), para que não seja contornado por acidente.
28. Como usuário, quero que `rm -rf /*` e `rm -rf *` sozinho sejam bloqueados.
29. Como usuário, quero que `rm -rf` de um caminho absoluto fora do diretório atual seja bloqueado.
30. Como usuário, quero que `rm -rf node_modules`, `rm -rf dist` e outras pastas relativas dentro do projeto continuem liberados, para o Claude limpar build sem atrito.
31. Como usuário, quero que `chmod -R 777` seja bloqueado.
32. Como usuário, quero que `curl … | sh`, `curl … | bash`, `wget -O- … | sh` e variantes sejam bloqueados, para que o Claude não execute script baixado sem eu ver.
33. Como usuário, quero que a mensagem de bloqueio diga qual comando e qual padrão bateram, no mesmo formato do `git-guard`.
34. Como usuário, quero desligar o rm-guard com `/conan-mods rm-guard off` quando eu decidir conscientemente.

### Painel e toggles

35. Como usuário, quero que `/conan-mods` sem argumento abra um painel com cada função e um botão de liga/desliga, para mudar o estado sem lembrar os nomes.
36. Como usuário, quero que apertar um botão do painel mude o estado na hora e redesenhe o painel e a faixa de desligados.
37. Como usuário, quero que o painel feche com Esc e devolva o foco ao prompt.
38. Como usuário, quero que `/conan-mods <nome> on|off` continue funcionando igual, para scripts e hábitos que já tenho.
39. Como usuário, quero que onde o painel não abre a resposta de `/conan-mods` continue sendo a lista em texto, para nunca ficar sem ver o estado.
40. Como usuário da extensão do Claude Code no Cursor, quero que o painel funcione lá também.
41. Como usuário, quero que as três funções novas comecem ligadas, como as atuais.
42. Como usuário, quero que a faixa `⚠ off: …` inclua as funções novas quando desligadas.
43. Como mantenedor, quero que a versão saia como minor (`1.1.0`), já que só acrescenta funções.

## Implementation Decisions

### Toggles

- `TOGGLE_NAMES` passa a ter sete nomes: `caveman`, `git-guard`, `dotenv-guard`, `sound`, `statusline`, `secret-guard`, `rm-guard`. Valor ausente continua significando ligado, então quem atualiza recebe as três novas ligadas.
- Ordem da faixa de desligados: `git-guard · dotenv-guard · secret-guard · rm-guard · caveman · sound · statusline` (guards primeiro, como hoje).
- `parseModsArgs`, `usageText` e `listText` continuam com o mesmo contrato e passam a aceitar os nomes novos.

### Painel

- `/conan-mods` sem argumento abre um pane de id fixo do plugin, com título `conan-mods`, aberto com foco e fechando com Esc.
- O pane desenha uma linha por função, na ordem de `TOGGLE_NAMES`, com o nome, o estado e um botão. O botão de cada linha alterna o toggle pelo mesmo caminho do comando em texto (store + state + invalidate), então faixa e painel redesenham juntos.
- A resposta do comando sem argumento traz a lista em texto mesmo quando o pane abre, para o registro na transcrição e para superfícies onde o pane não abre.
- Usa só elementos que existem nas superfícies `terminal` e `vscode` (Box, Text, Button). Sem `Client`.

### statusline

- Usa a linha de status do plugin (`$.ui.status`), uma por plugin, embaixo do prompt.
- Campos, da esquerda para a direita, como na skill atual: modelo, effort entre parênteses quando houver, `ctx:<pct>% <tokens>k`, duração, `limit:<pct>% ↺ HH:MM` da janela `five_hour`, branch do git. Um campo sem dado é omitido.
- Contexto, rate limit e início da sessão vêm de `$.session.usage()`. A duração é `agora − startedAt`, e o `startedAt` já recomeça no `/clear`, então não há baseline nem arquivo.
- Atualiza no evento de medição da sessão (`session.measure`, que dispara depois de cada turno e quando uma janela de rate limit muda um ponto) e ao abrir a sessão. Entre medições a duração pode ficar até um turno atrasada, o que é aceito.
- A branch vem de `git branch --show-current` via `$.process`, no diretório da sessão. Falha ou repo ausente omite o campo.
- Fuso da hora de reset, nesta ordem: `STATUSLINE_TZ`; fuso do host (`timedatectl`, `/etc/timezone`, link de `/etc/localtime`), ignorando `UTC` puro; no WSL, quando o Linux ainda diz UTC, o fuso local do Windows via PowerShell. O fuso resolvido fica em memória por sessão.
- Cores: a linha do plugin é texto. Se a linha de status do plugin não aceitar cor, a linha sai sem cor. Os limiares de cor do rate limit (verde < 50, amarelo 50–79, vermelho ≥ 80) só se aplicam se houver cor.
- A formatação (montar a linha a partir dos números, formatar duração, tokens e hora, escolher o fuso a partir das fontes lidas) fica num módulo puro `statusline-rules`. O `register.ts` só lê as fontes e chama o módulo.
- Desligado: limpa a linha (`$.ui.status(undefined)`) na hora e para de atualizar.
- Modelo e effort: o spec assume que o engine expõe os dois a um mod. Se algum não estiver disponível, o campo é omitido e o ticket registra isso.

### Skill `setup-statusline` (repo C0nanT/skills)

- Deixa de copiar `statusline-command.sh` e `statusline-reset-hook.sh` e de gravar `statusLine` e hooks no `settings.json`.
- Passa a: remover do `settings.json` a chave `statusLine` que aponta para `statusline-command.sh` e as entradas de hook com o marcador `claude-hook:statusline-reset` (em `SessionStart`, `SessionEnd` e `UserPromptSubmit`); apagar `~/.claude/statusline-command.sh`, `~/.claude/statusline-reset-hook.sh` e `~/.claude/statusline-baseline.json`; e mandar instalar o `conan-mods`.
- Os scripts bash da skill saem do repo de skills. O guia `docs/guides/pt-br/setup-statusline.md` acompanha.
- O item do `statusline-reset` sai do `TODO.md` deste repo.

### secret-guard

- Módulo puro `secret-guard-rules`, no mesmo formato do `dotenv-guard-rules`: uma função que decide se um caminho é segredo protegido (devolve a regra que bateu ou nada), uma que decide se um comando Bash referencia um, e as mensagens.
- Hook em Read, Edit, Write e MultiEdit pelo `file_path`, e outro em Bash pelo comando, cada um com `.catch` que nega em caso de erro, como os guards atuais.
- Lista inicial bloqueada: tudo sob `~/.ssh/` exceto `known_hosts`, `config` e `*.pub`; nomes `id_rsa`, `id_dsa`, `id_ecdsa`, `id_ed25519` em qualquer lugar; `~/.aws/credentials`; `~/.config/gcloud/` (credenciais); `~/.azure/`; extensões `.pem`, `.key`, `.p12`, `.pfx`; nomes `.npmrc`, `.pypirc`, `.netrc`, `.git-credentials`; `~/.docker/config.json`; `~/.config/gh/hosts.yml`.
- `~` é resolvido com `HOME` e também casa na forma literal `~/` e `$HOME/` dentro de comandos Bash.
- Mensagem de bloqueio: `BLOCKED: '<caminho>' matches secret rule '<regra>'. The user has prevented you from reading credentials.`
- `.npmrc` é bloqueado inteiro, sem olhar se tem token: ler o arquivo para decidir já seria o vazamento.

### rm-guard

- Módulo puro `rm-guard-rules`, no formato do `git-guard-rules`: recebe o comando e o diretório atual, devolve o padrão que bateu ou nada.
- `rm` com recursivo e force, em qualquer grafia (`-rf`, `-fr`, `-Rf`, `-r -f`, `--recursive --force`, combinações), com algum alvo perigoso: `/`, `/*`, `~`, `~/`, `$HOME`, `${HOME}`, `..` ou caminho começando por `../`, `*` sozinho, ou caminho absoluto que não fica dentro do diretório atual.
- Alvo relativo dentro do projeto (`node_modules`, `dist`, `./build`) passa.
- `chmod` recursivo com `777`, em qualquer ordem de flags.
- `curl` ou `wget` cuja saída é canalizada (`|`) para `sh`, `bash`, `zsh` ou `sudo sh/bash`.
- Avalia cada comando de uma linha composta (`;`, `&&`, `||`, `|`), como o `git-guard` já faz com o comando inteiro.
- Hook em Bash com `.catch` que nega em caso de erro.
- Mensagem de bloqueio no formato do `git-guard`: `BLOCKED: '<comando>' matches dangerous pattern '<padrão>'. The user has prevented you from doing this.`
- O diretório atual vem do evento da chamada (`cwd`) ou do ambiente da sessão.

### Versão

- Commits das funções novas com `feat(<função>):`, o que dá `1.1.0` pelo pipeline atual. Nenhuma edição manual de versão.

## Testing Decisions

- Um bom teste só observa o que é visível: a chamada passa ou é negada e com qual mensagem, o texto da linha de status, o texto e os botões do painel, a resposta do `/conan-mods`, o texto da faixa. Não verifica chamadas internas nem estrutura de estado.
- **Seam 1, plugin-level:** disparar eventos no plugin via `claude plugin test` (`tool.call`, `command.run`, `ui.render` de `AbovePrompt` e `Pane`, `session.measure`, `session.start`) e checar o resultado visível. Os testes de UI montam o pane e apertam botões por key, em loop sobre as superfícies `terminal` e `vscode`.
- **Seam 2, módulos puros:** `toggles`, `secret-guard-rules`, `rm-guard-rules` e `statusline-rules` testados direto, com tabelas de entrada e saída (comando ou caminho → padrão; números de uso → linha).
- Prior art: `git-guard.test.ts` e `dotenv-guard.test.ts` para os guards, `off-band.test.ts` para faixa e redesenho, `toggles.test.ts` para o comando, `sound.test.ts` para `$.process` com resultado mockado (branch do git, PowerShell do fuso).
- Relógio mockado para a duração da linha de status.
- A mudança na skill `setup-statusline` é validada pelas checagens do pre-push do repo de skills (frontmatter, markdownlint), sem teste novo.

## Out of Scope

- Cobrir Grep e Glob no `dotenv-guard` e no `secret-guard`.
- Bloquear `rm -rf` dentro do projeto ou qualquer comando que não esteja na lista do rm-guard (`dd`, `mkfs`, `sudo` em geral).
- Modo "perguntar" nos guards: todos negam.
- Painel com mais que liga/desliga (configuração de regras, histórico de bloqueios).
- Personalizar campos da linha de status.
- Som de "precisa de você", `turn-timer` e faixa de contexto (ideias 5, 6 e 7 da conversa original).
- Remover o `remove-conan-hooks.sh` do repo de skills.

## Further Notes

- A faixa de desligados ficou acima do prompt para não brigar com a linha de status da skill. Agora a linha de status é do próprio plugin, mas a faixa continua onde está.
- Verificar no primeiro ticket da statusline se o engine expõe modelo e effort a um mod e se `$.ui.status` aceita cor. As duas respostas só mudam o que aparece, não a estrutura.
- A troca da linha de status por PC é: atualizar o plugin, rodar a nova `setup-statusline` (que limpa o antigo). Sem isso aparecem duas linhas, a do `settings.json` e a do plugin.
- Tickets sugeridos, um por mod: toggles com os nomes novos; secret-guard; rm-guard; statusline no plugin; skill `setup-statusline` no repo de skills (bloqueado pela statusline); painel.
