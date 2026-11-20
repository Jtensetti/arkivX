#!/usr/bin/env bash
# Keeps rendering until all 365 shorts exist: validate content, render what is missing
# (CONCURRENCY at a time, default 4), make web copies, repeat. New content is picked up
# on the next round.
cd "$(dirname "$0")/.."
mkdir -p renders
# Chrome headless shell renders much faster (BeginFrame capture) when it is available.
HS=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
[ -x "$HS" ] && export PRODUCER_HEADLESS_SHELL_PATH="${PRODUCER_HEADLESS_SHELL_PATH:-$HS}"
while true; do
  if ! node scripts/build-content.mjs > /dev/null; then sleep 60; continue; fi
  todo=$(node -e "console.log(require('./video/batch.json').length)")
  if [ "$todo" = 0 ]; then
    bash scripts/encode-web.sh > /dev/null
    [ "$(ls renders/*.mp4 2>/dev/null | wc -l)" -ge 365 ] && { echo "all 365 rendered"; break; }
    sleep 120; continue
  fi
  echo "$(date +%H:%M) rendering $todo"
  (cd video && npx hyperframes render --batch batch.json --batch-concurrency "${CONCURRENCY:-4}" -o '../renders/{slug}.mp4' > ../research/render.log 2>&1)
  bash scripts/encode-web.sh > /dev/null
  echo "$(date +%H:%M) done: $(ls renders/*.mp4 | wc -l) rendered"
done
