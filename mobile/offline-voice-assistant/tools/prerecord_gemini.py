#!/usr/bin/env python3
"""
Pre-records the assistant's Amharic voice with Gemini text-to-speech, at build time.

    GEMINI_API_KEY=... python tools/prerecord_gemini.py brain/build/voice-script/am.json \
        app/src/main/assets/voice/am voice-recordings

Reads the recording script exported by `gradle :brain:exportVoiceScript`, records every clip that
is not already cached, and copies the clips plus an index.json into the app's assets. The app
then plays these clips fully offline. Without a key (or when the quota runs out) the script
keeps whatever is cached and exits successfully; the app uses its offline voice for the rest.

Env: GEMINI_API_KEY, GEMINI_TTS_MODEL (default gemini-3.8-flash-tts),
     GEMINI_TTS_VOICE (default Kore, a female voice).
"""
import base64
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
import wave

script_path, out_dir, cache_root = sys.argv[1], sys.argv[2], sys.argv[3]
KEY = os.environ.get("GEMINI_API_KEY", "").strip()
MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
VOICE = os.environ.get("GEMINI_TTS_VOICE", "Kore")
API = "https://generativelanguage.googleapis.com/v1beta"
STYLE = os.environ.get(
    "GEMINI_TTS_STYLE",
    "Speak in Amharic as a warm, friendly young Ethiopian woman working at a bank, on a phone call, at a natural pace:",
)

cache = os.path.join(cache_root, f"{MODEL}-{VOICE}")
os.makedirs(cache, exist_ok=True)
clips = json.load(open(script_path, encoding="utf-8"))
print(f"{len(clips)} clips in script; model={MODEL} voice={VOICE} key={'set' if KEY else 'MISSING'}")


def pick_model():
    """Use MODEL if it exists, otherwise the newest model whose name contains 'tts'."""
    global MODEL
    try:
        req = urllib.request.Request(f"{API}/models?pageSize=200", headers={"x-goog-api-key": KEY})
        with urllib.request.urlopen(req, timeout=30) as r:
            names = [m["name"].split("/")[-1] for m in json.load(r).get("models", [])]
    except Exception as e:  # listing is best effort
        print("could not list models:", e)
        return
    tts = [n for n in names if "tts" in n]
    print("TTS models available:", tts)
    if MODEL not in names and tts:
        MODEL = sorted(tts)[-1]
        print("using", MODEL)


def synthesize(text):
    body = {
        "contents": [{"parts": [{"text": f"{STYLE}\n{text}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
        },
    }
    req = urllib.request.Request(
        f"{API}/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": KEY},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)
    part = data["candidates"][0]["content"]["parts"][0]["inlineData"]
    raw = base64.b64decode(part["data"])
    if raw[:4] == b"RIFF":  # newer models return a complete WAV file
        import io
        with wave.open(io.BytesIO(raw)) as w:
            return w.readframes(w.getnframes()), w.getframerate()
    rate = 24000
    for p in part.get("mimeType", "").split(";"):
        if p.strip().startswith("rate="):
            rate = int(p.split("=")[1])
    return raw, rate


def trim_silence(pcm, rate, threshold=350):
    """Remove leading/trailing silence (16-bit little-endian mono) so clips join tightly."""
    n = len(pcm) // 2
    samples = memoryview(pcm).cast("h")
    start, end = 0, n
    while start < n and abs(samples[start]) < threshold:
        start += 1
    while end > start and abs(samples[end - 1]) < threshold:
        end -= 1
    pad = int(rate * 0.04)
    start, end = max(0, start - pad), min(n, end + pad)
    return bytes(pcm[start * 2:end * 2])


def save_wav(path, pcm, rate):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)


if KEY:
    pick_model()

import threading
from concurrent.futures import ThreadPoolExecutor

lock = threading.Lock()
made = failed = 0
quota_hit = False


def record(c):
    global made, failed, quota_hit
    path = os.path.join(cache, c["id"] + ".wav")
    if os.path.exists(path) or not KEY or quota_hit:
        return
    for attempt in range(6):
        try:
            pcm, rate = synthesize(c["text"])
            save_wav(path + ".part", trim_silence(pcm, rate), rate)
            os.replace(path + ".part", path)
            with lock:
                made += 1
            print(f"  recorded {c['id']}  {c['text']}", flush=True)
            return
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:300]
            if e.code == 429:
                if "quota" in msg.lower() and ("day" in msg.lower() or "daily" in msg.lower()):
                    quota_hit = True
                    print("  daily quota reached:", msg, flush=True)
                    return
                time.sleep(15 * (attempt + 1))
                continue
            if e.code >= 500:
                time.sleep(5)
                continue
            print(f"  HTTP {e.code} for {c['id']}: {msg}", flush=True)
            break
        except Exception as e:
            print(f"  error for {c['id']}: {e}", flush=True)
            time.sleep(3)
    with lock:
        failed += 1


with ThreadPoolExecutor(max_workers=int(os.environ.get("GEMINI_TTS_THREADS", "3"))) as pool:
    list(pool.map(record, clips))

# Copy everything we have into the app.
shutil.rmtree(out_dir, ignore_errors=True)
os.makedirs(out_dir, exist_ok=True)
index = []
for c in clips:
    src = os.path.join(cache, c["id"] + ".wav")
    if os.path.exists(src):
        shutil.copy(src, os.path.join(out_dir, c["id"] + ".wav"))
        index.append(c)
json.dump({"model": MODEL, "voice": VOICE, "clips": index}, open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(f"recorded now: {made}, failed: {failed}, bundled: {len(index)}/{len(clips)}")
