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

enum class Screen { HOME, CALL, SESSIONS }

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
            _state.update { it.copy(modelsLoading = true, modelsMessage = if (lang == Lang.AM) "የአማርኛ ድምፅ ሞዴሎች እየተጫኑ ነው…" else "Loading offline voice models…") }
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
                    Lang.entries.filter { it != lang }.forEach { voice.releaseVoice(it) }
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

    fun startCall() {
        val lang = _state.value.lang
        activeLang = lang
        transcript.clear()
        val dir = sessions.newSession()
        sessionDir = dir
        wav = WavWriter(File(dir, "audio.wav"), SAMPLE_RATE)
        val a = AccountOpeningAgent(initialLang = lang)
        agent = a
        _state.update {
            UiState(
                screen = Screen.CALL, lang = lang, modelSummary = it.modelSummary,
                modelsLoading = it.modelsLoading, modelsMessage = it.modelsMessage, sessionDir = dir.absolutePath,
            )
        }
        camera.start(File(dir, "video.mp4"))
        viewModelScope.launch {
            loadModels(lang).join()
            val ok = (mic ?: MicCapture(::onAudio).also { mic = it }).start()
            _state.update { it.copy(micOn = ok, error = if (ok) null else "Microphone unavailable") }
            apply(a.start())
        }
    }

    fun endCall() {
        agent?.let { if (it.step != Step.DONE && it.step != Step.CANCELLED) apply(it.cancel(), speakIt = false) }
        finishSession()
        camera.unbind()
        _state.update { it.copy(screen = Screen.HOME) }
    }

    private fun finishSession() {
        voice.stop()
        speakJob?.cancel()
        mic?.stop()
        mic = null
        camera.stop()
        wav?.close()
        wav = null
        val a = agent
        val dir = sessionDir
        if (a != null && dir != null) {
            runCatching { sessions.saveJson(dir, a.lang.code, a.profile, transcript, a.step == Step.DONE) }
        }
        viewModelScope.launch(asrDispatcher) { recognizers[activeLang]?.reset() }
        _state.update { it.copy(micOn = false) }
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
        // Half duplex: don't transcribe the assistant's own voice.
        if (speaking || muted) return
        viewModelScope.launch(asrDispatcher) {
            val engine = recognizers[activeLang] ?: return@launch
            if (resetAfterSpeech) { engine.reset(); resetAfterSpeech = false }
            val events = try { engine.accept(samples) } catch (e: Throwable) { Log.e(TAG, "asr", e); emptyList() }
            for (e in events) withContext(Dispatchers.Main) {
                when (e) {
                    is AsrEvent.Partial -> _state.update { it.copy(liveCaption = e.text) }
                    is AsrEvent.Final -> onUserText(e.text, typed = false)
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
        val target = if (a.lang == Lang.EN) Lang.AM else Lang.EN
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
            Step.DONE -> { camera.stop(); finishSessionKeepScreen() }
            Step.CANCELLED -> finishSessionKeepScreen()
            else -> Unit
        }
    }

    private fun finishSessionKeepScreen() {
        viewModelScope.launch {
            speakJob?.join()
            mic?.stop(); mic = null
            wav?.close(); wav = null
            val a = agent ?: return@launch
            sessionDir?.let { dir -> runCatching { sessions.saveJson(dir, a.lang.code, a.profile, transcript, a.step == Step.DONE) } }
            _state.update { it.copy(micOn = false) }
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
                // A short tail so the end of our own voice isn't picked up by the microphone.
                if (isActive) delay(250)
                resetAfterSpeech = true
                speaking = false
                _state.update { it.copy(speaking = false) }
            }
        }
    }

    override fun onCleared() {
        finishSession()
        camera.unbind()
        voice.release()
        recognizers.values.forEach { it.release() }
        asrDispatcher.close()
        ttsDispatcher.close()
    }

    companion object {
        private const val TAG = "AssistantVM"
    }
}
