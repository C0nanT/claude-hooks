#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Running the claude-hooks cleanup..."
bash "$SCRIPT_DIR/uninstall.sh"

echo "==> Removing installed skills..."
rm -rf "$HOME/.agents/skills"
rm -rf "$HOME/.claude/skills"

echo ""
echo "Clean. To reinstall from scratch:"
echo ""
echo "  npx skills@latest add C0nanT/skills"
echo "  /plugin install conan-mods --marketplace C0nanT/claude-hooks  # inside Claude Code"
echo ""
