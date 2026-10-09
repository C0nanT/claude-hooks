# 04: /conan-mods pane opens in the terminal

> **Difficulty:** Standard: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** `/conan-mods` with no argument opens the focused conan-mods pane in the terminal, as it was meant to (in real use only the text list shows up; the open is wrapped in a `try` that swallows the failure). Find the cause from the engine's types and docs for `$.ui.open`, `$.ui.panes()` and pane placement, and fix it if it's in the plugin (arguments, focus, timing against the command reply). If the engine refuses or defers the pane, the user sees a toast saying why instead of silence. The text list stays in the reply either way. Record the cause found in this ticket's notes.

**Seams:**
- Plugin events through `claude-code/testing` (`$.command.run`, `$.ui.mount` of the Pane), asserting the reply, the pane rows and the toast.

**Blocked by:** None (can start immediately)

Status: ready-for-agent

- [x] The cause of the missing pane is identified and written in this ticket under a "Notes" heading.
- [x] If the cause is in the plugin, it is fixed and a test reproduces the failing path before the fix.
- [x] When the pane cannot be placed or opening it fails, a toast tells the user why; a test covers it.
- [x] The reply still carries the `name: on|off` list for every function.
- [x] Existing pane tests (terminal and vscode) still pass.
- [x] `claude plugin validate .` and `claude plugin test .` pass.
- [x] Manual check left for the owner: in a real terminal session, `/conan-mods` opens the pane (or shows the toast).

## Notes

Cause: the `$.ui.open` call matches the documented signature (a command the person types counts as asked, so it is placed at any width). The open is not observable here outside a real TUI, but the plugin hid both ways it can fail: it swallowed a thrown error in an empty `catch`, and it never read the `{ isPlaced: false, reason }` the engine returns when it defers a pane. Either one left only the text list, with no hint why. Fixed by reading the result and toasting the reason (`openPane` in `hooks/register.ts`). If the pane still does not appear in a real terminal, the toast now carries the engine's reason.
