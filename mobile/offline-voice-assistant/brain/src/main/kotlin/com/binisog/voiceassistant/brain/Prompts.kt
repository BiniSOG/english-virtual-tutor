package com.binisog.voiceassistant.brain

/** Every sentence the assistant can say, in both languages. `{x}` placeholders are filled by the agent. */
object Prompts {
    private val en = mapOf(
        "greeting" to "Hello! Welcome to {bank}. I'm your virtual assistant, and I'll help you open a {bank} account today. This call is recorded for identity verification. Shall we get started?",
        "notReady" to "No problem. Say yes when you are ready, or tap the red button to end the call.",
        "askName" to "Great! First, please tell me your full name.",
        "askDob" to "Thank you. Next, what is your date of birth?",
        "askCity" to "Next, please tell me the city where you were born.",
        "askNationality" to "What is your nationality?",
        "askAccountType" to "Which account would you like to open: savings, current, interest-free, or youth savings?",
        "askFan" to "Now, let's verify your identity using your National ID. Please say or enter your FAN number, the Fayda ID number.",
        "confirm" to "I heard {value}. Is that correct? Say yes, or tell me again.",
        "nameNeedsFull" to "Please tell me your full name, including your father's name.",
        "dobFuture" to "That date is in the future. Please tell me your date of birth again.",
        "dobUnderage" to "Sorry, you must be at least 18 years old to open an account on your own. Please visit a branch with a guardian to open a youth account.",
        "fanPartial" to "I have {digits} so far. Please continue.",
        "fanLength" to "The FAN number must have {n} digits. I heard {got}. Please say it again.",
        "otpSent" to "We've sent a one-time password to your registered mobile number. Please say or enter the six-digit code.",
        "otpWrong" to "That code doesn't match. Please try again.",
        "otpOk" to "Your identity is verified.",
        "review" to "Please review your information and confirm to create your account.",
        "creating" to "Creating your account. This takes a moment.",
        "done" to "Congratulations! Your {type} has been created successfully. Your account number is {account}.",
        "notUnderstood" to "Sorry, I didn't catch that. {question}",
        "langSwitched" to "Okay, I'll continue in English.",
        "cancelled" to "Okay, I've stopped the session. Goodbye!",
        "afterFaq" to "Now, back to your application. {question}",
        "editing" to "Sure, let's change that. {question}",
        "reviewHint" to "Tap a detail to change it, or say yes to create your account.",
        "digitsSoFar" to "I have {digits} so far. Please continue.",
    )

    private val am = mapOf(
        "greeting" to "ሰላም! ወደ {bank} እንኳን በደህና መጡ። እኔ የእርስዎ ምናባዊ ረዳት ነኝ፤ ዛሬ የ{bank} አካውንት እንዲከፍቱ እረዳዎታለሁ። ይህ ጥሪ ማንነትዎን ለማረጋገጥ ይቀረጻል። እንጀምር?",
        "notReady" to "ችግር የለም። ሲዘጋጁ አዎ ይበሉ፤ ወይም ጥሪውን ለማቋረጥ ቀዩን ቁልፍ ይጫኑ።",
        "askName" to "በጣም ጥሩ! በመጀመሪያ እባክዎ ሙሉ ስምዎን ይንገሩኝ።",
        "askDob" to "አመሰግናለሁ። በመቀጠል የትውልድ ቀንዎ መቼ ነው?",
        "askCity" to "በመቀጠል እባክዎ የተወለዱበትን ከተማ ይንገሩኝ።",
        "askNationality" to "ዜግነትዎ ምንድን ነው?",
        "askAccountType" to "የትኛውን አካውንት መክፈት ይፈልጋሉ፦ ቁጠባ፣ ተንቀሳቃሽ፣ ከወለድ ነፃ ወይስ የወጣቶች ቁጠባ?",
        "askFan" to "አሁን በብሔራዊ መታወቂያዎ ማንነትዎን እናረጋግጥ። እባክዎ የፋይዳ መታወቂያ ቁጥርዎን ይናገሩ ወይም ያስገቡ።",
        "confirm" to "{value} ብለዋል። ትክክል ነው? አዎ ይበሉ፤ ወይም እንደገና ይንገሩኝ።",
        "nameNeedsFull" to "እባክዎ ሙሉ ስምዎን ከአባትዎ ስም ጋር ይንገሩኝ።",
        "dobFuture" to "ይህ ቀን ገና አልደረሰም። እባክዎ የትውልድ ቀንዎን እንደገና ይንገሩኝ።",
        "dobUnderage" to "ይቅርታ፣ በራስዎ አካውንት ለመክፈት ዕድሜዎ ቢያንስ አስራ ስምንት ዓመት መሆን አለበት። የወጣቶች አካውንት ለመክፈት ከአሳዳጊዎ ጋር ቅርንጫፍ ይጎብኙ።",
        "fanPartial" to "እስካሁን {digits} ተቀብያለሁ። እባክዎ ይቀጥሉ።",
        "fanLength" to "የፋይዳ ቁጥሩ {n} አሃዝ ሊኖረው ይገባል። የሰማሁት {got} ነው። እባክዎ እንደገና ይናገሩ።",
        "otpSent" to "ወደ ተመዘገበው ስልክ ቁጥርዎ የአንድ ጊዜ የይለፍ ኮድ ተልኳል። እባክዎ ባለ ስድስት አሃዙን ኮድ ይናገሩ ወይም ያስገቡ።",
        "otpWrong" to "ኮዱ አይዛመድም። እባክዎ እንደገና ይሞክሩ።",
        "otpOk" to "ማንነትዎ ተረጋግጧል።",
        "review" to "እባክዎ መረጃዎን ይመልከቱና አካውንቱን ለመክፈት ያረጋግጡ።",
        "creating" to "አካውንትዎ እየተከፈተ ነው። ትንሽ ይጠብቁ።",
        "done" to "እንኳን ደስ አለዎት! {type}ዎ በተሳካ ሁኔታ ተከፍቷል። የአካውንት ቁጥርዎ {account} ነው።",
        "notUnderstood" to "ይቅርታ፣ በደንብ አልሰማሁም። {question}",
        "langSwitched" to "እሺ፣ በአማርኛ እቀጥላለሁ።",
        "cancelled" to "እሺ፣ ክፍለ ጊዜው ተቋርጧል። ደህና ይሁኑ!",
        "afterFaq" to "አሁን ወደ ማመልከቻዎ እንመለስ። {question}",
        "editing" to "እሺ፣ እናስተካክለው። {question}",
        "reviewHint" to "ለመቀየር መረጃውን ይንኩ፤ ወይም አካውንቱን ለመክፈት አዎ ይበሉ።",
        "digitsSoFar" to "እስካሁን {digits} ተቀብያለሁ። እባክዎ ይቀጥሉ።",
    )

    fun get(key: String, lang: Lang, vararg args: Pair<String, String>): String {
        var s = (if (lang == Lang.AM) am else en)[key] ?: error("missing prompt $key")
        for ((k, v) in args) s = s.replace("{$k}", v)
        return s
    }

    fun hasAllKeysInBothLanguages(): Boolean = en.keys == am.keys
}
