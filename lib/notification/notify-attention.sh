#!/usr/bin/env bash

TITLE="Claude Code"
MSG="Aguardando sua atenção 👀"
MSG_WSL="Aguardando sua atencao"
SOUND_PRIMARY="/usr/share/sounds/freedesktop/stereo/bell.oga"
SOUND_FALLBACK="/usr/share/sounds/freedesktop/stereo/message.oga"
BEEPS=(659 180 880 250)

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

deduplicate_or_exit

if is_wsl; then
  notify_wsl "$TITLE" "$MSG_WSL" "${BEEPS[@]}"
  exit 0
fi

setup_display
notify_linux "$TITLE" "$MSG"
play_sound "$SOUND_PRIMARY" "$SOUND_FALLBACK"

exit 0
