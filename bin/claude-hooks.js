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
  console.log(`claude-hooks — portable Claude Code hook manager

Usage:
  npx @c0nant/claude-hooks install   [hook-name ...]   Install all hooks (or specific ones)
  npx @c0nant/claude-hooks uninstall [hook-name ...]   Remove all hooks (or specific ones)
  npx @c0nant/claude-hooks list                        Show installed hooks

By default manages ~/.claude/settings.json (global).
Set CLAUDE_SETTINGS env var to target a different file.
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
