package com.binisog.voiceassistant.brain

import java.time.LocalDate
import java.time.Period
import kotlin.random.Random

enum class Step { GREETING, FULL_NAME, DOB, BIRTH_CITY, NATIONALITY, ACCOUNT_TYPE, FAN, OTP, REVIEW, CREATING, DONE, CANCELLED }

data class Profile(
    val fullName: String? = null,
    val dateOfBirth: LocalDate? = null,
    val dobGivenInEthiopianCalendar: Boolean = false,
    val birthCity: String? = null,
    val nationality: String? = null,
    val accountType: Understanding.AccountType? = null,
    val fan: String? = null,
    val accountNumber: String? = null,
)

/** What the assistant says. [display] goes on screen, [speech] to the TTS voice (no digits). */
data class Reply(val display: String, val speech: String, val events: List<AgentEvent> = emptyList())

sealed interface AgentEvent {
    data class OtpIssued(val code: String) : AgentEvent
    data class AccountCreated(val accountNumber: String) : AgentEvent
    data object SessionEnded : AgentEvent
}

data class AgentConfig(
    val bankNameEn: String = "Demo Bank",
    val bankNameAm: String = "ዴሞ ባንክ",
    val fanLength: Int = 12,
    val otpLength: Int = 6,
    val minimumAge: Int = 18,
)

/**
 * The domain-scoped language model of the app: a slot-filling dialogue manager for opening a
 * bank account by voice. It understands free speech in English and Amharic (intents, names,
 * dates in both calendars, places, spoken digits, FAQ questions) and answers in the user's
 * preferred language. Deterministic on purpose: KYC data must never be "hallucinated".
 */
class AccountOpeningAgent(
    private val config: AgentConfig = AgentConfig(),
    private val random: Random = Random.Default,
    private val today: () -> LocalDate = { LocalDate.now() },
    initialLang: Lang = Lang.EN,
) {
    private data class Pending(val display: String, val spoken: String, val apply: (Profile) -> Profile)

    var lang: Lang = initialLang
        private set
    var step: Step = Step.GREETING
        private set
    var profile: Profile = Profile()
        private set

    /** Value heard but not yet confirmed (shown in the editable field with a Confirm button). */
    val pendingValue: String? get() = pending?.display

    /** Digits collected so far for FAN / OTP (people pause while reading long numbers). */
    var digitBuffer: String = ""
        private set
    var otpCode: String? = null
        private set

    private var pending: Pending? = null
    private var returnToReview = false
    private var lastReply: Reply? = null

    private val dataSteps = listOf(Step.FULL_NAME, Step.DOB, Step.BIRTH_CITY, Step.NATIONALITY, Step.ACCOUNT_TYPE, Step.FAN)

    private val bank get() = if (lang == Lang.AM) config.bankNameAm else config.bankNameEn

    // ------------------------------------------------------------------ public API

    fun start(): Reply {
        step = Step.GREETING
        return say("greeting", "bank" to bank)
    }

    /** Text from the speech recogniser, or typed by the user when [typed] is true. */
    fun onUtterance(text: String, typed: Boolean = false): Reply? {
        if (text.isBlank()) return null
        if (step == Step.CANCELLED || step == Step.CREATING) return null

        when (Understanding.intent(text)) {
            Intent.CANCEL -> return cancel()
            Intent.SWITCH_TO_AM -> return setLanguage(Lang.AM)
            Intent.SWITCH_TO_EN -> return setLanguage(Lang.EN)
            Intent.REPEAT -> return lastReply ?: currentQuestion()
            Intent.BACK -> return goBack()
            Intent.YES -> return onYes()
            Intent.NO -> return onNo()
            Intent.QUESTION -> Faq.answer(text, lang)?.let { answer ->
                if (step == Step.DONE) return remember(Reply(answer, Numbers.verbalize(answer, lang)))
                val q = currentQuestion()
                val follow = Prompts.get("afterFaq", lang, "question" to q.display)
                val followSpeech = Prompts.get("afterFaq", lang, "question" to q.speech)
                return remember(Reply("$answer\n\n$follow", Numbers.verbalize("$answer $followSpeech", lang)))
            }
            Intent.NONE -> Unit
        }
        return answer(text, typed)
    }

    /** The Confirm button. */
    fun onConfirm(): Reply? = when {
        pending != null -> commit()
        step == Step.REVIEW -> startCreating()
        step == Step.GREETING -> onYes()
        else -> null
    }

    fun onDatePicked(date: LocalDate): Reply {
        if (step != Step.DOB) editField(Step.DOB)
        validateDob(date)?.let { return it }
        pending = Pending(DateParser.display(date, lang), DateParser.speak(date, lang)) { it.copy(dateOfBirth = date, dobGivenInEthiopianCalendar = false) }
        return commit()
    }

    fun onAccountTypeChosen(type: Understanding.AccountType): Reply {
        if (step != Step.ACCOUNT_TYPE) editField(Step.ACCOUNT_TYPE)
        pending = Pending(type.display(lang), type.display(lang)) { it.copy(accountType = type) }
        return commit()
    }

    fun setLanguage(newLang: Lang): Reply {
        lang = newLang
        val switched = Prompts.get("langSwitched", lang)
        if (step == Step.CANCELLED) return remember(Reply(switched, switched))
        val q = currentQuestion()
        return remember(Reply("$switched ${q.display}", "$switched ${q.speech}"))
    }

    /** Jump back to one field from the review screen; afterwards return to review. */
    fun editField(target: Step): Reply {
        require(target in dataSteps) { "not editable: $target" }
        returnToReview = step == Step.REVIEW || returnToReview
        step = target
        pending = null
        digitBuffer = ""
        val q = currentQuestion()
        return remember(
            Reply(
                Prompts.get("editing", lang, "question" to q.display),
                Prompts.get("editing", lang, "question" to q.speech)
            )
        )
    }

    fun startCreating(): Reply {
        step = Step.CREATING
        return say("creating")
    }

    fun finishCreating(): Reply {
        val number = "1000" + (1..8).map { random.nextInt(10) }.joinToString("")
        profile = profile.copy(accountNumber = number)
        step = Step.DONE
        val type = profile.accountType?.display(lang) ?: Understanding.AccountType.SAVINGS.display(lang)
        val display = Prompts.get("done", lang, "type" to type, "account" to formatGroups(number))
        val speech = Prompts.get("done", lang, "type" to type, "account" to Numbers.spellDigits(number, lang))
        return remember(Reply(display, Numbers.verbalize(speech, lang), listOf(AgentEvent.AccountCreated(number))))
    }

    fun cancel(): Reply {
        step = Step.CANCELLED
        val s = Prompts.get("cancelled", lang)
        return remember(Reply(s, s, listOf(AgentEvent.SessionEnded)))
    }

    /** Nobody answered for a while: ask the current question again. */
    fun noResponse(): Reply? {
        if (step in setOf(Step.CREATING, Step.DONE, Step.CANCELLED)) return null
        val q = currentQuestion()
        return remember(
            Reply(
                Prompts.get("silence", lang, "question" to q.display),
                Prompts.get("silence", lang, "question" to q.speech)
            )
        )
    }

    /** The question for the current step, as a reply (used for "repeat" and after side questions). */
    fun currentQuestion(): Reply = when (step) {
        Step.GREETING -> sayRaw("greeting", "bank" to bank)
        Step.FULL_NAME -> sayRaw("askName")
        Step.DOB -> sayRaw("askDob")
        Step.BIRTH_CITY -> sayRaw("askCity")
        Step.NATIONALITY -> sayRaw("askNationality")
        Step.ACCOUNT_TYPE -> sayRaw("askAccountType")
        Step.FAN -> sayRaw("askFan")
        Step.OTP -> sayRaw("otpSent")
        Step.REVIEW -> sayRaw("review")
        Step.CREATING -> sayRaw("creating")
        Step.DONE, Step.CANCELLED -> lastReply ?: sayRaw("cancelled")
    }

    // ------------------------------------------------------------------ dialogue logic

    private fun onYes(): Reply? = when {
        step == Step.GREETING -> { step = Step.FULL_NAME; say("askName") }
        pending != null -> commit()
        step == Step.REVIEW -> startCreating()
        else -> notUnderstood()
    }

    private fun onNo(): Reply? = when {
        step == Step.GREETING -> say("notReady")
        pending != null -> {
            pending = null
            if (step == Step.FAN) digitBuffer = ""
            currentQuestion().let(::remember)
        }
        step == Step.REVIEW -> say("reviewHint")
        else -> notUnderstood()
    }

    private fun goBack(): Reply {
        val i = dataSteps.indexOf(step)
        val target = when {
            i > 0 -> dataSteps[i - 1]
            step == Step.OTP || step == Step.REVIEW -> Step.FAN
            else -> return currentQuestion()
        }
        returnToReview = false
        step = target
        pending = null
        digitBuffer = ""
        return remember(currentQuestion())
    }

    private fun answer(text: String, typed: Boolean): Reply? {
        when (step) {
            Step.GREETING -> return notUnderstood()
            Step.FULL_NAME -> {
                val name = Understanding.extractName(text) ?: return notUnderstood()
                if (name.split(' ').size < 2) return say("nameNeedsFull")
                return ask(Pending(name, name) { it.copy(fullName = name) })
            }
            Step.DOB -> {
                val parsed = DateParser.parse(text, lang) ?: return notUnderstood()
                validateDob(parsed.gregorian)?.let { return it }
                val d = parsed.gregorian
                return ask(Pending(DateParser.display(d, lang), DateParser.speak(d, lang)) {
                    it.copy(dateOfBirth = d, dobGivenInEthiopianCalendar = parsed.ethiopian)
                })
            }
            Step.BIRTH_CITY -> {
                val city = Understanding.extractCity(text, lang) ?: return notUnderstood()
                return ask(Pending(city, city) { it.copy(birthCity = city) })
            }
            Step.NATIONALITY -> {
                val place = Understanding.matchPlace(text, Understanding.countries) ?: return notUnderstood()
                val value = place.display(lang)
                return ask(Pending(value, value) { it.copy(nationality = value) })
            }
            Step.ACCOUNT_TYPE -> {
                val type = Understanding.extractAccountType(text) ?: return notUnderstood()
                return onAccountTypeChosen(type)
            }
            Step.FAN -> return collectFan(text, typed)
            Step.OTP -> return collectOtp(text, typed)
            Step.REVIEW -> return Understanding.fieldToEdit(text)?.let { editField(it) } ?: say("reviewHint")
            Step.DONE, Step.CREATING, Step.CANCELLED -> return null
        }
    }

    private fun collectFan(text: String, typed: Boolean): Reply {
        val digits = Numbers.digits(text)
        if (digits.isEmpty()) return notUnderstood()
        if (typed || pending != null) digitBuffer = ""
        pending = null
        digitBuffer += digits
        val n = config.fanLength
        return when {
            digitBuffer.length < n && !typed -> say(
                "fanPartial",
                "digits" to formatGroups(digitBuffer),
                spoken = mapOf("digits" to Numbers.spellDigits(digitBuffer, lang))
            )
            digitBuffer.length != n -> {
                val got = digitBuffer
                digitBuffer = ""
                say(
                    "fanLength", "n" to n.toString(), "got" to formatGroups(got),
                    spoken = mapOf("got" to Numbers.spellDigits(got, lang))
                )
            }
            else -> {
                val fan = digitBuffer
                ask(Pending(formatGroups(fan), Numbers.spellDigits(fan, lang)) { it.copy(fan = fan) })
            }
        }
    }

    private fun collectOtp(text: String, typed: Boolean): Reply {
        val digits = Numbers.digits(text)
        if (digits.isEmpty()) return notUnderstood()
        if (typed) digitBuffer = ""
        digitBuffer += digits
        if (digitBuffer.length < config.otpLength && !typed) {
            return say("digitsSoFar", "digits" to digitBuffer, spoken = mapOf("digits" to Numbers.spellDigits(digitBuffer, lang)))
        }
        val entered = digitBuffer
        digitBuffer = ""
        return if (entered == otpCode || entered.takeLast(config.otpLength) == otpCode) {
            step = Step.REVIEW
            returnToReview = false
            combine(sayRaw("otpOk"), sayRaw("review")).let(::remember)
        } else {
            say("otpWrong")
        }
    }

    private fun validateDob(d: LocalDate): Reply? {
        val now = today()
        if (d.isAfter(now)) return say("dobFuture")
        if (Period.between(d, now).years < config.minimumAge) return say("dobUnderage")
        return null
    }

    private fun ask(p: Pending): Reply {
        pending = p
        val display = Prompts.get("confirm", lang, "value" to p.display)
        val speech = Prompts.get("confirm", lang, "value" to p.spoken)
        return remember(Reply(display, Numbers.verbalize(speech, lang)))
    }

    private fun commit(): Reply {
        val p = pending ?: return currentQuestion()
        profile = p.apply(profile)
        pending = null
        digitBuffer = ""
        if (returnToReview && step != Step.FAN) {
            step = Step.REVIEW
            return say("review")
        }
        val next = when (step) {
            Step.FULL_NAME -> Step.DOB
            Step.DOB -> Step.BIRTH_CITY
            Step.BIRTH_CITY -> Step.NATIONALITY
            Step.NATIONALITY -> Step.ACCOUNT_TYPE
            Step.ACCOUNT_TYPE -> Step.FAN
            Step.FAN -> Step.OTP
            else -> step
        }
        step = next
        if (next == Step.OTP) {
            val code = (1..config.otpLength).map { random.nextInt(10) }.joinToString("")
            otpCode = code
            returnToReview = false
            val r = sayRaw("otpSent")
            return remember(r.copy(events = listOf(AgentEvent.OtpIssued(code))))
        }
        return remember(currentQuestion())
    }

    private fun notUnderstood(): Reply {
        val q = currentQuestion()
        return remember(
            Reply(
                Prompts.get("notUnderstood", lang, "question" to q.display),
                Prompts.get("notUnderstood", lang, "question" to q.speech)
            )
        )
    }

    // ------------------------------------------------------------------ helpers

    private fun sayRaw(key: String, vararg args: Pair<String, String>, spoken: Map<String, String> = emptyMap()): Reply {
        val display = Prompts.get(key, lang, *args)
        val spokenArgs = args.map { (k, v) -> k to (spoken[k] ?: v) }.toTypedArray()
        return Reply(display, Numbers.verbalize(Prompts.get(key, lang, *spokenArgs), lang))
    }

    private fun say(key: String, vararg args: Pair<String, String>, spoken: Map<String, String> = emptyMap()): Reply =
        remember(sayRaw(key, *args, spoken = spoken))

    private fun combine(a: Reply, b: Reply) = Reply("${a.display} ${b.display}", "${a.speech} ${b.speech}", a.events + b.events)

    private fun remember(r: Reply): Reply { lastReply = r; return r }

    companion object {
        fun formatGroups(digits: String): String = digits.chunked(4).joinToString(" ")
    }
}
