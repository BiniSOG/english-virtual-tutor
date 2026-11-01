package com.binisog.voiceassistant.brain

/**
 * Spoken-number understanding and generation for English and Amharic.
 *
 * Speech recognisers return numbers either as digits ("15") or as words ("fifteen",
 * "አስራ አምስት"). [chunks] turns any mix of those into separate number strings, e.g.
 * "january fifteenth two thousand" -> ["15", "2000"], "nineteen ninety two" -> ["19", "92"].
 */
object Numbers {

    private enum class Kind { NONE, UNIT, TEEN, TENS, HUNDRED, THOUSAND }

    private data class Word(val value: Long, val kind: Kind)

    private val english: Map<String, Word> = buildMap {
        listOf("zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine")
            .forEachIndexed { i, w -> put(w, Word(i.toLong(), Kind.UNIT)) }
        put("oh", Word(0, Kind.UNIT)); put("o", Word(0, Kind.UNIT)); put("nil", Word(0, Kind.UNIT))
        listOf(
            "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
            "seventeen", "eighteen", "nineteen"
        ).forEachIndexed { i, w -> put(w, Word(10L + i, Kind.TEEN)) }
        listOf("twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety")
            .forEachIndexed { i, w -> put(w, Word(20L + 10 * i, Kind.TENS)) }
        put("fourty", Word(40, Kind.TENS))
        put("hundred", Word(100, Kind.HUNDRED))
        put("thousand", Word(1000, Kind.THOUSAND))
    }

    private val englishOrdinals = mapOf(
        "first" to "one", "second" to "two", "third" to "three", "fifth" to "five",
        "eighth" to "eight", "ninth" to "nine", "twelfth" to "twelve",
    )

    // Amharic number words, already in AmharicText.normalize() form.
    private val amharic: Map<String, Word> = buildMap {
        fun p(w: String, v: Long, k: Kind) = put(AmharicText.normalize(w), Word(v, k))
        p("ዜሮ", 0, Kind.UNIT); p("ባዶ", 0, Kind.UNIT)
        p("አንድ", 1, Kind.UNIT); p("ሁለት", 2, Kind.UNIT); p("ሶስት", 3, Kind.UNIT)
        p("ሦስት", 3, Kind.UNIT); p("አራት", 4, Kind.UNIT); p("አምስት", 5, Kind.UNIT)
        p("ስድስት", 6, Kind.UNIT); p("ሰባት", 7, Kind.UNIT); p("ስምንት", 8, Kind.UNIT)
        p("ዘጠኝ", 9, Kind.UNIT)
        p("አስር", 10, Kind.TEEN); p("አሥር", 10, Kind.TEEN)
        // "አስራ" is the combining form of ten: "አስራ አምስት" = 15, so it behaves like a tens word.
        p("አስራ", 10, Kind.TENS); p("አሥራ", 10, Kind.TENS)
        p("ሃያ", 20, Kind.TENS); p("ሀያ", 20, Kind.TENS); p("ሰላሳ", 30, Kind.TENS)
        p("ሠላሳ", 30, Kind.TENS); p("አርባ", 40, Kind.TENS); p("ሃምሳ", 50, Kind.TENS)
        p("ሀምሳ", 50, Kind.TENS); p("ስልሳ", 60, Kind.TENS); p("ስድሳ", 60, Kind.TENS)
        p("ሰባ", 70, Kind.TENS); p("ሰማንያ", 80, Kind.TENS); p("ዘጠና", 90, Kind.TENS)
        p("መቶ", 100, Kind.HUNDRED); p("ሺ", 1000, Kind.THOUSAND); p("ሺህ", 1000, Kind.THOUSAND)
    }

    // Longest first so that greedy splitting of run-together words ("አስራአምስት") works.
    private val amharicKeys = amharic.keys.sortedByDescending { it.length }

    private val amharicSuffixes = listOf("ኛ", "ኛው", "ኛዉ", "ተኛ", "ቀን")

    private sealed interface Token {
        data class Num(val w: Word) : Token
        data class Digits(val s: String) : Token
        data object Filler : Token // "and", "እና" – joins number words, never breaks them
        data object Other : Token
    }

    private fun splitAmharic(token: String): List<Word>? {
        var rest = token
        for (suffix in amharicSuffixes.sortedByDescending { it.length }) {
            if (rest.length > suffix.length && rest.endsWith(suffix)) {
                rest = rest.removeSuffix(suffix); break
            }
        }
        val out = mutableListOf<Word>()
        while (rest.isNotEmpty()) {
            val key = amharicKeys.firstOrNull { rest.startsWith(it) } ?: return null
            out += amharic.getValue(key)
            rest = rest.substring(key.length)
        }
        return out.takeIf { it.isNotEmpty() }
    }

    private fun englishWord(token: String): Word? {
        english[token]?.let { return it }
        englishOrdinals[token]?.let { return english[it] }
        if (token.endsWith("ieth")) english[token.removeSuffix("ieth") + "y"]?.let { return it }
        if (token.endsWith("th")) english[token.removeSuffix("th")]?.let { return it }
        return null
    }

    private fun tokenize(text: String): List<Token> {
        val out = mutableListOf<Token>()
        val cleaned = AmharicText.normalize(text.lowercase())
            .replace(Regex("(\\d)(st|nd|rd|th|ኛ)\\b"), "$1")
            .replace(Regex("[-_/.,:;!?።፣፤]"), " ")
        for (raw in cleaned.split(Regex("\\s+"))) {
            if (raw.isEmpty()) continue
            // Split letter/digit boundaries: "15ኛ", "ጥር15".
            val parts = Regex("\\d+|\\D+").findAll(raw).map { it.value }.toList()
            for (part in parts) {
                when {
                    part.all { it.isDigit() } -> out += Token.Digits(part)
                    part == "and" || part == "እና" || part == "ና" -> out += Token.Filler
                    else -> {
                        val en = englishWord(part)
                        if (en != null) {
                            out += Token.Num(en)
                        } else {
                            val am = splitAmharic(part)
                            if (am != null) am.forEach { out += Token.Num(it) } else out += Token.Other
                        }
                    }
                }
            }
        }
        return out
    }

    /** Number strings found in [text], in order. Digit runs keep leading zeros. */
    fun chunks(text: String): List<String> {
        val result = mutableListOf<String>()
        var total = 0L
        var cur = 0L
        var last = Kind.NONE

        fun flush() {
            if (last != Kind.NONE) result += (total + cur).toString()
            total = 0; cur = 0; last = Kind.NONE
        }

        for (t in tokenize(text)) {
            when (t) {
                is Token.Digits -> { flush(); result += t.s }
                Token.Filler -> Unit
                Token.Other -> flush()
                is Token.Num -> {
                    val w = t.w
                    when (w.kind) {
                        Kind.UNIT -> {
                            if (last !in setOf(Kind.NONE, Kind.TENS, Kind.HUNDRED, Kind.THOUSAND)) flush()
                            cur += w.value
                        }
                        Kind.TEEN, Kind.TENS -> {
                            if (last !in setOf(Kind.NONE, Kind.HUNDRED, Kind.THOUSAND)) flush()
                            cur += w.value
                        }
                        Kind.HUNDRED -> cur = (if (cur == 0L) 1 else cur) * 100
                        Kind.THOUSAND -> {
                            total += (if (cur == 0L) 1 else cur) * 1000
                            cur = 0
                        }
                        Kind.NONE -> Unit
                    }
                    last = w.kind
                }
            }
        }
        flush()
        return result
    }

    /** Every digit spoken in [text] joined together: "one two three 45" -> "12345". */
    fun digits(text: String): String = chunks(text).joinToString("")

    // ---------------------------------------------------------------- speaking numbers

    private val enUnits = arrayOf(
        "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
        "eighteen", "nineteen"
    )
    private val enTens = arrayOf("", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety")

    private val amUnits = arrayOf("ዜሮ", "አንድ", "ሁለት", "ሶስት", "አራት", "አምስት", "ስድስት", "ሰባት", "ስምንት", "ዘጠኝ")
    private val amTens = arrayOf("", "አስር", "ሃያ", "ሰላሳ", "አርባ", "ሃምሳ", "ስልሳ", "ሰባ", "ሰማንያ", "ዘጠና")

    fun toWords(n: Long, lang: Lang): String = if (lang == Lang.EN) english(n) else amharicWords(n)

    private fun english(n: Long): String {
        if (n < 20) return enUnits[n.toInt()]
        if (n < 100) return enTens[(n / 10).toInt()] + if (n % 10 != 0L) " " + enUnits[(n % 10).toInt()] else ""
        if (n < 1000) return enUnits[(n / 100).toInt()] + " hundred" + if (n % 100 != 0L) " and " + english(n % 100) else ""
        if (n < 1_000_000) return english(n / 1000) + " thousand" + if (n % 1000 != 0L) " " + english(n % 1000) else ""
        return n.toString().map { enUnits[it - '0'] }.joinToString(" ")
    }

    private fun amharicWords(n: Long): String {
        if (n < 10) return amUnits[n.toInt()]
        if (n < 20) return if (n == 10L) "አስር" else "አስራ " + amUnits[(n - 10).toInt()]
        if (n < 100) return amTens[(n / 10).toInt()] + if (n % 10 != 0L) " " + amUnits[(n % 10).toInt()] else ""
        if (n < 1000) {
            val h = if (n / 100 == 1L) "መቶ" else amUnits[(n / 100).toInt()] + " መቶ"
            return h + if (n % 100 != 0L) " " + amharicWords(n % 100) else ""
        }
        if (n < 1_000_000) {
            val t = (if (n / 1000 == 1L) "አንድ" else amharicWords(n / 1000)) + " ሺህ"
            return t + if (n % 1000 != 0L) " " + amharicWords(n % 1000) else ""
        }
        return n.toString().map { amUnits[it - '0'] }.joinToString(" ")
    }

    /** Reads a string of digits one by one ("1000" -> "one zero zero zero"). */
    fun spellDigits(s: String, lang: Lang): String =
        s.filter { it.isDigit() }.map { if (lang == Lang.EN) enUnits[it - '0'] else amUnits[it - '0'] }.joinToString(" ")

    /**
     * Replaces every digit run in [text] with words so a character-based TTS voice can read it.
     * Runs of 5+ digits (IDs, account numbers) are read digit by digit, shorter runs as numbers.
     */
    fun verbalize(text: String, lang: Lang): String =
        Regex("\\d+").replace(text) { m ->
            val v = m.value
            if (v.length >= 5 || v.startsWith("0") && v.length > 1) spellDigits(v, lang) else toWords(v.toLong(), lang)
        }
}
