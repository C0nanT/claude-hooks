# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A marketplace with one Claude Code plugin, `conan-mods`: a mod whose TypeScript hooks run inside Claude Code. Users install it with `/plugin install conan-mods --marketplace C0nanT/claude-hooks` and update with `claude plugin update conan-mods` + `/reload-plugins`. User-facing behaviour (the four functions, `/conan-mods`, the off band) is in `README.md`.

The repo used to be the npm CLI `@c0nant/claude-hooks`, which wrote shell hooks into `settings.json`. That CLI is deprecated, and its last version (a cleanup tool) stays on npm only. Per-PC migration lives in `MIGRATING.md`.

## Commands

```bash
git config core.hooksPath .githooks   # pre-push runs validate + test
claude plugin validate .              # manifests and hooks module
claude plugin test .                  # every hooks/*.test.ts
claude --plugin-dir .                 # run Claude Code with the plugin loaded from this folder
./reset-env.sh                        # dev reset: old npm cleanup (npx @0.4.0) + wipe ~/.agents/skills and ~/.claude/skills
```

`validate` always warns that the root `CLAUDE.md` is not loaded as plugin context. That warning is expected, so CI runs `validate` without `--strict`.

## Architecture

- `hooks/register.ts` is the only hooks module (`hooks/hooks.json`). It wires events to logic and keeps every helper that touches `$` in the same file, because validate only follows `$` into functions declared there.
- Decision logic lives in pure modules (`*-rules.ts`, `toggles.ts`) that `register.ts` calls.
- Toggles: the names are fixed in `TOGGLE_NAMES`. Each value persists per PC in `$.store`, where an absent value means on. A copy is mirrored in `$.state` (typed in `types/index.d.ts`) so the off band redraws immediately.
- Tests fire events the way Claude Code would and assert only visible outcomes: deny or pass and with which message, the sound command's argv, the caveman section, the `/conan-mods` reply, the band text.
- `.claude-plugin/types/` is generated locally and gitignored. CI runs without it.

## Versioning and releases

- Branch/PR: `.github/workflows/test.yml` installs Claude Code and runs validate + test.
- `main`: every push runs `.github/workflows/release.yml`. It runs the same checks, infers the bump from commit messages since the last tag, writes the version to `.claude-plugin/plugin.json` and the `conan-mods` entry in `marketplace.json`, commits `<version> [skip ci]`, and pushes tag `v<version>`. No npm publish. **Never edit either version by hand.**
- Bump rules (full convention in `CONTRIBUTING.md`): `fix:` or no prefix → patch; `feat:` → minor; any `!:` after the type, or a `BREAKING CHANGE` footer → major. The highest bump since the last tag wins.
