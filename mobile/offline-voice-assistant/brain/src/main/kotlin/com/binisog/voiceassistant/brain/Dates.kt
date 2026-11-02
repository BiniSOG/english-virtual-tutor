package com.binisog.voiceassistant.brain

import java.time.LocalDate

enum class Lang(val code: String, val nativeName: String, val ethiopic: Boolean) {
    EN("en", "English", false),
    AM("am", "አማርኛ", true);

    /** Translation pack for languages other than English/Amharic (none are enabled now). */
    val pack: Translations.Pack? get() = Translations.of(this)

    companion object {
        fun of(code: String?): Lang = entries.firstOrNull { it.code == code } ?: EN
    }
}

/** Ethiopian (Amete Mihret) calendar <-> Gregorian conversion through Julian Day Numbers. */
object EthiopianCalendar {
    private const val EPOCH = 1724221L // JDN of 1 Meskerem 1 E.C.

    val monthsAm = listOf(
        "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት", "መጋቢት",
        "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"
    )

    fun toGregorian(year: Int, month: Int, day: Int): LocalDate? {
        if (month !in 1..13 || day !in 1..30) return null
        if (month == 13 && day > (if (year % 4 == 3) 6 else 5)) return null
        val jdn = EPOCH + 365L * (year - 1) + year / 4 + 30L * (month - 1) + day - 1
        return LocalDate.MIN.with(java.time.temporal.JulianFields.JULIAN_DAY, jdn)
    }

    /** Returns (year, month, day) in the Ethiopian calendar. */
    fun fromGregorian(date: LocalDate): Triple<Int, Int, Int> {
        val d = date.getLong(java.time.temporal.JulianFields.JULIAN_DAY) - EPOCH
        val cycle = Math.floorDiv(d, 1461L)
        val r = Math.floorMod(d, 1461L)
        // Each 4-year cycle starts at year 1 mod 4; the 3rd year has 366 days.
        val (yearInCycle, dayOfYear) = when {
            r < 365 -> 0 to r
            r < 730 -> 1 to r - 365
            r < 1096 -> 2 to r - 730
            else -> 3 to r - 1096
        }
        val year = (4 * cycle + yearInCycle + 1).toInt()
        val month = (dayOfYear / 30 + 1).toInt()
        val day = (dayOfYear % 30 + 1).toInt()
        return Triple(year, month, day)
    }
}

/** A date of birth heard from the user, with the calendar it was given in. */
data class SpokenDate(val gregorian: LocalDate, val ethiopian: Boolean)

object DateParser {
    private val gregorianMonths: List<List<String>> = listOf(
        listOf("january", "jan", "ጃንዋሪ", "ጃኑዋሪ", "ጃንዩወሪ"),
        listOf("february", "feb", "ፌብሩዋሪ", "ፌብሯሪ", "ፌብርዋሪ"),
        listOf("march", "mar", "ማርች"),
        listOf("april", "apr", "ኤፕሪል", "ኤፕርል"),
        listOf("may", "ሜይ", "ሜ"),
        listOf("june", "jun", "ጁን", "ጁን"),
        listOf("july", "jul", "ጁላይ"),
        listOf("august", "aug", "ኦገስት", "ኦጋስት"),
        listOf("september", "sep", "sept", "ሴፕቴምበር", "ሰፕቴምበር"),
        listOf("october", "oct", "ኦክቶበር"),
        listOf("november", "nov", "ኖቬምበር", "ኖቨምበር"),
        listOf("december", "dec", "ዲሴምበር", "ዲሰምበር"),
    )

    private val ethiopianMonths: List<List<String>> = listOf(
        listOf("መስከረም", "meskerem"), listOf("ጥቅምት", "tikimt", "tikemt"),
        listOf("ህዳር", "hidar", "hedar"), listOf("ታህሳስ", "ታኅሣሥ", "tahsas", "tahisas"),
        listOf("ጥር", "tir", "ter"), listOf("የካቲት", "yekatit"), listOf("መጋቢት", "megabit"),
        listOf("ሚያዝያ", "ሚያዚያ", "miyazia", "miyazya"), listOf("ግንቦት", "ginbot", "genbot"),
        listOf("ሰኔ", "sene"), listOf("ሐምሌ", "ሀምሌ", "hamle"), listOf("ነሐሴ", "ነሃሴ", "nehase"),
        listOf("ጳጉሜ", "ጳጉሜን", "pagume"),
    )

    private val ethiopianMonthsAll: List<List<String>> by lazy {
        ethiopianMonths.mapIndexed { i, names -> names + Translations.packs.values.mapNotNull { it.months.getOrNull(i) } }
    }

    private fun findMonth(words: List<String>, table: List<List<String>>): Int? {
        for ((i, names) in table.withIndex()) {
            val forms = names.map { AmharicText.normalize(it) }
            // Exact words first; Amharic words may carry suffixes ("በጥር", "ሚያዝያ 7"), so allow
            // containment for Ge'ez names of 2+ letters.
            if (words.any { w -> forms.any { it == w } }) return i + 1
        }
        for ((i, names) in table.withIndex()) {
            val forms = names.map { AmharicText.normalize(it) }.filter { AmharicText.containsEthiopic(it) && it.length >= 2 }
            if (words.any { w -> forms.any { f -> w.contains(f) && w.length <= f.length + 2 } }) return i + 1
        }
        return null
    }

    private val ecMarkers = listOf("ዓ.ም", "ዓም", "ethiopian", "በኢትዮጵያ").map { AmharicText.canonical(it) }
    private val gcMarkers = listOf("እ.ኤ.አ", "gregorian", "ፈረንጅ", "በፈረንጆች").map { AmharicText.canonical(it) }

    /**
     * Parses dates such as "15 January 2000", "January fifteenth two thousand", "15/01/2000",
     * "ሚያዝያ 7 1992" (Ethiopian calendar) or "ጥር አስራ አምስት ሁለት ሺህ".
     *
     * Purely numeric dates follow the conversation language: Amharic speakers usually give their
     * birth date in the Ethiopian calendar, English speakers in the Gregorian one.
     */
    fun parse(text: String, lang: Lang): SpokenDate? {
        val canon = AmharicText.canonical(text)
        val words = canon.split(' ').filter { it.isNotEmpty() }

        val nums = combineYears(Numbers.chunks(text).map { it.toInt() })
        val etMonth = findMonth(words, ethiopianMonthsAll)
        val grMonth = if (etMonth == null) findMonth(words, gregorianMonths) else null
        val mentionsEc = ecMarkers.any { canon.contains(it) }
        val mentionsGc = gcMarkers.any { canon.contains(it) }

        val month: Int
        val day: Int
        val year: Int
        if (etMonth != null || grMonth != null) {
            month = etMonth ?: grMonth!!
            year = nums.firstOrNull { it in 1900..2100 } ?: return null
            day = nums.firstOrNull { it in 1..31 } ?: return null
        } else {
            // dd/mm/yyyy (or yyyy-mm-dd)
            if (nums.size < 3) return null
            if (nums[0] in 1900..2100) {
                year = nums[0]; month = nums[1]; day = nums[2]
            } else {
                day = nums[0]; month = nums[1]; year = nums[2]
            }
        }
        val ethiopian = when {
            etMonth != null -> true
            grMonth != null -> false
            mentionsEc -> true
            mentionsGc -> false
            // In Ethiopia people usually give their birth date in the Ethiopian calendar.
            else -> lang != Lang.EN
        }
        val date = if (ethiopian) {
            EthiopianCalendar.toGregorian(year, month, day)
        } else {
            runCatching { LocalDate.of(year, month, day) }.getOrNull()
        } ?: return null
        return SpokenDate(date, ethiopian)
    }

    /** "19","92" -> 1992 ; "20","05" -> 2005 (people often say years in two halves). */
    private fun combineYears(nums: List<Int>): List<Int> {
        val out = mutableListOf<Int>()
        var i = 0
        while (i < nums.size) {
            val a = nums[i]
            val b = nums.getOrNull(i + 1)
            if ((a == 19 || a == 20) && b != null && b in 0..99 && !nums.any { it in 1900..2100 }) {
                out += a * 100 + b; i += 2
            } else {
                out += a; i++
            }
        }
        return out
    }

    private val enMonthNames = listOf(
        "January", "February", "March", "April", "May", "June", "July", "August",
        "September", "October", "November", "December"
    )

    fun formatGregorian(d: LocalDate): String = "${enMonthNames[d.monthValue - 1].take(3)} ${d.dayOfMonth}, ${d.year}"

    /** Ethiopian-calendar month name in [lang] (Amharic names when the language has none). */
    fun monthName(m: Int, lang: Lang): String = lang.pack?.months?.getOrNull(m - 1) ?: EthiopianCalendar.monthsAm[m - 1]

    fun formatEthiopian(d: LocalDate, lang: Lang = Lang.AM): String {
        val (y, m, day) = EthiopianCalendar.fromGregorian(d)
        return if (lang.ethiopic) "${monthName(m, lang)} $day፣ $y ዓ.ም." else "${monthName(m, lang)} $day, $y (E.C.)"
    }

    /** Text for the screen: Amharic shows both calendars. */
    fun display(d: LocalDate, lang: Lang): String =
        if (lang == Lang.EN) formatGregorian(d) else "${formatEthiopian(d, lang)} (${formatGregorian(d)})"

    /** Text for the voice: no digits, no abbreviations. */
    fun speak(d: LocalDate, lang: Lang): String = if (lang == Lang.EN) {
        "${enMonthNames[d.monthValue - 1]} ${Numbers.toWords(d.dayOfMonth.toLong(), Lang.EN)}, ${speakYearEn(d.year)}"
    } else {
        val (y, m, day) = EthiopianCalendar.fromGregorian(d)
        "${monthName(m, lang)} ${Numbers.toWords(day.toLong(), lang)}${if (lang.ethiopic) "፣" else ","} ${Numbers.toWords(y.toLong(), lang)}"
    }

    private fun speakYearEn(y: Int): String =
        if (y in 2000..2009) Numbers.toWords(y.toLong(), Lang.EN)
        else "${Numbers.toWords((y / 100).toLong(), Lang.EN)} ${if (y % 100 == 0) "hundred" else if (y % 100 < 10) "oh " + Numbers.toWords((y % 100).toLong(), Lang.EN) else Numbers.toWords((y % 100).toLong(), Lang.EN)}"
}
