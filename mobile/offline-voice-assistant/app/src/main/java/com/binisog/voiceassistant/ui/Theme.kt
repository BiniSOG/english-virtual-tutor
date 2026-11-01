package com.binisog.voiceassistant.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.binisog.voiceassistant.brain.Lang

object Brand {
    val Navy = Color(0xFF0B2F7A)
    val Blue = Color(0xFF1546B8)
    val Sky = Color(0xFFE8EEFB)
    val Gold = Color(0xFFF2B33D)
    val Red = Color(0xFFE53935)
    val Green = Color(0xFF2E9E4F)
    val Ink = Color(0xFF14213D)
    val Muted = Color(0xFF6B7280)
}

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Brand.Blue,
            onPrimary = Color.White,
            secondary = Brand.Gold,
            background = Color.White,
            surface = Color.White,
            error = Brand.Red,
        ),
        content = content,
    )
}

/** Inline bilingual UI text. */
fun tr(lang: Lang, en: String, am: String) = if (lang == Lang.AM) am else en
