package com.binisog.voiceassistant.brain

import kotlin.random.Random

/**
 * Everything the assistant ("Hana") says, in both languages. Most lines have several variants so
 * the call sounds like a person talking rather than a recording. `{x}` placeholders are filled
 * by the agent. Lines are short and spoken-style: one idea per sentence.
 */
object Prompts {
    private val en: Map<String, List<String>> = mapOf(
        "greeting" to listOf(
            "Hi, this is {agent} from {bank}. Thanks for picking up! I'll help you open your account today, it only takes a few minutes. Just so you know, this video call is recorded for verification. Shall we start?",
            "Hello, I'm {agent}, calling from {bank}. Thank you for taking the call. I can open your new account with you right now, it's quick. The call is recorded for your security. Ready to begin?",
        ),
        "notReady" to listOf(
            "No problem, take your time. Just say yes when you're ready.",
            "That's okay. Let me know when you're ready, just say yes.",
        ),
        "askName" to listOf(
            "Great! Let's start with your full name, please.",
            "Wonderful. First, could you tell me your full name?",
            "Okay! What's your full name, please?",
        ),
        "askDob" to listOf(
            "Nice to meet you, {first}. And what's your date of birth?",
            "Thank you, {first}. When were you born?",
            "Lovely, {first}. Could you tell me your date of birth?",
        ),
        "askCity" to listOf(
            "Got it. Which city were you born in?",
            "Thanks. And where were you born? Which city?",
            "Perfect. What's your city of birth?",
        ),
        "askNationality" to listOf(
            "Okay. And your nationality?",
            "Thank you. What's your nationality?",
        ),
        "askAccountType" to listOf(
            "Great. What kind of account would you like? Savings, current, interest-free, or a youth savings account?",
            "Okay. Which account suits you best: savings, current, interest-free, or youth savings?",
        ),
        "askFan" to listOf(
            "Almost done. Now I just need to verify your identity. Could you read me your Fayda number, your FAN, slowly?",
            "We're nearly there. For identity verification, please tell me your Fayda ID number, the FAN, digit by digit.",
        ),
        "confirm" to listOf(
            "{value}. Did I get that right?",
            "Okay, {value}. Is that correct?",
            "Just to confirm, {value}?",
            "I heard {value}. Is that right?",
        ),
        "nameNeedsFull" to listOf(
            "Could you give me your full name, with your father's name too?",
            "Sorry, I need your full name, including your father's name.",
        ),
        "dobFuture" to listOf("Hmm, that date hasn't happened yet. Could you tell me your date of birth again?"),
        "dobUnderage" to listOf(
            "I'm sorry, you need to be at least 18 to open an account on your own. A youth account can be opened at a branch with a parent or guardian.",
        ),
        "fanPartial" to listOf(
            "Okay, {digits}. Go on.",
            "{digits}. Please continue.",
        ),
        "fanLength" to listOf(
            "Hmm, the FAN should have {n} digits, but I got {got}. Could you read it again from the start?",
        ),
        "otpSent" to listOf(
            "Thank you. I've just sent a six-digit code to the phone number registered with your Fayda ID. What's the code?",
            "Great. You should get a six-digit code by SMS now. Could you read it to me?",
        ),
        "otpWrong" to listOf(
            "Hmm, that code doesn't match. Could you check it and read it again?",
            "That doesn't seem to be the right code. Let's try once more.",
        ),
        "otpOk" to listOf("Perfect, you're verified.", "Thank you, that's verified."),
        "review" to listOf(
            "Here's everything I have. Please have a look at the screen. Shall I go ahead and open your account?",
            "Okay, I've put your details on the screen. If everything looks right, just say yes and I'll open the account.",
        ),
        "creating" to listOf(
            "Great, I'm opening your account now. This will only take a moment.",
            "Wonderful. Give me a second while I set everything up.",
        ),
        "done" to listOf(
            "All done, {first}! Your {type} is now open. Your account number is {account}. Congratulations, and welcome to {bank}!",
            "Congratulations, {first}! Your {type} is ready. Your account number is {account}. Thank you for choosing {bank}!",
        ),
        "notUnderstood" to listOf(
            "Sorry, I didn't quite catch that. {question}",
            "Sorry, could you say that again? {question}",
            "I'm sorry, the line wasn't clear. {question}",
        ),
        "langSwitched" to listOf("Sure, let's continue in English."),
        "cancelled" to listOf("Okay, no problem. Thank you for your time, and have a lovely day. Goodbye!"),
        "afterFaq" to listOf("So, back to your application. {question}", "Okay! Now, {question}"),
        "editing" to listOf("Sure, let's fix that. {question}", "No problem. {question}"),
        "silence" to listOf(
            "Hello? Are you still there? {question}",
            "I'm still here. {question}",
            "Take your time. {question}",
        ),
        "reviewHint" to listOf(
            "Just say yes to open the account, or tell me what to change, for example, change my name.",
        ),
        "digitsSoFar" to listOf("{digits}. Go on.", "Okay, {digits}. And the rest?"),
    )

    private val am: Map<String, List<String>> = mapOf(
        "greeting" to listOf(
            "ሰላም፣ እኔ {agent} ነኝ ከ{bank}። ስልኩን ስላነሱ እናመሰግናለን! ዛሬ አካውንት እንዲከፍቱ እረዳዎታለሁ፤ ጥቂት ደቂቃዎች ብቻ ይወስዳል። ይህ የቪዲዮ ጥሪ ለማረጋገጫ ይቀረጻል። እንጀምር?",
            "ሰላም፣ {agent} እባላለሁ፤ ከ{bank} ነው የምደውለው። አዲስ አካውንትዎን አሁኑኑ አብረን እንክፈት፤ ፈጣን ነው። ጥሪው ለደህንነትዎ ይቀረጻል። እንጀምር?",
        ),
        "notReady" to listOf("ችግር የለም፣ ጊዜ ይውሰዱ። ሲዘጋጁ አዎ ይበሉ።"),
        "askName" to listOf(
            "በጣም ጥሩ! በመጀመሪያ ሙሉ ስምዎን ይንገሩኝ።",
            "እሺ! ሙሉ ስምዎ ማን ይባላል?",
        ),
        "askDob" to listOf(
            "ስለተዋወቅን ደስ ብሎኛል፣ {first}። የትውልድ ቀንዎ መቼ ነው?",
            "አመሰግናለሁ {first}። መቼ ነው የተወለዱት?",
        ),
        "askCity" to listOf(
            "እሺ። የተወለዱት በየትኛው ከተማ ነው?",
            "አመሰግናለሁ። የትውልድ ከተማዎ የት ነው?",
        ),
        "askNationality" to listOf("እሺ። ዜግነትዎስ?", "አመሰግናለሁ። ዜግነትዎ ምንድን ነው?"),
        "askAccountType" to listOf(
            "በጣም ጥሩ። ምን ዓይነት አካውንት ይፈልጋሉ? ቁጠባ፣ ተንቀሳቃሽ፣ ከወለድ ነፃ ወይስ የወጣቶች ቁጠባ?",
        ),
        "askFan" to listOf(
            "ልንጨርስ ነው። አሁን ማንነትዎን ማረጋገጥ አለብኝ። የፋይዳ ቁጥርዎን ቀስ ብለው ያንብቡልኝ።",
            "ትንሽ ቀርቶናል። ለማረጋገጫ የፋይዳ መታወቂያ ቁጥርዎን አንድ በአንድ ይንገሩኝ።",
        ),
        "confirm" to listOf(
            "{value}፣ ልክ ነው?",
            "{value} ብለዋል፤ ትክክል ነው?",
            "ለማረጋገጥ ያህል፣ {value}?",
        ),
        "nameNeedsFull" to listOf("ሙሉ ስምዎን ከአባትዎ ስም ጋር ይንገሩኝ።"),
        "dobFuture" to listOf("ይህ ቀን ገና አልደረሰም። የትውልድ ቀንዎን እንደገና ይንገሩኝ።"),
        "dobUnderage" to listOf(
            "ይቅርታ፣ በራስዎ አካውንት ለመክፈት ዕድሜዎ ቢያንስ አስራ ስምንት ዓመት መሆን አለበት። የወጣቶች አካውንት ከወላጅ ወይም አሳዳጊ ጋር በቅርንጫፍ መክፈት ይቻላል።",
        ),
        "fanPartial" to listOf("እሺ፣ {digits}። ይቀጥሉ።"),
        "fanLength" to listOf("የፋይዳ ቁጥሩ {n} አሃዝ ነው፤ እኔ የሰማሁት {got} ነው። እባክዎ ከመጀመሪያው እንደገና ያንብቡት።"),
        "otpSent" to listOf(
            "አመሰግናለሁ። ከፋይዳዎ ጋር ወደ ተመዘገበው ስልክ ባለ ስድስት አሃዝ ኮድ ልኬያለሁ። ኮዱ ስንት ነው?",
            "በጣም ጥሩ። አሁን ባለ ስድስት አሃዝ ኮድ በመልእክት ይደርስዎታል። ያንብቡልኝ።",
        ),
        "otpWrong" to listOf("ኮዱ አይዛመድም። እባክዎ አይተው እንደገና ያንብቡት።"),
        "otpOk" to listOf("በጣም ጥሩ፣ ማንነትዎ ተረጋግጧል።"),
        "review" to listOf(
            "ያለኝን መረጃ በሙሉ በስክሪኑ ላይ አስቀምጫለሁ። ይመልከቱት። አካውንቱን ልክፈትልዎ?",
        ),
        "creating" to listOf("በጣም ጥሩ፣ አካውንትዎን አሁን እየከፈትኩ ነው። ትንሽ ይጠብቁኝ።"),
        "done" to listOf(
            "ተጠናቋል {first}! አዲሱ አካውንትዎ ተከፍቷል፤ ዓይነቱ {type} ነው። የአካውንት ቁጥርዎ {account} ነው። እንኳን ደስ አለዎት፣ ወደ {bank} እንኳን በደህና መጡ!",
        ),
        "notUnderstood" to listOf(
            "ይቅርታ፣ በደንብ አልሰማሁም። {question}",
            "ይቅርታ፣ እንደገና ይድገሙልኝ? {question}",
        ),
        "langSwitched" to listOf("እሺ፣ በአማርኛ እንቀጥል።"),
        "cancelled" to listOf("እሺ፣ ችግር የለም። ስለ ጊዜዎ እናመሰግናለን። መልካም ቀን ይሁንልዎ!"),
        "afterFaq" to listOf("እሺ፣ ወደ ማመልከቻዎ እንመለስ። {question}"),
        "editing" to listOf("እሺ፣ እናስተካክለው። {question}"),
        "silence" to listOf("ሃሎ? አሉ? {question}", "እዚሁ ነኝ። {question}"),
        "reviewHint" to listOf("አካውንቱን ለመክፈት አዎ ይበሉ፤ ወይም የሚቀየረውን ይንገሩኝ፤ ለምሳሌ፦ ስሜን ቀይር።"),
        "digitsSoFar" to listOf("{digits}። ይቀጥሉ።"),
    )

    private val lastPick = mutableMapOf<String, Int>()

    /** A random variant, never the same one twice in a row. */
    fun template(key: String, lang: Lang, random: Random): String {
        val list = linesFor(lang)[key] ?: en[key] ?: error("missing prompt $key")
        if (list.size == 1) return list[0]
        val id = "${lang.code}:$key"
        var i = random.nextInt(list.size)
        if (i == lastPick[id]) i = (i + 1) % list.size
        lastPick[id] = i
        return list[i]
    }

    fun fill(template: String, vararg args: Pair<String, String>): String {
        var s = template
        for ((k, v) in args) s = s.replace("{$k}", v)
        // Drop placeholders that weren't provided, e.g. no first name yet.
        return s.replace(Regex(",? ?\\{[a-z]+\\}"), "").replace(Regex("\\s+([.,?!።፣])"), "$1")
    }

    /** First variant (stable; used by tests and by the FAQ follow-ups). */
    fun get(key: String, lang: Lang, vararg args: Pair<String, String>): String =
        fill((linesFor(lang)[key] ?: en[key] ?: error("missing prompt $key"))[0], *args)

    fun hasAllKeysInBothLanguages(): Boolean = en.keys == am.keys

    /** Every variant of every line (used to pre-record the Amharic voice). */
    fun allTemplates(lang: Lang): List<String> = linesFor(lang).values.flatten()

    private fun linesFor(lang: Lang): Map<String, List<String>> = when (lang) {
        Lang.EN -> en
        Lang.AM -> am
        else -> lang.pack?.prompts ?: en
    }
}
