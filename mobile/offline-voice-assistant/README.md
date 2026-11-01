# Offline Voice Account Assistant (Android)

An Android app that opens a bank account through a voice "video call" with an AI assistant. It runs **fully offline** and speaks **English and Amharic (አማርኛ)**. While the user answers, the **front camera records the session** for identity verification.

It feels like a real phone call. Tapping *Create Account* makes the phone ring with an incoming video call from "Hana". You answer, and she greets you, listens, reads back what she understood ("Abebe Kebede Bekele, did I get that right?") and replies, all by voice. She uses your first name, varies her phrasing, and asks again if you go quiet. Subtitles and a keyboard are optional.

Flow (matches the design mock-up): Home → *Create Account* → incoming call → answer → assistant greets you → full name → date of birth → birth city → nationality → account type → Fayda **FAN** → **OTP** → review and confirm → account created.

## How it works

| Part | Technology | Why |
|---|---|---|
| App | Kotlin, Jetpack Compose, CameraX | Native code is the fastest option for real-time audio on Android |
| Speech engine | [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) 2.0.1 (onnxruntime, C++) | Fast on-device ASR, VAD and TTS with no network |
| English speech recognition | Streaming Zipformer transducer (20M params, int8) | Live captions while you speak, very low latency |
| Amharic speech recognition | Meta **Omnilingual ASR** 300M CTC (int8, Apache-2.0) + Silero VAD | Recognises Amharic in Ge'ez script; far more accurate than small Whisper models for Amharic |
| Voice replies (female) | The phone's own offline female voice when it has one for the language. Otherwise Meta **MMS-TTS** (`mms-tts-amh`, `mms-tts-eng`) exported to ONNX and shifted to a female voice by `brain/VoiceShaper.kt` (TD-PSOLA pitch plus formant shift) | Natural female voice in both languages with no network |
| Avatar | `app/src/main/assets/avatar/agent.jpg`: AI-generated portrait of a fictional agent (Canva), animated with breathing and speech-driven head motion | Replace the file with your own agent's photo to rebrand |
| Language model | `brain/`: a domain-scoped bilingual language model written for this task | See below |
| Recording | CameraX front camera plus both voices (customer mic and Hana's voice, time-aligned) muxed into `call_recording.mp4`. Also `audio.wav` (mic) and `session.json` (answers and transcript) | Saved per session under `Android/data/com.binisog.voiceassistant/files/sessions/`, viewable and shareable from *Saved Sessions* |

### The language model (`brain/`)

A general chat LLM was deliberately **not** used for the KYC conversation. A 0.5–1B model would add 0.5–1 GB, take seconds per reply on mid-range phones, handle Amharic poorly, and could hallucinate customer data. The assistant uses a small model scoped to this job, in pure Kotlin and unit-tested:

- **Intents** in both languages: yes/no ("አዎ", "ልክ ነው", "አይደለም"), repeat, go back, cancel, switch language ("በአማርኛ"), questions.
- **Slot extraction**: names ("ስሜ … ነው", "my name is …"), dates in both the **Ethiopian and Gregorian calendars** ("ሚያዝያ 7 1992" → 15 Apr 2000), spoken numbers in English and Amharic words ("አስራ አምስት", "nineteen ninety two"), digit-by-digit FAN/OTP collected across pauses, a fuzzy gazetteer of Ethiopian cities (tolerant of ASR spelling and ሀ/ሃ/ሐ variants), nationalities and account types.
- **FAQ retrieval** for side questions ("why are you recording me?", "ምን ሰነድ ያስፈልጋል?"). After answering, it returns to the current question.
- **Response generation** from bilingual templates, with numbers spelled out for the voice. Every captured value is read back for confirmation before it is accepted.

The Fayda/National ID lookup and the OTP SMS are **simulated** (the code is shown on screen as a "demo SMS"), because the app has no network by design.

## Get the APK

The **Offline voice assistant APK** GitHub Actions workflow builds it. Each push to `mobile/offline-voice-assistant/**` publishes a pre-release named *Offline voice assistant – build N* with `offline-voice-assistant.apk` attached. The APK is also uploaded as a workflow artifact.

The APK is large (about 0.7 GB) because all models are inside it. After installing, nothing is downloaded: switch on airplane mode and it still works.

## Build locally

```bash
cd mobile/offline-voice-assistant
./gradlew :brain:test                       # dialogue-engine tests, no Android SDK needed
pip install torch transformers onnx sherpa-onnx==2.0.1
./tools/fetch_models.sh                     # downloads ASR/VAD + Android libs, exports MMS voices
python tools/verify_models.py app/src/main/assets/models   # TTS -> ASR self-test
./gradlew :app:assembleRelease              # needs Android SDK (ANDROID_HOME)
```

To change the bank name, edit `AgentConfig` in `brain/.../AccountOpeningAgent.kt` and the strings in `ui/`. Questions and replies are in `Prompts.kt`, and FAQ answers are in `Faq.kt`.

## Licences of bundled models

- sherpa-onnx: Apache-2.0. Its Kotlin API files are copied unchanged into `app/src/main/java/com/k2fsa/sherpa/onnx`.
- Omnilingual ASR: Apache-2.0. Zipformer (icefall): Apache-2.0. Silero VAD: MIT.
- **MMS-TTS voices: CC-BY-NC-4.0, non-commercial use only.** Replace them before any commercial deployment.
