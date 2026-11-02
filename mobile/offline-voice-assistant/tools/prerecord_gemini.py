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
LANGUAGE = os.environ.get("GEMINI_TTS_LANGUAGE", "Amharic")
STYLE = os.environ.get(
    "GEMINI_TTS_STYLE",
    f"Speak in {LANGUAGE} as a warm, friendly young Ethiopian woman working at a bank, on a phone call, at a natural pace:",
)
# Free-tier keys allow ~10 speech requests a day, so several lines are recorded per request and
# the audio is cut at the pauses between them.
BATCH = int(os.environ.get("GEMINI_TTS_BATCH", "20"))

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


def synthesize(text, prompt=None):
    body = {
        "contents": [{"parts": [{"text": prompt or f"{STYLE}\n{text}"}]}],
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

import array


def frames_energy(pcm, rate, hop_ms=10):
    a = array.array("h", pcm)
    hop = rate * hop_ms // 1000
    return [max((abs(x) for x in a[i:i + hop]), default=0) for i in range(0, len(a), hop)], hop


def silent_runs(pcm, rate, min_ms=250):
    energy, hop = frames_energy(pcm, rate)
    runs, i = [], 0
    while i < len(energy):
        if energy[i] < 400:
            j = i
            while j < len(energy) and energy[j] < 400:
                j += 1
            if j - i >= min_ms // 10:
                runs.append((i, j))
            i = j
        else:
            i += 1
    return runs, hop


def shorten_pauses(pcm, rate, max_ms=450):
    """Long pauses inside a line sound unnatural (and break splitting): cap them."""
    runs, hop = silent_runs(pcm, rate, min_ms=max_ms + 50)
    out, last = bytearray(), 0
    keep = max_ms // 10
    for a, b in runs:
        if a == 0 or b * hop * 2 >= len(pcm):
            continue
        out += pcm[last * hop * 2:(a + keep // 2) * hop * 2]
        last = b - keep // 2
    out += pcm[last * hop * 2:]
    return bytes(out)


def split_batch(pcm, rate, texts):
    """Cut a multi-line recording into len(texts) clips at the pauses that best match where each
    line should end (proportional to text length); None if no consistent split exists."""
    n = len(texts)
    if n == 1:
        return [pcm]
    runs, hop = silent_runs(pcm, rate, min_ms=300)
    total = len(pcm) // 2 // hop
    inner = [(a, b) for a, b in runs if a > 0 and b < total]
    m = len(inner)
    if m < n - 1:
        return None
    lens = [max(1, len(t)) for t in texts]
    cum = [sum(lens[:k + 1]) / sum(lens) for k in range(n - 1)]
    pos = [((a + b) / 2) / total for a, b in inner]
    bonus = [0.12 * min((b - a) / 150, 1.0) for a, b in inner]
    INF = float("inf")
    # dp[k][j]: best cost with cut k placed at candidate j
    dp = [[INF] * m for _ in range(n - 1)]
    back = [[-1] * m for _ in range(n - 1)]
    for j in range(m):
        dp[0][j] = abs(pos[j] - cum[0]) - bonus[j]
    for k in range(1, n - 1):
        best, arg = INF, -1
        for j in range(m):
            if j > 0 and dp[k - 1][j - 1] < best:
                best, arg = dp[k - 1][j - 1], j - 1
            if best < INF:
                dp[k][j] = best + abs(pos[j] - cum[k]) - bonus[j]
                back[k][j] = arg
    j = min(range(m), key=lambda x: dp[n - 2][x])
    if dp[n - 2][j] == INF:
        return None
    chosen = [j]
    for k in range(n - 2, 0, -1):
        j = back[k][j]
        chosen.append(j)
    chosen.reverse()
    bounds = [0] + [((inner[c][0] + inner[c][1]) // 2) * hop for c in chosen] + [len(pcm) // 2]
    pieces = [pcm[bounds[k] * 2:bounds[k + 1] * 2] for k in range(n)]
    for piece, text in zip(pieces, texts):
        speech = len(trim_silence(piece, rate)) / 2 / rate
        chars = max(1, len(text))
        if not (0.025 * chars <= speech + 0.2 and speech <= 0.3 * chars + 0.8):
            return None
    return pieces


VERIFY_MODEL = os.environ.get("GEMINI_VERIFY_MODEL", "gemini-3.5-flash")
verify_available = True


def ethiopic_normalize(t):
    """Same idea as AmharicText.normalize in the app: letters that sound the same compare equal
    (ሀ/ሐ/ኀ/ሃ, ሰ/ሠ, አ/ዐ/ኣ, ጸ/ፀ), so 'ሐና' and 'ሀና' are the same word."""
    out = []
    for ch in t:
        o = ord(ch)
        if 0x1200 <= o <= 0x137F:
            row, order = o & 0xFFF8, o - (o & 0xFFF8)
            row = {0x1210: 0x1200, 0x1280: 0x1200, 0x1220: 0x1230, 0x12D0: 0x12A0, 0x1340: 0x1338}.get(row, row)
            if row in (0x1200, 0x12A0) and order == 3:
                order = 0
            ch = chr(row + order)
        out.append(ch)
    return "".join(out)


def norm_words(t):
    import re
    return re.sub(r"[^\w\s]", " ", ethiopic_normalize(t.lower())).split()


def similar(a, b):
    import difflib
    return difflib.SequenceMatcher(None, " ".join(norm_words(a)), " ".join(norm_words(b))).ratio()


def wav_bytes(pcm, rate):
    import io
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    return buf.getvalue()


def verify(pieces, rate, texts):
    """Transcribe every cut piece with Gemini and check it says the expected line.
    Returns True/False, or None when verification isn't available (quota)."""
    global verify_available
    if not verify_available:
        return None
    parts = []
    for i, p in enumerate(pieces):
        parts.append({"text": f"Clip {i + 1}:"})
        parts.append({"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(wav_bytes(p, rate)).decode()}})
    parts.append({"text": f"Transcribe each of the {len(pieces)} clips exactly, in the original script ({LANGUAGE}). "
                          "Return a JSON array of strings, one per clip, in order."})
    body = {"contents": [{"parts": parts}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
    req = urllib.request.Request(f"{API}/models/{VERIFY_MODEL}:generateContent", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            heard = json.loads(json.load(r)["candidates"][0]["content"]["parts"][0]["text"])
    except urllib.error.HTTPError as e:
        print("  verification unavailable:", e.code, flush=True)
        if e.code == 429:
            verify_available = False
        return None
    except Exception as e:
        print("  verification error:", e, flush=True)
        return None
    if len(heard) != len(texts):
        return False
    scores = [similar(h, t) for h, t in zip(heard, texts)]
    # One-word clips (city names, numbers) are short: one vowel off is still the right word.
    bad = [(t, h, round(sc, 2)) for t, h, sc in zip(texts, heard, scores)
           if sc < (0.45 if len(norm_words(t)) <= 1 else 0.55)]
    for t, h, sc in bad:
        print(f"  mismatch {sc}: expected '{t}' heard '{h}'", flush=True)
    return not bad


def unambiguous(pcm, rate, n):
    """Without verification, only trust batches whose long pauses are exactly the line breaks."""
    runs, hop = silent_runs(pcm, rate, min_ms=1000)
    total = len(pcm) // 2 // hop
    return len([r for r in runs if r[0] > 0 and r[1] < total]) == n - 1


made = failed = 0
quota_hit = False


def record_batch(batch):
    """Records the clips of [batch]; splits the batch in two if the pauses can't be found."""
    global made, failed, quota_hit
    if quota_hit or not batch:
        return
    texts = [c["text"] for c in batch]
    if len(batch) == 1:
        prompt = f"{STYLE}\n{texts[0]}"
    else:
        prompt = (f"{STYLE}\nRead the following {len(batch)} separate lines one after another. "
                  "After each line, pause in complete silence for two full seconds before the next line. "
                  "Read only the lines themselves.\n\n" + "\n\n".join(texts))
    pcm = None
    for attempt in range(4):
        try:
            pcm, rate = synthesize(None, prompt)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:400]
            if e.code == 429:
                if "per day" in msg.lower() or "perday" in msg.lower() or "daily" in msg.lower():
                    quota_hit = True
                    print("  daily quota reached – the rest will be recorded by a later build", flush=True)
                    return
                time.sleep(30 * (attempt + 1))
                continue
            if e.code >= 500:
                time.sleep(10)
                continue
            print(f"  HTTP {e.code}: {msg}", flush=True)
            failed += len(batch)
            return
        except Exception as e:
            print("  error:", e, flush=True)
            time.sleep(5)
    if pcm is None:
        failed += len(batch)
        return
    pieces = split_batch(pcm, rate, texts)
    if pieces is not None:
        # Gemini sometimes adds words of its own, so every clip is checked by transcription.
        ok = verify(pieces, rate, texts)
        if ok is None:
            ok = len(batch) == 1 or unambiguous(pcm, rate, len(batch))
        if not ok:
            pieces = None
    if pieces is None:
        print(f"  could not split a batch of {len(batch)}; retrying in halves", flush=True)
        mid = len(batch) // 2
        record_batch(batch[:mid])
        record_batch(batch[mid:])
        return
    for c, piece in zip(batch, pieces):
        save_wav(os.path.join(cache, c["id"] + ".wav"), shorten_pauses(trim_silence(piece, rate), rate), rate)
        made += 1
        print(f"  recorded {c['id']}  {c['text']}", flush=True)


todo = [c for c in clips if not os.path.exists(os.path.join(cache, c["id"] + ".wav"))]
print(f"{len(todo)} clips to record ({LANGUAGE})")
if KEY:
    # Short words are grouped together, long sentences together, so the pauses stand out.
    todo.sort(key=lambda c: len(c["text"]))
    for i in range(0, len(todo), BATCH):
        if quota_hit:
            break
        record_batch(todo[i:i + BATCH])

APP_RATE = 16000  # the app plays clips at 16 kHz: a third smaller than Gemini's 24 kHz


def to_app_wav(src, dst):
    with wave.open(src) as w:
        rate, pcm = w.getframerate(), w.readframes(w.getnframes())
    if rate != APP_RATE:
        try:
            import numpy as np
            x = np.frombuffer(pcm, dtype=np.int16).astype(np.float32)
            # light low-pass before decimating
            x = np.convolve(x, np.array([0.25, 0.5, 0.25], dtype=np.float32), mode="same")
            n = int(len(x) * APP_RATE / rate)
            y = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
            pcm, rate = np.clip(y, -32768, 32767).astype(np.int16).tobytes(), APP_RATE
        except ImportError:
            pass
    save_wav(dst, pcm, rate)


# Copy everything we have into the app.
shutil.rmtree(out_dir, ignore_errors=True)
os.makedirs(out_dir, exist_ok=True)
index = []
for c in clips:
    src = os.path.join(cache, c["id"] + ".wav")
    if os.path.exists(src):
        to_app_wav(src, os.path.join(out_dir, c["id"] + ".wav"))
        index.append(c)
json.dump({"model": MODEL, "voice": VOICE, "clips": index}, open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(f"recorded now: {made}, failed: {failed}, bundled: {len(index)}/{len(clips)}")
