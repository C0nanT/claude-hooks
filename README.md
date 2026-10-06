# claude-hooks

> **Deprecated.** The hooks now ship as the Claude Code plugin `conan-mods`.
> This package's last version is only a **cleanup tool**: it removes everything
> older versions put in `~/.claude/settings.json` and on disk.

## Migrating a PC

On every PC that had the old hooks, run **one at a time**:

1. `npx @c0nant/claude-hooks@0.4.0 uninstall --dry-run` (preview, writes nothing);
2. `npx @c0nant/claude-hooks@0.4.0 uninstall`;
3. `/plugin install conan-mods --marketplace C0nanT/claude-hooks`, inside Claude Code.

> **Heads-up:** step 3 only works once the plugin release (Release B) is out on
> this repo's `main`. Until then the marketplace has no `conan-mods` plugin and
> the command fails.

**Pin `@0.4.0`:** `0.3.0` and older are the old installer, whose `uninstall`
ignores `--dry-run` and also deletes `statusline-reset`. The full checklist,
what to look for in the report, and how to recover if an old version ran are in
[MIGRATING.md](MIGRATING.md).

Requires Node ≥18 and `jq` (Ubuntu/WSL: `sudo apt-get install -y jq`).
## What the cleanup removes

- **`~/.claude/settings.json`:** the 5 hooks this project installed, each by its
  exact marker (`# claude-hook:caveman`, `git-guardrails`, `protect-dotenv`,
  `notify-attention`, `notify-done`), plus the previous-generation hooks
  (`conan-caveman-autostart`, `conan-git-guardrails`, `block-dangerous-git`).
  Emptied groups and events are pruned; the rest of the file is left intact.
  Hooks from other projects that share the `claude-hook:` marker (such as
  `statusline-reset`) are **not** touched.
- **Script folders:** `git-guardrails`, `notification` and `protect-dotenv` in
  `~/.claude/hooks-lib/`, and the folder itself if left empty.
- **Notification control files:** `$XDG_RUNTIME_DIR/claude-notification/`
  (or `/tmp/claude-notification/`).
- **Previous-generation scripts:** `conan-git-guardrails.sh` and
  `block-dangerous-git.sh` in `~/.claude/hooks/`, and the folder if left empty.
- **Old plugin:** `claude-notification` and its marketplace, via
  `claude plugin uninstall` / `claude plugin marketplace remove`. If `claude`
  is not on `PATH` or the plugin is not installed, the report says so and the
  run continues.

The report lists each item as removed, does not exist or failed, and shows any
command still carrying a `claude-hook:` marker. Running it again is safe.

## Commands

```bash
npx @c0nant/claude-hooks@0.4.0 uninstall --dry-run   # preview the cleanup
npx @c0nant/claude-hooks@0.4.0 uninstall             # run the cleanup
npx @c0nant/claude-hooks@0.4.0 list                  # old hooks still in settings.json
npx @c0nant/claude-hooks@0.4.0 install               # refuses; prints the plugin command
```

Always targets `~/.claude/settings.json` (resolved from `HOME`).
`CLAUDE_SETTINGS` is no longer supported.

## Development

### Setup

```bash
git config core.hooksPath .githooks   # pre-push runs tests
bash test/run.sh                      # requires jq
```

No `npm install` — zero runtime dependencies beyond Node ≥18 and `jq`.

### Day-to-day workflow

| Where you push | What happens |
|----------------|--------------|
| Branch or PR | CI runs `test/run.sh` only — no version bump, no npm publish |
| `main` | CI runs tests → bumps version → publishes to npm |

### Releasing

Fully automatic — CI decides the bump (patch/minor/major) from your commit
messages since the last tag and publishes on every push to `main`:

```
push to main → tests → detect bump from commits → version bump → tag → npm publish
```

**Never bump `package.json` manually.** The bump type is driven entirely by
commit message prefixes — see [CONTRIBUTING.md](CONTRIBUTING.md) for the
convention (`fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE` →
major). `./release.sh` still exists as a manual escape hatch.

Requires `NPM_TOKEN` in GitHub Actions secrets.

The whole package is deprecated on npm (done from the npm website, so the
message is the generic "Package no longer supported"). `npx` prints that
warning and still runs the cleanup.

### Plugin (`conan-mods`) local development

The plugin work lives on the `mods` branch and only reaches `main` at the
migration's final ticket (a push to `main` publishes).

```bash
claude --plugin-dir .          # load the plugin from this folder
claude plugin validate .       # manifest, marketplace and hooks module
claude plugin test .           # runs hooks/*.test.ts
```

Or add the folder as a local marketplace to get `/reload-plugins`:
`claude plugin marketplace add .` then `/plugin install conan-mods`.
