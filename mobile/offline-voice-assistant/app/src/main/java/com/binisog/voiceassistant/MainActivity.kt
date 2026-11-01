package com.binisog.voiceassistant

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.binisog.voiceassistant.ui.AppTheme
import com.binisog.voiceassistant.ui.CallScreen
import com.binisog.voiceassistant.ui.HomeScreen
import com.binisog.voiceassistant.ui.SessionsScreen

class MainActivity : ComponentActivity() {
    private val vm: AssistantViewModel by viewModels()

    private val needed = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)

    private fun hasPermissions() = needed.all { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AppTheme {
                val state by vm.state.collectAsStateWithLifecycle()
                val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
                    if (result.values.all { it }) vm.startCall()
                    else Toast.makeText(this, "Camera and microphone permissions are required for the video assistant.", Toast.LENGTH_LONG).show()
                }
                BackHandler(enabled = state.screen != Screen.HOME) {
                    if (state.screen == Screen.CALL) vm.endCall() else vm.goHome()
                }
                Box(Modifier.fillMaxSize().statusBarsPadding()) {
                    when (state.screen) {
                        Screen.HOME -> HomeScreen(
                            state = state,
                            onLanguage = vm::selectLanguage,
                            onCreateAccount = { if (hasPermissions()) vm.startCall() else launcher.launch(needed) },
                            onSessions = vm::showSessions,
                            onDismissCrash = vm::dismissCrash,
                        )
                        Screen.CALL -> CallScreen(state, vm)
                        Screen.SESSIONS -> SessionsScreen(state.lang, vm)
                    }
                }
            }
        }
    }
}
