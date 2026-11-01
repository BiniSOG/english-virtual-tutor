package com.binisog.voiceassistant.brain

/** Conversation-level intents that can be spoken at any step. */
enum class Intent { YES, NO, REPEAT, BACK, CANCEL, SWITCH_TO_EN, SWITCH_TO_AM, QUESTION, NONE }

object Understanding {

    private fun c(list: List<String>) = list.map { AmharicText.canonical(it) }

    private val yes = c(
        listOf(
            "yes", "yeah", "yep", "yup", "yah", "correct", "right", "that's right", "thats right", "sure",
            "ok", "okay", "confirm", "go ahead", "let's go", "lets go", "start", "of course", "exactly",
            "አዎ", "አዎን", "አዎ ትክክል", "እሺ", "ትክክል", "ትክክል ነው", "ልክ ነው", "ቀጥል", "ቀጥሉ", "እንጀምር", "ጀምር", "በትክክል",
        )
    )
    private val no = c(
        listOf(
            "no", "nope", "nah", "wrong", "incorrect", "not correct", "that's wrong", "not right", "not yet",
            "አይ", "አይደለም", "አይደል", "ስህተት", "ልክ አይደለም", "ትክክል አይደለም", "ተሳስቷል", "ገና ነው", "አልፈልግም",
        )
    )
    private val repeat = c(listOf("repeat", "say again", "say that again", "pardon", "come again", "ድገም", "ይድገሙ", "ይድገሙት", "እንደገና ይበሉ", "አልሰማሁም", "ደግመው"))
    private val back = c(listOf("go back", "previous", "back", "ተመለስ", "ይመለሱ", "ወደ ኋላ", "ወደኋላ"))
    private val cancel = c(listOf("cancel", "stop", "quit", "end call", "hang up", "ሰርዝ", "አቁም", "ያቁሙ", "ይቅር", "ጨርስ"))
    private val toEn = c(listOf("english", "speak english", "in english", "እንግሊዝኛ", "በእንግሊዝኛ"))
    private val toAm = c(listOf("amharic", "speak amharic", "in amharic", "አማርኛ", "በአማርኛ"))
    private val questionWords = c(
        listOf(
            "what", "why", "how", "when", "where", "which", "who", "can i", "do i", "is it", "is my", "are you", "will",
            "ምን", "ምንድን", "ለምን", "እንዴት", "መቼ", "የት", "ስንት", "ማን", "ይቻላል", "ያስፈልጋል", "ነው ወይ", "ይሆናል",
        )
    )

    private fun hasPhrase(text: String, phrases: List<String>): Boolean {
        val padded = " $text "
        return phrases.any { p -> padded.contains(" $p ") }
    }

    /** Short utterances only: "yes my name is no..." must not count as an answer. */
    fun intent(raw: String): Intent {
        val t = AmharicText.canonical(raw)
        if (t.isEmpty()) return Intent.NONE
        val words = t.split(' ').size
        if (hasPhrase(t, cancel) && words <= 4) return Intent.CANCEL
        if (hasPhrase(t, toAm) && words <= 4) return Intent.SWITCH_TO_AM
        if (hasPhrase(t, toEn) && words <= 4) return Intent.SWITCH_TO_EN
        if (hasPhrase(t, repeat) && words <= 5) return Intent.REPEAT
        if (hasPhrase(t, back) && words <= 4) return Intent.BACK
        if (words <= 4) {
            val isNo = hasPhrase(t, no)
            val isYes = hasPhrase(t, yes)
            // Negation wins: "አይ ትክክል አይደለም" contains "ትክክል" but means no.
            if (isNo) return Intent.NO
            if (isYes) return Intent.YES
        }
        if (raw.trim().endsWith("?") || raw.trim().endsWith("፧") || hasPhrase(t, questionWords)) return Intent.QUESTION
        return Intent.NONE
    }

    // ------------------------------------------------------------------ names

    private val namePrefixes = c(
        listOf(
            "my name is", "my full name is", "the name is", "name is", "i am", "i'm", "im", "it is", "it's", "its",
            "this is", "call me", "my name's",
            "ስሜ", "ሙሉ ስሜ", "እኔ", "ስሜ ደግሞ", "እኔ ስሜ",
        )
    ).sortedByDescending { it.length }
    private val nameSuffixes = c(listOf("ነው", "እባላለሁ", "ይባላል", "ነኝ", "thank you", "thanks", "please", "አመሰግናለሁ")).sortedByDescending { it.length }

    /** Strips "my name is" / "ስሜ ... ነው" and title-cases Latin names. */
    fun extractName(raw: String): String? {
        var t = AmharicText.canonical(raw).replace(Regex("\\d"), "").trim()
        var changed = true
        while (changed) {
            changed = false
            for (p in namePrefixes) if (t == p || t.startsWith("$p ")) { t = t.removePrefix(p).trim(); changed = true }
            for (s in nameSuffixes) if (t == s || t.endsWith(" $s")) { t = t.removeSuffix(s).trim(); changed = true }
        }
        if (t.isBlank()) return null
        val parts = t.split(' ').filter { it.isNotBlank() }
        // Show the user's own spelling (not the matching form) when the text is in Ge'ez.
        val display = if (AmharicText.containsEthiopic(raw)) {
            raw.trim().split(Regex("\\s+")).filter { w -> parts.any { AmharicText.canonical(w) == it } }
                .ifEmpty { parts }
        } else parts.map { w -> w.replaceFirstChar { it.uppercase() } }
        return display.joinToString(" ").takeIf { it.isNotBlank() }
    }

    // ------------------------------------------------------------------ places

    data class Place(val en: String, val am: String, val aliases: List<String> = emptyList()) {
        fun display(lang: Lang) = if (lang == Lang.AM) am else en
        val forms: List<String> get() = (listOf(en, am) + aliases).map { AmharicText.canonical(it) }
    }

    val cities = listOf(
        Place("Addis Ababa", "አዲስ አበባ", listOf("addis", "finfinne", "አዲሳባ", "አዲስ")),
        Place("Adama", "አዳማ", listOf("nazret", "nazareth", "ናዝሬት")),
        Place("Bahir Dar", "ባሕር ዳር", listOf("bahirdar", "bahar dar", "ባህርዳር")),
        Place("Gondar", "ጎንደር", listOf("gonder")),
        Place("Mekelle", "መቐለ", listOf("mekele", "makale", "መቀሌ")),
        Place("Hawassa", "ሀዋሳ", listOf("awassa", "awasa", "አዋሳ")),
        Place("Dire Dawa", "ድሬዳዋ", listOf("diredawa", "dire", "ድሬ")),
        Place("Jimma", "ጅማ", listOf("jima")),
        Place("Dessie", "ደሴ", listOf("dese")),
        Place("Harar", "ሐረር", listOf("harer")),
        Place("Bishoftu", "ቢሾፍቱ", listOf("debre zeit", "debrezeit", "ደብረ ዘይት")),
        Place("Debre Markos", "ደብረ ማርቆስ", listOf("debremarkos")),
        Place("Debre Birhan", "ደብረ ብርሃን", listOf("debre berhan", "debrebirhan")),
        Place("Debre Tabor", "ደብረ ታቦር"),
        Place("Arba Minch", "አርባ ምንጭ", listOf("arbaminch")),
        Place("Shashemene", "ሻሸመኔ", listOf("shashamane")),
        Place("Jijiga", "ጅጅጋ"),
        Place("Gambela", "ጋምቤላ", listOf("gambella")),
        Place("Asosa", "አሶሳ", listOf("assosa")),
        Place("Wolaita Sodo", "ወላይታ ሶዶ", listOf("sodo", "soddo", "ሶዶ")),
        Place("Dilla", "ዲላ"),
        Place("Nekemte", "ነቀምቴ", listOf("nekemt")),
        Place("Axum", "አክሱም", listOf("aksum")),
        Place("Lalibela", "ላሊበላ"),
        Place("Woldia", "ወልዲያ", listOf("weldiya")),
        Place("Kombolcha", "ኮምቦልቻ"),
        Place("Hosaena", "ሆሳዕና", listOf("hosanna", "hossana")),
        Place("Adigrat", "አዲግራት"),
        Place("Ambo", "አምቦ"),
        Place("Debre Libanos", "ደብረ ሊባኖስ"),
        Place("Hosaina", "ሆሳይና"),
        Place("Butajira", "ቡታጅራ"),
        Place("Burayu", "ቡራዩ"),
        Place("Sebeta", "ሰበታ"),
        Place("Shire", "ሽሬ"),
        Place("Adwa", "አድዋ"),
        Place("Metu", "መቱ"),
        Place("Gimbi", "ጊምቢ"),
        Place("Assela", "አሰላ", listOf("asella")),
        Place("Robe", "ሮቤ"),
        Place("Goba", "ጎባ"),
        Place("Negele", "ነገሌ"),
        Place("Moyale", "ሞያሌ"),
        Place("Semera", "ሰመራ"),
        Place("Bonga", "ቦንጋ"),
        Place("Mizan Teferi", "ሚዛን ተፈሪ"),
        Place("Debre Werk", "ደብረ ወርቅ"),
        Place("Finote Selam", "ፍኖተ ሰላም"),
        Place("Injibara", "እንጅባራ"),
        Place("Kemise", "ከሚሴ"),
        Place("Fiche", "ፍቼ"),
        Place("Holeta", "ሆለታ"),
        Place("Welkite", "ወልቂጤ", listOf("wolkite")),
        Place("Hawzen", "ሐውዜን"),
        Place("Alamata", "አላማጣ"),
        Place("Kobo", "ቆቦ"),
        Place("Bati", "ባቲ"),
        Place("Ziway", "ዝዋይ", listOf("batu", "ባቱ")),
        Place("Modjo", "ሞጆ"),
        Place("Durame", "ዱራሜ"),
        Place("Areka", "አረካ"),
        Place("Jinka", "ጂንካ"),
        Place("Tepi", "ቴፒ"),
        Place("Agaro", "አጋሮ"),
        Place("Chiro", "ጭሮ"),
        Place("Haramaya", "ሐረማያ"),
        Place("Awash", "አዋሽ"),
    )

    val countries = listOf(
        Place("Ethiopian", "ኢትዮጵያዊ", listOf("ethiopia", "ኢትዮጵያ", "ኢትዮጵያዊት", "habesha", "ሀበሻ")),
        Place("Eritrean", "ኤርትራዊ", listOf("eritrea", "ኤርትራ")),
        Place("Kenyan", "ኬንያዊ", listOf("kenya", "ኬንያ")),
        Place("Somali", "ሶማሊያዊ", listOf("somalia", "ሶማሊያ")),
        Place("Djiboutian", "ጂቡቲያዊ", listOf("djibouti", "ጂቡቲ")),
        Place("Sudanese", "ሱዳናዊ", listOf("sudan", "ሱዳን")),
        Place("South Sudanese", "ደቡብ ሱዳናዊ", listOf("south sudan", "ደቡብ ሱዳን")),
        Place("American", "አሜሪካዊ", listOf("america", "usa", "united states", "አሜሪካ")),
        Place("British", "እንግሊዛዊ", listOf("uk", "united kingdom", "england", "እንግሊዝ")),
        Place("Other", "ሌላ", listOf("other", "foreigner", "ውጭ ዜጋ")),
    )

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

    /** Best gazetteer match: exact phrase first, then a fuzzy match tolerant of ASR spelling errors. */
    fun matchPlace(raw: String, places: List<Place>): Place? {
        val t = AmharicText.canonical(raw)
        if (t.isEmpty()) return null
        val padded = " $t "
        places.flatMap { p -> p.forms.map { p to it } }
            .sortedByDescending { it.second.length }
            .firstOrNull { (_, f) -> padded.contains(" $f ") || (AmharicText.containsEthiopic(f) && f.length >= 3 && t.contains(f)) }
            ?.let { return it.first }
        val words = t.split(' ')
        val windows = (1..3).flatMap { n -> words.windowed(n).map { it.joinToString(" ") } } +
            (1..3).flatMap { n -> words.windowed(n).map { it.joinToString("") } }
        var best: Place? = null
        var bestScore = 1.0
        for (p in places) for (f in p.forms) for (w in windows) {
            if (f.length < 3) continue
            val score = levenshtein(f, w).toDouble() / maxOf(f.length, w.length)
            if (score < bestScore) { bestScore = score; best = p }
        }
        return if (bestScore <= 0.34) best else null
    }

    private val placeFillers = c(
        listOf(
            "i was born in", "born in", "i was born at", "in", "at", "the city of", "city", "the city is", "it is", "it's",
            "ተወለድኩት", "የተወለድኩት", "ተወለድኩ", "ነው", "ከተማ", "በ", "ውስጥ",
        )
    ).sortedByDescending { it.length }

    /** City answer: a known city, otherwise the cleaned free text (small towns are fine). */
    fun extractCity(raw: String, lang: Lang): String? {
        matchPlace(raw, cities)?.let { return it.display(lang) }
        var t = AmharicText.canonical(raw)
        for (f in placeFillers) t = (" $t ").replace(" $f ", " ").trim()
        if (t.isBlank() || t.split(' ').size > 4) return null
        return if (AmharicText.containsEthiopic(t)) t else t.split(' ').joinToString(" ") { w -> w.replaceFirstChar { it.uppercase() } }
    }

    // ------------------------------------------------------------------ account types

    enum class AccountType(val en: String, val am: String, val keys: List<String>) {
        SAVINGS("Savings Account", "የቁጠባ ሂሳብ", listOf("saving", "savings", "save", "ቁጠባ", "የቁጠባ", "ቁጠባ ሂሳብ")),
        CURRENT("Current Account", "ተንቀሳቃሽ ሂሳብ", listOf("current", "checking", "cheque", "check", "ተንቀሳቃሽ", "ከረንት", "ቼክ")),
        INTEREST_FREE("Interest-Free Account", "ከወለድ ነፃ ሂሳብ", listOf("interest free", "interest-free", "islamic", "wadiah", "ከወለድ ነፃ", "ከወለድ ነጻ", "ወለድ", "ነፃ", "ነጻ")),
        YOUTH("Youth Savings Account", "የወጣቶች ቁጠባ ሂሳብ", listOf("youth", "student", "ወጣት", "የወጣቶች", "ተማሪ"));

        fun display(lang: Lang) = if (lang == Lang.AM) am else en
    }

    fun extractAccountType(raw: String): AccountType? {
        val t = " " + AmharicText.canonical(raw) + " "
        // Most specific first: "interest free savings" is interest-free, "youth savings" is youth.
        val order = listOf(AccountType.INTEREST_FREE, AccountType.YOUTH, AccountType.CURRENT, AccountType.SAVINGS)
        return order.firstOrNull { type -> type.keys.map { AmharicText.canonical(it) }.any { k -> t.contains(" $k ") || (AmharicText.containsEthiopic(k) && t.contains(k)) } }
    }
}
