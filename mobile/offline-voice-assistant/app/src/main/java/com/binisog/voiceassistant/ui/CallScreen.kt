package com.binisog.voiceassistant.ui

import android.app.DatePickerDialog
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Sms
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.binisog.voiceassistant.AssistantViewModel
import com.binisog.voiceassistant.UiState
import com.binisog.voiceassistant.brain.AccountOpeningAgent
import com.binisog.voiceassistant.brain.DateParser
import com.binisog.voiceassistant.brain.Lang
import com.binisog.voiceassistant.brain.Step
import com.binisog.voiceassistant.brain.Understanding
import java.time.LocalDate

@Composable
fun CallScreen(state: UiState, vm: AssistantViewModel) {
    Column(Modifier.fillMaxSize().background(Color(0xFFF4F6FB))) {
        CallHeader(state.lang, state.recording)
        Box(Modifier.weight(1f)) {
            when (state.step) {
                Step.REVIEW -> ReviewPanel(state, vm)
                Step.CREATING -> CreatingPanel(state)
                Step.DONE -> DonePanel(state, vm)
                else -> VideoCallPanel(state, vm)
            }
            // The camera keeps recording in the background on every step.
            CameraPip(vm, state.recording, visible = state.step != Step.DONE, modifier = Modifier.align(Alignment.TopEnd).padding(12.dp))
        }
    }
}

@Composable
private fun CallHeader(lang: Lang, recording: Boolean) {
    Row(
        Modifier.fillMaxWidth().background(Brand.Navy).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Default.AccountBalance, null, tint = Brand.Gold)
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f)) {
            Text("Demo Bank", color = Color.White, fontWeight = FontWeight.Bold)
            Text(tr(lang, "AI Account Assistant", "የአካውንት ረዳት"), color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp)
        }
        if (recording) {
            val t = rememberInfiniteTransition(label = "rec")
            val a by t.animateFloat(1f, 0.2f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "recAlpha")
            Box(Modifier.size(10.dp).alpha(a).clip(CircleShape).background(Brand.Red))
            Spacer(Modifier.width(6.dp))
            Text("REC", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun CameraPip(vm: AssistantViewModel, recording: Boolean, visible: Boolean, modifier: Modifier) {
    val owner = LocalLifecycleOwner.current
    Box(
        modifier
            .size(width = if (visible) 92.dp else 1.dp, height = if (visible) 124.dp else 1.dp)
            .clip(RoundedCornerShape(12.dp))
            .border(2.dp, if (recording) Brand.Red else Color.White, RoundedCornerShape(12.dp))
            .background(Color.Black)
    ) {
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).apply {
                    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                    vm.camera.bind(owner, this)
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
    }
}

@Composable
private fun VideoCallPanel(state: UiState, vm: AssistantViewModel) {
    val lang = state.lang
    Column(Modifier.fillMaxSize()) {
        Box(
            Modifier.fillMaxWidth().weight(1f)
                .background(Brush.verticalGradient(listOf(Color(0xFFDDE6F7), Color(0xFFF4F6FB))))
        ) {
            AssistantAvatar(state.speaking, { vm.speakingLevel }, Modifier.fillMaxSize().padding(top = 8.dp))
            if (state.modelsLoading) {
                Row(
                    Modifier.align(Alignment.TopStart).padding(12.dp).clip(RoundedCornerShape(10.dp)).background(Color.White).padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(6.dp))
                    Text(state.modelsMessage, fontSize = 11.sp)
                }
            }
            // speech bubble
            Card(
                Modifier.align(Alignment.BottomCenter).padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(4.dp),
            ) {
                Text(
                    state.assistantText,
                    Modifier.padding(14.dp).verticalScroll(rememberScrollState()),
                    color = Brand.Ink, fontSize = 15.sp, lineHeight = 20.sp, maxLines = 8
                )
            }
        }

        Column(Modifier.fillMaxWidth().background(Color.White).imePadding().padding(horizontal = 16.dp, vertical = 10.dp)) {
            Caption(state)
            Spacer(Modifier.height(8.dp))
            InputPanel(state, vm)
            Spacer(Modifier.height(10.dp))
            Controls(state, vm)
        }
    }
}

@Composable
private fun Caption(state: UiState) {
    val lang = state.lang
    val listening = state.micOn && !state.micMuted && !state.speaking
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Waveform(active = listening && state.liveCaption.isNotEmpty() || state.speaking, color = if (state.speaking) Brand.Gold else Brand.Blue)
        Spacer(Modifier.width(8.dp))
        val text = when {
            state.speaking -> tr(lang, "Assistant is speaking…", "ረዳቱ እየተናገረ ነው…")
            state.liveCaption.isNotEmpty() -> state.liveCaption
            state.micMuted -> tr(lang, "Microphone muted – type your answer", "ማይክሮፎኑ ተዘግቷል – መልስዎን ይጻፉ")
            listening -> tr(lang, "Listening… speak now", "እያዳመጥኩ ነው… ይናገሩ")
            else -> ""
        }
        Column(Modifier.weight(1f)) {
            Text(text, fontSize = 13.sp, color = Brand.Muted, maxLines = 2)
            if (state.lastHeard.isNotEmpty()) Text(tr(lang, "You: ", "እርስዎ፦ ") + state.lastHeard, fontSize = 12.sp, color = Brand.Ink, maxLines = 1)
        }
    }
}

@Composable
private fun Waveform(active: Boolean, color: Color) {
    val t = rememberInfiniteTransition(label = "wave")
    val phase by t.animateFloat(0f, 1f, infiniteRepeatable(tween(600), RepeatMode.Reverse), label = "phase")
    Row(horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.CenterVertically, modifier = Modifier.height(24.dp)) {
        for (i in 0 until 7) {
            val h = if (active) 6f + 16f * (((i * 37) % 10) / 10f * phase + (1 - phase) * ((i * 53) % 10) / 10f) else 4f
            Box(Modifier.width(3.dp).height(h.dp).clip(RoundedCornerShape(2.dp)).background(color))
        }
    }
}

@Composable
private fun InputPanel(state: UiState, vm: AssistantViewModel) {
    val lang = state.lang
    val context = LocalContext.current
    when (state.step) {
        Step.GREETING -> Button(onClick = { vm.confirm() }, modifier = Modifier.fillMaxWidth()) {
            Text(tr(lang, "Yes, let's start", "አዎ፣ እንጀምር"))
        }
        Step.ACCOUNT_TYPE -> Column {
            Understanding.AccountType.entries.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { type ->
                        OutlinedButton(onClick = { vm.chooseAccountType(type) }, modifier = Modifier.weight(1f)) {
                            Text(type.display(lang), fontSize = 12.sp, textAlign = TextAlign.Center)
                        }
                    }
                }
            }
        }
        Step.DOB -> {
            val pending = state.pendingValue
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(
                    onClick = {
                        val init = state.profile.dateOfBirth ?: LocalDate.of(1995, 1, 1)
                        DatePickerDialog(context, { _, y, m, d -> vm.pickDate(LocalDate.of(y, m + 1, d)) }, init.year, init.monthValue - 1, init.dayOfMonth).show()
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.CalendarMonth, null)
                    Spacer(Modifier.width(6.dp))
                    Text(pending ?: tr(lang, "Pick date", "ቀን ይምረጡ"), maxLines = 1)
                }
                if (pending != null) {
                    Spacer(Modifier.width(8.dp))
                    Button(onClick = { vm.confirm() }) { Text(tr(lang, "Confirm", "አረጋግጥ")) }
                }
            }
        }
        Step.OTP -> Column {
            state.otpBanner?.let { code ->
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(Color(0xFFFFF4D6)).padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Sms, null, tint = Brand.Ink)
                    Spacer(Modifier.width(8.dp))
                    Text(tr(lang, "Demo SMS (offline): your code is ", "የማሳያ መልእክት (ከመስመር ውጭ)፦ ኮድዎ ") + code, fontSize = 13.sp, color = Brand.Ink)
                }
                Spacer(Modifier.height(8.dp))
            }
            TextAnswer(state, vm, digits = true, label = tr(lang, "6-digit code", "ባለ 6 አሃዝ ኮድ"), action = tr(lang, "Verify OTP", "አረጋግጥ"))
        }
        Step.FAN -> TextAnswer(state, vm, digits = true, label = tr(lang, "FAN (National ID number)", "የፋይዳ ቁጥር (FAN)"), action = tr(lang, "Continue", "ቀጥል"))
        Step.FULL_NAME -> TextAnswer(state, vm, digits = false, label = tr(lang, "Full name", "ሙሉ ስም"), action = tr(lang, "Confirm", "አረጋግጥ"))
        Step.BIRTH_CITY -> TextAnswer(state, vm, digits = false, label = tr(lang, "Birth city", "የትውልድ ከተማ"), action = tr(lang, "Confirm", "አረጋግጥ"))
        Step.NATIONALITY -> TextAnswer(state, vm, digits = false, label = tr(lang, "Nationality", "ዜግነት"), action = tr(lang, "Confirm", "አረጋግጥ"))
        else -> Unit
    }
}

/**
 * Editable answer field. Shows what the assistant heard; the user can confirm it, fix it by
 * typing, or simply say it again.
 */
@Composable
private fun TextAnswer(state: UiState, vm: AssistantViewModel, digits: Boolean, label: String, action: String) {
    val heard = state.pendingValue ?: if (digits && state.digitBuffer.isNotEmpty()) AccountOpeningAgent.formatGroups(state.digitBuffer) else ""
    var text by remember(state.step, heard) { mutableStateOf(heard) }
    val submit = {
        val t = text.trim()
        when {
            t.isEmpty() -> Unit
            t == state.pendingValue -> vm.confirm()
            else -> {
                vm.onUserText(t, typed = true)
                // A typed answer is already "confirmed" by the user.
                if (vm.state.value.pendingValue != null && !digits) vm.confirm()
            }
        }
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        OutlinedTextField(
            value = text,
            onValueChange = { text = it },
            label = { Text(label) },
            singleLine = true,
            modifier = Modifier.weight(1f),
            keyboardOptions = KeyboardOptions(keyboardType = if (digits) KeyboardType.Number else KeyboardType.Text),
            keyboardActions = KeyboardActions(onDone = { submit() }),
            trailingIcon = { IconButton(onClick = { submit() }) { Icon(Icons.AutoMirrored.Filled.Send, null) } },
        )
    }
    if (state.pendingValue != null) {
        Spacer(Modifier.height(6.dp))
        Button(onClick = { vm.confirm() }, modifier = Modifier.fillMaxWidth()) { Text(action) }
    }
}

@Composable
private fun Controls(state: UiState, vm: AssistantViewModel) {
    Row(Modifier.fillMaxWidth().navigationBarsPadding(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
        FilledIconButton(
            onClick = { vm.toggleMute() },
            colors = IconButtonDefaults.filledIconButtonColors(containerColor = if (state.micMuted) Brand.Muted else Brand.Sky),
            modifier = Modifier.size(52.dp)
        ) { Icon(if (state.micMuted) Icons.Default.MicOff else Icons.Default.Mic, null, tint = if (state.micMuted) Color.White else Brand.Blue) }
        FilledIconButton(
            onClick = { vm.endCall() },
            colors = IconButtonDefaults.filledIconButtonColors(containerColor = Brand.Red),
            modifier = Modifier.size(60.dp)
        ) { Icon(Icons.Default.CallEnd, null, tint = Color.White) }
        FilledIconButton(
            onClick = { vm.switchLanguageInCall() },
            colors = IconButtonDefaults.filledIconButtonColors(containerColor = Brand.Sky),
            modifier = Modifier.size(52.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Translate, null, tint = Brand.Blue, modifier = Modifier.size(18.dp))
                Text(if (state.lang == Lang.EN) "አማ" else "EN", fontSize = 10.sp, color = Brand.Blue)
            }
        }
    }
}

// ---------------------------------------------------------------------- review / creating / done

@Composable
private fun ReviewPanel(state: UiState, vm: AssistantViewModel) {
    val lang = state.lang
    val p = state.profile
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Spacer(Modifier.height(8.dp))
        Text(tr(lang, "Confirm Your Information", "መረጃዎን ያረጋግጡ"), fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Brand.Ink, modifier = Modifier.padding(end = 100.dp))
        Spacer(Modifier.height(6.dp))
        Text(state.assistantText, color = Brand.Muted, fontSize = 13.sp, modifier = Modifier.padding(end = 100.dp))
        Spacer(Modifier.height(16.dp))
        Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
            Column(Modifier.padding(vertical = 4.dp)) {
                ReviewRow(tr(lang, "Full Name", "ሙሉ ስም"), p.fullName) { vm.edit(Step.FULL_NAME) }
                ReviewRow(tr(lang, "Date of Birth", "የትውልድ ቀን"), p.dateOfBirth?.let { DateParser.display(it, lang) }) { vm.edit(Step.DOB) }
                ReviewRow(tr(lang, "Birth City", "የትውልድ ከተማ"), p.birthCity) { vm.edit(Step.BIRTH_CITY) }
                ReviewRow(tr(lang, "Nationality", "ዜግነት"), p.nationality) { vm.edit(Step.NATIONALITY) }
                ReviewRow(tr(lang, "Account Type", "የሂሳብ ዓይነት"), p.accountType?.display(lang)) { vm.edit(Step.ACCOUNT_TYPE) }
                ReviewRow("FAN", p.fan?.let { AccountOpeningAgent.formatGroups(it) }, last = true) { vm.edit(Step.FAN) }
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            tr(lang, "Offline demo: the National ID lookup is simulated with the details you gave.", "ከመስመር ውጭ ማሳያ፦ የብሔራዊ መታወቂያ ፍተሻው በሰጡት መረጃ ይመሰላል።"),
            fontSize = 11.sp, color = Brand.Muted
        )
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(onClick = { vm.edit(Step.FULL_NAME) }, modifier = Modifier.weight(1f)) { Text(tr(lang, "Edit", "አስተካክል")) }
            Button(onClick = { vm.confirm() }, modifier = Modifier.weight(2f)) { Text(tr(lang, "Confirm & Create Account", "አረጋግጥና ክፈት")) }
        }
        Spacer(Modifier.height(16.dp))
        Controls(state, vm)
    }
}

@Composable
private fun ReviewRow(label: String, value: String?, last: Boolean = false, onEdit: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onEdit).padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = Brand.Muted, fontSize = 13.sp, modifier = Modifier.weight(1f))
        Text(value ?: "—", color = Brand.Ink, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.weight(1.4f))
        Icon(Icons.Default.Edit, null, tint = Brand.Blue, modifier = Modifier.size(18.dp))
    }
    if (!last) HorizontalDivider(color = Brand.Sky)
}

@Composable
private fun CreatingPanel(state: UiState) {
    val lang = state.lang
    val items = listOf(
        tr(lang, "Verifying identity (National ID)", "ማንነትን በማረጋገጥ ላይ (ብሔራዊ መታወቂያ)"),
        tr(lang, "Retrieving your details", "መረጃዎን በማምጣት ላይ"),
        tr(lang, "Creating your bank account", "የባንክ አካውንት በመክፈት ላይ"),
        tr(lang, "Setting up your profile", "መገለጫዎን በማዘጋጀት ላይ"),
    )
    Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Box(contentAlignment = Alignment.Center) {
            CircularProgressIndicator(Modifier.size(110.dp), strokeWidth = 6.dp)
            Icon(Icons.Default.AccountBalance, null, tint = Brand.Blue, modifier = Modifier.size(48.dp))
        }
        Spacer(Modifier.height(20.dp))
        Text(tr(lang, "Creating Your Account…", "አካውንትዎ እየተከፈተ ነው…"), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Brand.Ink)
        Spacer(Modifier.height(20.dp))
        items.forEachIndexed { i, label ->
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                when {
                    i < state.creatingProgress -> Icon(Icons.Default.CheckCircle, null, tint = Brand.Green)
                    i == state.creatingProgress -> CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                    else -> Icon(Icons.Default.RadioButtonUnchecked, null, tint = Brand.Muted)
                }
                Spacer(Modifier.width(10.dp))
                Text(label, color = Brand.Ink)
            }
        }
    }
}

@Composable
private fun DonePanel(state: UiState, vm: AssistantViewModel) {
    val lang = state.lang
    val p = state.profile
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(24.dp))
        Box(Modifier.size(84.dp).clip(CircleShape).background(Brand.Green), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(52.dp))
        }
        Spacer(Modifier.height(16.dp))
        Text(tr(lang, "Account Created Successfully! 🎉", "አካውንትዎ በተሳካ ሁኔታ ተከፍቷል! 🎉"), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Brand.Ink, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Text(tr(lang, "Your account is now active. You can start using it immediately.", "አካውንትዎ አሁን ንቁ ነው። ወዲያውኑ መጠቀም ይችላሉ።"), color = Brand.Muted, textAlign = TextAlign.Center)
        Spacer(Modifier.height(20.dp))
        Card(colors = CardDefaults.cardColors(containerColor = Brand.Sky), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text(tr(lang, "Account Number", "የአካውንት ቁጥር"), color = Brand.Muted, fontSize = 12.sp)
                Text(p.accountNumber?.let { AccountOpeningAgent.formatGroups(it) } ?: "", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Brand.Ink)
                Spacer(Modifier.height(8.dp))
                Text(tr(lang, "Account Type", "የሂሳብ ዓይነት"), color = Brand.Muted, fontSize = 12.sp)
                Text(p.accountType?.display(lang) ?: "", fontWeight = FontWeight.SemiBold, color = Brand.Ink)
                Spacer(Modifier.height(8.dp))
                Text(tr(lang, "Account holder", "ባለ አካውንት"), color = Brand.Muted, fontSize = 12.sp)
                Text(p.fullName ?: "", fontWeight = FontWeight.SemiBold, color = Brand.Ink)
            }
        }
        Spacer(Modifier.height(16.dp))
        Text(
            tr(lang, "Verification video, audio and transcript saved on this phone:", "የማረጋገጫ ቪዲዮ፣ ድምፅ እና ጽሑፍ በዚህ ስልክ ተቀምጠዋል፦") + "\n" + (state.sessionDir ?: ""),
            fontSize = 11.sp, color = Brand.Muted, textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(20.dp))
        Button(onClick = { vm.goHome() }, modifier = Modifier.fillMaxWidth()) { Text(tr(lang, "Go to Home", "ወደ መነሻ")) }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = { vm.showSessions() }, modifier = Modifier.fillMaxWidth()) { Text(tr(lang, "View saved sessions", "የተቀመጡ ቀረጻዎችን ይመልከቱ")) }
    }
}
