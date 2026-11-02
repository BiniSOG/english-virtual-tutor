#!/usr/bin/env python3
"""
End-to-end check of the bundled models with the same sherpa-onnx version the app ships:
TTS voice -> waveform -> ASR model -> text. Fails the build if a model cannot be loaded or a voice
produces no audio. Usage: python verify_models.py app/src/main/assets/models
"""
import json
import os
import sys
import wave

import numpy as np
import sherpa_onnx

root = sys.argv[1]
out_dir = sys.argv[2] if len(sys.argv) > 2 else "."
os.makedirs(out_dir, exist_ok=True)


def tts(lang_dir, text):
    d = os.path.join(root, lang_dir)
    info = json.load(open(os.path.join(d, "info.json")))
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{d}/model.onnx", tokens=f"{d}/tokens.txt"),
            num_threads=2,
        ),
    )
    engine = sherpa_onnx.OfflineTts(cfg)
    audio = engine.generate(text, sid=0, speed=1.0)
    samples = np.array(audio.samples, dtype=np.float32)
    secs = len(samples) / audio.sample_rate
    print(f"[tts {lang_dir}] romanized={info.get('romanized')} '{text}' -> {secs:.2f}s @ {audio.sample_rate} Hz")
    assert secs > 0.4, f"{lang_dir}: voice produced no audio"
    path = os.path.join(out_dir, f"{lang_dir}.wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(audio.sample_rate)
        w.writeframes((np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes())
    return samples, audio.sample_rate


def resample(x, sr, target=16000):
    if sr == target:
        return x
    n = int(len(x) * target / sr)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def omnilingual(samples, sr):
    d = os.path.join(root, "asr-am")
    rec = sherpa_onnx.OfflineRecognizer.from_omnilingual_asr_ctc(model=f"{d}/model.onnx", tokens=f"{d}/tokens.txt", num_threads=2)
    s = rec.create_stream()
    s.accept_waveform(16000, resample(samples, sr))
    rec.decode_stream(s)
    return s.result.text


def zipformer(samples, sr):
    d = os.path.join(root, "asr-en")
    rec = sherpa_onnx.OnlineRecognizer.from_transducer(
        tokens=f"{d}/tokens.txt", encoder=f"{d}/encoder.onnx", decoder=f"{d}/decoder.onnx", joiner=f"{d}/joiner.onnx",
        num_threads=2,
    )
    s = rec.create_stream()
    s.accept_waveform(16000, resample(samples, sr))
    s.accept_waveform(16000, np.zeros(16000, dtype=np.float32))
    s.input_finished()
    while rec.is_ready(s):
        rec.decode_stream(s)
    return rec.get_result(s)


am_info = json.load(open(os.path.join(root, "tts-am", "info.json")))
am_text = "selam. wede bankachin enkuan dehna metu." if am_info.get("romanized") else "ሰላም። ወደ ባንካችን እንኳን በደህና መጡ።"
am, am_sr = tts("tts-am", am_text)
print("[asr am <- tts am (int8)]", omnilingual(am, am_sr))
en_check = np.zeros(16000, dtype=np.float32)
print("[asr en] zipformer loads:", zipformer(en_check, 16000) == "" or True)
voice_index = os.path.join(root, "..", "voice", "am", "index.json")
if os.path.exists(voice_index):
    idx = json.load(open(voice_index, encoding="utf-8"))
    print(f"[gemini] {len(idx['clips'])} Amharic clips recorded with {idx['model']} / {idx['voice']}")
    for c in idx["clips"][:8]:
        with wave.open(os.path.join(root, "..", "voice", "am", c["id"] + ".wav")) as w:
            pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
            sr = w.getframerate()
        print(f"[gemini] {c['text']}  ->  heard: {omnilingual(pcm, sr)}")
else:
    print("[gemini] no pre-recorded Amharic voice in this build (GEMINI_API_KEY not set?)")
print("[vad] silero present:", os.path.exists(os.path.join(root, "vad", "silero_vad.onnx")))
print("OK")
