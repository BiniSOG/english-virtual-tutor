package com.binisog.voiceassistant.brain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class VoiceScriptTest {
    private val clips = VoiceScript.amharicClips()
    private val recorded = clips.associate { it.id to it.text }

    @Test fun scriptIsReasonable() {
        assertTrue(clips.size in 150..900, "clips=${clips.size}")
        assertTrue(clips.none { it.text.contains("{") })
        assertEquals(clips.size, clips.map { it.id }.toSet().size)
    }

    @Test fun repliesAreMostlyRecorded() {
        val a = AccountOpeningAgent(initialLang = Lang.AM)
        val replies = listOf(
            a.start(),
            a.onUtterance("አዎ")!!,
            a.onUtterance("ስሜ ቤተልሄም ተስፋዬ አለሙ ነው")!!,
            a.onUtterance("አዎ")!!,
            a.onUtterance("ሚያዝያ 7 1992")!!,
            a.onUtterance("አዎ")!!,
            a.onUtterance("አዳማ")!!,
        )
        for (r in replies) {
            val plan = VoiceScript.plan(r.speech, recorded)
            val synthWords = plan.filterIsInstance<VoiceScript.Segment.Synth>().sumOf { VoiceScript.words(it.text).size }
            val total = VoiceScript.words(r.speech).size
            println("${r.speech}\n  -> $plan")
            // Only the customer's name may be left to the offline voice.
            assertTrue(synthWords <= 3, "too much unrecorded speech in: ${r.speech} -> $plan")
            assertTrue(total > 0)
        }
    }
}

class MultiLanguageTest {
    @Test fun numbersInPackLanguages() {
        assertEquals(listOf("200"), Numbers.chunks("dhibba lama"))
        assertEquals(listOf("1992"), Numbers.chunks("kuma tokko fi dhibba sagal fi sagaltamii lama"))
        assertEquals(listOf("15"), Numbers.chunks("kudha shan"))
        assertEquals("123", Numbers.digits("tokko lama sadii"))
        assertEquals(listOf("11"), Numbers.chunks("ዓሰርተ ሓደ"))
        assertEquals("642", Numbers.digits("ሽዱሽተ ኣርባዕተ ክልተ"))
        for (lang in listOf(Lang.OM, Lang.TI, Lang.AA)) {
            for (n in listOf(7L, 15L, 42L, 300L, 1992L, 2016L)) {
                val words = Numbers.toWords(n, lang)
                assertEquals(listOf(n.toString()), Numbers.chunks(words), "$lang $n -> $words")
            }
        }
    }

    @Test fun conversationInEachLanguage() {
        for (lang in listOf(Lang.OM, Lang.TI, Lang.AA)) {
            val a = AccountOpeningAgent(initialLang = lang)
            val g = a.start()
            assertTrue(!g.display.contains("{"), g.display)
            val yes = lang.pack!!.intents.getValue("yes").first()
            a.onUtterance(yes)
            assertEquals(Step.FULL_NAME, a.step, "$lang: '$yes' should mean yes")
            a.onUtterance("Abebe Kebede Bekele")
            assertEquals("Abebe Kebede Bekele", a.pendingValue, lang.name)
            val next = a.onUtterance(yes)!!
            assertEquals(Step.DOB, a.step)
            assertTrue(next.display.contains("Abebe"), "$lang: ${next.display}")
            println("$lang: ${next.display}")
        }
    }

    @Test fun switchesLanguageByVoice() {
        val a = AccountOpeningAgent(initialLang = Lang.EN)
        a.start()
        a.onUtterance("afaan oromoo")
        assertEquals(Lang.OM, a.lang)
        a.onUtterance("ትግርኛ")
        assertEquals(Lang.TI, a.lang)
        a.onUtterance("qafar af")
        assertEquals(Lang.AA, a.lang)
    }

    @Test fun scriptsForEveryLanguage() {
        for (lang in listOf(Lang.AM, Lang.OM, Lang.TI, Lang.AA)) {
            val clips = VoiceScript.clips(lang)
            println("$lang: ${clips.size} clips")
            assertTrue(clips.size > 120, "$lang ${clips.size}")
            assertTrue(clips.none { it.text.contains("{") })
        }
        // Amharic recordings made before must keep their ids.
        assertTrue(VoiceScript.clips(Lang.AM).any { it.id == "30e39c6804f9" })
    }
}
