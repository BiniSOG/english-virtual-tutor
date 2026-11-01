#!/usr/bin/env bash
# Records (or reuses cached) Gemini clips for every language and copies them into the app assets.
# Amharic first: with a free-tier key the daily quota may only cover part of the work.
set -euo pipefail
cd "$(dirname "$0")/.."
record() {
  GEMINI_TTS_LANGUAGE="$2" python3 tools/prerecord_gemini.py "brain/build/voice-script/$1.json" "app/src/main/assets/voice/$1" voice-recordings
}
record am "Amharic"
record om "Afaan Oromoo (Oromo)"
record ti "Tigrinya"
record aa "Afar (Qafar af)"
