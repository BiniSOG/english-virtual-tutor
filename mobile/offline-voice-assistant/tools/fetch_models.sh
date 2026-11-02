#!/usr/bin/env bash
# Downloads / exports every offline model and the sherpa-onnx Android native libraries into the
# app. Needs internet once (the app itself never does). Used by the GitHub Actions workflow.
#
#   ./tools/fetch_models.sh            # from mobile/offline-voice-assistant
#
set -euo pipefail
cd "$(dirname "$0")/.."

SHERPA_VERSION="${SHERPA_VERSION:-2.0.1}"
CACHE=".models-cache"
ASSETS="app/src/main/assets/models"
JNI="app/src/main/jniLibs"
REL="https://github.com/k2-fsa/sherpa-onnx/releases/download"
mkdir -p "$CACHE" "$ASSETS"/{asr-en,asr-am,vad,tts-am} "$JNI"

fetch() { # url -> cache file
  local url="$1" out="$CACHE/$(basename "$1")"
  if [ ! -s "$out" ]; then
    echo "downloading $url" >&2
    curl -fL --retry 5 --retry-delay 5 -o "$out.part" "$url"
    mv "$out.part" "$out"
  fi
  echo "$out"
}

# ---- sherpa-onnx native libraries (must match the Kotlin API in app/src/main/java/com/k2fsa) ----
auth=()
[ -n "${GITHUB_TOKEN:-}" ] && auth=(-H "Authorization: Bearer $GITHUB_TOKEN")
assets_json=$(curl -fsSL "${auth[@]}" "https://api.github.com/repos/k2-fsa/sherpa-onnx/releases/tags/v${SHERPA_VERSION}")
echo "$assets_json" | python3 -c "import json,sys; [print('  asset:', a['name']) for a in json.load(sys.stdin)['assets'] if 'android' in a['name']]"
android_url=$(echo "$assets_json" | python3 -c "
import json, re, sys
assets = json.load(sys.stdin)['assets']
names = [a for a in assets if re.fullmatch(r'sherpa-onnx-v?[0-9.]+-android\.tar\.bz2', a['name'])]
if not names:
    names = [a for a in assets if a['name'].endswith('.tar.bz2') and 'android' in a['name']
             and not re.search(r'rknn|qnn|ascend|static|apk|tts|asr|vad|kws|so-', a['name'])]
print(names[0]['browser_download_url'])
")
lib_tar=$(fetch "$android_url")
rm -rf "$CACHE/android-libs" && mkdir -p "$CACHE/android-libs"
tar xjf "$lib_tar" -C "$CACHE/android-libs"
# x86_64 is only packaged into the emulator test build (-PwithX86=true), not the phone APK.
for abi in arm64-v8a armeabi-v7a x86_64; do
  src=$(find "$CACHE/android-libs" -type d -name "$abi" | head -n1)
  if [ -z "$src" ]; then
    [ "$abi" = x86_64 ] && { echo "no x86_64 libs (emulator test will rely on ARM translation)"; continue; }
    echo "no $abi libs in $lib_tar"; exit 1
  fi
  mkdir -p "$JNI/$abi"
  cp "$src"/*.so "$JNI/$abi/"
  ls -la "$JNI/$abi"
done

# ---- English streaming ASR (Zipformer transducer, 20M params) ----
f=$(fetch "$REL/asr-models/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17.tar.bz2")
tar xjf "$f" -C "$CACHE"
d="$CACHE/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17"
cp "$d/encoder-epoch-99-avg-1.int8.onnx" "$ASSETS/asr-en/encoder.onnx"
cp "$d/decoder-epoch-99-avg-1.onnx" "$ASSETS/asr-en/decoder.onnx"
cp "$d/joiner-epoch-99-avg-1.int8.onnx" "$ASSETS/asr-en/joiner.onnx"
cp "$d/tokens.txt" "$ASSETS/asr-en/tokens.txt"

# ---- Amharic (multilingual) ASR: Meta Omnilingual ASR 300M CTC, int8 ----
OMNI="sherpa-onnx-omnilingual-asr-1600-languages-300M-ctc-int8-2025-11-12"
f=$(fetch "$REL/asr-models/$OMNI.tar.bz2")
tar xjf "$f" -C "$CACHE"
cp "$CACHE/$OMNI/model.int8.onnx" "$ASSETS/asr-am/model.onnx"
cp "$CACHE/$OMNI/tokens.txt" "$ASSETS/asr-am/tokens.txt"
# Only Ge'ez, Latin and digits may come out (stops Amharic being written in Arabic script etc.).
python3 tools/restrict_ctc_vocab.py "$ASSETS/asr-am/model.onnx" "$ASSETS/asr-am/tokens.txt"

# ---- Voice activity detection ----
cp "$(fetch "$REL/asr-models/silero_vad.onnx")" "$ASSETS/vad/silero_vad.onnx"

# ---- Amharic voice: Meta MMS VITS exported for sherpa-onnx, 8-bit to keep the app small ----
# (English is spoken by the phone's own offline voice, so no English model is bundled.)
if [ ! -s "$ASSETS/tts-am/model.onnx" ]; then
  python3 tools/export_mms_tts.py --lang amh --language-name Amharic --int8 --out "$ASSETS/tts-am"
fi
rm -rf "$ASSETS/tts-en"

du -sh "$ASSETS"/* "$JNI"/*
