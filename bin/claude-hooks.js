#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = {
  install:   path.join(ROOT, 'install.sh'),
  uninstall: path.join(ROOT, 'uninstall.sh'),
  list:      path.join(ROOT, 'list.sh'),
};

const [,, cmd, ...args] = process.argv;

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(`claude-hooks — cleanup tool for the old claude-hooks settings.json hooks

Usage:
  npx @c0nant/claude-hooks uninstall [--dry-run]   Remove the 5 old hooks from ~/.claude/settings.json
  npx @c0nant/claude-hooks list                    Show what uninstall would remove
  npx @c0nant/claude-hooks install                 No longer supported (prints the plugin command)

Always targets ~/.claude/settings.json (resolved from HOME).
Replacement: /plugin install conan-mods --marketplace C0nanT/claude-hooks
`);
  process.exit(0);
}

const script = SCRIPTS[cmd];
if (!script) {
  console.error(`Unknown command: ${cmd}. Use install, uninstall, or list.`);
  process.exit(1);
}

try {
  execFileSync('bash', [script, ...args], { stdio: 'inherit' });
} catch (err) {
  process.exit(err.status ?? 1);
}
