package com.binisog.voiceassistant.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.binisog.voiceassistant.brain.Lang

/** Full-screen incoming video call from the bank's assistant: answer or decline. */
@Composable
fun IncomingCallScreen(lang: Lang, onAccept: () -> Unit, onDecline: () -> Unit) {
    val portrait = rememberAgentPortrait()
    val t = rememberInfiniteTransition(label = "ring")
    val ring by t.animateFloat(1f, 1.35f, infiniteRepeatable(tween(1100), RepeatMode.Restart), label = "ring")
    val ringAlpha by t.animateFloat(0.5f, 0f, infiniteRepeatable(tween(1100), RepeatMode.Restart), label = "ringAlpha")
    val bounce by t.animateFloat(1f, 1.1f, infiniteRepeatable(tween(500), RepeatMode.Reverse), label = "bounce")

    Box(Modifier.fillMaxSize().background(Color(0xFF0B1630))) {
        if (portrait != null) {
            Image(portrait, null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().alpha(0.35f))
        }
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xCC0B1630), Color(0x660B1630), Color(0xEE0B1630)))))

        Column(Modifier.fillMaxSize().padding(top = 80.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(tr(lang, "Incoming video call", "ገቢ የቪዲዮ ጥሪ"), color = Color.White.copy(alpha = 0.8f), fontSize = 15.sp)
            Spacer(Modifier.height(28.dp))
            Box(contentAlignment = Alignment.Center) {
                Box(Modifier.size(150.dp).scale(ring).alpha(ringAlpha).clip(CircleShape).background(Color.White))
                Box(Modifier.size(150.dp).clip(CircleShape).border(3.dp, Color.White, CircleShape)) {
                    if (portrait != null) {
                        Image(portrait, null, contentScale = ContentScale.Crop, alignment = BiasAlignment(0f, -0.62f), modifier = Modifier.fillMaxSize())
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
            Text(tr(lang, "Hana", "ሐና"), color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Light)
            Text(tr(lang, "Demo Bank · Account opening", "ዴሞ ባንክ · አካውንት መክፈቻ"), color = Color.White.copy(alpha = 0.8f), fontSize = 16.sp)
        }

        Row(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth().navigationBarsPadding().padding(bottom = 56.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            CallAction(Icons.Default.CallEnd, tr(lang, "Decline", "አትቀበል"), Brand.Red, 1f, onDecline)
            CallAction(Icons.Default.Videocam, tr(lang, "Answer", "መልስ"), Color(0xFF22C55E), bounce, onAccept)
        }
    }
}

@Composable
private fun CallAction(icon: ImageVector, label: String, color: Color, scale: Float, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier.size(72.dp).scale(scale).clip(CircleShape).background(color).clickable(onClick = onClick),
            contentAlignment = Alignment.Center
        ) { Icon(icon, label, tint = Color.White, modifier = Modifier.size(34.dp)) }
        Spacer(Modifier.height(10.dp))
        Text(label, color = Color.White, fontSize = 14.sp)
    }
}

/** Shown after "Create account": the customer waits a few seconds until Hana calls. */
@Composable
fun WaitingForCallScreen(lang: Lang, secondsLeft: Int, onCancel: () -> Unit) {
    val portrait = rememberAgentPortrait()
    val t = rememberInfiniteTransition(label = "wait")
    val pulse by t.animateFloat(0.92f, 1.06f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "pulse")
    Box(Modifier.fillMaxSize().background(Color(0xFF0B1630))) {
        Column(
            Modifier.fillMaxSize().padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(Modifier.size(130.dp).scale(pulse).clip(CircleShape).border(3.dp, Color.White.copy(alpha = 0.8f), CircleShape)) {
                if (portrait != null) {
                    Image(portrait, null, contentScale = ContentScale.Crop, alignment = BiasAlignment(0f, -0.62f), modifier = Modifier.fillMaxSize())
                }
            }
            Spacer(Modifier.height(28.dp))
            Text(
                tr(lang, "Please wait for a call", "እባክዎ ጥሪ ይጠብቁ"),
                color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                tr(lang, "Hana from Demo Bank will video call you to open your account.", "ከዴሞ ባንክ ሐና አካውንትዎን ለመክፈት በቪዲዮ ትደውልልዎታለች።"),
                color = Color.White.copy(alpha = 0.8f), fontSize = 15.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Spacer(Modifier.height(28.dp))
            androidx.compose.material3.CircularProgressIndicator(color = Color.White, modifier = Modifier.size(28.dp), strokeWidth = 3.dp)
            Spacer(Modifier.height(12.dp))
            Text(
                tr(lang, "Calling you in $secondsLeft s…", "በ$secondsLeft ሰከንድ ውስጥ ትደውላለች…"),
                color = Color.White, fontSize = 16.sp,
            )
        }
        androidx.compose.material3.TextButton(
            onClick = onCancel,
            modifier = Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 32.dp),
        ) { Text(tr(lang, "Cancel", "ሰርዝ"), color = Color.White, fontSize = 16.sp) }
    }
}
