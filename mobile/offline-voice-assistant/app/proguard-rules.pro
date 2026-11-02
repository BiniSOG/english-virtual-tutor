# sherpa-onnx: the native library reads config fields and creates result objects by name (JNI).
-keep class com.k2fsa.sherpa.onnx.** { *; }
-keepclassmembers class com.k2fsa.sherpa.onnx.** { *; }
# Kotlin lambdas passed to JNI callbacks keep their invoke methods.
-keepclassmembers class kotlin.jvm.functions.Function1 { *; }
# Crash reporter and voice script are referenced from the manifest / reflection-free; keep app entry points.
-keep class com.binisog.voiceassistant.AssistantApp { *; }
-dontwarn org.slf4j.**
