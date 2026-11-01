package com.binisog.voiceassistant.brain

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sqrt

/**
 * Turns a male synthetic voice into a natural-sounding female one, fully offline.
 *
 * A female voice differs from a male one in two ways: higher pitch (about 1.7-1.9x) and
 * slightly higher formants (vocal tract ~15% shorter). Just speeding the audio up shifts both
 * by the same amount ("chipmunk"). Here pitch is moved with TD-PSOLA and the formants with a
 * small resample, so each can be set independently while the duration stays the same.
 */
object VoiceShaper {

    /** Median fundamental frequency (Hz) of the voiced parts, or 0 if nothing is voiced. */
    fun medianPitch(x: FloatArray, sr: Int): Float {
        val periods = pitchTrack(x, sr).filter { it > 0 }
        if (periods.isEmpty()) return 0f
        val sorted = periods.sorted()
        return sr / sorted[sorted.size / 2].toFloat()
    }

    /**
     * Shift to a female voice: pitch to ~[targetPitchHz], formants up by [formantFactor].
     * Voices that are already high are returned unchanged.
     */
    fun feminize(x: FloatArray, sr: Int, targetPitchHz: Float = 205f, formantFactor: Float = 1.14f): FloatArray {
        val f0 = medianPitch(x, sr)
        if (f0 <= 0f || f0 >= 165f) return x
        val totalPitch = (targetPitchHz / f0).coerceIn(1.0f, 2.1f)
        return shift(x, sr, pitchFactor = totalPitch, formantFactor = formantFactor)
    }

    /** Independent pitch and formant scaling; output has the same length as the input. */
    fun shift(x: FloatArray, sr: Int, pitchFactor: Float, formantFactor: Float): FloatArray {
        if (x.size < sr / 20) return x
        // PSOLA does pitch / formantFactor and stretches time by formantFactor; the resample
        // afterwards multiplies pitch and formants by formantFactor and restores the duration.
        val stretched = psola(x, sr, pitchFactor / formantFactor, formantFactor)
        val out = resample(stretched, formantFactor, x.size)
        // Keep loudness the same as the input.
        val inRms = rms(x)
        val outRms = rms(out)
        if (outRms > 1e-6f) {
            val g = (inRms / outRms).coerceIn(0.3f, 3f)
            for (i in out.indices) out[i] = (out[i] * g).coerceIn(-1f, 1f)
        }
        return out
    }

    // ------------------------------------------------------------------ analysis

    private fun rms(x: FloatArray): Float {
        var s = 0.0
        for (v in x) s += v * v
        return sqrt(s / x.size.coerceAtLeast(1)).toFloat()
    }

    /**
     * Pitch period (samples at [sr]) every 10 ms; 0 = unvoiced. The analysis itself runs at
     * ~8 kHz to keep it cheap on phones (24 kHz system voices would otherwise cost 3x9 more).
     */
    internal fun pitchTrack(x: FloatArray, sr: Int): IntArray {
        val d = (sr / 8000).coerceAtLeast(1)
        if (d == 1) return pitchTrackAt(x, sr)
        val low = FloatArray(x.size / d) { i ->
            var s = 0f
            for (j in 0 until d) s += x[i * d + j]
            s / d
        }
        val periods = pitchTrackAt(low, sr / d)
        // pitchTrackAt reports one value per 10 ms, the same frame grid as the full rate.
        return IntArray(periods.size) { periods[it] * d }
    }

    private fun pitchTrackAt(x: FloatArray, sr: Int): IntArray {
        val hop = sr / 100
        val win = (sr * 0.04).toInt()
        val minLag = sr / 400
        val maxLag = sr / 65
        val frames = (x.size / hop).coerceAtLeast(1)
        val out = IntArray(frames)
        val globalRms = rms(x)
        for (f in 0 until frames) {
            val start = f * hop - win / 2
            if (start < 0 || start + win + maxLag >= x.size) continue
            var e0 = 0.0
            for (i in 0 until win) e0 += x[start + i] * x[start + i]
            if (sqrt(e0 / win) < globalRms * 0.25) continue
            var best = 0.0
            var bestLag = 0
            for (lag in minLag..maxLag) {
                var num = 0.0
                var e1 = 0.0
                for (i in 0 until win) {
                    val a = x[start + i]
                    val b = x[start + i + lag]
                    num += a * b
                    e1 += b * b
                }
                val r = num / sqrt(e0 * e1 + 1e-12)
                if (r > best) { best = r; bestLag = lag }
            }
            if (best > 0.5) out[f] = bestLag
        }
        // Prefer the shortest strong lag (avoid octave errors), then median-smooth.
        for (f in out.indices) {
            val p = out[f]
            if (p == 0) continue
            val half = p / 2
            if (half >= minLag) {
                val start = f * hop - win / 2
                if (start >= 0 && start + win + p < x.size) {
                    var num = 0.0; var e0 = 0.0; var e1 = 0.0
                    for (i in 0 until win) {
                        val a = x[start + i]; val b = x[start + i + half]
                        num += a * b; e0 += a * a; e1 += b * b
                    }
                    if (num / sqrt(e0 * e1 + 1e-12) > 0.85) out[f] = half
                }
            }
        }
        val smoothed = out.copyOf()
        for (f in 1 until out.size - 1) {
            val a = out[f - 1]; val b = out[f]; val c = out[f + 1]
            if (a > 0 && b > 0 && c > 0) smoothed[f] = listOf(a, b, c).sorted()[1]
        }
        return smoothed
    }

    // ------------------------------------------------------------------ TD-PSOLA

    private fun psola(x: FloatArray, sr: Int, pitchFactor: Float, timeFactor: Float): FloatArray {
        val hop = sr / 100
        val track = pitchTrack(x, sr)
        val unvoicedStep = sr / 200
        fun periodAt(t: Int): Int = track.getOrElse((t / hop).coerceIn(0, track.size - 1)) { 0 }

        // Analysis marks: one per pitch period in voiced parts, aligned to the waveform peak.
        val marks = ArrayList<Int>()
        val markPeriod = ArrayList<Int>()
        val markVoiced = ArrayList<Boolean>()
        var t = 0
        while (t < x.size) {
            val p = periodAt(t)
            if (p > 0) {
                var best = t
                var bestV = -1f
                val r = p / 4
                for (i in (t - r).coerceAtLeast(0)..(t + r).coerceAtMost(x.size - 1)) {
                    val v = abs(x[i])
                    if (v > bestV) { bestV = v; best = i }
                }
                val m = if (marks.isNotEmpty() && best <= marks.last()) t else best
                marks += m; markPeriod += p; markVoiced += true
                t = m + p
            } else {
                marks += t; markPeriod += unvoicedStep; markVoiced += false
                t += unvoicedStep
            }
        }

        val outLen = (x.size * timeFactor).roundToInt()
        val y = FloatArray(outLen)
        val w = FloatArray(outLen)
        var ts = 0.0
        var k = 0
        while (ts < outLen) {
            val tin = ts / timeFactor
            while (k + 1 < marks.size && abs(marks[k + 1] - tin) <= abs(marks[k] - tin)) k++
            val center = marks[k]
            val p = markPeriod[k]
            val voiced = markVoiced[k]
            val outCenter = ts.roundToInt()
            for (i in -p until p) {
                val src = center + i
                val dst = outCenter + i
                if (src < 0 || src >= x.size || dst < 0 || dst >= outLen) continue
                val hann = (0.5 - 0.5 * cos(PI * (i + p) / p)).toFloat()
                y[dst] += x[src] * hann
                w[dst] += hann
            }
            ts += if (voiced) p / pitchFactor.toDouble() else p.toDouble()
        }
        for (i in y.indices) if (w[i] > 0.1f) y[i] /= w[i]
        return y
    }

    /** Reads [x] [factor] times faster (linear interpolation, light anti-alias) into [outLen] samples. */
    private fun resample(x: FloatArray, factor: Float, outLen: Int): FloatArray {
        val src = if (factor > 1f) {
            // 3-tap smoothing before decimating to reduce aliasing.
            FloatArray(x.size) { i ->
                0.25f * x[(i - 1).coerceAtLeast(0)] + 0.5f * x[i] + 0.25f * x[(i + 1).coerceAtMost(x.size - 1)]
            }
        } else x
        val out = FloatArray(outLen)
        for (i in 0 until outLen) {
            val pos = i * factor
            val i0 = pos.toInt()
            if (i0 >= src.size - 1) break
            val frac = pos - i0
            out[i] = src[i0] * (1 - frac) + src[i0 + 1] * frac
        }
        return out
    }

    /** Generic linear resampler between sample rates (for mixing voices into the 16 kHz recording). */
    fun convertRate(x: FloatArray, from: Int, to: Int): FloatArray {
        if (from == to) return x
        val outLen = (x.size.toLong() * to / from).toInt()
        val step = from.toDouble() / to
        return FloatArray(outLen) { i ->
            val pos = i * step
            val i0 = pos.toInt().coerceAtMost(x.size - 1)
            val i1 = (i0 + 1).coerceAtMost(x.size - 1)
            val frac = (pos - i0).toFloat()
            x[i0] * (1 - frac) + x[i1] * frac
        }
    }
}
