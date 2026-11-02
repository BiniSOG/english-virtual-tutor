package com.binisog.voiceassistant.speech

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log

/** Reads 16 kHz mono audio from the microphone on its own thread. */
class MicCapture(private val onSamples: (FloatArray) -> Unit) {
    @Volatile
    private var running = false
    private var thread: Thread? = null

    @SuppressLint("MissingPermission") // checked by the caller before starting a call
    fun start(): Boolean {
        if (running) return true
        val minBuf = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        // VOICE_COMMUNICATION turns on the phone's echo canceller and noise suppressor, so the
        // first word after Hana stops talking isn't lost in the tail of her voice.
        val record = try {
            AudioRecord(
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                maxOf(minBuf, SAMPLE_RATE / 5 * 2),
            )
        } catch (e: Exception) {
            Log.e("MicCapture", "AudioRecord failed", e); return false
        }
        if (record.state != AudioRecord.STATE_INITIALIZED) { record.release(); return false }
        running = true
        thread = Thread({
            val buf = ShortArray(SAMPLE_RATE / 10) // 100 ms
            record.startRecording()
            try {
                while (running) {
                    val n = record.read(buf, 0, buf.size)
                    if (n > 0) onSamples(FloatArray(n) { buf[it] / 32768f })
                }
            } finally {
                record.stop()
                record.release()
            }
        }, "mic").apply { start() }
        return true
    }

    fun stop() {
        running = false
        thread?.join(500)
        thread = null
    }
}
