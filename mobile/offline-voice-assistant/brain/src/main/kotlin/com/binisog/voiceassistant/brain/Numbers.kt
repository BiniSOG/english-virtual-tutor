package com.binisog.voiceassistant.brain

/**
 * Spoken-number understanding and generation for English and Amharic.
 *
 * Speech recognisers return numbers either as digits ("15") or as words ("fifteen",
 * "አስራ አምስት"). [chunks] turns any mix of those into separate number strings, e.g.
 * "january fifteenth two thousand" -> ["15", "2000"], "nineteen ninety two" -> ["19", "92"].
 */
object Numbers {

    private enum class Kind { NONE, UNIT, TEEN, TENS, HUNDRED, THOUSAND, HUNDRED_AFTER, THOUSAND_AFTER }

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

    /** Number words of the Oromo / Tigrinya / Afar packs, merged into the Amharic/Latin lexicon. */
    private val packWords: Map<String, Word> by lazy {
        buildMap {
            for (p in Translations.packs.values) {
                fun add(w: String, word: Word) {
                    val k = AmharicText.normalize(w.lowercase().trim())
                    if (k.isNotEmpty() && !containsKey(k) && english[k] == null) this[k] = word
                }
                p.units.forEachIndexed { i, w -> add(w, Word(i.toLong(), Kind.UNIT)) }
                p.tens.forEachIndexed { i, w ->
                    add(w, Word(10L * (i + 1), Kind.TENS))
                    // Oromo links tens to the unit with -ii: "digdamii shan".
                    if (!AmharicText.containsEthiopic(w) && w.endsWith("a")) add(w.dropLast(1) + "ii", Word(10L * (i + 1), Kind.TENS))
                }
                p.teenPrefix.split(' ').firstOrNull()?.let { if (it.isNotBlank()) add(it, Word(10, Kind.TENS)) }
                add(p.hundred, Word(100, if (p.multiplierAfter) Kind.HUNDRED_AFTER else Kind.HUNDRED))
                add(p.thousand, Word(1000, if (p.multiplierAfter) Kind.THOUSAND_AFTER else Kind.THOUSAND))
            }
        }
    }

    private val packFillers: Set<String> by lazy {
        Translations.packs.values.mapNotNull { it.conjunction.trim().lowercase().takeIf { c -> c.isNotEmpty() } }.toSet()
    }

    // Longest first so that greedy splitting of run-together words ("አስራአምስት") works.
    private val amharicKeys by lazy { (amharic.keys + packWords.keys.filter { AmharicText.containsEthiopic(it) }).sortedByDescending { it.length } }

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
            out += amharic[key] ?: packWords.getValue(key)
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
                    part == "and" || part == "እና" || part == "ና" || part in packFillers -> out += Token.Filler
                    else -> {
                        val en = englishWord(part) ?: packWords[part]?.takeIf { !AmharicText.containsEthiopic(part) }
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
        var pendingAfter = 0L // "dhibba" / "kuma" waiting for their multiplier ("dhibba lama" = 200)

        fun applyPending(multiplier: Long) {
            if (pendingAfter == 1000L) { total += multiplier * 1000; last = Kind.THOUSAND } else { cur += multiplier * 100; last = Kind.HUNDRED }
            pendingAfter = 0
        }

        fun flush() {
            if (pendingAfter > 0) applyPending(1)
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
                    if (pendingAfter > 0) {
                        if (w.kind == Kind.UNIT || w.kind == Kind.TEEN || w.kind == Kind.TENS) { applyPending(w.value); continue }
                        applyPending(1)
                    }
                    when (w.kind) {
                        Kind.HUNDRED_AFTER, Kind.THOUSAND_AFTER -> {
                            if (last == Kind.UNIT || last == Kind.TEEN || last == Kind.TENS) {
                                // "... sagal dhibba" written in normal order: treat as a plain multiplier.
                                if (w.kind == Kind.HUNDRED_AFTER) cur = (if (cur == 0L) 1 else cur) * 100
                                else { total += (if (cur == 0L) 1 else cur) * 1000; cur = 0 }
                                last = if (w.kind == Kind.HUNDRED_AFTER) Kind.HUNDRED else Kind.THOUSAND
                            } else {
                                if (last == Kind.NONE) last = Kind.HUNDRED
                                pendingAfter = w.value
                            }
                            continue
                        }
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

    fun toWords(n: Long, lang: Lang): String = when (lang) {
        Lang.EN -> english(n)
        Lang.AM -> amharicWords(n)
        else -> lang.pack?.let { packWordsFor(n, it) } ?: amharicWords(n)
    }

    private fun packWordsFor(n: Long, p: Translations.Pack): String {
        val joiner = if (p.conjunction.isBlank()) " " else " ${p.conjunction.trim()} "
        fun mult(word: String, k: Long) = when {
            k == 1L -> word
            p.multiplierAfter -> "$word ${packWordsFor(k, p)}"
            else -> "${packWordsFor(k, p)} $word"
        }
        return when {
            n < 10 -> p.units[n.toInt()]
            n < 20 -> if (n == 10L) p.tens[0] else "${p.teenPrefix.ifBlank { p.tens[0] }.trim()} ${p.units[(n - 10).toInt()]}"
            n < 100 -> p.tens[(n / 10 - 1).toInt()] + if (n % 10 != 0L) " " + p.units[(n % 10).toInt()] else ""
            n < 1000 -> mult(p.hundred, n / 100) + if (n % 100 != 0L) joiner + packWordsFor(n % 100, p) else ""
            n < 1_000_000 -> mult(p.thousand, n / 1000) + if (n % 1000 != 0L) joiner + packWordsFor(n % 1000, p) else ""
            else -> n.toString().map { p.units[it - '0'] }.joinToString(" ")
        }
    }

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
        s.filter { it.isDigit() }.map { d ->
            when (lang) {
                Lang.EN -> enUnits[d - '0']
                Lang.AM -> amUnits[d - '0']
                else -> lang.pack?.units?.get(d - '0') ?: amUnits[d - '0']
            }
        }.joinToString(" ")

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
