package com.binisog.voiceassistant.session

import android.content.Context
import com.binisog.voiceassistant.brain.Profile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.RandomAccessFile
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * One folder per call under Android/data/<app>/files/sessions/:
 * video.mp4 (front camera), audio.wav (microphone), session.json (answers + transcript).
 */
class SessionStore(private val context: Context) {

    val root: File get() = File(context.getExternalFilesDir(null) ?: context.filesDir, "sessions").apply { mkdirs() }

    fun newSession(): File {
        val name = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        return File(root, name).apply { mkdirs() }
    }

    companion object {
        /** Camera video with both voices mixed in (built when the call ends). */
        const val CALL_VIDEO = "call_recording.mp4"
    }

    fun list(): List<File> = root.listFiles { f -> f.isDirectory }?.sortedByDescending { it.name } ?: emptyList()

    fun saveJson(dir: File, lang: String, profile: Profile, transcript: List<Pair<String, String>>, completed: Boolean) {
        val json = JSONObject().apply {
            put("language", lang)
            put("completed", completed)
            put("savedAt", Date().toString())
            put("profile", JSONObject().apply {
                put("fullName", profile.fullName)
                put("dateOfBirth", profile.dateOfBirth?.toString())
                put("dobGivenInEthiopianCalendar", profile.dobGivenInEthiopianCalendar)
                put("birthCity", profile.birthCity)
                put("nationality", profile.nationality)
                put("accountType", profile.accountType?.name)
                put("fan", profile.fan)
                put("accountNumber", profile.accountNumber)
            })
            put("transcript", JSONArray().apply {
                transcript.forEach { (who, text) -> put(JSONObject().put("speaker", who).put("text", text)) }
            })
        }
        File(dir, "session.json").writeText(json.toString(2))
    }
}

/** Streams 16-bit mono PCM to a .wav file; the header is fixed up on close. */
class WavWriter(file: File, private val sampleRate: Int) {
    private val raf = RandomAccessFile(file, "rw").apply { setLength(0); write(ByteArray(44)) }
    private var dataBytes = 0L
    private var closed = false

    @Synchronized
    fun write(samples: FloatArray) {
        if (closed) return
        val bytes = ByteArray(samples.size * 2)
        for (i in samples.indices) {
            val v = (samples[i].coerceIn(-1f, 1f) * 32767).toInt()
            bytes[2 * i] = (v and 0xff).toByte()
            bytes[2 * i + 1] = (v shr 8 and 0xff).toByte()
        }
        raf.write(bytes)
        dataBytes += bytes.size
    }

    @Synchronized
    fun close() {
        if (closed) return
        closed = true
        fun le32(v: Long) = byteArrayOf((v and 0xff).toByte(), (v shr 8 and 0xff).toByte(), (v shr 16 and 0xff).toByte(), (v shr 24 and 0xff).toByte())
        fun le16(v: Int) = byteArrayOf((v and 0xff).toByte(), (v shr 8 and 0xff).toByte())
        raf.seek(0)
        raf.write("RIFF".toByteArray()); raf.write(le32(36 + dataBytes)); raf.write("WAVE".toByteArray())
        raf.write("fmt ".toByteArray()); raf.write(le32(16)); raf.write(le16(1)); raf.write(le16(1))
        raf.write(le32(sampleRate.toLong())); raf.write(le32(sampleRate * 2L)); raf.write(le16(2)); raf.write(le16(16))
        raf.write("data".toByteArray()); raf.write(le32(dataBytes))
        raf.close()
    }
}
