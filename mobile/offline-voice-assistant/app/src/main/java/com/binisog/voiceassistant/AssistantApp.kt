package com.binisog.voiceassistant

import android.app.Application
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter

/** Saves the stack trace of any crash so the next launch can show it (offline debugging). */
class AssistantApp : Application() {
    override fun onCreate() {
        super.onCreate()
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            runCatching {
                val sw = StringWriter()
                error.printStackTrace(PrintWriter(sw))
                crashFile(this).writeText("Thread: ${thread.name}\n$sw")
            }
            previous?.uncaughtException(thread, error)
        }
    }

    companion object {
        fun crashFile(app: Application) = File(app.filesDir, "last_crash.txt")
    }
}
