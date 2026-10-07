# 06: Effort shown from the saved settings until the first turn

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** The status line shows the effort as soon as the session opens. Until a main-loop turn reports its effort, the effort comes from the user's `~/.claude/settings.json`: `modelSettings[<current model>].effortLevel`, else the top-level `effortLevel`. The file is read once per session through a helper in the hooks module; a pure function takes the parsed settings and the model id and returns the level (non-string values ignored). Once a turn reports its effort, that value wins. A missing, unreadable or invalid settings file means no effort, never an error. Project/local settings and the `--effort` flag are not read.

**Seams:**
- Plugin events through `claude-code/testing` (`$.session.start`, `$.session.measure`, `$.turn.step`), with `fs.read` stubbed for the settings file, asserting the line text.
- Direct tests of the pure settings-effort function.

**Blocked by:** None (can start immediately)

Status: ready-for-agent

- [ ] At session start, with `modelSettings` giving `high` for the current model and top-level `medium`, the line shows `[High]`.
- [ ] With no per-model entry, the top-level `effortLevel` is used.
- [ ] After a turn reports `max`, the line shows `[Max]` even though the settings say `high`.
- [ ] Missing, unreadable or invalid JSON settings: the model shows without effort and nothing throws.
- [ ] The settings file is read at most once per session.
- [ ] README's statusline row no longer says the effort only appears after the first turn; it says where the effort comes from.
- [ ] `claude plugin validate .` and `claude plugin test .` pass.
