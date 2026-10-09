# 02: secret-guard blocks when HOME is missing

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** When HOME is empty or cannot be read, the secret-guard no longer fails open on the home-anchored rules (`~/.ssh`, `~/.aws/credentials`, `~/.config/gcloud`, `~/.azure`, `~/.docker/config.json`, `~/.config/gh/hosts.yml`). A file-tool path or Bash token that starts with `~`, `$HOME` or `${HOME}`, or an absolute path the guard can no longer check against those rules, is denied with a message saying HOME could not be read. Rules that don't depend on HOME (`id_rsa` and friends, `.npmrc`/`.pypirc`/`.netrc`/`.git-credentials`, extension rules) behave as today, and ordinary files keep passing. The decision lives in the pure secret-guard rules; the hooks module only reads HOME.

**Seams:**
- Plugin events through `claude-code/testing` (`$.tool.call` for Read/Edit/Write/MultiEdit and Bash), with HOME stubbed empty or failing via `mock.env`.
- Direct tests of the secret-guard rules module with plain values.

**Blocked by:** 01 (shared fail-closed helper)

Status: ready-for-human

- [x] With HOME empty, `Read ~/.ssh/id_ed25519` and `cat $HOME/.aws/credentials` are denied with a message naming the missing HOME.
- [x] With HOME unreadable (the env read throws), the same calls are denied.
- [x] With HOME missing, `Read /project/README.md` and `echo hello` still pass.
- [x] With HOME missing, HOME-independent rules (`id_rsa`, `.npmrc`, an existing key file) still deny with their usual rule.
- [x] With HOME set, every existing secret-guard test still passes unchanged.
- [x] README's secret-guard row mentions that a missing HOME blocks.
- [x] `claude plugin validate .` and `claude plugin test .` pass.
