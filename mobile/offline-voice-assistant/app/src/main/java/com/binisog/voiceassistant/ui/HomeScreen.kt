package com.binisog.voiceassistant.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.binisog.voiceassistant.UiState
import com.binisog.voiceassistant.brain.Lang

@Composable
fun HomeScreen(
    state: UiState,
    onLanguage: (Lang) -> Unit,
    onCreateAccount: () -> Unit,
    onSessions: () -> Unit,
    onDismissCrash: () -> Unit = {},
) {
    val lang = state.lang
    Column(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Brand.Navy, Brand.Blue, Color(0xFFF4F6FB)), endY = 1400f))
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(Brand.Gold), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.AccountBalance, null, tint = Brand.Navy)
            }
            Spacer(Modifier.width(10.dp))
            Column {
                Text("Demo Bank", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text(tr(lang, "AI Account Assistant", "የአካውንት ረዳት"), color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp)
            }
        }
        Spacer(Modifier.height(28.dp))
        Text(tr(lang, "Welcome to", "እንኳን ወደ"), color = Color.White, fontSize = 24.sp)
        Text(tr(lang, "Demo Bank Super App", "ዴሞ ባንክ በደህና መጡ"), color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(16.dp))

        Text(tr(lang, "Assistant language", "የረዳቱ ቋንቋ"), color = Color.White.copy(alpha = 0.85f), fontSize = 13.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = lang == Lang.EN, onClick = { onLanguage(Lang.EN) }, label = { Text("English") })
            FilterChip(selected = lang == Lang.AM, onClick = { onLanguage(Lang.AM) }, label = { Text("አማርኛ") })
        }
        Spacer(Modifier.height(20.dp))

        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
            Column(Modifier.padding(16.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Tile(Icons.Default.PersonAdd, tr(lang, "Create Account", "አካውንት ክፈት"), highlighted = true, enabled = true, onClick = onCreateAccount, modifier = Modifier.weight(1f))
                    Tile(Icons.Default.VideoLibrary, tr(lang, "Saved Sessions", "የተቀመጡ ቀረጻዎች"), enabled = true, onClick = onSessions, modifier = Modifier.weight(1f))
                    Tile(Icons.Default.Lock, tr(lang, "Login", "ግባ"), enabled = false, onClick = {}, modifier = Modifier.weight(1f))
                }
                Spacer(Modifier.height(16.dp))
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Brand.Sky).clickable(onClick = onCreateAccount).padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(tr(lang, "Open your account in minutes", "አካውንትዎን በደቂቃዎች ይክፈቱ"), fontWeight = FontWeight.Bold, color = Brand.Ink)
                        Text(tr(lang, "with the AI Video Assistant – works offline", "በAI ቪዲዮ ረዳት – ያለ ኢንተርኔት ይሰራል"), color = Brand.Muted, fontSize = 13.sp)
                    }
                    Box(Modifier.size(32.dp).clip(CircleShape).background(Brand.Blue), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.ChevronRight, null, tint = Color.White)
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.WifiOff, null, tint = Brand.Muted, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text(tr(lang, "Speech recognition, voice and assistant run 100% on this phone.", "የንግግር ማወቂያ፣ ድምፅ እና ረዳቱ ሙሉ በሙሉ በዚህ ስልክ ላይ ይሰራሉ።"), color = Brand.Muted, fontSize = 12.sp)
        }
        if (state.modelsLoading) {
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
                Text(state.modelsMessage, fontSize = 12.sp, color = Brand.Ink)
            }
        } else if (state.modelsMessage.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Text(state.modelsMessage, fontSize = 12.sp, color = Brand.Red)
        }
        state.lastCrash?.let { crash ->
            Spacer(Modifier.height(12.dp))
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE))) {
                Column(Modifier.padding(12.dp)) {
                    Text("The app stopped last time. Please send this to the developer:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Brand.Red)
                    androidx.compose.foundation.text.selection.SelectionContainer {
                        Text(crash.take(3000), fontSize = 10.sp, color = Brand.Ink, lineHeight = 12.sp)
                    }
                    androidx.compose.material3.TextButton(onClick = onDismissCrash) { Text("Dismiss") }
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(state.modelSummary, fontSize = 10.sp, color = Brand.Muted)
    }
}

@Composable
private fun Tile(icon: ImageVector, label: String, enabled: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, highlighted: Boolean = false) {
    Card(
        modifier = modifier.aspectRatio(1f).clickable(enabled = enabled, onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        border = if (highlighted) BorderStroke(2.dp, Brand.Gold) else null,
        colors = CardDefaults.cardColors(containerColor = if (highlighted) Brand.Blue else Brand.Sky),
    ) {
        Column(Modifier.fillMaxSize().padding(8.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            val tint = when {
                highlighted -> Color.White
                enabled -> Brand.Blue
                else -> Brand.Muted.copy(alpha = 0.5f)
            }
            Icon(icon, null, tint = tint)
            Spacer(Modifier.height(6.dp))
            Text(label, color = tint, fontSize = 12.sp, fontWeight = FontWeight.Medium, lineHeight = 14.sp)
        }
    }
}
