# Migrar claude-hooks para mods (plugin `conan-mods`)

Status: ready-for-agent

## Problem Statement

Hoje os hooks deste projeto (`caveman`, `git-guardrails`, `protect-dotenv`, `notify-attention`, `notify-done`) são comandos shell injetados no `settings.json` por um CLI publicado no npm. Esse modelo tem problemas concretos:

- **Falha em silêncio.** Cada hook aponta para um script em `~/.claude/hooks-lib/` e não faz nada se o script não existir. No PC de desenvolvimento a pasta está vazia: o `.env` não está protegido, as notificações não tocam e o `git-guardrails` nem está instalado, e ninguém percebeu.
- **Dependências externas.** Exige `jq`, cópia de scripts para fora do repo e manipulação manual do `settings.json` com um protocolo de marcadores.
- **Sem controle em tempo de uso.** Não dá para ligar ou desligar um hook sem reinstalar, e não há como ver o estado atual.
- **Resto acumulado.** Arquivos de controle de duplicidade das notificações nunca são apagados. Existem restos de gerações anteriores (marca `conan-caveman-autostart`, scripts em `~/.claude/hooks/`) e um plugin antigo separado (`claude-notification`) que duplica as notificações.

O Claude Code agora suporta mods: plugins com hooks em TypeScript que rodam dentro do próprio Claude Code, podem desenhar interface e registrar comandos, e são distribuídos por marketplace no GitHub.

## Solution

Transformar este repo em um marketplace com um único plugin, `conan-mods`, instalado com:

```
/plugin install conan-mods --marketplace C0nanT/claude-hooks
```

O plugin entrega quatro funções:

| Função | Comportamento |
|---|---|
| `caveman` | Lê a skill caveman instalada pelo repo de skills e coloca nas instruções da sessão. Avisa uma vez por sessão se a skill faltar. |
| `git-guard` | Bloqueia comandos git destrutivos, com as mesmas regras do `git-guardrails` atual. |
| `dotenv-guard` | Bloqueia leitura e edição de `.env`, com as mesmas regras do `protect-dotenv` atual. |
| `sound` | Toca um som quando o Claude termina a tarefa, sem notificação visual. |

O `notify-attention` deixa de existir.

Cada função pode ser ligada e desligada com `/hooks <nome> on|off`. A escolha vale para todas as sessões daquele PC. `/hooks` sozinho mostra o estado de tudo. Enquanto algo estiver desligado, uma faixa de uma linha acima do prompt mostra o que está desligado.

A migração sai em dois lançamentos:

- **Release A:** a última versão do pacote npm vira uma ferramenta de limpeza, que remove tudo o que as versões antigas deixaram.
- **Release B:** o repo passa a ser o plugin, e o npm deixa de ser publicado.

Em cada PC a troca é: limpeza com `--dry-run`, limpeza real, `/plugin install`.

## User Stories

### Instalação e atualização

1. Como dono dos PCs, quero instalar todas as funções com um único comando `/plugin install`, para não depender de npm, `jq` ou edição de `settings.json`.
2. Como dono dos PCs, quero atualizar o plugin com `claude plugin update` seguido de `/reload-plugins`, para receber correções sem reinstalar.
3. Como dono dos PCs, quero que o plugin funcione igual no terminal Ubuntu nativo, no terminal do Cursor, no WSL e no Cursor+WSL, para ter o mesmo comportamento em todos os meus ambientes.
4. Como dono dos PCs, quero que o plugin seja instalado sempre no escopo global, para não ter que configurar projeto por projeto.
5. Como mantenedor, quero que a versão do plugin seja calculada automaticamente pelas mensagens de commit, como hoje, para não editar versão à mão.
6. Como mantenedor, quero que o lançamento do plugin marque a versão `1.0.0`, para sinalizar a quebra em relação ao pacote npm.

### Caveman

7. Como usuário, quero que o modo caveman esteja ativo desde o início de toda sessão, para economizar tokens sem digitar `/caveman`.
8. Como usuário, quero que o plugin leia a skill caveman instalada pelo repo de skills, para que exista uma única fonte da skill, compartilhada com os outros agentes.
9. Como usuário, quero um aviso uma vez por sessão quando a skill caveman não estiver instalada, com o comando para instalá-la, para não ficar sem a função sem saber.
10. Como usuário, quero desligar a caveman com `/hooks caveman off` e que isso valha na hora, sem reiniciar a sessão.
11. Como usuário, quero religar a caveman com `/hooks caveman on` e que isso valha na hora.

### git-guard

12. Como usuário, quero que o Claude seja impedido de rodar `git push` (incluindo `--force`), `reset --hard`, `clean -f`/`-fd`, `branch -D`, `checkout .`, `restore .` e `git rm`, para não perder trabalho por um comando destrutivo.
13. Como usuário, quero que o bloqueio funcione mesmo com opções globais do git antes do subcomando (`-c k=v`, `-C dir`, `--git-dir=`, `--work-tree=`, `--namespace=`, `--no-pager`, `--literal-pathspecs`), para que o bloqueio não seja contornado por acidente.
14. Como usuário, quero que `git commit`, `git status`, `git diff`, `git log` e outros comandos seguros continuem liberados, para o Claude seguir trabalhando normalmente.
15. Como usuário, quero que a mensagem de bloqueio diga ao Claude qual comando e qual padrão bateram, para ele entender por que foi bloqueado.
16. Como usuário, quero poder desligar o git-guard com `/hooks git-guard off` quando eu decidir conscientemente, para casos pontuais.

### dotenv-guard

17. Como usuário, quero que o Claude seja impedido de ler, editar ou escrever arquivos `.env` e `.env.*` pelas ferramentas de arquivo, para proteger segredos.
18. Como usuário, quero que comandos Bash que mencionem um arquivo `.env` também sejam bloqueados, para que o bloqueio não seja contornado pelo terminal.
19. Como usuário, quero que `.env.example`, `.env.sample`, `.env.dist` e `.env.template` continuem liberados, para o Claude entender a configuração sem ver segredos.
20. Como usuário, quero que a mensagem de bloqueio sugira usar `.env.example`, para o Claude ter um caminho alternativo.
21. Como usuário, quero poder desligar o dotenv-guard com `/hooks dotenv-guard off`.

### sound

22. Como usuário, quero ouvir um som quando o Claude terminar a tarefa, para saber que posso voltar ao terminal.
23. Como usuário no Ubuntu, quero que o som toque pelo mesmo mecanismo de hoje (som do sistema via player de áudio do sistema, com som alternativo se o principal falhar).
24. Como usuário no WSL, quero que o som toque no Windows como hoje (bipes via PowerShell), porque o áudio do Linux pode não chegar ao Windows.
25. Como usuário, não quero notificação visual nem aviso dentro do terminal ao terminar, só o som.
26. Como usuário, quero que o som não toque duas vezes para o mesmo fim de tarefa.
27. Como usuário, quero desligar o som com `/hooks sound off`, e que isso cale apenas o som deste plugin, sem afetar outros sons do Claude Code.

### Ligar, desligar e indicador

28. Como usuário, quero rodar `/hooks` sem argumentos e ver o estado de todas as funções, para saber o que está ativo.
29. Como usuário, quero que a escolha de ligar ou desligar persista entre sessões no mesmo PC, para não ter que repetir.
30. Como usuário, quero que tudo comece ligado em uma instalação nova, para estar protegido por padrão.
31. Como usuário, quero uma resposta clara quando digitar um nome ou valor inválido em `/hooks`, com a lista de nomes válidos.
32. Como usuário, quero ver uma faixa acima do prompt enquanto qualquer função estiver desligada, por exemplo `⚠ off: git-guard · caveman`, para não esquecer algo desligado.
33. Como usuário, quero que essa faixa suma quando tudo estiver ligado, para não ocupar espaço à toa.
34. Como usuário, quero que a faixa seja atualizada na hora em que eu ligar ou desligar algo.

### Limpeza (Release A)

35. Como dono dos PCs, quero rodar `npx @c0nant/claude-hooks@latest uninstall --dry-run` e ver tudo o que seria removido sem apagar nada, para conferir antes.
36. Como dono dos PCs, quero que a limpeza remova do `settings.json` os 5 hooks deste projeto pelo nome (`caveman`, `git-guardrails`, `protect-dotenv`, `notify-attention`, `notify-done`), para não rodarem em dobro com o plugin.
37. Como dono dos PCs, quero que a limpeza **não** remova hooks de outros projetos que usem a mesma marca, como o `statusline-reset`, para não quebrar minha linha de status.
38. Como dono dos PCs, quero que a limpeza apague as pastas de scripts em `~/.claude/hooks-lib/` e a própria pasta se ficar vazia.
39. Como dono dos PCs, quero que a limpeza apague os arquivos de controle de duplicidade das notificações, em `$XDG_RUNTIME_DIR/claude-notification/` ou `/tmp/claude-notification/`.
40. Como dono dos PCs, quero que a limpeza remova os hooks da geração anterior: a marca `conan-caveman-autostart` e os scripts `conan-git-guardrails.sh` e `block-dangerous-git.sh` em `~/.claude/hooks/`, e a pasta se ficar vazia.
41. Como dono dos PCs, quero que a limpeza desinstale o plugin antigo `claude-notification` e remova o marketplace dele usando os comandos oficiais do Claude Code, para não deixar resto em arquivos internos.
42. Como dono dos PCs, quero um relatório no fim da limpeza dizendo o que foi removido, o que já não existia e o que sobrou com a marca `claude-hook:`, para ter certeza de que não ficou resíduo.
43. Como dono dos PCs, quero que a limpeza funcione mesmo se o `claude` não estiver no `PATH` ou se o plugin antigo não estiver instalado, informando isso no relatório em vez de falhar.
44. Como dono dos PCs, quero que a limpeza preserve o resto do `settings.json` intacto e remova grupos e eventos que ficarem vazios.
45. Como dono dos PCs, quero que `npx @c0nant/claude-hooks install` recuse instalar e mostre o comando `/plugin install` novo, para eu não reinstalar a versão antiga por engano.
46. Como dono dos PCs, quero que a limpeza seja segura para rodar mais de uma vez, sem erro e sem efeito na segunda vez.
47. Como mantenedor, quero marcar o pacote npm como deprecated depois do Release A, apontando para o plugin.

### Manutenção

48. Como mantenedor, quero testar o plugin com `claude plugin test` no CI e no pre-push, para não publicar quebrado.
49. Como mantenedor, quero que os casos de teste atuais de `protect-dotenv` e `git-guardrails` virem testes do plugin, para não perder nenhuma regra na migração.
50. Como mantenedor, quero o README e o CLAUDE.md descrevendo o plugin, a instalação, `/hooks` e o desenvolvimento local, para eu ou um agente conseguirmos manter.

## Implementation Decisions

### Estrutura

- O repo vira um marketplace com uma única entrada, o plugin `conan-mods`, cuja `source` é o próprio repo.
- Um único hooks module registra todas as funções. Cada função fica em um módulo interno próprio (caveman, git-guard, dotenv-guard, sound, toggles e indicador), e o registro só liga os eventos a esses módulos.
- A lógica de decisão (bater um comando contra as regras do git, decidir se um caminho é `.env` protegido, interpretar os argumentos de `/hooks`) fica em funções puras, chamadas pelos hooks.
- O plugin tem contrato de tipos para os valores que guarda em estado.
- Some: o CLI npm (no Release B), `install.sh`, `list.sh`, a biblioteca de mutação de `settings.json`, as definições `hooks/*.json`, as pastas de scripts shell, o protocolo de marcador `claude-hook:` e o suporte a `CLAUDE_SETTINGS`.

### Toggles

- Nomes fixos: `caveman`, `git-guard`, `dotenv-guard`, `sound`.
- Um único comando `/hooks` registrado na abertura da sessão:
  - sem argumento, lista cada nome com `on` ou `off`;
  - `<nome> on|off` muda o estado e responde com o novo estado;
  - qualquer outra entrada responde com o uso e os nomes válidos.
- O estado persiste no armazenamento do plugin que sobrevive entre sessões (`$.store`), por PC. Valor ausente significa ligado.
- O estado também fica no estado de sessão (`$.state`), para a faixa reagir na hora.

### Caveman

- Entra na montagem das instruções de sistema (`prompt.compose`) como uma seção da sessão, quando ligada. Isso permite ligar e desligar na hora sem reiniciar.
- Lê `~/.claude/skills/caveman/SKILL.md` por `$.fs`. É a mesma fonte de hoje, mantida pelo repo C0nanT/skills e compartilhada com outros agentes, e o plugin não carrega cópia própria.
- Se o arquivo não existir, a seção não entra e o plugin mostra um aviso uma vez por sessão, com o comando `npx skills@latest add C0nanT/skills`.

### git-guard

- Hook em chamadas de ferramenta, filtrado para Bash.
- Porta exatamente a lista atual de padrões, incluindo a tolerância a opções globais do git entre `git` e o subcomando, e os padrões soltos `push --force` e `reset --hard`. A liberação do `git commit` continua.
- Quando bate, nega a chamada com a mensagem atual: `BLOCKED: '<comando>' matches dangerous pattern '<padrão>'. The user has prevented you from doing this.`
- Desligado, deixa tudo passar.

### dotenv-guard

- Hook em todas as chamadas de ferramenta.
- Read, Edit, Write e MultiEdit: bloqueia quando o nome do arquivo é `.env` ou `.env.*`, exceto `.env.example`, `.env.sample`, `.env.dist` e `.env.template`.
- Bash: remove do comando as variantes seguras e bloqueia se ainda restar uma referência `.env` seguida de fim de texto ou de um caractere que não seja letra, `_` ou `-`.
- As mensagens de bloqueio são as atuais.
- As regras são portadas sem revisão. Melhorias, como cobrir Grep e Glob, ficam para depois.

### sound

- Dispara no fim da tarefa, no evento equivalente ao `Stop` de hoje.
- Detecta WSL do mesmo jeito que hoje: `microsoft` em `/proc/version` ou `WSL_DISTRO_NAME` definida.
- **WSL:** roda PowerShell com a sequência de bipes atual da tarefa concluída. Sem toast do Windows.
- **Ubuntu:** roda `paplay` no volume atual com o som principal `complete.oga`, cai para `bell.oga` se falhar, e por último usa `aplay` com o som padrão do ALSA.
- Os comandos rodam por `$.process`, e uma falha nunca interrompe a sessão.
- Sem notificação visual e sem toast.
- Mantém proteção contra disparo duplo em memória, por sessão, com janela de 2 segundos, sem arquivos em disco.
- Os sons e a escolha `paplay`/PowerShell continuam iguais. O player de áudio próprio do mod fica fora de escopo.

### Indicador

- Uma faixa acima do prompt lista, na ordem fixa `git-guard · dotenv-guard · caveman · sound`, só os nomes desligados: `⚠ off: <nomes>`.
- Com tudo ligado, a faixa não desenha nada e devolve o desenho padrão.
- Usa a faixa e não a linha de status, para não conflitar com a linha de status própria instalada pela skill `setup-statusline`.

### Release A (última versão npm)

- O CLI mantém só a limpeza:
  - `uninstall [--dry-run]` remove tudo;
  - `install` recusa, com código de saída diferente de zero, e mostra o comando `/plugin install` novo;
  - `list` mostra o que a limpeza encontraria.
- Os passos da limpeza, nesta ordem:
  1. **`settings.json`:** remove os grupos cujo comando tem a marca exata de cada um dos 5 nomes. Nunca remove pelo prefixo da marca. Também remove os hooks da geração anterior: a marca `conan-caveman-autostart` e os comandos que citem `conan-git-guardrails` ou `block-dangerous-git` fora da marca `claude-hook:git-guardrails`. Grupos, eventos e o objeto `hooks` que ficarem vazios são podados.
  2. **Pastas de scripts:** remove `git-guardrails`, `notification` e `protect-dotenv` dentro de `~/.claude/hooks-lib/`, e a pasta se ficar vazia.
  3. **Arquivos de controle:** remove a pasta `claude-notification` em `$XDG_RUNTIME_DIR`, ou em `/tmp` quando a variável não existe.
  4. **Geração anterior:** remove `conan-git-guardrails.sh` e `block-dangerous-git.sh` de `~/.claude/hooks/`, e a pasta se ficar vazia.
  5. **Plugin antigo:** desinstala `claude-notification` com `claude plugin uninstall` e remove o marketplace dele com `claude plugin marketplace remove`. Se o `claude` não existir ou o plugin não estiver instalado, registra no relatório e segue.
  6. **Relatório:** cada item como `removido`, `não existia` ou `falhou`, mais a lista de comandos que ainda têm a marca `claude-hook:` (o esperado é só o `statusline-reset`), e o comando de instalação do plugin.
- O `--dry-run` executa a mesma detecção e imprime o mesmo relatório como "seria removido", sem escrever nada e sem chamar o `claude`.
- Ainda exige `jq` e Node, como hoje.
- Depois de publicado: `npm deprecate @c0nant/claude-hooks` com mensagem apontando para o plugin.

### Release B e CI

- Os dois lançamentos são pushes separados na `main`, nesta ordem, para que a versão de limpeza seja publicada no npm.
- O pipeline de release mantém a detecção do tipo de versão pelas mensagens de commit, mas grava a versão no manifesto do plugin e na entrada do marketplace, cria a tag e não publica no npm.
- O commit do Release B usa `feat!:`, o que leva a versão para `1.0.0`.
- O CI e o hook de pre-push rodam a validação do plugin e `claude plugin test`. O CI instala o Claude Code para isso.
- O README e o CLAUDE.md deste repo são reescritos para o plugin.

## Testing Decisions

- Um bom teste dispara um evento como o Claude Code dispararia e confere só o resultado visível: bloqueou ou deixou passar e com qual mensagem, chamou ou não o comando de som e com quais argumentos, a seção da caveman entrou ou não, o texto de resposta do `/hooks`, o que a faixa desenha. Nada de testar funções internas ou formato de estado.

**Pontos de teste combinados:**

- **Plugin:** `claude plugin test` sobre o plugin inteiro. Cada teste dispara chamada de ferramenta, fim de tarefa, montagem de instruções, `/hooks` ou desenho da faixa, e confere o resultado.
- **Limpeza (Release A):** `node bin/claude-hooks.js uninstall [--dry-run]` (e `install`, `list`) com `HOME` apontando para uma pasta temporária com restos falsos: os 5 hooks, o `statusline-reset`, `hooks-lib`, arquivos de controle, a geração anterior e um hook alheio sem marca. O comando `claude` é trocado por um falso no `PATH` que registra as chamadas. Os testes conferem o que sumiu, o que ficou, o relatório e as chamadas registradas.

**Módulos testados:**

- **git-guard:** todos os casos atuais de "blocks dangerous commands", "blocks with global options" e "allows safe commands", portados um a um. Desligado, deixa passar.
- **dotenv-guard:** todos os casos atuais de "blocks .env reads", "allows safe variants" e "bash command detection", portados um a um. Desligado, deixa passar.
- **caveman:**
  - a seção entra com a skill presente e ligada;
  - não entra desligada;
  - sem a skill, não entra e avisa uma única vez por sessão;
  - ligar e desligar vale na montagem seguinte.
- **sound:**
  - WSL detectado → chama PowerShell;
  - Ubuntu → chama `paplay` e cai para o alternativo se falhar;
  - desligado → não chama nada;
  - dois disparos dentro de 2 segundos → uma chamada só.
- **`/hooks`:**
  - lista;
  - liga e desliga cada nome;
  - entrada inválida;
  - o estado persiste numa nova sessão;
  - padrão é ligado.
- **Faixa:** nada com tudo ligado, nomes certos e na ordem certa com itens desligados, atualiza depois do `/hooks`.
- **Limpeza:**
  - remove os 5 pelo nome e preserva `statusline-reset` e hooks alheios;
  - poda grupos e eventos vazios;
  - remove as pastas e a geração anterior;
  - `--dry-run` não altera nada e não chama o `claude`;
  - a segunda execução não muda nada e não dá erro;
  - sem `claude` no `PATH`, relata e não falha;
  - `install` recusa com saída diferente de zero e mostra o comando novo.

**Prior art:**

- Seções de `protect-dotenv` e `git-guardrails` do `test/run.sh` atual: fonte dos casos a portar.
- Seções "CLI: ..." do `test/run.sh`: mesmo estilo para os testes da limpeza (rodar o CLI contra arquivos temporários e conferir o JSON).
- Exemplo de chamada de ferramenta da documentação de mods: formato de teste do plugin.

## Out of Scope

- Migrar o hook `statusline-reset` da skill `setup-statusline`. Está registrado em `TODO.md`.
- Revisar ou ampliar as regras do git-guard e do dotenv-guard (por exemplo, cobrir Grep e Glob).
- Notificação visual e toast ao terminar a tarefa, e o `notify-attention`.
- Usar o player de áudio próprio do mod em vez de `paplay`/PowerShell.
- Suporte a `claude -p`, ao app desktop e à extensão VS Code.
- Instalação por projeto.
- Sincronizar os toggles entre PCs.
- Embutir a skill caveman no plugin.
- Renomear o repo para "mods". O usuário fará isso depois, e o GitHub redireciona o endereço antigo.
- Atualizar o repo de skills (seção "Hooks" do README e guias `docs/guides/*/caveman.md`). Vai num PR separado lá, logo após o Release B.
- Arquivar o repo `claude-notification`. É um passo manual depois da limpeza.

## Further Notes

- No PC de desenvolvimento, `~/.claude/hooks-lib/` está vazia e o `git-guardrails` não está instalado: hoje o `.env` não está protegido e o som não toca. A migração corrige isso, mas o risco existe até a troca.
- Em cada PC, a troca é:
  1. `npx @c0nant/claude-hooks@latest uninstall --dry-run` para conferir;
  2. o mesmo comando sem `--dry-run`;
  3. `/plugin install conan-mods --marketplace C0nanT/claude-hooks`.
- Para desenvolver localmente, rodar o plugin pela pasta do repo com `claude --plugin-dir`, ou adicionar a pasta como marketplace local para ter recarga com `/reload-plugins`.
- Não foi confirmado se o texto de status de um mod convive com uma linha de status própria. Por isso o indicador usa a faixa acima do prompt.
