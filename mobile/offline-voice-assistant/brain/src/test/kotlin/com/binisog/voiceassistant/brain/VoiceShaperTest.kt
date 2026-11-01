package com.binisog.voiceassistant.brain

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.sin
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class VoiceShaperTest {
    /** Vowel-like male voice: 110 Hz glottal pulses through two damped formant resonances. */
    private fun maleVowel(sr: Int, seconds: Double, f0: Double = 110.0): FloatArray {
        val n = (sr * seconds).toInt()
        val out = FloatArray(n)
        val period = sr / f0
        var next = 0.0
        while (next < n) {
            val start = next.toInt()
            for (i in 0 until (sr * 0.02).toInt()) {
                if (start + i >= n) break
                val t = i.toDouble() / sr
                out[start + i] += (0.6 * exp(-t * 300) * sin(2 * PI * 700 * t) + 0.4 * exp(-t * 400) * sin(2 * PI * 1200 * t)).toFloat()
            }
            next += period
        }
        return out
    }

    @Test fun detectsPitch() {
        val sr = 16000
        val f0 = VoiceShaper.medianPitch(maleVowel(sr, 1.0), sr)
        assertTrue(abs(f0 - 110f) < 6f, "f0=$f0")
    }

    @Test fun feminizesWithoutChangingDuration() {
        val sr = 16000
        val x = maleVowel(sr, 1.5)
        val y = VoiceShaper.feminize(x, sr)
        assertEquals(x.size, y.size)
        val f0 = VoiceShaper.medianPitch(y, sr)
        assertTrue(abs(f0 - 205f) < 20f, "f0 after=$f0")
        assertTrue(y.all { it.isFinite() })
    }

    @Test fun worksAt24k() {
        val sr = 24000
        val y = VoiceShaper.feminize(maleVowel(sr, 1.2), sr)
        val f0 = VoiceShaper.medianPitch(y, sr)
        assertTrue(abs(f0 - 205f) < 25f, "f0 after=$f0")
    }

    @Test fun leavesFemaleVoiceAlone() {
        val sr = 16000
        val x = maleVowel(sr, 1.0, f0 = 210.0)
        assertTrue(VoiceShaper.feminize(x, sr) === x)
    }

    @Test fun convertsRate() {
        val x = FloatArray(24000) { sin(2 * PI * 440 * it / 24000.0).toFloat() }
        assertEquals(16000, VoiceShaper.convertRate(x, 24000, 16000).size)
    }
}
