#!/usr/bin/env bash
# Build public/soundtrack.mp3 (cue + electrical layer) and run the overlay
# tests. Runs on the build VM; render.sh then renders the picture on the Mac.
set -euo pipefail
cd "$(dirname "$0")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

python3 scene/sfx.py "$work/sfx.wav"
ffmpeg -v error -y -i music/cue.wav -i "$work/sfx.wav" -filter_complex \
  "[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.8[s];[0:a][s]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.75:level=false[m]" \
  -map "[m]" -c:a libmp3lame -b:a 192k public/soundtrack.mp3
ffmpeg -hide_banner -nostats -i public/soundtrack.mp3 -af ebur128=peak=true -f null - 2>&1 | grep -E "^ +(I|Peak):"

node --test js/*.test.mjs
echo SOUNDTRACK_DONE
