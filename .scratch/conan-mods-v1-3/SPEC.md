# conan-mods v1.3: guards mais precisos, painel, statusline

Status: ready-for-agent

## Problem Statement

Usando o `conan-mods` 1.2.0 no dia a dia, apareceram cinco atritos:

- O `secret-guard` falha aberto quando não consegue ler `HOME`: as regras ancoradas na home (`~/.ssh`, `~/.aws/credentials`, `~/.docker/config.json`, `~/.config/gh/hosts.yml`, gcloud, azure) deixam de bater e a chamada passa. Todo outro erro dos guards bloqueia; esse não.
- Os guards de Bash (`git-guard`, `dotenv-guard`, `secret-guard`, `rm-guard`) leem o comando inteiro como texto. Texto que não é executado dispara bloqueio: código passado a `node -e`, o corpo de um heredoc que grava um arquivo, uma mensagem de commit que menciona `git push` ou `.env`. Nesta sessão o Claude foi bloqueado escrevendo código com `row.key` e uma mensagem de commit.
- `/conan-mods` sem argumento deveria abrir um painel com um botão por função. No terminal só aparece a lista em texto.
- Na statusline colorida, só o rate limit muda de cor. O contexto enchendo não chama atenção.
- O effort só aparece depois do primeiro turno, porque o engine só informa o effort no `turn.step`. Ao abrir a sessão, a linha mostra o modelo sem effort, embora o banner do Claude Code já diga "with high effort".

Além disso, os cinco handlers de guard em `register.ts` repetem o mesmo bloco `.catch` que bloqueia em caso de erro, cada um com sua mensagem.

## Solution

- O `secret-guard` passa a bloquear quando `HOME` está vazio ou não pode ser lido e o caminho ou comando poderia bater numa regra da home.
- Os guards de Bash passam a analisar só o texto que o shell executa. Ficam de fora: o corpo de heredoc que vai para um arquivo ou para um programa que não é shell, a mensagem de commit (`-m`, `--message`, `-F -` com heredoc) e o código passado a interpretadores com `-e`/`-c` (`node -e`, `python -c`, etc.). Um heredoc ou pipe que alimenta um shell (`bash`, `sh`, `zsh`, `bash -c`, `sh -c`, `eval`) continua sendo analisado, então `bash <<EOF` não vira brecha.
- O painel do `/conan-mods` abre no terminal. Se não puder abrir, o usuário vê um aviso explicando o motivo, em vez de só a lista em silêncio.
- O `ctx` da statusline colorida usa os mesmos limiares do rate limit: verde abaixo de 50%, amarelo de 50 a 79%, vermelho a partir de 80%.
- Até o primeiro turno, o effort vem do `~/.claude/settings.json` do usuário: `modelSettings[<modelo>].effortLevel` e, sem ele, o `effortLevel` geral. Quando o primeiro turno chega, o valor do turno vence.
- Os guards passam a usar um helper compartilhado para o bloqueio em caso de erro, sem mudar o comportamento visível.

## User Stories

1. As a user, I want the secret-guard to block reading `~/.ssh/id_ed25519` even when `HOME` cannot be read, so that a broken environment never opens a hole in the guard.
2. As a user, I want the secret-guard deny message in that case to say that HOME could not be read, so that I understand why the call was blocked.
3. As a user, I want rules that don't depend on HOME (`id_rsa`, `.npmrc`, extension rules) to keep working when HOME is missing, so that the guard stays as strong as possible.
4. As a user, I want files outside any home-anchored rule (e.g. `/project/README.md`) to keep passing when HOME is missing, so that a missing HOME doesn't block ordinary work.
5. As Claude, I want to write code with `node -e '...row.key...'` without the secret-guard blocking me, so that I can work on JavaScript without false positives.
6. As Claude, I want to write a file with `cat > file <<'EOF' ... EOF` whose body mentions `.env`, `id_rsa` or `git push`, so that writing docs or code about those topics isn't blocked.
7. As Claude, I want to commit with a message that mentions `git push`, `.env` or `rm -rf`, so that commit messages describing guard work aren't blocked.
8. As a user, I want `bash <<EOF` followed by `cat ~/.ssh/id_rsa` to stay blocked, so that a heredoc can't be used to slip a command past the guards.
9. As a user, I want `sh -c 'git push'`, `bash -c '...'` and `eval '...'` to stay analysed, so that wrapping a command in a shell doesn't bypass the guards.
10. As a user, I want `echo 'cat ~/.ssh/id_rsa' | bash` to stay blocked, so that piping text into a shell doesn't bypass the guards.
11. As a user, I want `git push` itself, outside any message, to stay blocked by the git-guard, so that the relaxation only touches inert text.
12. As a user, I want `git commit -m "..." && git push` to stay blocked because of the `git push` after `&&`, so that chaining a real push after a commit is still caught.
13. As a user, I want `python -c`, `node -e`, `ruby -e` and `perl -e` code to be treated as inert, so that inline scripts behave like heredoc bodies.
14. As a user, I want a heredoc that feeds `python`, `node` or another non-shell program to be treated as inert, so that inline scripts via heredoc aren't blocked.
15. As a user, I want the rm-guard to still block `rm -rf /` written as a real command, even if the same line also contains a heredoc, so that a heredoc anywhere in the line doesn't disable the guard for the rest.
16. As a user, I want a malformed or unterminated heredoc to be analysed as a whole, so that a parsing failure fails closed.
17. As a user, I want `/conan-mods` with no argument to open the conan-mods pane in the terminal, so that I can switch functions with buttons.
18. As a user, I want a visible notice when the pane cannot open, saying why, so that I know whether it's my terminal or a bug.
19. As a user, I want the text list to keep coming in the reply, so that the transcript still records the state.
20. As a user, I want the `ctx` segment green under 50%, yellow from 50 to 79% and red from 80%, so that I notice the context filling up.
21. As a user, I want the `ctx` and rate-limit thresholds to be the same, so that the colours mean the same thing everywhere.
22. As a user, I want the plain line (statusline-color off) to stay plain text, so that nothing changes when I chose no colour.
23. As a user, I want the effort to show as soon as the session opens, read from my saved settings, so that the line is complete from the start.
24. As a user, I want the per-model setting (`modelSettings[<model>].effortLevel`) to win over the general one, so that the line matches the banner.
25. As a user, I want the effort reported by the first turn to replace the saved one, so that a `--effort` flag or a mid-session `/effort` is reflected after the next turn.
26. As a user, I want no effort shown when neither the settings nor a turn give one, and no error when settings.json is missing or invalid, so that a bad file never breaks the line.
27. As a maintainer, I want one shared fail-closed helper for the guards' error path, so that a new guard can't forget to block on error.
28. As a maintainer, I want every guard's error message to stay exactly as it is today, so that the refactor changes no visible behaviour.

## Implementation Decisions

- **HOME fail-closed (secret-guard).** The rules module learns to tell "no HOME" apart from "no match": when `home` is empty, a path or command token that could resolve under a home-anchored rule (starts with `~`, `$HOME`, `${HOME}`, or is absolute and the rule can't be checked) is reported as a match with a dedicated rule/reason, and the deny message names the missing HOME. Paths that only hit HOME-independent rules keep today's behaviour. `register.ts` keeps reading HOME through its helper; the decision stays pure.
- **Inert text extraction.** A new pure module (e.g. `bash-text-rules`) takes a command string and returns the text the shell actually executes, with inert spans removed: heredoc bodies whose command is not a shell, the message argument of `git commit` (`-m`, `--message`, and `-F -`/`--file=-` with a heredoc), and the code argument of interpreter `-e`/`-c` flags for non-shell interpreters. Heredoc bodies and `-c` arguments that go to `bash`, `sh`, `zsh`, `dash`, `ksh` or `eval`, and text piped into a shell, are kept and analysed (the inner text is analysed as a command too). Unterminated heredocs, unbalanced quotes or anything it can't parse return the full command unchanged (fail closed). Each Bash guard calls it once and matches its rules against the result; the guard rules modules themselves don't change their matching.
- **Pane in the terminal.** First investigate why `$.ui.open` doesn't seat the pane from `command.run` in the terminal (the call is wrapped in a `try` that swallows the error). Fix the cause if it's in the plugin (arguments, focus, timing, the reply racing the open). If the engine refuses or defers the pane, show a toast with the reason (`$.ui.open`'s result or `$.ui.panes()` `isPlaced` false) instead of failing silently. The text reply stays.
- **ctx colour.** The tone of the context segment comes from the same threshold function as the rate limit, with new tones for context (or a shared low/mid/high tone family) mapped to the same theme colours (`success`, `warning`, `error`). The plain line is unchanged.
- **Saved effort.** A new `$` helper in `register.ts` reads `~/.claude/settings.json` (path from HOME) once per session; a pure function takes the parsed JSON and the model id and returns `modelSettings[model].effortLevel ?? effortLevel ?? undefined`, ignoring non-string values. `drawStatusLine` uses the turn's effort when present, else the saved one. Project and local settings files and the `--effort` flag are not read.
- **Shared fail-closed helper.** A helper in `register.ts` builds the `.catch` handler for a guard from its name and noun (`command` or `call`), producing exactly today's messages (`<plugin>: <guard> failed, command blocked.` / `call blocked.`). All five guard handlers use it.
- Architecture follows CLAUDE.md: decisions in pure `*-rules.ts` modules taking plain values, every `$` call in helpers declared in `register.ts`.

## Testing Decisions

- A good test fires an event the way Claude Code would and asserts only what the user sees: deny or pass and with which message, the line text, band elements and their colour props, the `/conan-mods` reply and pane. Pure modules are tested directly with plain values.
- Seam: plugin events through `claude-code/testing` (`$.tool.call`, `$.command.run`, `$.session.measure`, `$.ui.mount`), with IO stubbed via `on('fs.read' | 'fs.exists' | 'process.run' | 'session.cwd', …)`, `mock.store`, `mock.env`, `mock.clock`.
- Seam: direct tests of the pure rules modules (the new inert-text module, secret-guard rules, statusline rules, the saved-effort reader).
- Modules tested: secret-guard (HOME missing), each Bash guard against the inert-text cases (allowed and still-blocked lists from the user stories, including the bypass attempts in stories 8–12 and 15–16), the pane open path, statusline colour for ctx, effort from settings vs turn, and the unchanged error messages of every guard.
- Prior art: `hooks/secret-guard.test.ts` (BLOCKED/ALLOWED lists, `fs.exists` stub), `hooks/rm-guard.test.ts` (`session.cwd` stub), `hooks/statusline.test.ts` (`world()` and band mount with `props.color`), `hooks/panel.test.ts` (pane mount and button press), `hooks/statusline-rules.test.ts`.

## Out of Scope

- Any way for Claude to push or to get one-off permission for a guarded action. The user will never grant Claude push permission and only switches the git-guard off by hand in extreme cases.
- A path allowlist for the rm-guard.
- Statusline configuration through `userConfig` (fields, order, branch icon, thresholds).
- Changes to the `delegate-tickets` or `review-axes` skills.
- Reading effort from project/local settings or the `--effort` flag.

## Further Notes

- The inert-text change is security-sensitive: every relaxation needs a matching still-blocked test for the obvious bypass (shell heredoc, `-c`, `eval`, pipe into a shell, chaining after `&&`/`;`).
- The pane investigation may end in "the engine defers it": then the deliverable is the visible notice, and the cause goes into the ticket's notes.
- Expected release: `feat:` commits → 1.3.0.
