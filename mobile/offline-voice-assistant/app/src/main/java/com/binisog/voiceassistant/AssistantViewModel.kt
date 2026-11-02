package com.binisog.voiceassistant

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.binisog.voiceassistant.brain.AccountOpeningAgent
import com.binisog.voiceassistant.brain.AgentEvent
import com.binisog.voiceassistant.brain.Lang
import com.binisog.voiceassistant.brain.Profile
import com.binisog.voiceassistant.brain.Reply
import com.binisog.voiceassistant.brain.Step
import com.binisog.voiceassistant.brain.Understanding
import com.binisog.voiceassistant.camera.CameraRecorder
import com.binisog.voiceassistant.session.CallRecording
import com.binisog.voiceassistant.session.SessionStore
import com.binisog.voiceassistant.session.WavWriter
import com.binisog.voiceassistant.speech.AsrEvent
import com.binisog.voiceassistant.speech.MicCapture
import com.binisog.voiceassistant.speech.ModelCatalog
import com.binisog.voiceassistant.speech.SAMPLE_RATE
import com.binisog.voiceassistant.speech.SpeechRecognizerEngine
import com.binisog.voiceassistant.speech.StreamingEnglishRecognizer
import com.binisog.voiceassistant.speech.VadOfflineRecognizer
import com.binisog.voiceassistant.speech.VoiceOutput
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate
import java.util.concurrent.Executors

enum class Screen { HOME, RINGING, CALL, SESSIONS }

data class UiState(
    val screen: Screen = Screen.HOME,
    val lang: Lang = Lang.EN,
    val modelsLoading: Boolean = false,
    val modelsMessage: String = "",
    val modelSummary: String = "",
    val step: Step = Step.GREETING,
    val assistantText: String = "",
    val liveCaption: String = "",
    val lastHeard: String = "",
    val pendingValue: String? = null,
    val digitBuffer: String = "",
    val speaking: Boolean = false,
    val micOn: Boolean = false,
    val micMuted: Boolean = false,
    val recording: Boolean = false,
    val otpBanner: String? = null,
    val profile: Profile = Profile(),
    val creatingProgress: Int = 0,
    val sessionDir: String? = null,
    val error: String? = null,
    val lastCrash: String? = null,
    /** Keyboard/buttons fallback; the call is voice-only unless the user turns this on. */
    val typing: Boolean = false,
    /** Subtitles of what the assistant says (off by default, like a normal call). */
    val captions: Boolean = false,
    val callStartedAt: Long = 0,
    val savingVideo: Boolean = false,
    val callVideo: String? = null,
)

class AssistantViewModel(app: Application) : AndroidViewModel(app) {

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state

    val catalog = ModelCatalog(app.assets)
    val camera = CameraRecorder(app).apply { onStateChanged = { rec -> _state.update { it.copy(recording = rec) } } }
    val sessions = SessionStore(app)
    private val voice = VoiceOutput(app, catalog)

    // sherpa-onnx objects live on one thread each.
    private val asrDispatcher = Executors.newSingleThreadExecutor { Thread(it, "asr") }.asCoroutineDispatcher()
    private val ttsDispatcher = Executors.newSingleThreadExecutor { Thread(it, "tts") }.asCoroutineDispatcher()

    private val recognizers = java.util.concurrent.ConcurrentHashMap<Lang, SpeechRecognizerEngine>()
    private var agent: AccountOpeningAgent? = null
    private var mic: MicCapture? = null
    private var wav: WavWriter? = null
    private var sessionDir: File? = null
    private val transcript = mutableListOf<Pair<String, String>>()
    private var speakJob: Job? = null
    private var loadJob: Job? = null
    private var silenceJob: Job? = null
    private var callRecording: CallRecording? = null
    private var ringer: android.media.Ringtone? = null
    private var ringTimeout: Job? = null
    @Volatile private var lastActivity = System.currentTimeMillis()
    private var silentReprompts = 0

    @Volatile private var speaking = false
    @Volatile private var muted = false
    @Volatile private var activeLang = Lang.EN
    @Volatile private var resetAfterSpeech = false

    val speakingLevel: Float get() = voice.level

    init {
        val crash = AssistantApp.crashFile(app).takeIf { it.exists() }?.readText()
        _state.update { it.copy(modelSummary = catalog.summary(), lastCrash = crash) }
        loadModels(Lang.EN)
    }

    // ------------------------------------------------------------------ models

    private fun loadModels(lang: Lang): Job {
        loadJob?.let { if (it.isActive) return it }
        val job = viewModelScope.launch {
            _state.update { it.copy(modelsLoading = true, modelsMessage = com.binisog.voiceassistant.ui.tr(lang, "Loading offline voice models…", "የድምፅ ሞዴሎች እየተጫኑ ነው…")) }
            try {
                withContext(asrDispatcher) {
                    // Keep memory low on small phones: only one language's recogniser at a time.
                    recognizers.keys.filter { it != lang }.forEach { recognizers.remove(it)?.release() }
                    if (!recognizers.containsKey(lang)) {
                        val engine = when {
                            lang == Lang.EN && catalog.hasStreamingEnglish -> StreamingEnglishRecognizer(getApplication<Application>().assets)
                            catalog.hasOmnilingual && catalog.hasVad -> VadOfflineRecognizer(getApplication<Application>().assets)
                            else -> null
                        }
                        if (engine != null) recognizers[lang] = engine
                    }
                }
                withContext(ttsDispatcher) {
                    val keep = voice.voicesNeededFor(lang)
                    Lang.entries.filter { it !in keep }.forEach { voice.releaseVoice(it) }
                    voice.prepare(lang)
                }
                val missing = !recognizers.containsKey(lang)
                _state.update {
                    it.copy(
                        modelsLoading = false,
                        modelsMessage = if (missing) "Speech models are not bundled in this build – you can still type your answers." else "",
                    )
                }
            } catch (e: Throwable) {
                Log.e(TAG, "model load failed", e)
                _state.update { it.copy(modelsLoading = false, modelsMessage = "Could not load voice models: ${e.message}") }
            }
        }
        loadJob = job
        return job
    }

    fun selectLanguage(lang: Lang) {
        if (_state.value.lang == lang && recognizers.containsKey(lang)) return
        activeLang = lang
        _state.update { it.copy(lang = lang) }
        loadJob?.cancel()
        loadJob = null
        loadModels(lang)
    }

    // ------------------------------------------------------------------ call lifecycle

    // ------------------------------------------------------------------ incoming call

    /** "Create account" rings the phone like a real incoming video call. */
    fun requestCall() {
        _state.update { it.copy(screen = Screen.RINGING) }
        val ctx = getApplication<Application>()
        runCatching {
            val uri = android.media.RingtoneManager.getActualDefaultRingtoneUri(ctx, android.media.RingtoneManager.TYPE_RINGTONE)
                ?: android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE)
            ringer = android.media.RingtoneManager.getRingtone(ctx, uri)?.apply {
                if (android.os.Build.VERSION.SDK_INT >= 28) isLooping = true
                play()
            }
        }
        runCatching {
            val vib = ctx.getSystemService(android.os.Vibrator::class.java)
            vib?.vibrate(android.os.VibrationEffect.createWaveform(longArrayOf(0, 600, 900), 0))
        }
        ringTimeout?.cancel()
        ringTimeout = viewModelScope.launch { delay(45_000); declineCall() }
    }

    private fun stopRinging() {
        ringTimeout?.cancel()
        runCatching { ringer?.stop() }
        ringer = null
        runCatching { getApplication<Application>().getSystemService(android.os.Vibrator::class.java)?.cancel() }
    }

    fun acceptCall() {
        stopRinging()
        startCall()
    }

    fun declineCall() {
        stopRinging()
        _state.update { it.copy(screen = Screen.HOME) }
    }

    fun toggleCaptions() = _state.update { it.copy(captions = !it.captions) }

    fun startCall() {
        val lang = _state.value.lang
        activeLang = lang
        transcript.clear()
        val dir = sessions.newSession()
        sessionDir = dir
        wav = WavWriter(File(dir, "audio.wav"), SAMPLE_RATE)
        val rec = CallRecording(SAMPLE_RATE)
        callRecording = rec
        voice.onAgentAudio = { rec.onAgent(it) }
        val a = AccountOpeningAgent(initialLang = lang)
        agent = a
        _state.update {
            UiState(
                screen = Screen.CALL, lang = lang, modelSummary = it.modelSummary,
                modelsLoading = it.modelsLoading, modelsMessage = it.modelsMessage, sessionDir = dir.absolutePath,
                callStartedAt = System.currentTimeMillis(), captions = it.captions,
            )
        }
        camera.start(File(dir, "video.mp4"))
        viewModelScope.launch {
            loadModels(lang).join()
            val ok = (mic ?: MicCapture(::onAudio).also { mic = it }).start()
            _state.update { it.copy(micOn = ok, error = if (ok) null else "Microphone unavailable") }
            apply(a.start())
            watchSilence()
        }
    }

    fun endCall() {
        agent?.let { if (it.step != Step.DONE && it.step != Step.CANCELLED) apply(it.cancel(), speakIt = false) }
        voice.stop()
        speakJob?.cancel()
        _state.update { it.copy(screen = Screen.HOME) }
        viewModelScope.launch {
            finalizeRecording()
            camera.unbind()
        }
    }

    /**
     * Ends the session: stops the microphone and camera, saves the answers, and builds
     * call_recording.mp4 with both voices on the video.
     */
    private suspend fun finalizeRecording() {
        silenceJob?.cancel()
        mic?.stop()
        mic = null
        wav?.close()
        wav = null
        voice.onAgentAudio = null
        val a = agent
        val dir = sessionDir
        if (a != null && dir != null) {
            runCatching { sessions.saveJson(dir, a.lang.code, a.profile, transcript, a.step == Step.DONE) }
        }
        viewModelScope.launch(asrDispatcher) { recognizers[activeLang]?.reset() }
        _state.update { it.copy(micOn = false) }
        val rec = callRecording ?: return
        callRecording = null
        camera.stopAndAwait()
        if (dir == null) return
        rec.videoStartedAtMs = camera.startedAtMs
        _state.update { it.copy(savingVideo = true) }
        val out = File(dir, SessionStore.CALL_VIDEO)
        val ok = withContext(Dispatchers.IO) { rec.export(File(dir, "video.mp4"), File(dir, "audio.wav"), out) }
        if (ok) File(dir, "video.mp4").delete()
        Log.i("CallRecording", "saved ok=$ok path=${out.absolutePath} size=${out.length()} video=${camera.startedAtMs > 0}")
        _state.update { it.copy(savingVideo = false, callVideo = if (ok) out.absolutePath else null) }
    }

    fun dismissCrash() {
        AssistantApp.crashFile(getApplication()).delete()
        _state.update { it.copy(lastCrash = null) }
    }

    fun showSessions() = _state.update { it.copy(screen = Screen.SESSIONS) }
    fun goHome() {
        if (_state.value.screen == Screen.CALL) camera.unbind()
        _state.update { it.copy(screen = Screen.HOME) }
    }

    // ------------------------------------------------------------------ audio in

    private fun onAudio(samples: FloatArray) {
        wav?.write(samples)
        callRecording?.onMic(samples.size)
        // Half duplex: don't transcribe the assistant's own voice.
        if (speaking || muted) return
        viewModelScope.launch(asrDispatcher) {
            val engine = recognizers[activeLang] ?: return@launch
            if (resetAfterSpeech) { engine.reset(); resetAfterSpeech = false }
            val events = try { engine.accept(samples) } catch (e: Throwable) { Log.e(TAG, "asr", e); emptyList() }
            for (e in events) withContext(Dispatchers.Main) {
                when (e) {
                    is AsrEvent.Partial -> {
                        lastActivity = System.currentTimeMillis()
                        _state.update { it.copy(liveCaption = e.text) }
                    }
                    is AsrEvent.Final -> onUserText(e.text, typed = false)
                }
            }
        }
    }

    fun toggleTyping() = _state.update { it.copy(typing = !it.typing) }

    /**
     * Voice-first: after the assistant finishes speaking it listens. If the customer says nothing
     * for a while, it asks the question again (twice at most, then waits quietly).
     */
    private fun watchSilence() {
        silenceJob?.cancel()
        silentReprompts = 0
        silenceJob = viewModelScope.launch {
            while (isActive) {
                delay(1000)
                val a = agent ?: break
                val st = _state.value
                val listening = st.micOn && !st.micMuted && !speaking && !st.typing
                if (!listening || st.modelsLoading) { lastActivity = System.currentTimeMillis(); continue }
                if (System.currentTimeMillis() - lastActivity > SILENCE_MS && silentReprompts < 2) {
                    silentReprompts++
                    a.noResponse()?.let { apply(it) }
                }
            }
        }
    }

    fun toggleMute() {
        muted = !muted
        _state.update { it.copy(micMuted = muted) }
    }

    // ------------------------------------------------------------------ user input

    fun onUserText(text: String, typed: Boolean) {
        val a = agent ?: return
        if (speaking && !typed) return
        transcript += "user" to text
        silentReprompts = 0
        lastActivity = System.currentTimeMillis()
        _state.update { it.copy(lastHeard = text, liveCaption = "") }
        val before = a.lang
        val reply = a.onUtterance(text, typed) ?: return
        if (a.lang != before) selectLanguage(a.lang)
        apply(reply)
    }

    fun confirm() = agent?.onConfirm()?.let { apply(it) }
    fun pickDate(date: LocalDate) = agent?.let { apply(it.onDatePicked(date)) }
    fun chooseAccountType(t: Understanding.AccountType) = agent?.let { apply(it.onAccountTypeChosen(t)) }
    fun edit(step: Step) = agent?.let { apply(it.editField(step)) }

    fun switchLanguageInCall() {
        val a = agent ?: return
        val target = Lang.entries[(a.lang.ordinal + 1) % Lang.entries.size]
        selectLanguage(target)
        apply(a.setLanguage(target))
    }

    fun dismissOtp() = _state.update { it.copy(otpBanner = null) }

    // ------------------------------------------------------------------ assistant output

    private fun apply(reply: Reply, speakIt: Boolean = true) {
        val a = agent ?: return
        transcript += "assistant" to reply.display
        for (e in reply.events) when (e) {
            is AgentEvent.OtpIssued -> _state.update { it.copy(otpBanner = e.code) }
            is AgentEvent.AccountCreated -> Unit
            AgentEvent.SessionEnded -> Unit
        }
        _state.update {
            it.copy(
                lang = a.lang, step = a.step, assistantText = reply.display, pendingValue = a.pendingValue,
                digitBuffer = a.digitBuffer, profile = a.profile,
                otpBanner = if (a.step == Step.OTP) it.otpBanner else null,
            )
        }
        if (speakIt) speak(reply.speech, a.lang)
        when (a.step) {
            Step.CREATING -> runCreation(a)
            Step.DONE -> finishSessionKeepScreen()
            Step.CANCELLED -> finishSessionKeepScreen()
            else -> Unit
        }
    }

    private fun finishSessionKeepScreen() {
        silenceJob?.cancel()
        viewModelScope.launch {
            speakJob?.join()  // let the goodbye be recorded too
            finalizeRecording()
        }
    }

    private fun runCreation(a: AccountOpeningAgent) {
        viewModelScope.launch {
            for (i in 1..4) {
                delay(900)
                _state.update { it.copy(creatingProgress = i) }
            }
            speakJob?.join()
            apply(a.finishCreating())
        }
    }

    private fun speak(text: String, lang: Lang) {
        val previous = speakJob
        previous?.cancel()
        voice.stop()
        speakJob = viewModelScope.launch {
            previous?.join()
            speaking = true
            _state.update { it.copy(speaking = true, liveCaption = "") }
            try {
                withContext(ttsDispatcher) { voice.speak(text, lang) }
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Throwable) {
                Log.e(TAG, "speech output failed", e)
            } finally {
                // Playback already ends with a short silence; listen again right away so a quick
                // "ok" isn't clipped to "k".
                if (isActive) delay(60)
                resetAfterSpeech = true
                lastActivity = System.currentTimeMillis()
                speaking = false
                _state.update { it.copy(speaking = false) }
            }
        }
    }

    override fun onCleared() {
        stopRinging()
        silenceJob?.cancel()
        voice.stop()
        mic?.stop()
        wav?.close()
        camera.stop()
        camera.unbind()
        voice.release()
        recognizers.values.forEach { it.release() }
        asrDispatcher.close()
        ttsDispatcher.close()
    }

    companion object {
        private const val TAG = "AssistantVM"
        private const val SILENCE_MS = 12_000L
    }
}
