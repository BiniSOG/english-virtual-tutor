package com.binisog.voiceassistant.brain

/**
 * Tiny bilingual retrieval model for off-script questions ("why are you recording me?").
 * Each entry has keyword lists per language; the best-overlapping entry above a threshold wins.
 */
object Faq {
    data class Entry(val keysEn: List<String>, val keysAm: List<String>, val en: String, val am: String)

    val entries = listOf(
        Entry(
            listOf("record", "recording", "video", "camera", "film", "privacy", "watching"),
            listOf("ቪዲዮ", "ካሜራ", "ቀረጻ", "ይቀረጻል", "የምትቀርጹኝ", "የምትቀርጸኝ", "ምስል", "ግላዊነት"),
            "The front camera records this session so the bank can verify that you are really the person opening the account. The video stays on this phone.",
            "የፊት ካሜራው ይህን ክፍለ ጊዜ የሚቀርጸው አካውንቱን የሚከፍቱት እርስዎ መሆንዎን ባንኩ ለማረጋገጥ ነው። ቪዲዮው በዚህ ስልክ ላይ ብቻ ይቀመጣል።"
        ),
        Entry(
            listOf("document", "documents", "need", "require", "requirements", "bring", "id", "photo", "passport"),
            listOf("ሰነድ", "ያስፈልጋል", "ያስፈልገኛል", "መታወቂያ", "ፎቶ", "ፓስፖርት", "ምን ያስፈልጋል"),
            "You only need your Fayda national ID number and the phone number registered with it. No paper documents are needed.",
            "የሚያስፈልግዎ የፋይዳ ብሔራዊ መታወቂያ ቁጥርዎ እና ከእሱ ጋር የተመዘገበው ስልክ ቁጥር ብቻ ነው። የወረቀት ሰነድ አያስፈልግም።"
        ),
        Entry(
            listOf("fan", "fayda", "national", "number", "where", "find"),
            listOf("ፋይዳ", "ፋን", "ብሔራዊ", "ቁጥሩ", "የት", "አገኛለሁ"),
            "The FAN is the number printed on your Fayda national ID card or in the Fayda app. It is used to confirm your identity.",
            "FAN በፋይዳ ብሔራዊ መታወቂያ ካርድዎ ወይም በፋይዳ መተግበሪያ ላይ የሚገኝ ቁጥር ነው። ማንነትዎን ለማረጋገጥ ያገለግላል።"
        ),
        Entry(
            listOf("savings", "current", "difference", "type", "types", "which", "account", "best"),
            listOf("ቁጠባ", "ተንቀሳቃሽ", "ልዩነት", "ዓይነት", "አይነት", "የትኛው", "ይሻላል"),
            "A savings account earns interest and is good for saving money. A current account is for frequent payments and cheques. An interest-free account follows Islamic banking principles.",
            "የቁጠባ ሂሳብ ወለድ ያስገኛል፤ ገንዘብ ለመቆጠብ ጥሩ ነው። ተንቀሳቃሽ ሂሳብ ለተደጋጋሚ ክፍያ እና ለቼክ ነው። ከወለድ ነፃ ሂሳብ የኢስላማዊ ባንክ መርሆዎችን ይከተላል።"
        ),
        Entry(
            listOf("long", "time", "minutes", "fast", "quick", "how long"),
            listOf("ስንት", "ደቂቃ", "ጊዜ", "ይወስዳል", "ፈጣን"),
            "It usually takes about three minutes. Your account is active as soon as we finish.",
            "ብዙውን ጊዜ ሦስት ደቂቃ ያህል ይወስዳል። ልክ እንደጨረስን አካውንትዎ ንቁ ይሆናል።"
        ),
        Entry(
            listOf("deposit", "minimum", "money", "fee", "cost", "charge", "pay", "balance"),
            listOf("ተቀማጭ", "ዝቅተኛ", "ገንዘብ", "ክፍያ", "ብር", "ያስከፍላል"),
            "Opening the account is free. Minimum balance and fees depend on the bank's current tariff, which a branch can confirm.",
            "አካውንት መክፈት በነፃ ነው። ዝቅተኛ ቀሪ ሂሳብ እና ክፍያዎች በባንኩ ወቅታዊ ታሪፍ ይወሰናሉ፤ ቅርንጫፍ ሊያረጋግጥልዎ ይችላል።"
        ),
        Entry(
            listOf("interest", "rate", "percent"),
            listOf("ወለድ", "መጠን", "በመቶ"),
            "Interest rates follow the bank's published rates and National Bank of Ethiopia rules. Savings accounts earn at least the regulatory minimum rate.",
            "የወለድ መጠን የባንኩን ይፋዊ ተመን እና የኢትዮጵያ ብሔራዊ ባንክ መመሪያን ይከተላል። የቁጠባ ሂሳብ ቢያንስ በመመሪያው ዝቅተኛ ተመን ወለድ ያገኛል።"
        ),
        Entry(
            listOf("otp", "code", "sms", "receive", "received", "didn't", "message"),
            listOf("ኮድ", "መልእክት", "አልደረሰኝም", "ኤስኤምኤስ", "ኦቲፒ"),
            "The one-time code goes to the phone number registered with your Fayda ID. In this offline demo it is shown on the screen.",
            "የአንድ ጊዜ ኮዱ ከፋይዳ መታወቂያዎ ጋር ወደ ተመዘገበው ስልክ ቁጥር ይላካል። በዚህ ከመስመር ውጭ ማሳያ ላይ ኮዱ በስክሪኑ ላይ ይታያል።"
        ),
        Entry(
            listOf("safe", "secure", "security", "data", "information", "share", "stored"),
            listOf("ደህንነት", "አስተማማኝ", "መረጃዬ", "መረጃ", "ይቀመጣል"),
            "Everything is processed on this phone without internet. Nothing is sent anywhere during this demo.",
            "ሁሉም ነገር ያለ ኢንተርኔት በዚህ ስልክ ላይ ይሰራል። በዚህ ማሳያ ወቅት ምንም መረጃ ወደ ሌላ ቦታ አይላክም።"
        ),
        Entry(
            listOf("who", "you", "robot", "human", "person", "ai", "real"),
            listOf("ማን", "ነሽ", "ነህ", "ሮቦት", "ሰው"),
            "I'm an AI assistant that runs fully on this phone. I can help you open an account in English or Amharic.",
            "እኔ ሙሉ በሙሉ በዚህ ስልክ ላይ የሚሰራ የሰው ሰራሽ አስተውሎት ረዳት ነኝ። በአማርኛ ወይም በእንግሊዝኛ አካውንት እንዲከፍቱ እረዳዎታለሁ።"
        ),
        Entry(
            listOf("card", "atm", "debit", "mobile", "banking", "app"),
            listOf("ካርድ", "ኤቲኤም", "ሞባይል", "ባንኪንግ"),
            "After the account is created you can request an ATM card and activate mobile banking from the app.",
            "አካውንቱ ከተከፈተ በኋላ የኤቲኤም ካርድ መጠየቅ እና የሞባይል ባንኪንግን ከመተግበሪያው ማስጀመር ይችላሉ።"
        ),
    )

    private val stop = setOf("the", "a", "an", "is", "are", "do", "i", "my", "to", "of", "it", "what", "how", "can", "you", "me", "for", "this", "ነው", "ምን", "እንዴት")

    fun answer(raw: String, lang: Lang): String? {
        val words = AmharicText.canonical(raw).split(' ').filter { it.isNotEmpty() && it !in stop }
        if (words.isEmpty()) return null
        var best: Entry? = null
        var bestScore = 0.0
        for (e in entries) {
            val keys = (e.keysEn + e.keysAm).map { AmharicText.canonical(it) }
            var hits = 0.0
            for (w in words) {
                if (keys.any { k -> k == w }) hits += 1.0
                else if (keys.any { k -> AmharicText.containsEthiopic(k) && k.length >= 3 && (w.contains(k) || k.contains(w) && w.length >= 3) }) hits += 0.7
            }
            val score = hits / words.size.coerceAtMost(6)
            if (score > bestScore) { bestScore = score; best = e }
        }
        val b = best ?: return null
        if (bestScore < 0.25) return null
        return if (lang == Lang.AM) b.am else b.en
    }
}
