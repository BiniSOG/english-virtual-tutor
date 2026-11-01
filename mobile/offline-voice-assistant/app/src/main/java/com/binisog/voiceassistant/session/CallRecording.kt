package com.binisog.voiceassistant.session

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.util.Log
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Builds the final call video: the front-camera video plus one audio track that contains both
 * sides of the conversation – the customer's microphone and the assistant's voice, placed at the
 * moment each was heard.
 *
 * The camera records video only (the microphone is busy with speech recognition), so the
 * audio is mixed here from audio.wav and the assistant's played samples, AAC-encoded and muxed.
 */
class CallRecording(private val sampleRate: Int) {
    private class Clip(val offset: Long, val samples: FloatArray)

    private val agentClips = ArrayList<Clip>()

    /** Samples written to audio.wav so far: the shared timeline. */
    @Volatile
    var micSamples: Long = 0
        private set

    /** Wall-clock times used to line the audio up with the video. */
    @Volatile
    var micStartedAtMs: Long = 0
    @Volatile
    var videoStartedAtMs: Long = 0

    fun onMic(count: Int) {
        if (micStartedAtMs == 0L) micStartedAtMs = System.currentTimeMillis() - count * 1000L / sampleRate
        micSamples += count
    }

    @Synchronized
    fun onAgent(samples: FloatArray) {
        // Agent audio may start before the next mic block arrives; consecutive blocks follow each other.
        val last = agentClips.lastOrNull()
        val offset = if (last != null && last.offset + last.samples.size >= micSamples - sampleRate / 5) {
            last.offset + last.samples.size
        } else micSamples
        agentClips += Clip(offset, samples)
    }

    /** Mixes everything and writes [out]. Returns true on success. Runs for a few seconds. */
    fun export(video: File, micWav: File, out: File): Boolean = try {
        val mic = readWav16(micWav)
        val total = maxOf(mic.size.toLong(), synchronized(this) { agentClips.maxOfOrNull { it.offset + it.samples.size } ?: 0L })
        val mix = FloatArray(total.toInt())
        for (i in mic.indices) mix[i] = mic[i]
        synchronized(this) {
            // The phone speaker leaks into the microphone while the assistant talks; the customer
            // isn't speaking then (the call is half duplex), so duck the mic to avoid an echo.
            for (c in agentClips) for (i in c.samples.indices) {
                val p = (c.offset + i).toInt()
                if (p < mic.size) mix[p] = mic[p] * 0.12f
            }
            for (c in agentClips) for (i in c.samples.indices) {
                val p = (c.offset + i).toInt()
                if (p < mix.size) mix[p] += c.samples[i] * 0.9f
            }
        }
        // Line up with the video: drop or pad audio so t=0 matches the first video frame.
        val shift = if (videoStartedAtMs > 0 && micStartedAtMs > 0) (micStartedAtMs - videoStartedAtMs) * sampleRate / 1000 else 0L
        val aligned = when {
            shift > 0 -> FloatArray(shift.toInt()) + mix
            shift < 0 -> mix.copyOfRange((-shift).toInt().coerceAtMost(mix.size), mix.size)
            else -> mix
        }
        val pcm = ShortArray(aligned.size) { (aligned[it].coerceIn(-1f, 1f) * 32767).toInt().toShort() }
        if (video.length() > 0) mux(video, pcm, out) else false
    } catch (e: Throwable) {
        Log.e(TAG, "export failed", e)
        false
    }

    private fun readWav16(f: File): FloatArray {
        if (!f.exists() || f.length() <= 44) return FloatArray(0)
        val bytes = RandomAccessFile(f, "r").use { r -> ByteArray(r.length().toInt()).also { r.readFully(it) } }
        val bb = ByteBuffer.wrap(bytes, 44, bytes.size - 44).order(ByteOrder.LITTLE_ENDIAN)
        return FloatArray((bytes.size - 44) / 2) { bb.short / 32768f }
    }

    private fun mux(video: File, pcm: ShortArray, out: File): Boolean {
        val extractor = MediaExtractor()
        extractor.setDataSource(video.path)
        val vIndex = (0 until extractor.trackCount).firstOrNull {
            extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("video/") == true
        } ?: return false
        val vFormat = extractor.getTrackFormat(vIndex)
        extractor.selectTrack(vIndex)

        val muxer = MediaMuxer(out.path, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
        if (vFormat.containsKey("rotation-degrees")) muxer.setOrientationHint(vFormat.getInteger("rotation-degrees"))

        val aFormat = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, 1).apply {
            setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
            setInteger(MediaFormat.KEY_BIT_RATE, 64_000)
            setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 16_384)
        }
        val encoder = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
        encoder.configure(aFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
        encoder.start()

        var audioTrack = -1
        var videoTrack = -1
        var started = false
        val info = MediaCodec.BufferInfo()
        var fed = 0
        var inputDone = false
        var outputDone = false
        while (!outputDone) {
            if (!inputDone) {
                val inIdx = encoder.dequeueInputBuffer(10_000)
                if (inIdx >= 0) {
                    val buf = encoder.getInputBuffer(inIdx)!!
                    buf.clear()
                    val n = minOf(buf.remaining() / 2, pcm.size - fed, 2048)
                    val ptsUs = fed * 1_000_000L / sampleRate
                    if (n <= 0) {
                        encoder.queueInputBuffer(inIdx, 0, 0, ptsUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                        inputDone = true
                    } else {
                        val bb = buf.order(ByteOrder.LITTLE_ENDIAN)
                        for (i in 0 until n) bb.putShort(pcm[fed + i])
                        encoder.queueInputBuffer(inIdx, 0, n * 2, ptsUs, 0)
                        fed += n
                    }
                }
            }
            val outIdx = encoder.dequeueOutputBuffer(info, 10_000)
            when {
                outIdx == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                    audioTrack = muxer.addTrack(encoder.outputFormat)
                    videoTrack = muxer.addTrack(vFormat)
                    muxer.start()
                    started = true
                }
                outIdx >= 0 -> {
                    val buf = encoder.getOutputBuffer(outIdx)!!
                    val isConfig = info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0
                    if (started && info.size > 0 && !isConfig) muxer.writeSampleData(audioTrack, buf, info)
                    encoder.releaseOutputBuffer(outIdx, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) outputDone = true
                }
            }
        }
        encoder.stop()
        encoder.release()
        if (!started) { muxer.release(); extractor.release(); return false }

        val maxSize = if (vFormat.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) vFormat.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE) else 2 * 1024 * 1024
        val vbuf = ByteBuffer.allocate(maxOf(maxSize, 512 * 1024))
        val vinfo = MediaCodec.BufferInfo()
        val firstPts = extractor.sampleTime.coerceAtLeast(0)
        while (true) {
            vinfo.size = extractor.readSampleData(vbuf, 0)
            if (vinfo.size < 0) break
            vinfo.offset = 0
            vinfo.presentationTimeUs = extractor.sampleTime - firstPts
            vinfo.flags = if (extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0) MediaCodec.BUFFER_FLAG_KEY_FRAME else 0
            muxer.writeSampleData(videoTrack, vbuf, vinfo)
            extractor.advance()
        }
        muxer.stop()
        muxer.release()
        extractor.release()
        return out.length() > 0
    }

    companion object {
        private const val TAG = "CallRecording"
    }
}
