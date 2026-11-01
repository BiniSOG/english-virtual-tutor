import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("org.jetbrains.kotlin.jvm")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
    testLogging { events("failed"); exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL }
}

// Amharic recording script for tools/prerecord_gemini.py
tasks.register<JavaExec>("exportVoiceScript") {
    group = "voice"
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.binisog.voiceassistant.brain.VoiceScriptKt")
    args(layout.buildDirectory.file("voice-script/am.json").get().asFile.absolutePath)
}
