package com.binisog.voiceassistant.brain

import java.io.File
import java.security.MessageDigest

/**
 * Pre-recorded voice: the build records (with Gemini TTS) every fixed phrase the assistant can
 * say in Amharic, plus the words used to fill in answers (numbers, months, cities, ...). At run
 * time [plan] splits a reply into recorded clips; anything not recorded – usually the customer's
 * own name – is left as text for the offline voice.
 */
object VoiceScript {

    data class Clip(val id: String, val text: String)

    sealed interface Segment {
        data class Recorded(val id: String) : Segment
        data class Synth(val text: String) : Segment
    }

    private val punct = Regex("[\\p{Punct}።፣፤፥፦፧፨“”‘’«»…—–]")

    /** Words used for matching: no punctuation, unified letter variants. */
    fun words(text: String): List<String> =
        AmharicText.normalize(text.replace(punct, " ")).split(Regex("\\s+")).filter { it.isNotBlank() }

    fun idFor(text: String): String {
        val key = words(text).joinToString(" ")
        val md = MessageDigest.getInstance("SHA-1").digest(key.toByteArray())
        return md.take(6).joinToString("") { "%02x".format(it) }
    }

    /** Everything to record for Amharic, de-duplicated. */
    fun amharicClips(config: AgentConfig = AgentConfig()): List<Clip> {
        val texts = LinkedHashSet<String>()
        // Fixed parts of every line: split at the {placeholders}.
        for (template in Prompts.allTemplates(Lang.AM)) {
            // Bank and agent names never change, so record them inside their sentences.
            val t = template.replace("{bank}", config.bankNameAm).replace("{agent}", config.agentNameAm)
            for (fragment in t.split(Regex("\\{[a-z]+\\}"))) addSentences(texts, fragment)
        }
        for (e in Faq.entries) addSentences(texts, e.am)
        // Values that get filled in.
        texts += config.bankNameAm
        texts += config.agentNameAm
        texts += EthiopianCalendar.monthsAm
        for (n in 0..30) texts += Numbers.toWords(n.toLong(), Lang.AM)
        for (n in listOf(40, 50, 60, 70, 80, 90)) texts += Numbers.toWords(n.toLong(), Lang.AM)
        texts += listOf("መቶ", "ሺህ", "አስራ", "አንድ ሺህ", "ሁለት ሺህ")
        for (c in Understanding.cities) texts += c.am
        for (c in Understanding.countries) texts += c.am
        for (a in Understanding.AccountType.entries) texts += a.am
        return texts.filter { words(it).isNotEmpty() }
            .distinctBy { words(it).joinToString(" ") }
            .map { Clip(idFor(it), it.trim()) }
    }

    /** Long lines are recorded sentence by sentence so they can be reused across variants. */
    private fun addSentences(out: MutableSet<String>, text: String) {
        Regex("[^።?!፧]+[።?!፧]?").findAll(text).map { it.value.trim().trim('፣', ',', ' ') }
            .filter { words(it).isNotEmpty() }
            .forEach { out += it }
    }

    /**
     * Splits [text] into recorded clips (longest match first) and the leftover words, which are
     * spoken by the offline voice.
     */
    fun plan(text: String, recorded: Map<String, String>): List<Segment> {
        // index: first word -> (word sequence, id), longest first
        val index = HashMap<String, MutableList<Pair<List<String>, String>>>()
        for ((id, clipText) in recorded) {
            val w = words(clipText)
            if (w.isNotEmpty()) index.getOrPut(w[0]) { mutableListOf() } += w to id
        }
        index.values.forEach { l -> l.sortByDescending { it.first.size } }

        val w = words(text)
        val out = mutableListOf<Segment>()
        val pending = mutableListOf<String>()
        fun flush() {
            if (pending.isNotEmpty()) { out += Segment.Synth(pending.joinToString(" ")); pending.clear() }
        }
        var i = 0
        while (i < w.size) {
            val match = index[w[i]]?.firstOrNull { (seq, _) ->
                i + seq.size <= w.size && seq.indices.all { w[i + it] == seq[it] }
            }
            if (match != null) {
                flush()
                out += Segment.Recorded(match.second)
                i += match.first.size
            } else {
                pending += w[i]
                i++
            }
        }
        flush()
        return out
    }
}

/** Writes the Amharic recording script as JSON: `gradle :brain:exportVoiceScript`. */
fun main(args: Array<String>) {
    val out = File(args.firstOrNull() ?: "build/voice-script/am.json")
    out.parentFile?.mkdirs()
    val clips = VoiceScript.amharicClips()
    fun esc(s: String) = s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ")
    out.writeText(clips.joinToString(",\n", "[\n", "\n]\n") { """  {"id": "${it.id}", "text": "${esc(it.text)}"}""" })
    println("wrote ${clips.size} clips to $out")
}
