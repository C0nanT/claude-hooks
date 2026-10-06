#!/usr/bin/env bash
set -euo pipefail

# Installing hooks into settings.json is no longer supported.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

{
  echo "error: 'install' is no longer supported; hooks now ship as a Claude Code plugin."
  echo "Install it with:"
  echo "  $PLUGIN_INSTALL_CMD"
  echo "Then run 'uninstall' to clean the old hooks out of settings.json."
} >&2
exit 1
