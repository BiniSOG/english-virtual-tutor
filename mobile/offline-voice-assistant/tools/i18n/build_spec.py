#!/usr/bin/env python3
"""Collects every English text the assistant uses into tools/i18n/spec.en.json (input for translate.py)."""
import glob
import json
import re

ROOT = "brain/src/main/kotlin/com/binisog/voiceassistant/brain"
STR = r'"((?:[^"\\]|\\.)*)"'


def unescape(s):
    return s.encode().decode("unicode_escape").encode("latin-1").decode("utf-8")


src = open(f"{ROOT}/Prompts.kt", encoding="utf-8").read()
en_block = src[src.index("private val en"):src.index("private val am")]
prompts = {}
starts = [(m.group(1), m.end()) for m in re.finditer(r'"([a-zA-Z]+)" to listOf\(', en_block)]
for i, (key, pos) in enumerate(starts):
    end = starts[i + 1][1] if i + 1 < len(starts) else len(en_block)
    chunk = en_block[pos:end]
    chunk = chunk[:chunk.rfind(")")] if i + 1 < len(starts) else chunk
    prompts[key] = [unescape(s) for s in re.findall(STR, chunk) if not re.fullmatch(r"[a-zA-Z]+", s) or " " in s]
    # the last string of a chunk may be the next key; drop pure identifiers
    prompts[key] = [p for p in prompts[key] if p and not re.fullmatch(r"[a-zA-Z]+", p)]

faq_src = open(f"{ROOT}/Faq.kt", encoding="utf-8").read()
faq = []
for m in re.finditer(r"Entry\(\s*listOf\((.*?)\),\s*listOf\((.*?)\),\s*" + STR + r",\s*" + STR, faq_src, re.S):
    faq.append({"keywords": [unescape(s) for s in re.findall(STR, m.group(1))], "answer": unescape(m.group(3))})

ui = set()
for f in glob.glob("app/src/main/java/**/*.kt", recursive=True):
    for m in re.finditer(r"tr\((?:lang|state\.lang|state\.lang), " + STR + r", " + STR + r"\)", open(f, encoding="utf-8").read()):
        ui.add(unescape(m.group(1)))

spec = {
    "prompts": prompts,
    "faq": faq,
    "ui": sorted(ui),
    "accountTypes": {"SAVINGS": "Savings Account", "CURRENT": "Current Account",
                     "INTEREST_FREE": "Interest-Free Account", "YOUTH": "Youth Savings Account"},
    "intents": {
        "yes": ["yes", "yeah", "correct", "that's right", "okay", "sure", "let's start", "go ahead"],
        "no": ["no", "not correct", "that's wrong", "not yet"],
        "repeat": ["repeat", "say that again", "I didn't hear"],
        "back": ["go back", "previous"],
        "cancel": ["cancel", "stop", "end the call"],
        "question": ["what", "why", "how", "when", "where", "how much", "is it possible", "do I need"],
    },
    "namePrefixes": ["my name is", "my full name is", "I am", "I'm called"],
    "nameSuffixes": ["is my name", "thank you", "please"],
    "placeFillers": ["I was born in", "born in", "the city of", "city"],
    "editKeys": {
        "FULL_NAME": ["name", "change my name"], "DOB": ["date of birth", "birthday"],
        "BIRTH_CITY": ["city", "place of birth"], "NATIONALITY": ["nationality", "country"],
        "ACCOUNT_TYPE": ["account type"], "FAN": ["Fayda number", "ID number"],
    },
}
json.dump(spec, open("tools/i18n/spec.en.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(prompts), "prompt keys,", sum(len(v) for v in prompts.values()), "lines;", len(faq), "faq;", len(ui), "ui strings")
for k, v in list(prompts.items())[:3]:
    print(k, v)
