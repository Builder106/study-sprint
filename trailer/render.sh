#!/usr/bin/env bash
# Render the trailer with HyperFrames on the Mac GPU. Output goes outside the
# checkout. Needs public/board.mp4 (scene/blender_board.py) and
# public/soundtrack.mp3 (mix-audio.sh).
set -euo pipefail
cd "$(dirname "$0")"
test -s public/board.mp4
test -s public/soundtrack.mp3
out="${OUT:-$HOME/Library/Caches/hyperframes-renders/study-sprint/closed-circuit.mp4}"
mkdir -p "$(dirname "$out")"

npx --yes hyperframes@0.8.116 lint
npx --yes hyperframes@0.8.116 render --browser-gpu --quality high --strict -o "$out" "$@"
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -show_entries format=duration,size \
  -of compact "$out"
echo "TRAILER_RENDER_DONE $out"
