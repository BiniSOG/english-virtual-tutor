package com.binisog.voiceassistant.brain

/**
 * Predicts what the customer is likely to say at each step and pulls misheard speech towards it.
 *
 * Speech recognition often gets a word *almost* right ("jan worry" for January, "for" for four,
 * "savings" as "say things", "እሽ" for "እሺ"). Words are compared by how they SOUND (a simple
 * phonetic key that works for English and for Ge'ez via romanisation) against the answers that
 * make sense for the current question, and close ones are replaced by the expected word.
 */
object AnswerPredictor {

    /** Phonetic key: romanise Ge'ez, lower-case, merge letters that sound alike. */
    fun phonetic(raw: String): String {
        var t = AmharicText.romanize(AmharicText.normalize(raw.lowercase()))
        t = t.replace(Regex("[^a-z0-9 ]"), "")
        val rules = listOf(
            "ph" to "f", "gh" to "g", "kh" to "k", "ck" to "k", "qu" to "kw", "q" to "k", "c" to "k",
            "x" to "ks", "z" to "s", "v" to "b", "sh" to "s", "ch" to "s", "th" to "t", "dh" to "d",
            "y" to "i", "w" to "u", "ee" to "i", "oo" to "u", "ea" to "i", "ou" to "u", "ai" to "e", "ei" to "e",
        )
        for ((a, b) in rules) t = t.replace(a, b)
        t = t.replace(Regex("(.)\\1+"), "$1") // double letters
        t = t.replace(Regex("(?<=[^aeiou ])h"), "") // silent h after consonants
        return t.trim()
    }

    private fun levenshtein(a: String, b: String): Int {
        val dp = IntArray(b.length + 1) { it }
        for (i in 1..a.length) {
            var prev = dp[0]; dp[0] = i
            for (j in 1..b.length) {
                val tmp = dp[j]
                dp[j] = minOf(dp[j] + 1, dp[j - 1] + 1, prev + if (a[i - 1] == b[j - 1]) 0 else 1)
                prev = tmp
            }
        }
        return dp[b.length]
    }

    /** 0..1 similarity of how two strings sound. */
    fun soundsLike(a: String, b: String): Double {
        val x = phonetic(a).replace(" ", "")
        val y = phonetic(b).replace(" ", "")
        if (x.isEmpty() || y.isEmpty()) return 0.0
        return 1.0 - levenshtein(x, y).toDouble() / maxOf(x.length, y.length)
    }

    // ------------------------------------------------------------------ vocabularies

    private val numberWords = listOf(
        "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
        "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred", "thousand",
        "ዜሮ", "አንድ", "ሁለት", "ሶስት", "አራት", "አምስት", "ስድስት", "ሰባት", "ስምንት", "ዘጠኝ", "አስር", "አስራ",
        "ሃያ", "ሰላሳ", "አርባ", "ሃምሳ", "ስልሳ", "ሰባ", "ሰማንያ", "ዘጠና", "መቶ", "ሺህ",
    )

    /** Words speech recognition writes instead of digits ("for" -> four, "to" -> two). */
    private val homophones = mapOf(
        "for" to "four", "fore" to "four", "far" to "four", "to" to "two", "too" to "two", "tu" to "two",
        "won" to "one", "wan" to "one", "ate" to "eight", "eit" to "eight", "tree" to "three", "free" to "three",
        "fife" to "five", "sicks" to "six", "sex" to "six", "nein" to "nine", "niner" to "nine", "oh" to "zero",
        "o" to "zero", "zeros" to "zero", "tin" to "ten", "then" to "ten",
    )

    private val months = listOf(
        "january", "february", "march", "april", "may", "june", "july", "august", "september", "october",
        "november", "december",
    ) + EthiopianCalendar.monthsAm + listOf(
        "meskerem", "tikimt", "hidar", "tahsas", "tir", "yekatit", "megabit", "miyazia", "ginbot", "sene",
        "hamle", "nehase", "pagume",
    )

    private val yesNo = listOf(
        "yes", "yeah", "okay", "ok", "no", "correct", "right", "start", "begin", "ready", "wrong",
        "አዎ", "አዎን", "እሺ", "ትክክል", "ልክ", "አይ", "አይደለም", "ጀምር", "እንጀምር",
    )

    private val accountWords = listOf(
        "savings", "saving", "current", "checking", "interest", "free", "youth", "student",
        "ቁጠባ", "ተንቀሳቃሽ", "ወለድ", "ነፃ", "ወጣቶች",
    )

    /** Vocabulary of likely words for [step] (empty = free answer, e.g. a name). */
    fun vocabulary(step: Step, confirming: Boolean): List<String> = buildList {
        if (confirming || step == Step.GREETING || step == Step.REVIEW) addAll(yesNo)
        when (step) {
            Step.DOB -> { addAll(months); addAll(numberWords) }
            Step.FAN, Step.OTP -> addAll(numberWords)
            Step.ACCOUNT_TYPE -> addAll(accountWords)
            else -> Unit
        }
    }

    /**
     * Replaces words (and pairs of words heard as two, like "jan worry") that sound like an
     * expected word. Exact matches and short function words are left alone.
     */
    fun correct(text: String, step: Step, confirming: Boolean): String {
        val vocab = vocabulary(step, confirming)
        if (vocab.isEmpty() || text.isBlank()) return text
        val numbersExpected = step == Step.DOB || step == Step.FAN || step == Step.OTP
        val words = text.trim().split(Regex("\\s+")).toMutableList()
        val out = mutableListOf<String>()
        var i = 0
        while (i < words.size) {
            val w = words[i]
            val lw = w.lowercase().trim(',', '.', '?', '!', '።', '፣')
            if (numbersExpected && homophones.containsKey(lw)) { out += homophones.getValue(lw); i++; continue }
            if (lw.any { it.isDigit() } || vocab.any { it.equals(lw, ignoreCase = true) }) { out += w; i++; continue }
            // Try the word together with the next one first ("jan worry" -> january).
            val pair = if (i + 1 < words.size) "$lw ${words[i + 1].lowercase()}" else null
            val pairBest = pair?.let { best(it, vocab) }
            if (pairBest != null && pairBest.second >= 0.78 && phonetic(pair).length >= 5) {
                out += pairBest.first; i += 2; continue
            }
            val single = if (phonetic(lw).replace(" ", "").length >= 3) best(lw, vocab) else null
            out += if (single != null && single.second >= 0.72) single.first else w
            i++
        }
        return out.joinToString(" ")
    }

    private fun best(heard: String, vocab: List<String>): Pair<String, Double>? =
        vocab.map { it to soundsLike(heard, it) }.maxByOrNull { it.second }

    /**
     * Answers the customer can say (or tap) at this step, shown as suggestions on screen.
     * Free answers (names, dates, ID numbers) get no suggestions.
     */
    fun suggestions(step: Step, confirming: Boolean, lang: Lang): List<String> = when {
        confirming || step == Step.GREETING ->
            if (lang == Lang.AM) listOf("አዎ", "አይ") else listOf("Yes", "No")
        step == Step.ACCOUNT_TYPE -> Understanding.AccountType.entries.map { it.display(lang) }
        step == Step.NATIONALITY -> Understanding.countries.take(4).map { it.display(lang) }
        step == Step.BIRTH_CITY -> Understanding.cities.take(6).map { it.display(lang) }
        step == Step.REVIEW -> if (lang == Lang.AM) listOf("አዎ") else listOf("Yes")
        else -> emptyList()
    }
}
