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
