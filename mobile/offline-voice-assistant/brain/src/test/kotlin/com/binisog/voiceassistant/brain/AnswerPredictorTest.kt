package com.binisog.voiceassistant.brain

import java.time.LocalDate
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AnswerPredictorTest {
    @Test fun soundsLike() {
        assertTrue(AnswerPredictor.soundsLike("jan worry", "january") > 0.7)
        assertTrue(AnswerPredictor.soundsLike("ሀዋሳ", "hawassa") > 0.75, AnswerPredictor.phonetic("ሀዋሳ"))
        assertTrue(AnswerPredictor.soundsLike("savings", "current") < 0.5)
    }

    @Test fun correctsTowardsExpectedAnswers() {
        assertEquals("january fifteen two thousand", AnswerPredictor.correct("jan worry fifteen two thousand", Step.DOB, false))
        assertEquals("four two one", AnswerPredictor.correct("for to won", Step.FAN, false))
        assertEquals("yes", AnswerPredictor.correct("yess", Step.FULL_NAME, true))
        assertEquals("savings", AnswerPredictor.correct("savins", Step.ACCOUNT_TYPE, false))
        // names are never changed
        assertEquals("abebe kebede", AnswerPredictor.correct("abebe kebede", Step.FULL_NAME, false))
    }

    @Test fun agentUsesPredictions() {
        val a = AccountOpeningAgent(random = Random(1), today = { LocalDate.of(2026, 11, 1) })
        a.start(); a.onUtterance("yes")
        a.onUtterance("my name is Abebe Kebede"); a.onUtterance(a.pickBest(listOf("yess"))!!)
        assertEquals(Step.DOB, a.step)
        val heard = a.pickBest(listOf("jan worry fifteen two thousand"))!!
        a.onUtterance(heard)
        assertEquals("Jan 15, 2000", a.pendingValue)
        a.onUtterance("yes")
        assertEquals(Step.BIRTH_CITY, a.step)
        a.onUtterance("hawasa"); a.onUtterance("yes")
        assertEquals("Hawassa", a.profile.birthCity)
        a.onUtterance("ethiopian"); a.onUtterance("yes")
        assertEquals(listOf("Savings Account", "Current Account", "Interest-Free Account", "Youth Savings Account"), a.suggestions())
        a.onUtterance(a.pickBest(listOf("savins please"))!!)
        assertEquals(Step.FAN, a.step)
        a.onUtterance(a.pickBest(listOf("one two three for five six seven ate nine zero one to"))!!)
        assertEquals("1234 5678 9012", a.pendingValue)
    }
}
