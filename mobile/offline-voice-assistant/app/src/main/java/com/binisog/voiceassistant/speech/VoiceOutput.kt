package com.binisog.voiceassistant.speech

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import com.binisog.voiceassistant.brain.AmharicText
import com.binisog.voiceassistant.brain.Lang
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.Locale
import java.util.UUID
import kotlin.coroutines.resume
import kotlin.math.sqrt

/**
 * Speaks the assistant's replies. Uses the bundled MMS voice for the language when present,
 * and Android's built-in TextToSpeech otherwise.
 */
class VoiceOutput(private val context: Context, private val catalog: ModelCatalog) {

    private val voices = mutableMapOf<Lang, OfflineTts>()
    private var systemTts: TextToSpeech? = null
    private var systemTtsReady = false

    @Volatile
    private var stopRequested = false

    /** 0..1 loudness of what is currently playing, for the avatar's mouth. */
    @Volatile
    var level: Float = 0f
        private set

    /** Load the voice for [lang] (slow: call off the main thread). */
    fun prepare(lang: Lang) {
        if (voices.containsKey(lang) || !catalog.hasTts(lang)) return
        val dir = ModelCatalog.ttsDir(lang)
        try {
            voices[lang] = OfflineTts(
                assetManager = context.assets,
                config = OfflineTtsConfig(
                    model = OfflineTtsModelConfig(
                        vits = OfflineTtsVitsModelConfig(
                            model = "$dir/model.onnx",
                            tokens = "$dir/tokens.txt",
                            noiseScale = 0.667f,
                            noiseScaleW = 0.8f,
                            lengthScale = if (lang == Lang.AM) 1.05f else 1.0f,
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

    private fun textFor(lang: Lang, text: String): String {
        var t = text.replace("\n", " ")
        // MMS voices read characters, so symbols must be spelled out.
        t = t.replace("&", if (lang == Lang.AM) " እና " else " and ")
        if (catalog.ttsWantsRomanized(lang) || lang == Lang.EN && AmharicText.containsEthiopic(t)) {
            t = AmharicText.romanize(t)
        }
        return t.lowercase()
    }

    /** Speaks [text] and returns when playback has finished (or [stop] was called). */
    suspend fun speak(text: String, lang: Lang) {
        stopRequested = false
        val voice = voices[lang]
        if (voice != null) speakWithMms(voice, textFor(lang, text)) else speakWithSystem(text, lang)
        level = 0f
    }

    fun stop() {
        stopRequested = true
        systemTts?.stop()
    }

    private fun speakWithMms(voice: OfflineTts, text: String) {
        try {
            playMms(voice, text)
        } catch (e: Throwable) {
            Log.e(TAG, "MMS playback failed", e)
        }
    }

    private fun playMms(voice: OfflineTts, text: String) {
        val rate = voice.sampleRate()
        val minBuf = AudioTrack.getMinBufferSize(rate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_FLOAT)
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANT)
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
        track.play()
        var written = 0L
        try {
            // Sentences are synthesised one by one and played while the next is generated.
            voice.generateWithCallback(text = text, sid = 0, speed = 1.0f) { samples ->
                if (stopRequested) return@generateWithCallback 0
                var off = 0
                val chunk = rate / 20
                while (off < samples.size && !stopRequested) {
                    val n = minOf(chunk, samples.size - off)
                    var sum = 0f
                    for (i in off until off + n) sum += samples[i] * samples[i]
                    level = (sqrt(sum / n) * 6f).coerceIn(0f, 1f)
                    track.write(samples, off, n, AudioTrack.WRITE_BLOCKING)
                    off += n
                }
                written += samples.size
                if (stopRequested) 0 else 1
            }
            // Wait for the tail of the buffer to play out.
            while (!stopRequested && track.playbackHeadPosition < written) Thread.sleep(20)
        } catch (e: Throwable) {
            Log.e(TAG, "TTS failed", e)
        } finally {
            runCatching { track.stop() }
            track.release()
        }
    }

    private suspend fun ensureSystemTts(): TextToSpeech? {
        systemTts?.let { if (systemTtsReady) return it }
        return suspendCancellableCoroutine { cont ->
            var tts: TextToSpeech? = null
            tts = TextToSpeech(context) { status ->
                systemTtsReady = status == TextToSpeech.SUCCESS
                systemTts = tts
                if (cont.isActive) cont.resume(if (systemTtsReady) tts else null)
            }
        }
    }

    private suspend fun speakWithSystem(text: String, lang: Lang) {
        val tts = ensureSystemTts() ?: return
        val locale = if (lang == Lang.AM) Locale("am", "ET") else Locale.US
        tts.language = locale
        suspendCancellableCoroutine { cont ->
            val id = UUID.randomUUID().toString()
            tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) { level = 0.5f }
                override fun onDone(utteranceId: String?) { if (cont.isActive) cont.resume(Unit) }
                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) { if (cont.isActive) cont.resume(Unit) }
                override fun onStop(utteranceId: String?, interrupted: Boolean) { if (cont.isActive) cont.resume(Unit) }
            })
            val result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id)
            if (result != TextToSpeech.SUCCESS && cont.isActive) cont.resume(Unit)
            cont.invokeOnCancellation { tts.stop() }
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
