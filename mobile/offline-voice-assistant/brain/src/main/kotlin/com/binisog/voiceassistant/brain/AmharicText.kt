package com.binisog.voiceassistant.brain

/**
 * Helpers for Ge'ez (Ethiopic) script text: spelling normalisation for matching,
 * and romanisation for TTS voices that were trained on romanised text.
 */
object AmharicText {

    fun isEthiopic(c: Char): Boolean = c.code in 0x1200..0x139F || c.code in 0x2D80..0x2DDF

    fun containsEthiopic(s: String): Boolean = s.any { isEthiopic(it) }

    /**
     * Collapses letters that sound the same in modern Amharic so that, for example,
     * "ሀዋሳ", "ሃዋሳ" and "ሐዋሳ" all compare equal. Used only for matching, never for display.
     */
    fun normalize(input: String): String {
        val sb = StringBuilder(input.length)
        for (ch in input) {
            var code = ch.code
            if (code in 0x1200..0x137F) {
                val row = code and 0xFFF8 // each row holds 8 vowel forms
                var order = code - row
                val newRow = when (row) {
                    0x1210, 0x1280, 0x1200 -> 0x1200 // ሐ ኀ ሀ -> ሀ
                    0x1220 -> 0x1230 // ሠ -> ሰ
                    0x12D0 -> 0x12A0 // ዐ -> አ
                    0x1340 -> 0x1338 // ፀ -> ጸ
                    else -> row
                }
                // ሃ/ሀ and ኣ/አ are used interchangeably.
                if ((newRow == 0x1200 || newRow == 0x12A0) && order == 3) order = 0
                code = newRow + order
            }
            sb.append(code.toChar())
        }
        return sb.toString()
    }

    /** Lower-cases, normalises Ge'ez variants and replaces punctuation with spaces. */
    fun canonical(input: String): String {
        val n = normalize(input.lowercase())
        val sb = StringBuilder(n.length)
        for (c in n) {
            sb.append(
                when {
                    c.isLetterOrDigit() -> c
                    c == '\'' -> c
                    else -> ' '
                }
            )
        }
        return sb.toString().replace(Regex("\\s+"), " ").trim()
    }

    // Consonant for each 8-letter row of the Ethiopic block, "" for vowel-carrier rows.
    private val rowConsonant: Map<Int, String> = mapOf(
        0x1200 to "h", 0x1208 to "l", 0x1210 to "h", 0x1218 to "m", 0x1220 to "s",
        0x1228 to "r", 0x1230 to "s", 0x1238 to "sh", 0x1240 to "q", 0x1248 to "qw",
        0x1250 to "q", 0x1258 to "qw", 0x1260 to "b", 0x1268 to "v", 0x1270 to "t",
        0x1278 to "ch", 0x1280 to "h", 0x1288 to "hw", 0x1290 to "n", 0x1298 to "ny",
        0x12A0 to "", 0x12A8 to "k", 0x12B0 to "kw", 0x12B8 to "h", 0x12C0 to "kw",
        0x12C8 to "w", 0x12D0 to "", 0x12D8 to "z", 0x12E0 to "zh", 0x12E8 to "y",
        0x12F0 to "d", 0x12F8 to "d", 0x1300 to "j", 0x1308 to "g", 0x1310 to "gw",
        0x1318 to "g", 0x1320 to "t", 0x1328 to "ch", 0x1330 to "p", 0x1338 to "ts",
        0x1340 to "ts", 0x1348 to "f", 0x1350 to "p",
    )

    private val orderVowel = arrayOf("e", "u", "i", "a", "e", "", "o", "wa")

    /**
     * uroman-style romanisation ("ሰላም" -> "selam"). Meta MMS voices for Amharic are trained on
     * romanised text, so this lets them read Ge'ez script.
     */
    fun romanize(input: String): String {
        val sb = StringBuilder()
        for (ch in input) {
            val code = ch.code
            when {
                code in 0x1200..0x135A -> {
                    val row = code and 0xFFF8
                    val order = code - row
                    val consonant = rowConsonant[row]
                    if (consonant == null) {
                        sb.append(' ')
                    } else if (consonant.isEmpty()) {
                        // አ-row: the letter itself is a vowel. 1st and 4th order are both "a".
                        sb.append(if (order == 0) "a" else if (order == 5) "e" else orderVowel[order])
                    } else {
                        sb.append(consonant).append(orderVowel[order])
                    }
                }
                ch == '።' || ch == '፧' -> sb.append(if (ch == '፧') '?' else '.')
                ch == '፣' || ch == '፤' || ch == '፥' || ch == '፦' -> sb.append(',')
                else -> sb.append(ch)
            }
        }
        return sb.toString()
    }
}
