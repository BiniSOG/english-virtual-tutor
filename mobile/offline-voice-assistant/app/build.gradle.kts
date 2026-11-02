plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.binisog.voiceassistant"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.binisog.voiceassistant"
        minSdk = 26
        targetSdk = 35
        versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionName = "1.0." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0")
    }

    // One APK per phone type instead of one big APK carrying every phone's native code:
    // app-arm64-v8a-release.apk (almost all phones today) and app-armeabi-v7a-release.apk (old 32-bit).
    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "armeabi-v7a")
            // CI emulator smoke test runs on x86_64.
            if (project.hasProperty("withX86")) include("x86_64")
            isUniversalApk = false
        }
    }

    signingConfigs {
        // One fixed TEST key for every build, so a new APK installs over the previous one
        // (CI machines would otherwise sign each build with a fresh random debug key, and
        // Android refuses to update an app whose signature changed). Not for production.
        create("test") {
            storeFile = file("test-signing.jks")
            storePassword = "testtest"
            keyAlias = "test"
            keyPassword = "testtest"
        }
    }

    buildTypes {
        release {
            // Remove unused code and resources (Compose/material icons are large otherwise).
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("test")
        }
        debug {
            signingConfig = signingConfigs.getByName("test")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    androidResources {
        // Keep ONNX models uncompressed so sherpa-onnx can memory-map them from the APK.
        noCompress += listOf("onnx", "txt", "json")
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true // compressed inside the APK
            // Only the JNI library and onnxruntime are used; the C/C++ API libraries are not.
            excludes += listOf("**/libsherpa-onnx-c-api.so", "**/libsherpa-onnx-cxx-api.so")
        }
    }
}

dependencies {
    implementation(project(":brain"))

    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    val camerax = "1.4.1"
    implementation("androidx.camera:camera-core:$camerax")
    implementation("androidx.camera:camera-camera2:$camerax")
    implementation("androidx.camera:camera-lifecycle:$camerax")
    implementation("androidx.camera:camera-video:$camerax")
    implementation("androidx.camera:camera-view:$camerax")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
