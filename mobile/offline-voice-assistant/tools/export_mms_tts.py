#!/usr/bin/env python3
"""
Export a Meta MMS text-to-speech voice (facebook/mms-tts-<lang>, VITS) from Hugging Face to an
ONNX model that sherpa-onnx (>= 2.0) can run on Android with its character frontend.

Usage:  python export_mms_tts.py --lang amh --out app/src/main/assets/models/tts-am

Writes model.onnx, tokens.txt and info.json ({"romanized": bool}).

Note: the MMS TTS checkpoints are licensed CC-BY-NC 4.0 (non-commercial use).
"""
import argparse
import json
import os

import onnx
import torch
from transformers import AutoTokenizer, VitsModel


class SherpaVits(torch.nn.Module):
    """Gives the HF model the input signature sherpa-onnx uses for VITS models."""

    def __init__(self, model: VitsModel):
        super().__init__()
        self.model = model

    def forward(self, x, x_length, noise_scale, length_scale, noise_scale_w):
        # VitsModel reads these as attributes; tensors make them runtime inputs of the graph.
        self.model.noise_scale = noise_scale
        self.model.noise_scale_duration = noise_scale_w
        self.model.speaking_rate = 1.0 / length_scale
        positions = torch.arange(x.shape[1], device=x.device).unsqueeze(0)
        attention_mask = (positions < x_length.unsqueeze(1)).long()
        waveform = self.model(input_ids=x, attention_mask=attention_mask).waveform
        return waveform.unsqueeze(1)  # (1, 1, num_samples)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True, help="MMS ISO 639-3 code, e.g. amh, eng")
    ap.add_argument("--out", required=True)
    ap.add_argument("--language-name", default=None)
    ap.add_argument("--int8", action="store_true", help="8-bit weights (about 4x smaller)")
    args = ap.parse_args()

    repo = f"facebook/mms-tts-{args.lang}"
    os.makedirs(args.out, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(repo)
    model = VitsModel.from_pretrained(repo).eval()
    try:
        model.decoder.remove_weight_norm()
    except Exception as e:  # not fatal, only slightly slower
        print("remove_weight_norm skipped:", e)

    vocab = tokenizer.get_vocab()
    romanized = bool(getattr(tokenizer, "is_uroman", False))
    add_blank = bool(getattr(tokenizer, "add_blank", True))
    print(f"{repo}: vocab={len(vocab)} uroman={romanized} add_blank={add_blank} sr={model.config.sampling_rate}")

    # tokens.txt: one "<char> <id>" per line. sherpa's character frontend needs 1-char symbols.
    lines = []
    for sym, idx in sorted(vocab.items(), key=lambda kv: kv[1]):
        if len(sym) != 1 or (sym.isspace() and sym != " "):
            print(f"  skipping token {sym!r} ({idx})")
            continue
        lines.append(f"{sym} {idx}")
    with open(os.path.join(args.out, "tokens.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    wrapper = SherpaVits(model).eval()
    sample = "selam" if romanized else ("ሰላም" if args.lang == "amh" else "hello")
    ids = tokenizer(sample, return_tensors="pt").input_ids
    x_length = torch.tensor([ids.shape[1]], dtype=torch.int64)
    scales = (torch.tensor([0.667]), torch.tensor([1.0]), torch.tensor([0.8]))

    path = os.path.join(args.out, "model.onnx")
    with torch.no_grad():
        torch.onnx.export(
            wrapper,
            (ids, x_length, *scales),
            path,
            input_names=["x", "x_length", "noise_scale", "length_scale", "noise_scale_w"],
            output_names=["y"],
            dynamic_axes={"x": {1: "L"}, "y": {2: "T"}},
            opset_version=17,
            do_constant_folding=True,
            dynamo=False,
        )

    m = onnx.load(path)
    meta = {
        "model_type": "vits",
        "comment": "mms",
        "frontend": "characters",
        "language": args.language_name or args.lang,
        "sample_rate": str(model.config.sampling_rate),
        "add_blank": str(int(add_blank)),
        "blank_id": "0",
        "use_eos_bos": "0",
        "n_speakers": str(max(1, int(model.config.num_speakers))),
        "punctuation": "",
    }
    def stamp(model):
        del model.metadata_props[:]
        for k, v in meta.items():
            p = model.metadata_props.add()
            p.key, p.value = k, v

    stamp(m)
    onnx.save(m, path)
    if args.int8:
        from onnxruntime.quantization import QuantType, quantize_dynamic

        tmp = path + ".int8"
        quantize_dynamic(path, tmp, weight_type=QuantType.QUInt8)
        q = onnx.load(tmp)
        stamp(q)  # keep the sherpa-onnx metadata on the quantized model
        onnx.save(q, path)
        os.remove(tmp)

    with open(os.path.join(args.out, "info.json"), "w") as f:
        json.dump({"romanized": romanized, "source": repo, "license": "CC-BY-NC-4.0"}, f)
    print("wrote", path, os.path.getsize(path) // (1024 * 1024), "MB")


if __name__ == "__main__":
    main()
