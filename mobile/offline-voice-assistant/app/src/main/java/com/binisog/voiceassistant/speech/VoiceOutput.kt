package com.binisog.voiceassistant.speech

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import android.util.Log
import com.binisog.voiceassistant.brain.AmharicText
import com.binisog.voiceassistant.brain.Lang
import com.binisog.voiceassistant.brain.VoiceScript
import com.binisog.voiceassistant.brain.VoiceShaper
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeoutOrNull
import java.io.File
import java.io.RandomAccessFile
import java.util.Locale
import java.util.UUID
import kotlin.math.sqrt

/**
 * The assistant's voice (female, offline).
 *
 *  1. The phone's own offline text-to-speech voice for the language, preferring a female voice.
 *     Most Android phones ship a natural female English voice; many can install Amharic.
 *  2. Otherwise the bundled Meta MMS voice, moved to a female pitch with [VoiceShaper].
 *
 * Every sample that is played is also handed to [onAgentAudio] so the call recording contains
 * the assistant's side of the conversation.
 */
class VoiceOutput(private val context: Context, private val catalog: ModelCatalog) {

    private class Pcm(val samples: FloatArray, val rate: Int)

    private val voices = mutableMapOf<Lang, OfflineTts>()
    private var systemTts: TextToSpeech? = null
    private var systemTtsReady = false
    private val systemVoice = mutableMapOf<Lang, Voice?>()

    @Volatile
    private var stopRequested = false

    /** 0..1 loudness of what is playing now, to animate the avatar. */
    @Volatile
    var level: Float = 0f
        private set

    /** Called with each block of played audio, resampled to 16 kHz mono. */
    @Volatile
    var onAgentAudio: ((FloatArray) -> Unit)? = null

    /** Which engine speaks each language (shown on the home screen). */
    val engineInUse = java.util.concurrent.ConcurrentHashMap<Lang, String>()

    /** Lines pre-recorded with Gemini at build time (assets/voice/<code>), per language: id -> text. */
    private val recorded = java.util.concurrent.ConcurrentHashMap<Lang, Map<String, String>>()

    private fun recordedFor(lang: Lang): Map<String, String> = recorded.getOrPut(lang) {
        runCatching {
            val json = org.json.JSONObject(context.assets.open("voice/${lang.code}/index.json").bufferedReader().use { it.readText() })
            val arr = json.getJSONArray("clips")
            (0 until arr.length()).associate { i -> arr.getJSONObject(i).let { it.getString("id") to it.getString("text") } }
        }.getOrDefault(emptyMap())
    }

    private val clipCache = object : LinkedHashMap<String, Pcm>(64, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Pcm>?) = size > 80
    }

    fun hasRecorded(lang: Lang): Boolean = recordedFor(lang).isNotEmpty()

    /**
     * The offline voice used for words that weren't pre-recorded (names) and for languages
     * without recordings yet: Ge'ez-script Tigrinya is read by the Amharic voice, Latin-script
     * Oromo and Afar by the English one.
     */
    fun fallbackFor(lang: Lang): Lang = when {
        lang == Lang.EN || lang == Lang.AM -> lang
        catalog.hasTts(lang) -> lang // the language's own bundled MMS voice
        lang.ethiopic -> Lang.AM
        else -> Lang.EN
    }

    private suspend fun ensureVoice(l: Lang) {
        if (pickSystemVoice(l) != null) return
        if (!voices.containsKey(l) && catalog.hasTts(l)) loadMms(l)
    }

    /** Load the voice for [lang] (slow: call off the main thread). */
    suspend fun prepare(lang: Lang) {
        val fb = fallbackFor(lang)
        if (hasRecorded(lang)) {
            engineInUse[lang] = "Gemini recordings (${recordedFor(lang).size} clips)"
            ensureVoice(fb) // for names
            return
        }
        if (pickSystemVoice(lang) != null) {
            engineInUse[lang] = "phone voice " + systemVoice[lang]?.name
            return
        }
        ensureVoice(fb)
        engineInUse[lang] = when {
            fb != lang -> "approximate: ${fb.nativeName} voice"
            voices.containsKey(lang) -> "MMS ${lang.nativeName} + female voice shaping"
            systemVoice[lang] != null -> "phone voice " + systemVoice[lang]?.name
            else -> "none"
        }
    }

    /** Voices to keep loaded while [lang] is active. */
    fun voicesNeededFor(lang: Lang): Set<Lang> = setOf(lang, fallbackFor(lang))

    private fun loadMms(lang: Lang) {
        val dir = ModelCatalog.ttsDir(lang)
        try {
            voices[lang] = OfflineTts(
                assetManager = context.assets,
                config = OfflineTtsConfig(
                    model = OfflineTtsModelConfig(
                        vits = OfflineTtsVitsModelConfig(
                            model = "$dir/model.onnx",
                            tokens = "$dir/tokens.txt",
                            noiseScale = 0.6f,
                            noiseScaleW = 0.7f,
                            lengthScale = if (lang == Lang.EN) 1.02f else 1.08f,
                        ),
                        numThreads = 2,
                    ),
                    maxNumSentences = 1,
                ),
            )
        } catch (e: Throwable) {
            Log.e(TAG, "Could not load MMS voice for $lang", e)
        }
    }

    fun releaseVoice(lang: Lang) {
        voices.remove(lang)?.release()
    }

    fun stop() {
        stopRequested = true
    }

    /** Speaks [text] and returns when playback has finished (or [stop] was called). */
    suspend fun speak(text: String, lang: Lang) {
        stopRequested = false
        try {
            if (hasRecorded(lang) && mostlyRecorded(text, lang)) {
                speakRecorded(text, lang)
                return
            }
            // A phone voice for the language itself, otherwise the fallback voice.
            val engine = if (systemVoice[lang] != null) lang else fallbackFor(lang)
            if (systemVoice[engine] != null) {
                // One request for the whole reply: the phone voice handles prosody across sentences.
                synthesizeSystem(text, engine)?.let { play(it) }
                return
            }
            val voice = voices[engine]
            if (voice == null) {
                synthesizeSystem(text, engine, anyVoice = true)?.let { play(it) }
                return
            }
            for (s in splitSentences(text)) {
                if (stopRequested) break
                play(synthesizeMms(voice, s, engine))
            }
        } finally {
            level = 0f
        }
    }

    // ------------------------------------------------------------------ Gemini recordings

    /**
     * True when recordings cover the reply except short gaps such as the customer's name. While
     * a language is only partly recorded, whole sentences would be missing: then the reply is
     * spoken entirely by the offline voice instead of a patchwork of two voices.
     */
    private fun mostlyRecorded(text: String, lang: Lang): Boolean {
        val gaps = VoiceScript.plan(text, recordedFor(lang)).filterIsInstance<VoiceScript.Segment.Synth>()
        return gaps.all { VoiceScript.words(it.text).size <= 4 }
    }

    private fun loadClip(lang: Lang, id: String): Pcm? = synchronized(clipCache) { clipCache["${lang.code}/$id"] } ?: runCatching {
        val bytes = context.assets.open("voice/${lang.code}/$id.wav").use { it.readBytes() }
        parseWav(bytes)
    }.getOrNull()?.also { synchronized(clipCache) { clipCache["${lang.code}/$id"] = it } }

    /**
     * A reply made of recorded clips, with the leftover words (the customer's name) spoken by the
     * offline voice at the same loudness, joined with short natural gaps.
     */
    private suspend fun speakRecorded(text: String, lang: Lang) {
        val fb = fallbackFor(lang)
        val rate = 24000
        val parts = ArrayList<FloatArray>()
        var clipRms = 0.0
        var clipCount = 0
        val plan = VoiceScript.plan(text, recordedFor(lang))
        val synthIdx = ArrayList<Int>()
        for (seg in plan) {
            if (stopRequested) return
            when (seg) {
                is VoiceScript.Segment.Recorded -> loadClip(lang, seg.id)?.let { pcm ->
                    val x = VoiceShaper.convertRate(pcm.samples, pcm.rate, rate)
                    clipRms += rms(x); clipCount++
                    parts += x
                }
                is VoiceScript.Segment.Synth -> {
                    val pcm = if (systemVoice[fb] != null) synthesizeSystem(seg.text, fb)
                    else voices[fb]?.let { synthesizeMms(it, seg.text, fb) }
                    if (pcm != null) {
                        synthIdx += parts.size
                        parts += VoiceShaper.convertRate(pcm.samples, pcm.rate, rate)
                    }
                }
            }
        }
        if (parts.isEmpty()) return
        // Match the loudness of the synthesised words to the recordings.
        if (clipCount > 0) {
            val target = clipRms / clipCount
            for (i in synthIdx) {
                val r = rms(parts[i])
                if (r > 1e-5) {
                    val g = (target / r).toFloat().coerceIn(0.3f, 4f)
                    for (j in parts[i].indices) parts[i][j] = (parts[i][j] * g).coerceIn(-1f, 1f)
                }
            }
        }
        val gap = FloatArray(rate * 7 / 100)
        var total = 0
        for (p in parts) total += p.size + gap.size
        val out = FloatArray(total)
        var o = 0
        for (p in parts) { p.copyInto(out, o); o += p.size + gap.size }
        play(Pcm(out, rate))
    }

    private fun rms(x: FloatArray): Double {
        var s = 0.0
        for (v in x) s += v * v
        return kotlin.math.sqrt(s / x.size.coerceAtLeast(1))
    }

    // ------------------------------------------------------------------ phone (system) voice

    private suspend fun ensureSystemTts(): TextToSpeech? {
        systemTts?.let { if (systemTtsReady) return it }
        val ready = CompletableDeferred<Boolean>()
        val tts = TextToSpeech(context) { status -> ready.complete(status == TextToSpeech.SUCCESS) }
        systemTtsReady = withTimeoutOrNull(5000) { ready.await() } ?: false
        systemTts = tts
        return if (systemTtsReady) tts else null
    }

    private fun localeFor(lang: Lang) = if (lang == Lang.EN) Locale.US else Locale(lang.code, "ET")

    /** An installed, offline voice for [lang], female if the engine has one. */
    private suspend fun pickSystemVoice(lang: Lang): Voice? {
        if (systemVoice.containsKey(lang)) return systemVoice[lang]
        val tts = ensureSystemTts()
        val wanted = localeFor(lang)
        val voice = tts?.let { t ->
            runCatching { t.voices }.getOrNull().orEmpty().filter { v ->
                v.locale.language == wanted.language &&
                    !v.isNetworkConnectionRequired &&
                    v.features?.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED) != true
            }.maxByOrNull { femaleScore(it, wanted) }
        }
        systemVoice[lang] = voice
        Log.i(TAG, "phone voice for $lang: ${voice?.name}")
        return voice
    }

    private fun femaleScore(v: Voice, wanted: Locale): Int {
        val n = v.name.lowercase()
        var score = 0
        if (v.locale.country == wanted.country) score += 5
        if ("female" in n) score += 20
        if ("male" in n && "female" !in n) score -= 20
        // Google TTS voice ids known to be female / male.
        if (listOf("-sfg", "-tpf", "-iob", "-iog", "-tpc", "-gba", "-gbc", "-cxx", "-fis").any { it in n }) score += 15
        if (listOf("-iol", "-iom", "-tpd", "-gbb", "-gbd", "-rjs").any { it in n }) score -= 15
        if (v.quality >= Voice.QUALITY_HIGH) score += 2
        return score
    }

    private suspend fun synthesizeSystem(text: String, lang: Lang, anyVoice: Boolean = false): Pcm? {
        val tts = ensureSystemTts() ?: return null
        val voice = systemVoice[lang]
        when {
            voice != null -> tts.voice = voice
            anyVoice -> if (tts.setLanguage(localeFor(lang)) < TextToSpeech.LANG_AVAILABLE) return null
            else -> return null
        }
        val file = File(context.cacheDir, "tts-${UUID.randomUUID()}.wav")
        val id = file.name
        val done = CompletableDeferred<Boolean>()
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) { if (utteranceId == id) done.complete(true) }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) { if (utteranceId == id) done.complete(false) }
            override fun onError(utteranceId: String?, errorCode: Int) { if (utteranceId == id) done.complete(false) }
        })
        tts.setSpeechRate(0.97f)
        if (tts.synthesizeToFile(text, Bundle(), file, id) != TextToSpeech.SUCCESS) return null
        val ok = withTimeoutOrNull(30_000) { done.await() } ?: false
        val pcm = if (ok) readWav(file) else null
        file.delete()
        return pcm?.let { Pcm(VoiceShaper.feminize(it.samples, it.rate), it.rate) }
    }

    private fun readWav(file: File): Pcm? = runCatching {
        parseWav(RandomAccessFile(file, "r").use { raf -> ByteArray(raf.length().toInt()).also { raf.readFully(it) } })
    }.getOrNull()

    private fun parseWav(bytes: ByteArray): Pcm? = runCatching {
        fun le16(o: Int) = (bytes[o].toInt() and 0xff) or ((bytes[o + 1].toInt() and 0xff) shl 8)
        fun le32(o: Int) = le16(o) or (le16(o + 2) shl 16)
        var pos = 12
        var rate = 22050
        var channels = 1
        var result: Pcm? = null
        while (pos + 8 <= bytes.size && result == null) {
            val id = String(bytes, pos, 4, Charsets.US_ASCII)
            val size = le32(pos + 4)
            if (id == "fmt ") {
                channels = le16(pos + 10).coerceAtLeast(1)
                rate = le32(pos + 12)
            } else if (id == "data") {
                val start = pos + 8
                val end = if (size <= 0 || start + size > bytes.size) bytes.size else start + size
                val frames = (end - start) / (2 * channels)
                result = Pcm(FloatArray(frames) { i -> le16(start + i * 2 * channels).toShort() / 32768f }, rate)
            }
            pos += 8 + size + (size and 1)
        }
        result
    }.getOrNull()

    // ------------------------------------------------------------------ bundled MMS voice

    private fun textFor(lang: Lang, text: String): String {
        var t = text.replace("\n", " ").replace("&", if (lang.ethiopic) " እና " else " and ")
        if (catalog.ttsWantsRomanized(lang) || lang == Lang.EN && AmharicText.containsEthiopic(t)) t = AmharicText.romanize(t)
        return t.lowercase()
    }

    private fun synthesizeMms(voice: OfflineTts, sentence: String, lang: Lang): Pcm {
        val audio = voice.generate(text = textFor(lang, sentence), sid = 0, speed = 1.0f)
        val rate = voice.sampleRate()
        return Pcm(VoiceShaper.feminize(audio.samples, rate), rate)
    }

    private fun splitSentences(text: String): List<String> =
        Regex("[^.!?።፧]+[.!?።፧]*").findAll(text)
            .map { it.value.trim() }
            .filter { s -> s.any { it.isLetterOrDigit() } }
            .toList()

    // ------------------------------------------------------------------ playback

    private fun play(pcm: Pcm) {
        if (pcm.samples.isEmpty() || stopRequested) return
        val rate = pcm.rate
        val minBuf = AudioTrack.getMinBufferSize(rate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_FLOAT)
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    // Voice-call stream: the echo canceller uses it as its reference signal.
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                    .setSampleRate(rate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(if (minBuf > 0) minBuf * 4 else rate)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        try {
            track.play()
            // A short natural pause after each sentence.
            val samples = pcm.samples + FloatArray(rate / 6)
            val chunk = rate / 20
            var off = 0
            while (off < samples.size && !stopRequested) {
                val n = minOf(chunk, samples.size - off)
                val block = samples.copyOfRange(off, off + n)
                var sum = 0f
                for (v in block) sum += v * v
                level = (sqrt(sum / n) * 6f).coerceIn(0f, 1f)
                onAgentAudio?.invoke(VoiceShaper.convertRate(block, rate, SAMPLE_RATE))
                track.write(block, 0, n, AudioTrack.WRITE_BLOCKING)
                off += n
            }
            while (!stopRequested && track.playbackHeadPosition < off) Thread.sleep(15)
        } catch (e: Throwable) {
            Log.e(TAG, "playback failed", e)
        } finally {
            runCatching { track.stop() }
            track.release()
        }
    }

    fun release() {
        voices.values.forEach { it.release() }
        voices.clear()
        systemTts?.shutdown()
    }

    companion object {
        private const val TAG = "VoiceOutput"
    }
}
