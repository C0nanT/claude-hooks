# 05: ctx coloured by the rate-limit thresholds

> **Difficulty:** Light: **suggested model:** Sonnet (Claude Code) / Sonnet (Cursor). Suggestion only, use whatever model you have to hand.

**Spec:** ../SPEC.md

**What to build:** In the coloured status band, the `ctx` segment follows the same thresholds and theme colours as the rate limit: green (`success`) under 50%, yellow (`warning`) from 50 to 79%, red (`error`) from 80%. Both segments share one threshold function so they can't drift apart. The plain line (statusline-color off) is unchanged.

**Seams:**
- Plugin events through `claude-code/testing` (`$.session.measure`, `$.ui.mount` of AbovePrompt), asserting the `ctx` segment's `color` prop.
- Direct tests of the statusline rules module.

**Blocked by:** None (can start immediately)

Status: ready-for-human

- [x] `ctx` at 49%, 50%, 79% and 80% is drawn `success`, `warning`, `warning`, `error`.
- [x] Rate limit and ctx use one shared threshold function.
- [x] The plain line text is unchanged.
- [x] README's statusline-color row mentions the ctx colours.
- [x] `claude plugin validate .` and `claude plugin test .` pass.
