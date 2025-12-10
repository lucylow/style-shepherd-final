#!/usr/bin/env bash
set -e
echo "Ensuring demo mock files exist..."

# create data dir
mkdir -p data
MOCK=data/raindrop-mock.json
if [ ! -f "$MOCK" ]; then
  cat > "$MOCK" <<JSON
{
  "memories": [],
  "buckets": {}
}
JSON
  echo "Created $MOCK"
else
  echo "$MOCK exists"
fi

# ensure public mock audio
mkdir -p public/mock
DEMO_AUDIO=public/mock/demo_voice.mp3
if [ ! -f "$DEMO_AUDIO" ]; then
  # create a tiny silent mp3 (1 sec) if ffmpeg not available - include base64 audio or a placeholder text file and instruct judges to replace
  echo "Demo audio missing: please add a short mp3 to $DEMO_AUDIO OR set ELEVENLABS_API_KEY for live TTS."
  # you could generate a small beep here if you include base64
else
  echo "$DEMO_AUDIO exists"
fi
