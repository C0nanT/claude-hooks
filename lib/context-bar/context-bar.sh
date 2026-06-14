#!/usr/bin/env bash

CONTEXT_MAX=200000
BAR_WIDTH=30

payload=$(cat 2>/dev/null) || exit 0
transcript=$(printf '%s' "$payload" | jq -r '.transcript_path // empty' 2>/dev/null) || exit 0
[ -z "$transcript" ] && exit 0
[ ! -f "$transcript" ] && exit 0

chars=$(wc -c < "$transcript" 2>/dev/null) || exit 0
tokens=$(( chars / 4 ))
if (( tokens > CONTEXT_MAX )); then tokens=$CONTEXT_MAX; fi
pct=$(( tokens * 100 / CONTEXT_MAX ))

filled=$(( pct * BAR_WIDTH / 100 ))
empty=$(( BAR_WIDTH - filled ))

bar=""
for (( i=0; i<filled; i++ )); do bar+="█"; done
for (( i=0; i<empty; i++ )); do bar+="░"; done

if (( pct >= 80 )); then
  color="\033[31m"
elif (( pct >= 50 )); then
  color="\033[33m"
else
  color="\033[32m"
fi
reset="\033[0m"

free_tokens=$(( CONTEXT_MAX - tokens ))
used_k=$(( tokens / 1000 ))
max_k=$(( CONTEXT_MAX / 1000 ))
free_k=$(( free_tokens / 1000 ))

printf "\n${color}◈ Context  [%s]  %d%%  (~%dk / %dk tokens)  free: ~%dk${reset}\n\n" \
  "$bar" "$pct" "$used_k" "$max_k" "$free_k" >&2
