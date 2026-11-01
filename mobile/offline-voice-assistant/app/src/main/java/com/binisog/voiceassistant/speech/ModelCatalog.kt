package com.binisog.voiceassistant.speech

import android.content.res.AssetManager
import com.binisog.voiceassistant.brain.Lang
import org.json.JSONObject

/**
 * The offline models bundled in `assets/models/` by tools/fetch_models.sh:
 *
 *  - asr-en : streaming Zipformer transducer (English, ~20M params, live captions)
 *  - asr-am : Meta Omnilingual ASR 300M CTC, int8 (1600+ languages incl. Amharic)
 *  - vad    : Silero VAD (finds the end of each sentence for the non-streaming model)
 *  - tts-en / tts-am : Meta MMS VITS voices exported for sherpa-onnx
 */
class ModelCatalog(private val assets: AssetManager) {

    private fun exists(path: String): Boolean = try {
        assets.open(path).close(); true
    } catch (_: Exception) {
        false
    }

    val hasStreamingEnglish get() = exists("$ASR_EN/encoder.onnx") && exists("$ASR_EN/tokens.txt")
    val hasOmnilingual get() = exists("$ASR_MULTI/model.onnx") && exists("$ASR_MULTI/tokens.txt")
    val hasVad get() = exists(VAD)

    fun hasTts(lang: Lang) = exists("${ttsDir(lang)}/model.onnx") && exists("${ttsDir(lang)}/tokens.txt")

    /** MMS voices for some languages (Amharic included) were trained on romanised text. */
    fun ttsWantsRomanized(lang: Lang): Boolean = try {
        val json = assets.open("${ttsDir(lang)}/info.json").bufferedReader().use { it.readText() }
        JSONObject(json).optBoolean("romanized", false)
    } catch (_: Exception) {
        false
    }

    fun summary(): String = buildString {
        append("ASR en: ").append(if (hasStreamingEnglish) "zipformer" else if (hasOmnilingual) "omnilingual" else "missing")
        append(" · ASR am: ").append(if (hasOmnilingual) "omnilingual" else "missing")
        append(" · TTS en: ").append(if (hasTts(Lang.EN)) "mms" else "system")
        append(" · TTS am: ").append(if (hasTts(Lang.AM)) "mms" else "system")
    }

    companion object {
        const val ROOT = "models"
        const val ASR_EN = "$ROOT/asr-en"
        const val ASR_MULTI = "$ROOT/asr-am"
        const val VAD = "$ROOT/vad/silero_vad.onnx"
        fun ttsDir(lang: Lang) = "$ROOT/tts-${lang.code}"
    }
}
