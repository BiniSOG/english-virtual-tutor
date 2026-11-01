#!/usr/bin/env python3
"""
Drives the app on an Android emulator like a user would and fails on any crash:
Home -> Create Account -> "Yes, let's start" -> type a name -> end call, in English and Amharic.

Usage: python3 emulator_smoke.py <apk> <out_dir>
Writes screenshots, UI dumps and logcat to <out_dir>.
"""
import os
import re
import subprocess
import sys
import time

APK, OUT = sys.argv[1], sys.argv[2]
PKG = "com.binisog.voiceassistant"
os.makedirs(OUT, exist_ok=True)
step_no = 0


def adb(*args, timeout=120, check=True):
    r = subprocess.run(["adb", *args], capture_output=True, text=True, timeout=timeout)
    if check and r.returncode != 0:
        print(r.stdout, r.stderr)
        raise SystemExit(f"adb {' '.join(args)} failed")
    return r.stdout


def shot(name):
    global step_no
    step_no += 1
    path = os.path.join(OUT, f"{step_no:02d}-{name}.png")
    with open(path, "wb") as f:
        f.write(subprocess.run(["adb", "exec-out", "screencap", "-p"], capture_output=True, timeout=60).stdout)
    print("screenshot", path)


def dump():
    adb("shell", "uiautomator", "dump", "/sdcard/ui.xml", check=False, timeout=60)
    return adb("shell", "cat", "/sdcard/ui.xml", check=False)


def alive():
    return adb("shell", "pidof", PKG, check=False).strip() != ""


def find(text, xml):
    for node in re.findall(r"<node [^>]*>", xml):
        labels = re.findall(r'(?:text|content-desc)="([^"]*)"', node)
        b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', node)
        if b and any(text in l for l in labels if l):
            x1, y1, x2, y2 = map(int, b.groups())
            return (x1 + x2) // 2, (y1 + y2) // 2
    return None


def wait_for(text, timeout=180):
    end = time.time() + timeout
    while time.time() < end:
        if not alive():
            fail(f"app died while waiting for '{text}'")
        xml = dump()
        pos = find(text, xml)
        if pos:
            return pos
        time.sleep(3)
    with open(os.path.join(OUT, f"missing-{step_no}.xml"), "w") as f:
        f.write(xml)
    shot("timeout")
    fail(f"'{text}' never appeared")


def tap(text, timeout=180):
    x, y = wait_for(text, timeout)
    print(f"tap '{text}' at {x},{y}")
    adb("shell", "input", "tap", str(x), str(y))


def save_logcat():
    log = adb("logcat", "-d", "-v", "threadtime", timeout=120, check=False)
    with open(os.path.join(OUT, "logcat.txt"), "w") as f:
        f.write(log)
    return log


def crashes(log):
    lines = log.splitlines()
    hits = [i for i, l in enumerate(lines) if re.search(r"FATAL EXCEPTION|Fatal signal|ANR in " + PKG + r"|backtrace:", l)]
    out = []
    for i in hits[:3]:
        out.append("\n".join(lines[max(0, i - 5): i + 60]))
    return out


def fail(msg):
    shot("failure")
    log = save_logcat()
    print("SMOKE TEST FAILED:", msg)
    for c in crashes(log):
        print("-" * 80)
        print(c)
    raise SystemExit(1)


def run_call(lang_chip, create_label, listening_label, start_label, name_field, name):
    adb("shell", "am", "start", "-W", "-n", f"{PKG}/.MainActivity")
    tap(lang_chip, 120)
    time.sleep(2)
    tap(create_label, 120)
    # The whole multi-sentence greeting must be spoken before the app starts listening.
    wait_for(listening_label, 420)
    shot(f"listening-{lang_chip}")
    # Voice is the default; the keyboard fallback is used here because the emulator has no voice.
    tap("Type instead", 30)
    tap(start_label, 30)
    time.sleep(15)
    if not alive():
        fail(f"crash after '{start_label}'")
    shot(f"after-start-{lang_chip}")
    tap(name_field, 60)
    adb("shell", "input", "text", name.replace(" ", "%s"))
    adb("shell", "input", "keyevent", "66")
    time.sleep(15)  # reply interrupts the previous one: confirm + next question
    if not alive():
        fail("crash after typing the name")
    shot(f"after-name-{lang_chip}")
    tap("Type instead", 30)  # back to voice-only
    time.sleep(30)  # silence -> the assistant asks again; ASR keeps running
    if not alive():
        fail("crash while listening")
    shot(f"reprompt-{lang_chip}")
    adb("shell", "input", "keyevent", "4")  # back = end call
    time.sleep(3)


adb("logcat", "-c", check=False)
print("installing", APK, os.path.getsize(APK) // (1024 * 1024), "MB")
adb("install", "-r", "-g", APK, timeout=900)
for p in ("android.permission.CAMERA", "android.permission.RECORD_AUDIO"):
    adb("shell", "pm", "grant", PKG, p, check=False)

run_call("English", "Create Account", "Listening", "Yes, let's start", "Full name", "Abebe Kebede Bekele")
run_call("አማርኛ", "አካውንት ክፈት", "እያዳመጥኩ", "አዎ፣ እንጀምር", "ሙሉ ስም", "Abebe Kebede Bekele")

log = save_logcat()
found = crashes(log)
if found:
    for c in found:
        print(c)
    raise SystemExit("crash found in logcat")
print("SMOKE TEST PASSED")
