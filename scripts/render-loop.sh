#!/usr/bin/env bash
# Keeps rendering until all 365 shorts exist: validate content, render what is missing
# (3 at a time), make web copies, repeat. New content files are picked up on the next round.
cd "$(dirname "$0")/.."
mkdir -p renders
while true; do
  if ! node scripts/build-content.mjs > /dev/null; then sleep 60; continue; fi
  todo=$(node -e "console.log(require('./video/batch.json').length)")
  if [ "$todo" = 0 ]; then
    bash scripts/encode-web.sh > /dev/null
    [ "$(ls renders/*.mp4 2>/dev/null | wc -l)" -ge 365 ] && { echo "all 365 rendered"; break; }
    sleep 120; continue
  fi
  echo "$(date +%H:%M) rendering $todo"
  (cd video && npx hyperframes render --batch batch.json --batch-concurrency 3 -o '../renders/{slug}.mp4' > ../research/render.log 2>&1)
  bash scripts/encode-web.sh > /dev/null
  echo "$(date +%H:%M) done: $(ls renders/*.mp4 | wc -l) rendered"
done
