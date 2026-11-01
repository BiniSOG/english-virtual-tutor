package com.binisog.voiceassistant.camera

import android.content.Context
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FallbackStrategy
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.io.File

/**
 * Records the front camera to an mp4 while the conversation runs. Video only: the microphone
 * is used by the speech recogniser, and its audio is saved separately as audio.wav.
 */
class CameraRecorder(private val context: Context) {
    private var videoCapture: VideoCapture<Recorder>? = null
    private var recording: Recording? = null
    private var pendingFile: File? = null
    var onStateChanged: (Boolean) -> Unit = {}

    /** Wall-clock time of the first recorded frame (to line up the audio). */
    @Volatile
    var startedAtMs: Long = 0
        private set
    private var finalized: kotlinx.coroutines.CompletableDeferred<Unit>? = null

    fun bind(owner: LifecycleOwner, previewView: PreviewView) {
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            try {
                val provider = future.get()
                val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
                val recorder = Recorder.Builder()
                    .setQualitySelector(QualitySelector.from(Quality.SD, FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)))
                    .build()
                val capture = VideoCapture.withOutput(recorder)
                provider.unbindAll()
                provider.bindToLifecycle(owner, CameraSelector.DEFAULT_FRONT_CAMERA, preview, capture)
                videoCapture = capture
                pendingFile?.let { pendingFile = null; start(it) }
            } catch (e: Exception) {
                Log.e(TAG, "Camera bind failed", e)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    fun start(file: File) {
        if (recording != null) return
        val capture = videoCapture ?: run { pendingFile = file; return }
        startedAtMs = 0
        val done = kotlinx.coroutines.CompletableDeferred<Unit>()
        finalized = done
        recording = capture.output
            .prepareRecording(context, FileOutputOptions.Builder(file).build())
            .start(ContextCompat.getMainExecutor(context)) { event ->
                when (event) {
                    is VideoRecordEvent.Start -> {
                        startedAtMs = System.currentTimeMillis()
                        onStateChanged(true)
                    }
                    is VideoRecordEvent.Finalize -> {
                        onStateChanged(false)
                        done.complete(Unit)
                        if (event.hasError()) Log.w(TAG, "Recording finished with error ${event.error}")
                    }
                }
            }
    }

    fun stop() {
        pendingFile = null
        recording?.stop()
        recording = null
    }

    /** Stops recording and waits until the mp4 file is complete. */
    suspend fun stopAndAwait() {
        val f = finalized
        stop()
        if (f != null) kotlinx.coroutines.withTimeoutOrNull(8000) { f.await() }
    }

    fun unbind() {
        stop()
        try {
            ProcessCameraProvider.getInstance(context).get().unbindAll()
        } catch (_: Exception) {
        }
        videoCapture = null
    }

    companion object {
        private const val TAG = "CameraRecorder"
    }
}
