package com.binisog.voiceassistant.speech

import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sqrt

/**
 * Lets only loud, close speech through to speech recognition.
 *
 *  1. High-pass filter at ~100 Hz removes rumble, wind and handling noise.
 *  2. The background noise level is tracked continuously (it adapts to a quiet office or a busy
 *     street).
 *  3. Sound is passed only while it is clearly louder than that background (about +11 dB, and
 *     never below an absolute minimum), so TV, distant voices and traffic are silenced. A short
 *     hold keeps quiet word endings, and gain changes are smoothed to avoid clicks.
 */
class NoiseGate(private val sampleRate: Int = SAMPLE_RATE) {
    private val frame = sampleRate / 50 // 20 ms
    private val rc = 1.0 / (2 * PI * 100.0)
    private val alpha = (rc / (rc + 1.0 / sampleRate)).toFloat()
    private var hpIn = 0f
    private var hpOut = 0f

    /** Running background level (RMS). */
    var noiseFloor = 0.004f
        private set
    private var holdFrames = 0
    private var gain = 0f
    private val attack = 1f - exp(-1.0 / (0.003 * sampleRate)).toFloat()
    private val release = 1f - exp(-1.0 / (0.06 * sampleRate)).toFloat()

    /** True while the gate is passing speech (for the UI and for logging). */
    var open = false
        private set

    fun process(x: FloatArray): FloatArray {
        val y = FloatArray(x.size)
        // high-pass
        for (i in x.indices) {
            hpOut = alpha * (hpOut + x[i] - hpIn)
            hpIn = x[i]
            y[i] = hpOut
        }
        var start = 0
        while (start < y.size) {
            val end = minOf(start + frame, y.size)
            var sum = 0.0
            for (i in start until end) sum += y[i] * y[i]
            val rms = sqrt(sum / (end - start)).toFloat()
            // Background estimate: follows quiet frames quickly, loud frames very slowly.
            noiseFloor = if (rms < noiseFloor * 1.5f) noiseFloor * 0.9f + rms * 0.1f else noiseFloor * 1.002f
            noiseFloor = noiseFloor.coerceIn(0.0008f, 0.05f)
            val loud = rms > maxOf(noiseFloor * 3.5f, MIN_SPEECH_RMS)
            if (loud) holdFrames = HOLD_FRAMES else if (holdFrames > 0) holdFrames--
            open = holdFrames > 0
            val target = if (open) 1f else 0f
            for (i in start until end) {
                gain += (target - gain) * (if (target > gain) attack else release)
                y[i] *= gain
            }
            start = end
        }
        return y
    }

    fun reset() {
        holdFrames = 0
        gain = 0f
        open = false
    }

    companion object {
        /** Absolute minimum loudness of speech we accept (about -38 dBFS). */
        const val MIN_SPEECH_RMS = 0.012f
        private const val HOLD_FRAMES = 18 // 360 ms: keeps soft word endings
    }
}
