# 01: Shared fail-closed helper for the guards

> **Difficulty:** Light: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** Prefactor. Every guard handler (git-guard, dotenv-guard file and Bash, secret-guard file and Bash, rm-guard) builds its error path from one shared fail-closed helper instead of repeating the `.catch` block. Nothing visible changes: when a guard throws before calling `next`, the call is denied with exactly today's message (`<plugin>: <guard> failed, command blocked.` for Bash, `call blocked.` for file tools); after `next` was called, the result passes through.

**Seams:**
- Plugin events through `claude-code/testing` (`$.tool.call`), asserting deny/pass and the message.

**Blocked by:** None (can start immediately)

Status: ready-for-agent

- [ ] One helper in the hooks module builds the fail-closed `.catch` handler from the guard name and the noun (`command`/`call`).
- [ ] All five guard handlers use it; no guard keeps its own inline `.catch` body.
- [ ] Each guard's error message is byte-for-byte what it was before; a test per guard forces an error (e.g. an unreadable store) and asserts the exact message.
- [ ] `claude plugin validate .` and `claude plugin test .` pass.
