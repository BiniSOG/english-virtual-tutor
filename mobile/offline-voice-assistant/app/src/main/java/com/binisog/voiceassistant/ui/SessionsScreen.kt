package com.binisog.voiceassistant.ui

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.binisog.voiceassistant.AssistantViewModel
import com.binisog.voiceassistant.brain.Lang
import org.json.JSONObject
import java.io.File

@Composable
fun SessionsScreen(lang: Lang, vm: AssistantViewModel) {
    val context = LocalContext.current
    val sessions = remember { vm.sessions.list() }

    fun share(file: File, mime: String) {
        val uri = FileProvider.getUriForFile(context, context.packageName + ".files", file)
        val send = Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        context.startActivity(Intent.createChooser(send, file.name))
    }

    Column(Modifier.fillMaxSize().background(Color(0xFFF4F6FB))) {
        Row(Modifier.fillMaxWidth().background(Brand.Navy).padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { vm.goHome() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color.White) }
            Text(tr(lang, "Saved sessions", "የተቀመጡ ቀረጻዎች"), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }
        if (sessions.isEmpty()) {
            Text(tr(lang, "No sessions yet.", "እስካሁን ምንም ቀረጻ የለም።"), Modifier.padding(20.dp), color = Brand.Muted)
        }
        LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(sessions) { dir ->
                val video = File(dir, com.binisog.voiceassistant.session.SessionStore.CALL_VIDEO).takeIf { it.exists() } ?: File(dir, "video.mp4")
                val audio = File(dir, "audio.wav")
                val json = File(dir, "session.json")
                val info = remember(dir) {
                    runCatching {
                        val o = JSONObject(json.readText())
                        val p = o.getJSONObject("profile")
                        (p.optString("fullName").takeIf { it.isNotBlank() && it != "null" } ?: "—") +
                            " · " + (if (o.optBoolean("completed")) tr(lang, "completed", "ተጠናቋል") else tr(lang, "not finished", "አልተጠናቀቀም"))
                    }.getOrDefault("")
                }
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(14.dp)) {
                    Column(Modifier.padding(14.dp)) {
                        Text(dir.name, fontWeight = FontWeight.Bold, color = Brand.Ink)
                        Text(info, color = Brand.Muted, fontSize = 13.sp)
                        Text(
                            "video ${video.length() / 1024} KB · audio ${audio.length() / 1024} KB",
                            color = Brand.Muted, fontSize = 12.sp
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (video.length() > 0) OutlinedButton(onClick = { share(video, "video/mp4") }) { Text(tr(lang, "Video", "ቪዲዮ")) }
                            if (audio.length() > 44) OutlinedButton(onClick = { share(audio, "audio/wav") }) { Text(tr(lang, "Audio", "ድምፅ")) }
                            if (json.exists()) OutlinedButton(onClick = { share(json, "application/json") }) { Text(tr(lang, "Data", "መረጃ")) }
                        }
                    }
                }
            }
        }
    }
}
