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

    /** A finished sentence. */
    data class Final(val text: String) : AsrEvent
}

/** All methods are called from one background thread. */
interface SpeechRecognizerEngine {
    fun accept(samples: FloatArray): List<AsrEvent>
    fun reset()
    fun release()
}

private fun threads() = Runtime.getRuntime().availableProcessors().coerceIn(2, 4)

/** English: streaming Zipformer transducer. Endpointing is built in; captions update as you speak. */
class StreamingEnglishRecognizer(assets: AssetManager) : SpeechRecognizerEngine {
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
                rule2 = EndpointRule(true, 1.0f, 0.0f),
                rule3 = EndpointRule(false, 0.0f, 20.0f),
            ),
            enableEndpoint = true,
            decodingMethod = "greedy_search",
        ),
    )
    private var stream: OnlineStream = recognizer.createStream()
    private var lastPartial = ""

    override fun accept(samples: FloatArray): List<AsrEvent> {
        val events = mutableListOf<AsrEvent>()
        stream.acceptWaveform(samples, SAMPLE_RATE)
        while (recognizer.isReady(stream)) recognizer.decode(stream)
        val text = recognizer.getResult(stream).text.trim().lowercase()
        if (text != lastPartial) {
            lastPartial = text
            if (text.isNotEmpty()) events += AsrEvent.Partial(text)
        }
        if (recognizer.isEndpoint(stream)) {
            if (text.isNotEmpty()) events += AsrEvent.Final(text)
            recognizer.reset(stream)
            lastPartial = ""
        }
        return events
    }

    override fun reset() {
        stream.release()
        stream = recognizer.createStream()
        lastPartial = ""
    }

    override fun release() {
        stream.release()
        recognizer.release()
    }
}

/**
 * Amharic (and English fallback): Silero VAD cuts the microphone stream into sentences and
 * Meta's Omnilingual ASR CTC model transcribes each one. Omnilingual ASR recognises Amharic in
 * Ge'ez script far better than small multilingual Whisper models.
 */
class VadOfflineRecognizer(assets: AssetManager) : SpeechRecognizerEngine {
    private val windowSize = 512
    private val vad = Vad(
        assetManager = assets,
        config = VadModelConfig(
            sileroVadModelConfig = SileroVadModelConfig(
                model = ModelCatalog.VAD,
                threshold = 0.5f,
                minSilenceDuration = 0.7f,
                minSpeechDuration = 0.25f,
                windowSize = windowSize,
                maxSpeechDuration = 20.0f,
            ),
            sampleRate = SAMPLE_RATE,
            numThreads = 1,
        ),
    )
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
    private var buffer = FloatArray(0)
    private var wasSpeech = false

    override fun accept(samples: FloatArray): List<AsrEvent> {
        val events = mutableListOf<AsrEvent>()
        buffer += samples
        var offset = 0
        while (buffer.size - offset >= windowSize) {
            vad.acceptWaveform(buffer.copyOfRange(offset, offset + windowSize))
            offset += windowSize
        }
        buffer = buffer.copyOfRange(offset, buffer.size)

        val speech = vad.isSpeechDetected()
        if (speech && !wasSpeech) events += AsrEvent.Partial("…")
        wasSpeech = speech

        while (!vad.empty()) {
            val segment = vad.front()
            vad.pop()
            val stream = recognizer.createStream()
            try {
                stream.acceptWaveform(segment.samples, SAMPLE_RATE)
                recognizer.decode(stream)
                val text = recognizer.getResult(stream).text.trim()
                if (text.isNotEmpty()) events += AsrEvent.Final(text)
            } finally {
                stream.release()
            }
        }
        return events
    }

    override fun reset() {
        vad.reset()
        buffer = FloatArray(0)
        wasSpeech = false
    }

    override fun release() {
        vad.release()
        recognizer.release()
    }
}
