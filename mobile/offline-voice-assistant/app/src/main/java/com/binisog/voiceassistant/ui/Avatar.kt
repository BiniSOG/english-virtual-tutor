package com.binisog.voiceassistant.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import kotlinx.coroutines.delay

/**
 * Illustrated virtual assistant drawn in code (no video model needed offline): blinks, breathes,
 * and moves her mouth with the loudness of the voice that is playing.
 */
@Composable
fun AssistantAvatar(speaking: Boolean, level: () -> Float, modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "avatar")
    val breathe by transition.animateFloat(
        0f, 1f, infiniteRepeatable(tween(2600, easing = LinearEasing), RepeatMode.Reverse), label = "breathe"
    )
    val blink by transition.animateFloat(
        1f, 1f,
        infiniteRepeatable(keyframes {
            durationMillis = 4200
            1f at 0; 1f at 3900; 0.1f at 4000; 1f at 4150
        }),
        label = "blink"
    )
    var mouth by remember { mutableFloatStateOf(0f) }
    LaunchedEffect(speaking) {
        while (true) {
            val target = if (speaking) level().coerceIn(0.15f, 1f) else 0f
            mouth += (target - mouth) * 0.45f
            delay(40)
        }
    }

    val skin = Color(0xFF8D5524)
    val skinShade = Color(0xFF7A4A1F)
    val hair = Color(0xFF1B120C)
    val blazer = Color(0xFF173B8F)

    Canvas(modifier) {
        val w = size.width
        val h = size.height
        val cx = w / 2
        val headR = minOf(w, h) * 0.22f
        val headY = h * 0.40f + breathe * 2f

        // background glow
        drawCircle(Brush.radialGradient(listOf(Color(0x332E64D8), Color.Transparent)), radius = w * 0.6f, center = Offset(cx, headY))

        // hair back (curly volume)
        for (i in 0 until 14) {
            val a = Math.toRadians(160.0 + i * 16.0)
            val r = headR * 1.18f
            drawCircle(hair, headR * 0.42f, Offset(cx + (r * Math.cos(a)).toFloat(), headY + (r * Math.sin(a)).toFloat() * 0.95f))
        }
        drawCircle(hair, headR * 1.12f, Offset(cx, headY - headR * 0.08f))

        // shoulders / blazer
        val body = Path().apply {
            moveTo(cx - w * 0.42f, h)
            cubicTo(cx - w * 0.40f, h * 0.70f, cx - w * 0.22f, h * 0.66f + breathe * 2f, cx, h * 0.66f + breathe * 2f)
            cubicTo(cx + w * 0.22f, h * 0.66f + breathe * 2f, cx + w * 0.40f, h * 0.70f, cx + w * 0.42f, h)
            close()
        }
        drawPath(body, blazer)
        // neck and shirt
        drawRect(skinShade, Offset(cx - headR * 0.32f, headY + headR * 0.7f), Size(headR * 0.64f, headR * 0.7f))
        val collar = Path().apply {
            moveTo(cx - headR * 0.6f, h * 0.67f + breathe * 2f); lineTo(cx, h * 0.80f); lineTo(cx + headR * 0.6f, h * 0.67f + breathe * 2f); close()
        }
        drawPath(collar, Color.White)
        // scarf stripes
        drawLine(Brand.Gold, Offset(cx - headR * 0.45f, h * 0.70f), Offset(cx - headR * 0.05f, h * 0.79f), strokeWidth = headR * 0.12f)
        drawLine(Color(0xFF4F7BE0), Offset(cx + headR * 0.45f, h * 0.70f), Offset(cx + headR * 0.05f, h * 0.79f), strokeWidth = headR * 0.12f)

        // face
        drawOval(skin, Offset(cx - headR * 0.82f, headY - headR), Size(headR * 1.64f, headR * 2.0f))
        // fringe
        drawArc(hair, 180f, 180f, true, Offset(cx - headR * 0.86f, headY - headR * 1.08f), Size(headR * 1.72f, headR * 0.9f))

        // eyes
        val eyeY = headY - headR * 0.05f
        val eyeDx = headR * 0.34f
        for (s in listOf(-1, 1)) {
            drawOval(Color.White, Offset(cx + s * eyeDx - headR * 0.16f, eyeY - headR * 0.09f * blink), Size(headR * 0.32f, headR * 0.18f * blink))
            if (blink > 0.4f) drawCircle(Color(0xFF2B1A10), headR * 0.075f, Offset(cx + s * eyeDx, eyeY))
            drawLine(hair, Offset(cx + s * eyeDx - headR * 0.18f, eyeY - headR * 0.22f), Offset(cx + s * eyeDx + headR * 0.16f, eyeY - headR * 0.26f), strokeWidth = headR * 0.05f)
        }
        // nose
        drawLine(skinShade, Offset(cx, eyeY + headR * 0.1f), Offset(cx - headR * 0.04f, eyeY + headR * 0.38f), strokeWidth = headR * 0.05f)
        // mouth
        val mouthY = headY + headR * 0.55f
        val open = headR * 0.22f * mouth
        if (open > 1f) {
            drawOval(Color(0xFF5A1E1E), Offset(cx - headR * 0.22f, mouthY - open / 2), Size(headR * 0.44f, open + headR * 0.04f))
            drawArc(Color(0xFFB0413E), 0f, 180f, false, Offset(cx - headR * 0.24f, mouthY - open / 2 - headR * 0.04f), Size(headR * 0.48f, open + headR * 0.12f), style = Stroke(headR * 0.06f))
        } else {
            drawArc(Color(0xFFB0413E), 10f, 160f, false, Offset(cx - headR * 0.24f, mouthY - headR * 0.12f), Size(headR * 0.48f, headR * 0.2f), style = Stroke(headR * 0.07f))
        }
        // earrings
        drawCircle(Brand.Gold, headR * 0.06f, Offset(cx - headR * 0.84f, headY + headR * 0.25f))
        drawCircle(Brand.Gold, headR * 0.06f, Offset(cx + headR * 0.84f, headY + headR * 0.25f))
    }
}
