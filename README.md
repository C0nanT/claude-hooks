# claude-hooks → `conan-mods`

A Claude Code plugin (a mod: TypeScript hooks that run inside Claude Code) with
five functions:

| Function | What it does |
|---|---|
| `caveman` | Adds `~/.claude/skills/caveman/SKILL.md` to the session instructions. If the skill is missing, warns once per session with `npx skills@latest add C0nanT/skills`. |
| `git-guard` | Blocks destructive git commands (`push`, `reset --hard`, `clean -f`, `branch -D`, `checkout .`, `restore .`, `rm`), even with global options before the subcommand. |
| `dotenv-guard` | Blocks reading or editing `.env` / `.env.*` through Read, Edit, Write, MultiEdit and Bash. `.env.example`, `.env.sample`, `.env.dist` and `.env.template` stay allowed. |
| `secret-guard` | Blocks reading or editing credential files through Read, Edit, Write, MultiEdit and Bash: `~/.ssh/*` (except `known_hosts`, `config` and `*.pub`), `id_rsa`/`id_dsa`/`id_ecdsa`/`id_ed25519`, `~/.aws/credentials`, `~/.config/gcloud/`, `~/.azure/`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `.npmrc`, `.pypirc`, `.netrc`, `.git-credentials`, `~/.docker/config.json` and `~/.config/gh/hosts.yml`. |
| `sound` | Plays a sound when Claude finishes a task: `paplay` on Ubuntu, PowerShell beeps on WSL. No visual notification. |

## Install

Inside Claude Code:

```
/plugin install conan-mods --marketplace C0nanT/claude-hooks
```

Install it in the user (global) scope. It needs no npm, `jq` or `settings.json`
edits.

**Coming from the old npm hooks?** Run the cleanup first on that PC, or the old
hooks run twice alongside the plugin. See [MIGRATING.md](MIGRATING.md).

## Update

```bash
claude plugin update conan-mods
```

Then run `/reload-plugins` inside any open session.

## `/conan-mods`

Everything starts **on**. The choice persists across sessions on the same PC.

```
/conan-mods                  # list each function with on/off
/conan-mods git-guard off    # switch one off, effective immediately
/conan-mods git-guard on
```

Valid names: `caveman`, `git-guard`, `dotenv-guard`, `secret-guard`, `sound`. Anything else
prints the usage.

### The off band

While any function is off, a one-line band above the prompt lists what is off,
in a fixed order:

```
⚠ off: git-guard · caveman
```

It disappears when everything is back on.

## Development

### Layout

```
.claude-plugin/plugin.json        # plugin manifest (version is written by CI)
.claude-plugin/marketplace.json   # marketplace with the single conan-mods entry
hooks/hooks.json                  # loads hooks/register.ts
hooks/register.ts                 # wires every event to the modules below
hooks/*-rules.ts, hooks/toggles.ts  # pure decision logic
hooks/*.test.ts                   # plugin tests
types/index.d.ts                  # types for the plugin's stored state
```

### Setup and local run

```bash
git config core.hooksPath .githooks   # pre-push validates and tests the plugin
claude --plugin-dir .                 # load the plugin from this folder
claude plugin validate .              # manifest, marketplace and hooks module
claude plugin test .                  # runs hooks/*.test.ts
```

To get `/reload-plugins` while editing, add the folder as a local marketplace:
`claude plugin marketplace add .` then `/plugin install conan-mods`.

### Releasing

| Where you push | What happens |
|----------------|--------------|
| Branch or PR | CI installs Claude Code and runs `claude plugin validate` + `claude plugin test` |
| `main` | Same checks → detect bump from commits → write the version to `plugin.json` and the marketplace entry → commit `[skip ci]` → tag `v<version>` |

Nothing is published to npm. The version is never edited by hand: the bump
comes from commit prefixes (`fix:` → patch, `feat:` → minor, `feat!:` /
`BREAKING CHANGE` → major). See [CONTRIBUTING.md](CONTRIBUTING.md).

### The old npm package

`@c0nant/claude-hooks` is deprecated on npm. Its last version (`0.4.x`) is only
a cleanup tool for the old hooks, and its source was removed from this repo at
the plugin release. [MIGRATING.md](MIGRATING.md) has the per-PC steps.
