package com.binisog.voiceassistant.brain

import java.time.LocalDate
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class NumbersTest {
    @Test fun englishWords() {
        assertEquals(listOf("15", "2000"), Numbers.chunks("january fifteenth two thousand"))
        assertEquals(listOf("19", "92"), Numbers.chunks("nineteen ninety two"))
        assertEquals("123456789012", Numbers.digits("one two three four five six seven eight nine zero one two"))
        assertEquals("1234", Numbers.digits("twelve thirty four"))
        assertEquals(listOf("2005"), Numbers.chunks("two thousand and five"))
        assertEquals(listOf("125"), Numbers.chunks("one hundred twenty-five"))
        assertEquals("1234 5678 9012".replace(" ", ""), Numbers.digits("1234 5678 9012"))
    }

    @Test fun amharicWords() {
        assertEquals(listOf("15"), Numbers.chunks("አስራ አምስት"))
        assertEquals(listOf("15"), Numbers.chunks("አስራአምስት"))
        assertEquals(listOf("1992"), Numbers.chunks("አንድ ሺህ ዘጠኝ መቶ ዘጠና ሁለት"))
        assertEquals(listOf("2000"), Numbers.chunks("ሁለት ሺ"))
        assertEquals("642819", Numbers.digits("ስድስት አራት ሁለት ስምንት አንድ ዘጠኝ"))
        assertEquals(listOf("7"), Numbers.chunks("7ኛ"))
    }

    @Test fun speaking() {
        assertEquals("one thousand nine hundred and ninety two", Numbers.toWords(1992, Lang.EN))
        assertEquals("አንድ ሺህ ዘጠኝ መቶ ዘጠና ሁለት", Numbers.toWords(1992, Lang.AM))
        assertEquals("አስራ አምስት", Numbers.toWords(15, Lang.AM))
        assertEquals("code one two three four five", Numbers.verbalize("code 12345", Lang.EN))
    }
}

class CalendarTest {
    @Test fun newYear() {
        assertEquals(LocalDate.of(2023, 9, 12), EthiopianCalendar.toGregorian(2016, 1, 1))
        assertEquals(LocalDate.of(2000, 4, 15), EthiopianCalendar.toGregorian(1992, 8, 7))
        assertEquals(Triple(1992, 8, 7), EthiopianCalendar.fromGregorian(LocalDate.of(2000, 4, 15)))
        // round trip over many days
        var d = LocalDate.of(1950, 1, 1)
        while (d.year < 2030) {
            val (y, m, day) = EthiopianCalendar.fromGregorian(d)
            assertEquals(d, EthiopianCalendar.toGregorian(y, m, day), "round trip $d")
            d = d.plusDays(13)
        }
    }

    @Test fun parsing() {
        assertEquals(LocalDate.of(2000, 1, 15), DateParser.parse("January 15th 2000", Lang.EN)?.gregorian)
        assertEquals(LocalDate.of(2000, 1, 15), DateParser.parse("the fifteenth of january two thousand", Lang.EN)?.gregorian)
        assertEquals(LocalDate.of(1992, 3, 4), DateParser.parse("4 march nineteen ninety two", Lang.EN)?.gregorian)
        assertEquals(LocalDate.of(2000, 1, 15), DateParser.parse("15/01/2000", Lang.EN)?.gregorian)
        val ec = DateParser.parse("ሚያዝያ 7 1992", Lang.AM)
        assertEquals(LocalDate.of(2000, 4, 15), ec?.gregorian)
        assertTrue(ec!!.ethiopian)
        assertEquals(LocalDate.of(2000, 4, 15), DateParser.parse("ሚያዝያ ሰባት አንድ ሺህ ዘጠኝ መቶ ዘጠና ሁለት", Lang.AM)?.gregorian)
        assertEquals(LocalDate.of(2000, 1, 15), DateParser.parse("ጃንዋሪ 15 2000", Lang.AM)?.gregorian)
        assertEquals(LocalDate.of(2000, 4, 15), DateParser.parse("7/8/1992 ዓ.ም", Lang.EN)?.gregorian)
        assertNull(DateParser.parse("I don't know", Lang.EN))
    }
}

class UnderstandingTest {
    @Test fun intents() {
        assertEquals(Intent.YES, Understanding.intent("Yes, that's right"))
        assertEquals(Intent.YES, Understanding.intent("አዎ"))
        assertEquals(Intent.YES, Understanding.intent("እሺ እንጀምር"))
        assertEquals(Intent.NO, Understanding.intent("no"))
        assertEquals(Intent.NO, Understanding.intent("አይ ትክክል አይደለም"))
        assertEquals(Intent.SWITCH_TO_AM, Understanding.intent("በአማርኛ"))
        assertEquals(Intent.QUESTION, Understanding.intent("why are you recording me?"))
        assertEquals(Intent.QUESTION, Understanding.intent("ለምን ትቀርጹኛላችሁ"))
        assertEquals(Intent.NONE, Understanding.intent("my name is Betelhem Tesfaye Alemu"))
    }

    @Test fun names() {
        assertEquals("Betelhem Tesfaye Alemu", Understanding.extractName("my name is betelhem tesfaye alemu"))
        assertEquals("ቤተልሄም ተስፋዬ አለሙ", Understanding.extractName("ስሜ ቤተልሄም ተስፋዬ አለሙ ነው"))
        assertEquals("ቤተልሄም ተስፋዬ", Understanding.extractName("ቤተልሄም ተስፋዬ እባላለሁ"))
    }

    @Test fun places() {
        assertEquals("Addis Ababa", Understanding.extractCity("I was born in addis ababa", Lang.EN))
        assertEquals("አዲስ አበባ", Understanding.extractCity("አዲስ አበባ ነው የተወለድኩት", Lang.AM))
        assertEquals("Hawassa", Understanding.extractCity("awasa", Lang.EN))
        assertEquals("Hawassa", Understanding.extractCity("ሃዋሳ", Lang.EN))
        assertEquals("Bahir Dar", Understanding.extractCity("bahar dar", Lang.EN))
        assertEquals("Gondor".let { "Gondar" }, Understanding.extractCity("gondor", Lang.EN))
        assertEquals("Ethiopian", Understanding.matchPlace("I am ethiopian", Understanding.countries)?.en)
        assertEquals("Ethiopian", Understanding.matchPlace("ኢትዮጵያዊ ነኝ", Understanding.countries)?.en)
        assertEquals(Understanding.AccountType.SAVINGS, Understanding.extractAccountType("a savings account please"))
        assertEquals(Understanding.AccountType.INTEREST_FREE, Understanding.extractAccountType("ከወለድ ነፃ"))
        assertEquals(Understanding.AccountType.CURRENT, Understanding.extractAccountType("ተንቀሳቃሽ ሂሳብ"))
    }

    @Test fun faq() {
        assertNotNull(Faq.answer("why are you recording video", Lang.EN))
        assertTrue(Faq.answer("what documents do I need", Lang.EN)!!.contains("Fayda"))
        assertNotNull(Faq.answer("ምን ሰነድ ያስፈልጋል", Lang.AM))
        assertNull(Faq.answer("banana", Lang.EN))
        assertTrue(Prompts.hasAllKeysInBothLanguages())
    }

    @Test fun romanize() {
        assertEquals("selam", AmharicText.romanize("ሰላም"))
        assertEquals("adis abeba", AmharicText.romanize("አዲስ አበባ"))
    }
}

class AgentTest {
    private fun agent(lang: Lang = Lang.EN) =
        AccountOpeningAgent(random = Random(7), today = { LocalDate.of(2026, 11, 1) }, initialLang = lang)

    @Test fun happyPathEnglish() {
        val a = agent()
        a.start()
        a.onUtterance("yes")
        assertEquals(Step.FULL_NAME, a.step)
        a.onUtterance("my name is Betelhem Tesfaye Alemu")
        assertEquals("Betelhem Tesfaye Alemu", a.pendingValue)
        a.onUtterance("yes")
        assertEquals(Step.DOB, a.step)
        a.onUtterance("January fifteenth two thousand"); a.onConfirm()
        assertEquals(LocalDate.of(2000, 1, 15), a.profile.dateOfBirth)
        a.onUtterance("Addis Ababa"); a.onUtterance("correct")
        assertEquals("Addis Ababa", a.profile.birthCity)
        a.onUtterance("Ethiopian"); a.onUtterance("yes")
        a.onUtterance("savings")
        assertEquals(Step.FAN, a.step)
        a.onUtterance("one two three four five six")
        assertEquals(Step.FAN, a.step)
        a.onUtterance("seven eight nine zero one two")
        assertEquals("1234 5678 9012", a.pendingValue)
        val otp = a.onUtterance("yes")!!
        assertEquals(Step.OTP, a.step)
        val code = (otp.events.single() as AgentEvent.OtpIssued).code
        a.onUtterance("000000".takeIf { it != code } ?: "111111")
        assertEquals(Step.OTP, a.step)
        a.onUtterance(code.map { Numbers.toWords((it - '0').toLong(), Lang.EN) }.joinToString(" "))
        assertEquals(Step.REVIEW, a.step)
        a.onConfirm()
        assertEquals(Step.CREATING, a.step)
        val done = a.finishCreating()
        assertEquals(Step.DONE, a.step)
        assertTrue(done.speech.none { it.isDigit() }, done.speech)
    }

    @Test fun amharicFlowWithQuestionAndEdit() {
        val a = agent(Lang.AM)
        assertTrue(a.start().display.contains("እንጀምር"))
        a.onUtterance("አዎ")
        a.onUtterance("ስሜ ቤተልሄም ተስፋዬ አለሙ ነው"); a.onUtterance("አዎ")
        val faq = a.onUtterance("ለምን ቪዲዮ ትቀርጻላችሁ?")!!
        assertTrue(faq.display.contains("ካሜራ"))
        assertEquals(Step.DOB, a.step)
        a.onUtterance("ሚያዝያ 7 1992"); a.onUtterance("ትክክል ነው")
        assertEquals(LocalDate.of(2000, 4, 15), a.profile.dateOfBirth)
        a.onUtterance("ሀዋሳ"); a.onUtterance("እሺ")
        assertEquals("ሀዋሳ", a.profile.birthCity)
        a.onUtterance("ኢትዮጵያዊ"); a.onUtterance("አዎ")
        a.onUtterance("ቁጠባ")
        a.onUtterance("1234 5678 9012", typed = true); a.onConfirm()
        a.onUtterance(a.otpCode!!, typed = true)
        assertEquals(Step.REVIEW, a.step)
        a.editField(Step.BIRTH_CITY)
        a.onUtterance("አዳማ"); a.onConfirm()
        assertEquals(Step.REVIEW, a.step)
        assertEquals("አዳማ", a.profile.birthCity)
        a.onUtterance("ስሜን ቀይር")
        assertEquals(Step.FULL_NAME, a.step)
        a.onUtterance("ቤተልሄም ተስፋዬ"); a.onUtterance("አዎ")
        assertEquals(Step.REVIEW, a.step)
        assertEquals(Step.DOB, Understanding.fieldToEdit("change my date of birth"))
        assertEquals(Step.BIRTH_CITY, Understanding.fieldToEdit("the city is wrong"))
        assertTrue(a.noResponse()!!.display.startsWith("እያዳመጥኩ"))
        val sw = a.setLanguage(Lang.EN)
        assertTrue(sw.display.startsWith("Okay"))
    }

    @Test fun guards() {
        val a = agent()
        a.start(); a.onUtterance("yes")
        assertEquals(Step.FULL_NAME, a.step)
        a.onUtterance("Abebe")
        assertNull(a.pendingValue)
        a.onUtterance("Abebe Kebede"); a.onUtterance("no")
        assertNull(a.pendingValue)
        a.onUtterance("Abebe Kebede Bekele"); a.onUtterance("yes")
        val r = a.onUtterance("March 3rd 2015")!!
        assertTrue(r.display.contains("18"))
        assertEquals(Step.DOB, a.step)
        a.onUtterance("go back")
        assertEquals(Step.FULL_NAME, a.step)
        assertEquals(Step.CANCELLED, a.onUtterance("cancel").let { a.step })
    }
}
