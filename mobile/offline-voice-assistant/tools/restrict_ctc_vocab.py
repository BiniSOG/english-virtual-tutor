#!/usr/bin/env python3
"""
Restrict Meta's Omnilingual CTC model to the scripts this app needs: Ge'ez (Amharic), Latin
(English) and digits. The model knows 1600+ languages and sometimes writes Amharic speech in
Arabic or other scripts; a large negative bias on every other token's score makes that impossible.

    python restrict_ctc_vocab.py model.onnx tokens.txt
"""
import sys

import numpy as np
import onnx
from onnx import helper, numpy_helper

model_path, tokens_path = sys.argv[1], sys.argv[2]


def allowed(sym):
    s = sym.replace("▁", "")
    if s == "" or s.startswith("<") or s in ("|", "'", "-"):
        return True  # blank, special tokens, word boundaries
    for ch in s:
        o = ord(ch)
        if 0x1200 <= o <= 0x139F or 0x2D80 <= o <= 0x2DDF or 0xAB00 <= o <= 0xAB2F:
            continue  # Ethiopic
        if ch.isascii() and (ch.isalnum() or ch in "'-"):
            continue  # Latin letters, digits
        return False
    return True


ids = {}
for line in open(tokens_path, encoding="utf-8"):
    parts = line.rstrip("\n").rsplit(" ", 1)
    if len(parts) == 2 and parts[1].strip().lstrip("-").isdigit():
        ids[int(parts[1])] = parts[0]
vocab = max(ids) + 1
bias = np.zeros(vocab, dtype=np.float32)
blocked = 0
for i, sym in ids.items():
    if not allowed(sym):
        bias[i] = -60.0
        blocked += 1

m = onnx.load(model_path)
g = m.graph
if any(n.name == "restrict_scripts_add" for n in g.node):
    print("already restricted")
    sys.exit(0)
out = g.output[0]
raw = out.name + "_unrestricted"
for n in g.node:
    for k, o in enumerate(n.output):
        if o == out.name:
            n.output[k] = raw
g.initializer.append(numpy_helper.from_array(bias, name="restrict_scripts_bias"))
g.node.append(helper.make_node("Add", [raw, "restrict_scripts_bias"], [out.name], name="restrict_scripts_add"))
onnx.save(m, model_path)
print(f"blocked {blocked} of {vocab} tokens (non Ge'ez/Latin scripts); output '{out.name}'")
