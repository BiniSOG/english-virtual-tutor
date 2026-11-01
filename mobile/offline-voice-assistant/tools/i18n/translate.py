#!/usr/bin/env python3
"""
Drafts translations of tools/i18n/spec.en.json with Gemini into tools/i18n/<code>.json.
A native speaker should review the output; the JSON files are the source of truth and can be
edited by hand, then `python tools/i18n/gen_kotlin.py` regenerates the app code.

    GEMINI_API_KEY=... python tools/i18n/translate.py om ti aa
"""
import json
import os
import sys
import urllib.request

LANGS = {
    "om": ("Afaan Oromoo (Oromo, Latin Qubee script)", "Ethiopia"),
    "ti": ("Tigrinya (ትግርኛ, Ge'ez script, as spoken in Tigray, Ethiopia)", "Ethiopia"),
    "aa": ("Qafar af (Afar, Latin script)", "Ethiopia"),
}
KEY = os.environ["GEMINI_API_KEY"]
MODEL = os.environ.get("GEMINI_TEXT_MODEL", "gemini-3.5-flash")
spec = json.load(open("tools/i18n/spec.en.json", encoding="utf-8"))

INSTRUCTIONS = """You are a professional translator and native speaker of {lang}, localizing a bank's
voice assistant ("Hana", a friendly female bank agent on a video call) for customers in {country}.

Translate the JSON below into natural, spoken, polite {lang} as a real bank agent would say it on
the phone. Rules:
- Keep exactly the same JSON structure and keys. Translate only the string values.
- Keep placeholders like {{first}}, {{value}}, {{question}}, {{digits}}, {{bank}}, {{agent}}, {{type}},
  {{account}}, {{n}}, {{got}} unchanged, and keep them as separate words (never glue a prefix or
  suffix to a placeholder).
- "ui" is a list: return an object mapping each English string to its translation.
- "intents", "namePrefixes", "nameSuffixes", "placeFillers", "editKeys", "faq[].keywords": give
  several common ways people actually SAY these in {lang} (short, lower case, as speech recognition
  would write them). Lists may be longer than the English ones.
- Use the formal/polite form of address.

Also add these extra fields:
- "languageNames": ways to say the name of this language (e.g. to ask "speak {lang}").
- "bankName": "Demo Bank" written in {lang}. "agentName": "Hana" written in {lang} script.
- "numbers": {{"units": [words for 0..9], "tens": [words for 10,20,...,90],
  "teenPrefix": the form of "ten" used before a unit in 11-19 (or "" if 11-19 are single words),
  "hundred": word, "thousand": word,
  "multiplierAfter": true if the language says "hundred two" for 200 (multiplier after), else false,
  "conjunction": the word for "and" used inside numbers (or "")}}
- "months": the 13 Ethiopian-calendar month names in {lang} (Meskerem ... Pagume) in order,
  as written in {lang}.
Return only JSON."""


def ask(code):
    lang, country = LANGS[code]
    body = {
        "contents": [{"parts": [{"text": INSTRUCTIONS.format(lang=lang, country=country) + "\n\n" + json.dumps(spec, ensure_ascii=False)}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.3},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    with urllib.request.urlopen(req, timeout=600) as r:
        data = json.load(r)
    return json.loads(data["candidates"][0]["content"]["parts"][0]["text"])


for code in sys.argv[1:]:
    out = ask(code)
    missing = [k for k in spec["prompts"] if k not in out.get("prompts", {})]
    print(code, "prompts:", len(out.get("prompts", {})), "missing:", missing, "ui:", len(out.get("ui", {})))
    json.dump(out, open(f"tools/i18n/{code}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
