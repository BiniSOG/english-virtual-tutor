package com.binisog.voiceassistant.ui

import android.graphics.BitmapFactory
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import kotlin.math.sin

/** The assistant's portrait bundled at assets/avatar/agent.jpg (null if the build has none). */
@Composable
fun rememberAgentPortrait(): ImageBitmap? {
    val context = LocalContext.current
    return remember {
        runCatching {
            context.assets.open("avatar/agent.jpg").use { BitmapFactory.decodeStream(it).asImageBitmap() }
        }.getOrNull()
    }
}

/**
 * The assistant on the video call: a full-screen portrait that breathes and moves naturally,
 * with livelier head motion while she is talking (driven by the loudness of her voice).
 * Falls back to the illustrated avatar when no portrait is bundled.
 */
@Composable
fun AgentVideo(speaking: Boolean, level: () -> Float, modifier: Modifier = Modifier) {
    val portrait = rememberAgentPortrait()
    if (portrait == null) {
        Box(modifier.background(Brush.verticalGradient(listOf(Color(0xFF1C2E5A), Color(0xFF0B1630))))) {
            AssistantAvatar(speaking, level, Modifier.fillMaxSize())
        }
        return
    }
    val transition = rememberInfiniteTransition(label = "agent")
    val breathe by transition.animateFloat(
        0f, 1f, infiniteRepeatable(tween(3800, easing = LinearEasing), RepeatMode.Reverse), label = "breathe"
    )
    var talk by remember { mutableFloatStateOf(0f) }
    var clock by remember { mutableFloatStateOf(0f) }
    LaunchedEffect(speaking) {
        while (true) {
            withFrameMillis { t -> clock = t / 1000f }
            val target = if (speaking) level().coerceIn(0f, 1f) else 0f
            talk += (target - talk) * 0.12f
        }
    }
    Image(
        bitmap = portrait,
        contentDescription = "Hana, your account assistant",
        contentScale = ContentScale.Crop,
        modifier = modifier.graphicsLayer {
            // Slightly zoomed so the gentle movement never shows the edges.
            val s = 1.07f + 0.006f * breathe + 0.006f * talk
            scaleX = s
            scaleY = s
            translationY = -4f * breathe + 3f * talk * sin(clock * 7.3f)
            translationX = 5f * talk * sin(clock * 2.1f) + 1.5f * sin(clock * 0.35f)
            rotationZ = 0.5f * talk * sin(clock * 3.7f) + 0.15f * sin(clock * 0.27f)
        },
    )
}
