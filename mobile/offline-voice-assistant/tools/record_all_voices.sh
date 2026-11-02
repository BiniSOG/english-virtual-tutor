#!/usr/bin/env bash
# Records (or reuses cached) Gemini clips for the Amharic voice and copies them into the app assets.
set -euo pipefail
cd "$(dirname "$0")/.."
GEMINI_TTS_LANGUAGE="Amharic" python3 tools/prerecord_gemini.py brain/build/voice-script/am.json app/src/main/assets/voice/am voice-recordings
