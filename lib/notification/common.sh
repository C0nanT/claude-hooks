#!/usr/bin/env bash

STATE_DIR="${XDG_RUNTIME_DIR:-/tmp}/claude-notification"
DEBOUNCE_SECONDS=2

is_wsl() {
  grep -qi microsoft /proc/version 2>/dev/null || [ -n "${WSL_DISTRO_NAME:-}" ]
}

setup_display() {
  export DISPLAY="${DISPLAY:-:0}"
  export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=/run/user/$(id -u)/bus}"
}

deduplicate_or_exit() {
  command -v jq >/dev/null 2>&1 || return 0

  local payload session_id event key state_file now last
  payload=$(cat)
  session_id=$(printf '%s' "$payload" | jq -r '.session_id // empty' 2>/dev/null)
  event=$(printf '%s' "$payload" | jq -r '.hook_event_name // empty' 2>/dev/null)

  if [ -n "$session_id" ] && [ -n "$event" ]; then
    mkdir -p "$STATE_DIR" 2>/dev/null
    key=$(printf '%s-%s' "$session_id" "$event" | tr -c 'a-zA-Z0-9-' '_')
    state_file="$STATE_DIR/$key.ts"
    now=$(date +%s)
    if [ -f "$state_file" ]; then
      last=$(cat "$state_file" 2>/dev/null || echo 0)
      if [ $((now - last)) -lt $DEBOUNCE_SECONDS ]; then
        exit 0
      fi
    fi
    echo "$now" > "$state_file"
  fi
}

notify_wsl() {
  local title="$1" body="$2"
  shift 2
  local beeps=("$@")

  local beep_cmds=""
  while [ ${#beeps[@]} -ge 2 ]; do
    beep_cmds+="[Console]::Beep($( printf '%s' "${beeps[0]}"), $( printf '%s' "${beeps[1]}"));"
    beeps=("${beeps[@]:2}")
  done

  powershell.exe -WindowStyle Hidden -Command "
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    \$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    \$template.SelectSingleNode('//text[@id=1]').InnerText = '$title'
    \$template.SelectSingleNode('//text[@id=2]').InnerText = '$body'
    \$toast = [Windows.UI.Notifications.ToastNotification]::new(\$template)
    \$toast.ExpirationTime = [DateTimeOffset]::Now.AddSeconds(2)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Claude Code').Show(\$toast)
    $beep_cmds
  " &
}

notify_linux() {
  local title="$1" body="$2"
  command -v notify-send >/dev/null 2>&1 || return 1
  notify-send -t 2000 "$title" "$body"
}

play_sound() {
  local primary="${1:-}" fallback="${2:-}"
  if command -v paplay >/dev/null 2>&1; then
    { [ -n "$primary" ] && paplay --volume=32768 "$primary" 2>/dev/null; } \
      || { [ -n "$fallback" ] && paplay --volume=32768 "$fallback" 2>/dev/null; } \
      || true
  elif command -v aplay >/dev/null 2>&1; then
    aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true
  fi
}
