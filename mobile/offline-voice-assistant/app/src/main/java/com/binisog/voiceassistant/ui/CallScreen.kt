package com.binisog.voiceassistant.ui

import android.app.DatePickerDialog
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.ClosedCaptionDisabled
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Sms
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
import kotlinx.coroutines.delay
import java.time.LocalDate

private val Glass = Color.Black.copy(alpha = 0.45f)

fun formatDuration(ms: Long): String {
    val s = (ms / 1000).coerceAtLeast(0)
    return "%02d:%02d".format(s / 60, s % 60)
}

/** A live video call with the assistant; when the account is open the call ends with a summary. */
@Composable
fun CallScreen(state: UiState, vm: AssistantViewModel) {
    if (state.step == Step.DONE && !state.speaking) {
        DonePanel(state, vm)
        return
    }
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AgentVideo(state.speaking, { vm.speakingLevel }, Modifier.fillMaxSize())

        // top: who you're talking to, call time, recording
        Column(
            Modifier.fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.65f), Color.Transparent)))
                .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 28.dp)
        ) { CallTopBar(state) }

        CameraPip(vm, state.recording, Modifier.align(Alignment.TopEnd).padding(top = 76.dp, end = 12.dp))

        if (state.modelsLoading) {
            Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = Color.White)
                Spacer(Modifier.height(10.dp))
                Text(tr(state.lang, "Connecting…", "በማገናኘት ላይ…"), color = Color.White)
            }
        }

        Column(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f))))
                .imePadding()
                .padding(horizontal = 14.dp)
                .padding(top = 40.dp, bottom = 10.dp)
        ) {
            when (state.step) {
                Step.REVIEW -> ReviewCard(state, vm)
                Step.CREATING -> CreatingCard(state)
                else -> Unit
            }
            if (state.captions && state.assistantText.isNotEmpty()) {
                Text(
                    state.assistantText,
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(Glass).padding(10.dp),
                    color = Color.White, fontSize = 15.sp, lineHeight = 20.sp, maxLines = 5
                )
                Spacer(Modifier.height(8.dp))
            }
            ConversationStatus(state)
            SuggestionChips(state, vm)
            if (state.typing) {
                Spacer(Modifier.height(8.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                    Column(Modifier.padding(12.dp)) { InputPanel(state, vm) }
                }
            }
            Spacer(Modifier.height(14.dp))
            Controls(state, vm)
        }
    }
}

@Composable
private fun CallTopBar(state: UiState) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { now = System.currentTimeMillis(); delay(500) } }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(tr(state.lang, "Hana · Demo Bank", "ሐና · ዴሞ ባንክ"), color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Lock, null, tint = Color.White.copy(alpha = 0.8f), modifier = Modifier.size(12.dp))
                Spacer(Modifier.width(4.dp))
                val time = if (state.callStartedAt > 0) formatDuration(now - state.callStartedAt) else "00:00"
                Text(tr(state.lang, "Video call · ", "የቪዲዮ ጥሪ · ") + time, color = Color.White.copy(alpha = 0.85f), fontSize = 13.sp)
            }
        }
        if (state.recording) {
            val t = rememberInfiniteTransition(label = "rec")
            val a by t.animateFloat(1f, 0.25f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "recAlpha")
            Row(
                Modifier.clip(RoundedCornerShape(12.dp)).background(Glass).padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(Modifier.size(8.dp).alpha(a).clip(CircleShape).background(Brand.Red))
                Spacer(Modifier.width(5.dp))
                Text("REC", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun CameraPip(vm: AssistantViewModel, recording: Boolean, modifier: Modifier) {
    val owner = LocalLifecycleOwner.current
    Box(
        modifier
            .size(width = 96.dp, height = 132.dp)
            .clip(RoundedCornerShape(14.dp))
            .border(1.5.dp, if (recording) Color.White.copy(alpha = 0.9f) else Color.White.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
            .background(Color.DarkGray)
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

/** Who is talking, what the customer said, and what is waiting for "yes" – kept small. */
@Composable
private fun ConversationStatus(state: UiState) {
    val lang = state.lang
    val listening = state.micOn && !state.micMuted && !state.speaking && !state.modelsLoading
    val heard = state.liveCaption.ifEmpty { state.lastHeard }
    if (heard.isNotEmpty()) {
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Glass).padding(horizontal = 12.dp, vertical = 8.dp)) {
            Text(tr(lang, "You: ", "እርስዎ፦ "), color = Color.White.copy(alpha = 0.7f), fontSize = 14.sp)
            Text(heard, color = Color.White, fontSize = 15.sp, maxLines = 2)
        }
        Spacer(Modifier.height(6.dp))
    }
    state.pendingValue?.let { value ->
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.92f)).padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Text(tr(lang, "Say \"yes\" if this is correct", "ትክክል ከሆነ \"አዎ\" ይበሉ"), fontSize = 11.sp, color = Brand.Muted)
            Text(value, fontSize = 19.sp, fontWeight = FontWeight.Bold, color = Brand.Ink)
        }
        Spacer(Modifier.height(6.dp))
    }
    if (state.pendingValue == null && state.digitBuffer.isNotEmpty() && (state.step == Step.FAN || state.step == Step.OTP)) {
        Text(AccountOpeningAgent.formatGroups(state.digitBuffer) + " …", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
    }
    if (state.step == Step.OTP) state.otpBanner?.let { code ->
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color(0xFFFFF4D6)).padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Sms, null, tint = Brand.Ink)
            Spacer(Modifier.width(8.dp))
            Text(tr(lang, "SMS (offline demo): your code is ", "መልእክት (ከመስመር ውጭ ማሳያ)፦ ኮድዎ ") + code, fontSize = 13.sp, color = Brand.Ink)
        }
        Spacer(Modifier.height(6.dp))
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        val t = rememberInfiniteTransition(label = "listen")
        val pulse by t.animateFloat(0.4f, 1f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "pulse")
        val (label, color) = when {
            state.speaking -> tr(lang, "Hana is speaking", "ሐና እየተናገረች ነው") to Brand.Gold
            state.micMuted -> tr(lang, "You're muted", "ማይክሮፎንዎ ተዘግቷል") to Brand.Red
            listening -> tr(lang, "Listening…", "እያዳመጠች ነው…") to Color(0xFF4ADE80)
            else -> "" to Color.Transparent
        }
        if (label.isNotEmpty()) {
            Box(Modifier.size(8.dp).alpha(if (listening || state.speaking) pulse else 1f).clip(CircleShape).background(color))
            Spacer(Modifier.width(6.dp))
            Text(label, color = Color.White.copy(alpha = 0.9f), fontSize = 13.sp)
        }
    }
}

/** Answers the assistant expects right now: say one, or tap it. */
@Composable
private fun SuggestionChips(state: UiState, vm: AssistantViewModel) {
    if (state.suggestions.isEmpty() || state.step == Step.CREATING) return
    Spacer(Modifier.height(8.dp))
    Text(tr(state.lang, "You can say", "እንዲህ ማለት ይችላሉ"), color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
    Spacer(Modifier.height(4.dp))
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        for (s in state.suggestions) {
            Box(
                Modifier.clip(RoundedCornerShape(18.dp)).background(Color.White.copy(alpha = 0.22f))
                    .border(1.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(18.dp))
                    .clickable { vm.onUserText(s, typed = true) }
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) { Text(s, color = Color.White, fontSize = 15.sp, maxLines = 1) }
        }
    }
}

@Composable
private fun RoundButton(icon: ImageVector, description: String, bg: Color, size: Int = 54, onClick: () -> Unit) {
    Box(
        Modifier.size(size.dp).clip(CircleShape).background(bg).clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) { Icon(icon, description, tint = Color.White) }
}

@Composable
private fun Controls(state: UiState, vm: AssistantViewModel) {
    val glass = Color.White.copy(alpha = 0.18f)
    Row(Modifier.fillMaxWidth().navigationBarsPadding(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
        RoundButton(if (state.micMuted) Icons.Default.MicOff else Icons.Default.Mic, "Mute", if (state.micMuted) Color.White.copy(alpha = 0.45f) else glass) { vm.toggleMute() }
        RoundButton(if (state.captions) Icons.Default.ClosedCaption else Icons.Default.ClosedCaptionDisabled, "Subtitles", if (state.captions) Color.White.copy(alpha = 0.45f) else glass) { vm.toggleCaptions() }
        RoundButton(Icons.Default.CallEnd, "End call", Brand.Red, size = 64) { vm.endCall() }
        RoundButton(Icons.Default.Keyboard, "Type instead", if (state.typing) Color.White.copy(alpha = 0.45f) else glass) { vm.toggleTyping() }
        Box(
            Modifier.size(54.dp).clip(CircleShape).background(glass).clickable { vm.switchLanguageInCall() },
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Translate, "Language", tint = Color.White, modifier = Modifier.size(18.dp))
                Text(Lang.entries[(state.lang.ordinal + 1) % Lang.entries.size].code.uppercase(), fontSize = 10.sp, color = Color.White)
            }
        }
    }
}

// ---------------------------------------------------------------------- review / creating

@Composable
private fun ReviewCard(state: UiState, vm: AssistantViewModel) {
    val lang = state.lang
    val p = state.profile
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.heightIn(max = 380.dp).verticalScroll(rememberScrollState()).padding(vertical = 8.dp)) {
            Text(tr(lang, "Confirm your information", "መረጃዎን ያረጋግጡ"), fontWeight = FontWeight.Bold, fontSize = 17.sp, color = Brand.Ink, modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp))
            ReviewRow(tr(lang, "Full Name", "ሙሉ ስም"), p.fullName) { vm.edit(Step.FULL_NAME) }
            ReviewRow(tr(lang, "Date of Birth", "የትውልድ ቀን"), p.dateOfBirth?.let { DateParser.display(it, lang) }) { vm.edit(Step.DOB) }
            ReviewRow(tr(lang, "Birth City", "የትውልድ ከተማ"), p.birthCity) { vm.edit(Step.BIRTH_CITY) }
            ReviewRow(tr(lang, "Nationality", "ዜግነት"), p.nationality) { vm.edit(Step.NATIONALITY) }
            ReviewRow(tr(lang, "Account Type", "የሂሳብ ዓይነት"), p.accountType?.display(lang)) { vm.edit(Step.ACCOUNT_TYPE) }
            ReviewRow("FAN", p.fan?.let { AccountOpeningAgent.formatGroups(it) }, last = true) { vm.edit(Step.FAN) }
            Row(Modifier.padding(horizontal = 14.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = { vm.edit(Step.FULL_NAME) }, modifier = Modifier.weight(1f)) { Text(tr(lang, "Edit", "አስተካክል")) }
                Button(onClick = { vm.confirm() }, modifier = Modifier.weight(2f)) { Text(tr(lang, "Confirm & Create", "አረጋግጥና ክፈት")) }
            }
        }
    }
    Spacer(Modifier.height(10.dp))
}

@Composable
private fun CreatingCard(state: UiState) {
    val lang = state.lang
    val items = listOf(
        tr(lang, "Verifying identity (National ID)", "ማንነትን በማረጋገጥ ላይ (ብሔራዊ መታወቂያ)"),
        tr(lang, "Retrieving your details", "መረጃዎን በማምጣት ላይ"),
        tr(lang, "Creating your bank account", "የባንክ አካውንት በመክፈት ላይ"),
        tr(lang, "Setting up your profile", "መገለጫዎን በማዘጋጀት ላይ"),
    )
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.AccountBalance, null, tint = Brand.Blue)
                Spacer(Modifier.width(8.dp))
                Text(tr(lang, "Creating your account…", "አካውንትዎ እየተከፈተ ነው…"), fontWeight = FontWeight.Bold, color = Brand.Ink)
            }
            Spacer(Modifier.height(8.dp))
            items.forEachIndexed { i, label ->
                Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    when {
                        i < state.creatingProgress -> Icon(Icons.Default.CheckCircle, null, tint = Brand.Green)
                        i == state.creatingProgress -> CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                        else -> Icon(Icons.Default.RadioButtonUnchecked, null, tint = Brand.Muted)
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(label, color = Brand.Ink, fontSize = 14.sp)
                }
            }
        }
    }
    Spacer(Modifier.height(10.dp))
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
private fun ReviewRow(label: String, value: String?, last: Boolean = false, onEdit: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onEdit).padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = Brand.Muted, fontSize = 13.sp, modifier = Modifier.weight(1f))
        Text(value ?: "—", color = Brand.Ink, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.weight(1.4f))
        Icon(Icons.Default.Edit, null, tint = Brand.Blue, modifier = Modifier.size(18.dp))
    }
    if (!last) HorizontalDivider(color = Brand.Sky)
}

@Composable
private fun DonePanel(state: UiState, vm: AssistantViewModel) {
    val lang = state.lang
    val p = state.profile
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(16.dp))
        Text(tr(lang, "Call ended", "ጥሪው ተጠናቋል"), color = Brand.Muted, fontSize = 13.sp)
        Spacer(Modifier.height(12.dp))
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
        when {
            state.savingVideo -> Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
                Text(tr(lang, "Saving the call recording…", "የጥሪው ቀረጻ እየተቀመጠ ነው…"), fontSize = 12.sp, color = Brand.Muted)
            }
            state.callVideo != null -> Text(
                tr(lang, "Call recording (video with both voices) saved:", "የጥሪው ቀረጻ (ቪዲዮ ከሁለቱም ድምፆች ጋር) ተቀምጧል፦") + "\n" + state.callVideo,
                fontSize = 11.sp, color = Brand.Muted, textAlign = TextAlign.Center
            )
            else -> Text(
                tr(lang, "Session saved on this phone:", "ክፍለ ጊዜው በዚህ ስልክ ተቀምጧል፦") + "\n" + (state.sessionDir ?: ""),
                fontSize = 11.sp, color = Brand.Muted, textAlign = TextAlign.Center
            )
        }
        Spacer(Modifier.height(20.dp))
        Button(onClick = { vm.goHome() }, modifier = Modifier.fillMaxWidth()) { Text(tr(lang, "Go to Home", "ወደ መነሻ")) }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = { vm.showSessions() }, modifier = Modifier.fillMaxWidth()) { Text(tr(lang, "View saved sessions", "የተቀመጡ ቀረጻዎችን ይመልከቱ")) }
    }
}
