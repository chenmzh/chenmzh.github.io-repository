"""Prepare TAPE GFP fluorescence regression, retaining original splits."""
from __future__ import annotations
import argparse
import json
import math
import tarfile
from collections import Counter
from pathlib import Path
from common import download, write_json, write_jsonl, text_hash
URL = "https://s3.amazonaws.com/songlabdata/proteindata/data_raw_pytorch/fluorescence.tar.gz"
EXPECTED = {"train": 21446, "valid": 5362, "test": 27217}

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", default="data/fluorescence")
    p.add_argument("--archive", help="Existing official raw JSON archive for offline preparation")
    a = p.parse_args()
    out = Path(a.out)
    archive = Path(a.archive) if a.archive else out / "raw" / "fluorescence.tar.gz"
    if a.archive and not archive.is_file():
        raise FileNotFoundError(archive)
    source = download(URL, archive)
    splits, audit = {}, {}
    # Read JSON members directly: no pickle and no filesystem tar extraction.
    with tarfile.open(archive, mode="r:gz") as tar:
        for split, expected in EXPECTED.items():
            members = [m for m in tar.getmembers() if m.isfile() and Path(m.name).name == f"fluorescence_{split}.json"]
            if len(members) != 1:
                raise ValueError(f"Expected one JSON member for {split}; found {[m.name for m in members]}")
            f = tar.extractfile(members[0])
            if f is None:
                raise ValueError("Unreadable archive member")
            original = json.load(f)
            if not isinstance(original, list) or len(original) != expected:
                raise ValueError(f"Unexpected {split} record count; recheck the official archive version")
            records = []
            for i, row in enumerate(original):
                seq = row["primary"].strip().upper()
                raw_label = row["log_fluorescence"]
                target = float(raw_label[0] if isinstance(raw_label, list) else raw_label)
                if not seq or not set(seq) <= set("ACDEFGHIKLMNPQRSTVWYBXZOU") or not math.isfinite(target):
                    raise ValueError(f"Invalid sequence or target: {split}/{i}")
                records.append({"id": f"tape-gfp-{split}-{i}", "sequence": seq,
                    "label": target, "sequence_sha256": text_hash(seq),
                    "source": "TAPE/fluorescence", "source_split": split})
            splits[split] = records
            audit[split] = {"rows": len(records), "min_length": min(len(r['sequence']) for r in records),
                "max_length": max(len(r['sequence']) for r in records),
                "duplicate_sequences": len(records) - len({r['sequence_sha256'] for r in records}),
                "min_log_fluorescence": min(r['label'] for r in records),
                "max_log_fluorescence": max(r['label'] for r in records)}
    overlaps = {}
    names = list(splits)
    for i, x in enumerate(names):
        for y in names[i+1:]:
            overlaps[f"{x}/{y}"] = len({r['sequence_sha256'] for r in splits[x]} & {r['sequence_sha256'] for r in splits[y]})
    for name, rows in splits.items():
        write_jsonl(out / f"{'validation' if name == 'valid' else name}.jsonl", rows)
    write_json(out / "manifest.json", {"source": source, "audit": audit,
        "cross_split_exact_sequence_overlap": overlaps,
        "split_policy": "Original TAPE split retained; do NOT random-resplit GFP variants.",
        "target": "Original log_fluorescence; not raw fluorescence intensity",
        "limitations": "Exact sequence overlap is checked; this is not proof of homology independence or absence of ESM pretraining overlap.",
        "license_note": "TAPE code license is BSD-3-Clause; independently check original GFP dataset rights before redistribution/commercial use."})
    print(json.dumps(audit, indent=2))
    if any(overlaps.values()):
        print("WARNING: exact sequences overlap across official splits. Investigate before interpreting generalization; official membership was not silently changed.")

if __name__ == "__main__":
    main()
