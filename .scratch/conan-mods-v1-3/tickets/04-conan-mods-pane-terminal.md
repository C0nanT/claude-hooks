# 04: /conan-mods pane opens in the terminal

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** `/conan-mods` with no argument opens the focused conan-mods pane in the terminal, as it was meant to (in real use only the text list shows up; the open is wrapped in a `try` that swallows the failure). Find the cause from the engine's types and docs for `$.ui.open`, `$.ui.panes()` and pane placement, and fix it if it's in the plugin (arguments, focus, timing against the command reply). If the engine refuses or defers the pane, the user sees a toast saying why instead of silence. The text list stays in the reply either way. Record the cause found in this ticket's notes.

**Seams:**
- Plugin events through `claude-code/testing` (`$.command.run`, `$.ui.mount` of the Pane), asserting the reply, the pane rows and the toast.

**Blocked by:** None (can start immediately)

Status: ready-for-agent

- [ ] The cause of the missing pane is identified and written in this ticket under a "Notes" heading.
- [ ] If the cause is in the plugin, it is fixed and a test reproduces the failing path before the fix.
- [ ] When the pane cannot be placed or opening it fails, a toast tells the user why; a test covers it.
- [ ] The reply still carries the `name: on|off` list for every function.
- [ ] Existing pane tests (terminal and vscode) still pass.
- [ ] `claude plugin validate .` and `claude plugin test .` pass.
- [ ] Manual check left for the owner: in a real terminal session, `/conan-mods` opens the pane (or shows the toast).
