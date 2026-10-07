# 03: Bash guards ignore inert text

> **Difficulty:** Heavy: **suggested model:** Opus (Claude Code) / Opus or the strongest reasoning model available (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** The four Bash guards (git-guard, dotenv-guard, secret-guard, rm-guard) match their rules only against text the shell executes. A new pure module returns that text from a command, with inert spans removed:

- heredoc bodies whose receiving command is not a shell (`cat > file <<'EOF'`, `python3 - <<EOF`, `node <<EOF`);
- the message of `git commit` (`-m`, `--message`, and `-F -`/`--file=-` fed by a heredoc);
- the code argument of `-e`/`-c` for non-shell interpreters (`node -e`, `python -c`, `ruby -e`, `perl -e`).

Kept and analysed: heredoc bodies, `-c` arguments and piped text that go to a shell (`bash`, `sh`, `zsh`, `dash`, `ksh`, `eval`), and everything outside the inert spans, including commands chained with `&&`, `;`, `|`. Anything the module can't parse confidently (unterminated heredoc, unbalanced quotes) yields the full command unchanged, so it fails closed. Loosening a security boundary: every allowed case needs a matching still-blocked bypass test.

**Seams:**
- Plugin events through `claude-code/testing` (`$.tool.call` with Bash), asserting deny/pass per guard.
- Direct tests of the new inert-text rules module with plain strings.

**Blocked by:** 01 (shared fail-closed helper)

Status: ready-for-agent

- [ ] Allowed: `node -e` code mentioning `row.key`; `cat > notes.md <<'EOF'` with a body mentioning `.env`, `id_rsa`, `git push` and `rm -rf /`; `git commit -m "..."` and `git commit -F - <<EOF` messages mentioning `git push`, `.env` and `rm -rf`; `python3 - <<EOF` with a body mentioning `~/.ssh/id_rsa`.
- [ ] Still blocked: `bash <<EOF` / `sh <<EOF` with a guarded command in the body; `bash -c`, `sh -c` and `eval` with a guarded command; `echo '<guarded command>' | bash`; `git commit -m "x" && git push`; `git commit -m "x"; cat .env`; a guarded command on the same line after a non-shell heredoc ends.
- [ ] An unterminated heredoc or unbalanced quote is analysed as the whole command (a guarded word anywhere still blocks).
- [ ] Each of the four Bash guards uses the extracted text; file-tool guards are unchanged.
- [ ] Every existing guard test still passes.
- [ ] README states, once, that the Bash guards skip heredoc bodies, commit messages and inline interpreter code unless they go to a shell.
- [ ] `claude plugin validate .` and `claude plugin test .` pass.
