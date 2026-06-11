#!/usr/bin/env bash

TITLE="Claude Code"
MSG="Tarefa concluída ✅"
MSG_WSL="Tarefa concluida"
SOUND_PRIMARY="/usr/share/sounds/freedesktop/stereo/complete.oga"
SOUND_FALLBACK="/usr/share/sounds/freedesktop/stereo/bell.oga"
BEEPS=(523 120 659 120 784 180)

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
