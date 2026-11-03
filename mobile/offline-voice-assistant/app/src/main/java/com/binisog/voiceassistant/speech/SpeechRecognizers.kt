package com.binisog.voiceassistant.speech

import android.content.res.AssetManager
import com.k2fsa.sherpa.onnx.EndpointConfig
import com.k2fsa.sherpa.onnx.EndpointRule
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineOmnilingualAsrCtcModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import com.k2fsa.sherpa.onnx.OnlineModelConfig
import com.k2fsa.sherpa.onnx.OnlineRecognizer
import com.k2fsa.sherpa.onnx.OnlineRecognizerConfig
import com.k2fsa.sherpa.onnx.OnlineStream
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig
import com.k2fsa.sherpa.onnx.SileroVadModelConfig
import com.k2fsa.sherpa.onnx.Vad
import com.k2fsa.sherpa.onnx.VadModelConfig

const val SAMPLE_RATE = 16000

sealed interface AsrEvent {
    /** Live caption while the user is still talking. */
    data class Partial(val text: String) : AsrEvent

    /**
     * A finished sentence, as one or more transcriptions (best first). The dialogue picks the
     * one that answers the current question, e.g. the one that reads as a date at "date of birth".
     */
    data class Final(val alternatives: List<String>) : AsrEvent {
        val text: String get() = alternatives.firstOrNull().orEmpty()
    }
}

/** All methods are called from one background thread. */
interface SpeechRecognizerEngine {
    fun accept(samples: FloatArray): List<AsrEvent>
    fun reset()
    fun release()
}

private fun threads() = Runtime.getRuntime().availableProcessors().coerceIn(2, 4)

/**
 * Meta Omnilingual ASR (300M, CTC). Shared by both languages: it is the Amharic recogniser and
 * the second, more accent-robust opinion on English sentences.
 */
class Omnilingual(assets: AssetManager) {
    private val recognizer = OfflineRecognizer(
        assetManager = assets,
        config = OfflineRecognizerConfig(
            featConfig = FeatureConfig(sampleRate = SAMPLE_RATE, featureDim = 80),
            modelConfig = OfflineModelConfig(
                omnilingual = OfflineOmnilingualAsrCtcModelConfig(model = "${ModelCatalog.ASR_MULTI}/model.onnx"),
                tokens = "${ModelCatalog.ASR_MULTI}/tokens.txt",
                numThreads = threads(),
            ),
        ),
    )

    fun transcribe(samples: FloatArray): String {
        if (samples.size < SAMPLE_RATE / 5) return ""
        val stream = recognizer.createStream()
        return try {
            stream.acceptWaveform(normalizeLevel(samples), SAMPLE_RATE)
            recognizer.decode(stream)
            recognizer.getResult(stream).text.trim()
        } finally {
            stream.release()
        }
    }

    fun release() = recognizer.release()
}

/** Quiet phone speech is raised to a steady level before recognition (max 8x, no clipping). */
fun normalizeLevel(x: FloatArray): FloatArray {
    var sum = 0.0
    var peak = 0f
    for (v in x) { sum += v * v; peak = maxOf(peak, kotlin.math.abs(v)) }
    val rms = kotlin.math.sqrt(sum / x.size.coerceAtLeast(1)).toFloat()
    if (rms < 1e-5f || peak < 1e-4f) return x
    val gain = minOf(0.08f / rms, 0.95f / peak, 8f)
    if (gain in 0.9f..1.1f) return x
    return FloatArray(x.size) { x[it] * gain }
}

/** Keeps the last few seconds of microphone audio, addressable by absolute sample index. */
private class AudioRing(seconds: Int) {
    private val buf = FloatArray(SAMPLE_RATE * seconds)
    var total = 0L
        private set

    fun add(x: FloatArray) {
        for (v in x) { buf[(total % buf.size).toInt()] = v; total++ }
    }

    /** Samples [from, to) by absolute index, clipped to what is still in the ring. */
    fun slice(from: Long, to: Long): FloatArray {
        val a = maxOf(from, total - buf.size, 0L)
        val b = minOf(to, total)
        if (b <= a) return FloatArray(0)
        return FloatArray((b - a).toInt()) { buf[((a + it) % buf.size).toInt()] }
    }

    fun clear() { total = 0 }
}

private const val PAD_BEFORE = SAMPLE_RATE / 4   // 250 ms before speech: don't clip the first word
private const val PAD_AFTER = SAMPLE_RATE / 5    // 200 ms after

/**
 * English: streaming Zipformer for live captions and barge-in; each finished sentence is also
 * transcribed by Omnilingual (better with accents), and both are offered to the dialogue.
 */
class StreamingEnglishRecognizer(assets: AssetManager, private val omni: Omnilingual?) : SpeechRecognizerEngine {
    private val dir = ModelCatalog.ASR_EN
    private val recognizer = OnlineRecognizer(
        assetManager = assets,
        config = OnlineRecognizerConfig(
            featConfig = FeatureConfig(sampleRate = SAMPLE_RATE, featureDim = 80),
            modelConfig = OnlineModelConfig(
                transducer = OnlineTransducerModelConfig(
                    encoder = "$dir/encoder.onnx",
                    decoder = "$dir/decoder.onnx",
                    joiner = "$dir/joiner.onnx",
                ),
                tokens = "$dir/tokens.txt",
                numThreads = threads(),
                modelType = "zipformer",
            ),
            endpointConfig = EndpointConfig(
                rule1 = EndpointRule(false, 2.4f, 0.0f),
                rule2 = EndpointRule(true, 0.9f, 0.0f),
                rule3 = EndpointRule(false, 0.0f, 20.0f),
            ),
            enableEndpoint = true,
            // Keeps several hypotheses instead of only the single best token at each step.
            decodingMethod = "modified_beam_search",
            maxActivePaths = 4,
        ),
    )
    private var stream: OnlineStream = recognizer.createStream()
    private var lastPartial = ""
    private val ring = AudioRing(30)
    private var utteranceStart = 0L

    override fun accept(samples: FloatArray): List<AsrEvent> {
        val events = mutableListOf<AsrEvent>()
        ring.add(samples)
        stream.acceptWaveform(samples, SAMPLE_RATE)
        while (recognizer.isReady(stream)) recognizer.decode(stream)
        val text = recognizer.getResult(stream).text.trim().lowercase()
        if (text != lastPartial) {
            lastPartial = text
            if (text.isNotEmpty()) events += AsrEvent.Partial(text)
        }
        if (recognizer.isEndpoint(stream)) {
            if (text.isNotEmpty()) {
                val audio = ring.slice(utteranceStart - PAD_BEFORE, ring.total)
                val second = runCatching { omni?.transcribe(audio) }.getOrNull()?.lowercase().orEmpty()
                events += AsrEvent.Final(listOf(second, text).filter { it.isNotBlank() }.distinct())
            }
            recognizer.reset(stream)
            lastPartial = ""
            utteranceStart = ring.total
        }
        return events
    }

    override fun reset() {
        stream.release()
        stream = recognizer.createStream()
        lastPartial = ""
        utteranceStart = ring.total
    }

    override fun release() {
        stream.release()
        recognizer.release()
    }
}

/**
 * Amharic: Silero VAD finds each sentence, Omnilingual transcribes it with a little audio kept
 * before and after (so first and last syllables aren't cut off).
 */
class VadOfflineRecognizer(assets: AssetManager, private val omni: Omnilingual) : SpeechRecognizerEngine {
    private val windowSize = 512
    private val vad = Vad(
        assetManager = assets,
        config = VadModelConfig(
            sileroVadModelConfig = SileroVadModelConfig(
                model = ModelCatalog.VAD,
                threshold = 0.6f, // only clear speech starts a sentence
                minSilenceDuration = 0.6f,
                minSpeechDuration = 0.2f,
                windowSize = windowSize,
                maxSpeechDuration = 20.0f,
            ),
            sampleRate = SAMPLE_RATE,
            numThreads = 1,
        ),
    )
    private var buffer = FloatArray(0)
    private var wasSpeech = false
    private val ring = AudioRing(40)

    override fun accept(samples: FloatArray): List<AsrEvent> {
        val events = mutableListOf<AsrEvent>()
        buffer += samples
        var offset = 0
        while (buffer.size - offset >= windowSize) {
            val chunk = buffer.copyOfRange(offset, offset + windowSize)
            ring.add(chunk)
            vad.acceptWaveform(chunk)
            offset += windowSize
        }
        buffer = buffer.copyOfRange(offset, buffer.size)

        val speech = vad.isSpeechDetected()
        if (speech && !wasSpeech) events += AsrEvent.Partial("…")
        wasSpeech = speech

        while (!vad.empty()) {
            val segment = vad.front()
            vad.pop()
            // segment.start counts samples since the VAD was (re)started, like the ring.
            val padded = ring.slice(segment.start - PAD_BEFORE, segment.start + segment.samples.size + PAD_AFTER)
            val audio = if (padded.size >= segment.samples.size) padded else segment.samples
            val text = omni.transcribe(audio)
            if (text.isNotEmpty()) events += AsrEvent.Final(listOf(text))
        }
        return events
    }

    override fun reset() {
        vad.reset()
        ring.clear()
        buffer = FloatArray(0)
        wasSpeech = false
    }

    override fun release() {
        vad.release()
    }
}
