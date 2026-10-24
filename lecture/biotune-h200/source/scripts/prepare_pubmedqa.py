"""Download version-checked PubMedQA and preserve all 500 official test IDs."""
from __future__ import annotations
import argparse
import json
import random
from collections import Counter
from pathlib import Path
from common import (download, make_record, stratified_dev_ids, audit_splits,
                    write_json, write_jsonl, text_hash)

ROOT = "https://raw.githubusercontent.com/pubmedqa/pubmedqa/master/"
BLOBS = {"ori_pqal.json": "38db7750761c78950ed32303e7545bdaa513390c",
         "test_ground_truth.json": "825bf8f262c3cca0e3bd1c6f38eecf5e581b0659"}

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", default="data/pubmedqa")
    p.add_argument("--source-dir", help="Offline directory containing ori_pqal.json and test_ground_truth.json")
    p.add_argument("--artificial", type=int, default=0, help="Optional number of weakly labeled PQA-A examples to obtain")
    p.add_argument("--hf-revision", help="Optional HF dataset commit for PQA-A; otherwise resolve and log current SHA")
    p.add_argument("--seed", type=int, default=42)
    a = p.parse_args()
    if a.artificial < 0:
        p.error("--artificial must be nonnegative")
    out = Path(a.out)
    raw = Path(a.source_dir) if a.source_dir else out / "raw"
    sources = []
    for name, blob in BLOBS.items():
        if a.source_dir and not (raw / name).is_file():
            raise FileNotFoundError(raw / name)
        sources.append(download(ROOT + "data/" + name, raw / name, blob))
    if not a.source_dir:
        sources.append(download(ROOT + "LICENSE", raw / "PubMedQA-LICENSE.txt"))
    original = json.loads((raw / "ori_pqal.json").read_text())
    test_gold = json.loads((raw / "test_ground_truth.json").read_text())
    if len(original) != 1000 or len(test_gold) != 500 or not set(test_gold) <= set(original):
        raise ValueError("Unexpected source counts/IDs: stop rather than change the benchmark")
    rows = [make_record(k, v) for k, v in original.items()]
    for row in rows:
        if row["id"] in test_gold and row["gold"] != test_gold[row["id"]]:
            raise ValueError(f"Conflicting official label: {row['id']}")
    pool = [r for r in rows if r["id"] not in test_gold]
    dev_ids = stratified_dev_ids(pool, size=50, seed=a.seed)
    splits = {"train": [r for r in pool if r["id"] not in dev_ids],
              "validation": [r for r in pool if r["id"] in dev_ids],
              "test": [r for r in rows if r["id"] in test_gold]}
    report = audit_splits(splits)
    write_json(out / "audit.json", report)
    if report["cross_split_collisions"]:
        raise ValueError(f"Cross-split duplicates detected. Inspect {out/'audit.json'}; do not silently alter official test membership.")
    for split in ("train", "validation"):
        random.Random(a.seed).shuffle(splits[split])
        write_jsonl(out / f"{split}.jsonl", splits[split])
    test = sorted(splits["test"], key=lambda r: r["id"])
    write_jsonl(out / "test.inputs.jsonl", [{k: v for k, v in r.items() if k not in {"gold", "completion"}} for r in test])
    write_jsonl(out / "test.labels.jsonl", [{"id": r["id"], "gold": r["gold"]} for r in test])
    manifest = {"seed": a.seed, "source_files": sources, "audit": report,
                "split_policy": "Official 500-ID test preserved; remaining 500 custom stratified 450/50, NOT the official 10-fold CV.",
                "input_policy": "Only QUESTION and CONTEXTS; excludes LONG_ANSWER, predictions and gold labels.",
                "license_note": "PubMedQA repository MIT; underlying abstract rights require separate review for reuse/distribution."}
    if a.artificial:
        from datasets import load_dataset
        from huggingface_hub import HfApi
        revision = a.hf_revision or HfApi().dataset_info("qiaojin/PubMedQA").sha
        stream = load_dataset("qiaojin/PubMedQA", "pqa_artificial", split="train", streaming=True, revision=revision)
        stream = stream.shuffle(seed=a.seed, buffer_size=10000)
        blocked_ids = {r["id"] for r in rows}
        blocked_q = {r["question_sha256"] for r in rows}
        blocked_c = {r["context_sha256"] for r in rows}
        selected, skipped = [], Counter()
        for r in stream:
            item = {"QUESTION": r["question"], "CONTEXTS": r["context"]["contexts"], "final_decision": r["final_decision"]}
            x = make_record(str(r["pubid"]), item, "PubMedQA/PQA-A:weak-label")
            if x['id'] in blocked_ids or x['question_sha256'] in blocked_q or x['context_sha256'] in blocked_c:
                skipped['duplicate_or_labeled_overlap'] += 1
                continue
            blocked_ids.add(x['id']); blocked_q.add(x['question_sha256']); blocked_c.add(x['context_sha256'])
            selected.append(x)
            if len(selected) >= a.artificial:
                break
        if len(selected) != a.artificial:
            raise ValueError("Not enough eligible artificial examples")
        write_jsonl(out / "artificial_train.jsonl", selected)
        manifest["artificial"] = {"revision": revision, "rows": len(selected), "labels": dict(Counter(r['gold'] for r in selected)), "skipped": dict(skipped), "note": "Weak labels, not expert annotations. Separate training stage; never merge official test."}
    manifest["output_sha256"] = {}
    import hashlib
    for f in out.glob("*.jsonl"):
        manifest["output_sha256"][f.name] = hashlib.sha256(f.read_bytes()).hexdigest()
    write_json(out / "manifest.json", manifest)
    print(json.dumps(report, indent=2))
    print(f"Prepared files in {out.resolve()}")

if __name__ == "__main__":
    main()
