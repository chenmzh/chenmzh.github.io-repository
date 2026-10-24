"""Generate strict JSON decisions; gold labels are never sent to the model."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from common import read_jsonl, write_json, write_jsonl, prompt_ids, parse_decision, LABELS

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--model", default="Qwen/Qwen3-8B")
    p.add_argument("--model-revision")
    p.add_argument("--adapter")
    p.add_argument("--data", default="data/pubmedqa/validation.jsonl")
    p.add_argument("--labels", help="Separate label file, required for the blind official test input")
    p.add_argument("--out", required=True)
    p.add_argument("--qlora", action="store_true", help="Evaluate with a 4-bit base; use the same precision for the matching baseline")
    p.add_argument("--max-length", type=int, default=4096)
    p.add_argument("--max-new-tokens", type=int, default=64)
    p.add_argument("--final-test-confirm", action="store_true")
    a = p.parse_args()
    if "test" in Path(a.data).name and not a.final_test_confirm:
        p.error("Official test stays sealed during tuning. Add --final-test-confirm only after selecting the final model.")
    if Path(a.out).exists() and any(Path(a.out).iterdir()):
        raise FileExistsError("Use a fresh evaluation output directory")
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    from huggingface_hub import HfApi
    from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
    from peft import PeftModel
    rows = read_jsonl(a.data)
    if len({r['id'] for r in rows}) != len(rows):
        raise ValueError("Duplicate evaluation IDs")
    label_rows = read_jsonl(a.labels) if a.labels else rows
    gold = {r['id']: r['gold'] for r in label_rows}
    if len(gold) != len(label_rows) or set(gold) != {r['id'] for r in rows}:
        raise ValueError("Evaluation inputs/labels must match exactly, with unique IDs")
    if any(v not in LABELS for v in gold.values()):
        raise ValueError("Invalid gold label")
    revision = a.model_revision
    if a.adapter and (Path(a.adapter)/"run_config.json").exists():
        saved = json.loads((Path(a.adapter)/"run_config.json").read_text())
        if saved["model"] != a.model:
            raise ValueError("Adapter/base-model mismatch")
        if revision and revision != saved['resolved_model_revision']:
            raise ValueError("Adapter/base-model revision mismatch")
        revision = saved['resolved_model_revision']
    if revision is None and not Path(a.model).exists():
        revision = HfApi().model_info(a.model).sha
    tokenizer = AutoTokenizer.from_pretrained(a.model, revision=revision, trust_remote_code=False)
    kwargs = dict(revision=revision, torch_dtype=torch.bfloat16, attn_implementation="sdpa", trust_remote_code=False)
    if a.qlora:
        kwargs.update(quantization_config=BitsAndBytesConfig(load_in_4bit=True,
            bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.bfloat16),
            device_map={"": 0})
    model = AutoModelForCausalLM.from_pretrained(a.model, **kwargs)
    if not a.qlora:
        model.to("cuda")
    if a.adapter:
        model = PeftModel.from_pretrained(model, a.adapter)
    model.eval()
    model.config.use_cache = True
    predictions = []
    with torch.inference_mode():
        for i, row in enumerate(rows):
            tokens = prompt_ids(tokenizer, row)
            if len(tokens) + a.max_new_tokens > a.max_length:
                raise ValueError(f"{row['id']}: context exceeds --max-length; do not silently truncate test evidence")
            inputs = torch.tensor([tokens], device="cuda")
            output = model.generate(input_ids=inputs, attention_mask=torch.ones_like(inputs),
                max_new_tokens=a.max_new_tokens, do_sample=False,
                eos_token_id=tokenizer.eos_token_id,
                pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id)
            text = tokenizer.decode(output[0, len(tokens):], skip_special_tokens=True).strip()
            predictions.append({"id": row['id'], "gold": gold[row['id']],
                "prediction": parse_decision(text), "raw_output": text})
            if (i + 1) % 25 == 0:
                print(f"Evaluated {i+1}/{len(rows)}")
    y = [r['gold'] for r in predictions]
    pred = [r['prediction'] for r in predictions]
    accuracy = float(accuracy_score(y, pred))
    n, z = len(y), 1.959963984540054
    center = (accuracy + z*z/(2*n)) / (1+z*z/n)
    half = z*((accuracy*(1-accuracy)/n + z*z/(4*n*n))**0.5)/(1+z*z/n)
    metrics = {"n": n, "accuracy": accuracy, "accuracy_wilson_95_ci": [center-half, center+half],
        "macro_f1": float(f1_score(y, pred, labels=list(LABELS), average="macro", zero_division=0)),
        "invalid_rate": pred.count("INVALID")/n,
        "classification_report": classification_report(y, pred, labels=list(LABELS), output_dict=True, zero_division=0),
        "confusion_label_order": list(LABELS)+["INVALID"],
        "confusion_matrix": confusion_matrix(y, pred, labels=list(LABELS)+["INVALID"]).tolist(),
        "model_revision": revision, "adapter": a.adapter, "base_precision": "NF4" if a.qlora else "BF16",
        "prompt_mode": "enable_thinking=False; deterministic greedy decoding", "arguments": vars(a)}
    write_jsonl(Path(a.out)/"predictions.jsonl", predictions)
    write_json(Path(a.out)/"metrics.json", metrics)
    print(json.dumps({k: metrics[k] for k in ('n','accuracy','macro_f1','invalid_rate')}, indent=2))

if __name__ == "__main__":
    main()
