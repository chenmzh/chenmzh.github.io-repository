"""ESM-2 GFP regression: frozen-encoder baseline versus full fine-tuning."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from common import read_jsonl, write_json, write_jsonl

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--model", default="facebook/esm2_t12_35M_UR50D")
    p.add_argument("--model-revision")
    p.add_argument("--data-dir", default="data/fluorescence")
    p.add_argument("--out", default="runs/esm2-gfp-full")
    p.add_argument("--mode", choices=["head", "full"], default="full")
    p.add_argument("--epochs", type=float, default=5)
    p.add_argument("--batch-size", type=int, default=16)
    p.add_argument("--lr", type=float, help="Defaults: head 1e-3, full 2e-5")
    p.add_argument("--max-length", type=int, default=1024)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--evaluate-test-only", action="store_true")
    p.add_argument("--checkpoint", help="Saved checkpoint for final test evaluation; no retraining")
    a = p.parse_args()
    import numpy as np
    import torch
    from scipy.stats import spearmanr
    from datasets import Dataset
    from huggingface_hub import HfApi
    from transformers import (AutoTokenizer, AutoModelForSequenceClassification, Trainer,
        TrainingArguments, DataCollatorWithPadding, EarlyStoppingCallback, set_seed)
    if not torch.cuda.is_available() or not torch.cuda.is_bf16_supported():
        raise RuntimeError("This profile requires a BF16-capable CUDA GPU")
    if Path(a.out).exists() and any(Path(a.out).iterdir()):
        raise FileExistsError("Use a new output directory")
    if a.evaluate_test_only and not a.checkpoint:
        p.error("--evaluate-test-only requires --checkpoint")
    set_seed(a.seed)
    data = Path(a.data_dir)
    revision = a.model_revision
    if a.evaluate_test_only:
        stats = json.loads((Path(a.checkpoint)/"target_stats.json").read_text())
        mean, std = stats['train_mean'], stats['train_std']
        tokenizer = AutoTokenizer.from_pretrained(a.checkpoint, trust_remote_code=False)
        model = AutoModelForSequenceClassification.from_pretrained(a.checkpoint, trust_remote_code=False)
        train_rows, val_rows = None, None
    else:
        if revision is None and not Path(a.model).exists():
            revision = HfApi().model_info(a.model).sha
        train_rows = read_jsonl(data / "train.jsonl")
        val_rows = read_jsonl(data / "validation.jsonl")
        values = np.array([r['label'] for r in train_rows], dtype=float)
        mean, std = float(values.mean()), float(values.std())
        if std <= 0:
            raise ValueError("Training targets have zero variance")
        tokenizer = AutoTokenizer.from_pretrained(a.model, revision=revision, trust_remote_code=False)
        model = AutoModelForSequenceClassification.from_pretrained(a.model,
            revision=revision, num_labels=1, problem_type="regression", trust_remote_code=False)
        if a.mode == "head":
            for parameter in model.esm.parameters():
                parameter.requires_grad = False
    def encode(rows):
        features = []
        for r in rows:
            enc = tokenizer(r['sequence'], truncation=False)
            if len(enc['input_ids']) > a.max_length:
                raise ValueError(f"Sequence {r['id']} exceeds model limit; do not silently clip biological sequence")
            enc['labels'] = float((r['label'] - mean) / std)
            features.append(enc)
        return Dataset.from_list(features)
    def metrics(prediction):
        pred = np.asarray(prediction.predictions).reshape(-1)*std + mean
        gold = np.asarray(prediction.label_ids).reshape(-1)*std + mean
        rho = float(spearmanr(gold, pred).statistic)
        return {"spearman": rho if np.isfinite(rho) else 0.0,
            "spearman_defined": float(np.isfinite(rho)),
            "rmse": float(np.sqrt(np.mean((gold-pred)**2))),
            "mae": float(np.mean(np.abs(gold-pred)))}
    args = TrainingArguments(output_dir=a.out, num_train_epochs=a.epochs,
        per_device_train_batch_size=a.batch_size, per_device_eval_batch_size=a.batch_size,
        gradient_accumulation_steps=2, learning_rate=a.lr or (1e-3 if a.mode == 'head' else 2e-5),
        weight_decay=0.01, warmup_ratio=0.05, bf16=True, tf32=True,
        logging_steps=50, eval_strategy="no" if a.evaluate_test_only else "epoch",
        save_strategy="no" if a.evaluate_test_only else "epoch", save_total_limit=2,
        load_best_model_at_end=not a.evaluate_test_only, metric_for_best_model="spearman",
        greater_is_better=True, report_to="none", seed=a.seed, data_seed=a.seed,
        dataloader_num_workers=2)
    trainer = Trainer(model=model, args=args, processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer), compute_metrics=metrics,
        train_dataset=encode(train_rows) if train_rows is not None else None,
        eval_dataset=encode(val_rows) if val_rows is not None else None,
        callbacks=[] if a.evaluate_test_only else [EarlyStoppingCallback(early_stopping_patience=2)])
    if a.evaluate_test_only:
        rows = read_jsonl(data / "test.jsonl")
        result = trainer.predict(encode(rows), metric_key_prefix="test")
        pred = np.asarray(result.predictions).reshape(-1)*std+mean
        write_jsonl(Path(a.out)/"predictions.jsonl", [{"id": r['id'], "gold": r['label'], "prediction": float(x)} for r, x in zip(rows, pred)])
        write_json(Path(a.out)/"test_metrics.json", result.metrics)
        print(result.metrics)
    else:
        torch.cuda.reset_peak_memory_stats()
        result = trainer.train()
        trainer.save_model(a.out)
        tokenizer.save_pretrained(a.out)
        write_json(Path(a.out)/"target_stats.json", {"train_mean": mean, "train_std": std,
            "label_scale": "original TAPE log_fluorescence"})
        validation_metrics = trainer.evaluate()
        validation_metrics["train_mean_baseline_validation_rmse"] = float(np.sqrt(np.mean([(r['label']-mean)**2 for r in val_rows])))
        write_json(Path(a.out)/"run_config.json", vars(a) | {"resolved_model_revision": revision,
            "trainable_parameters": sum(p.numel() for p in model.parameters() if p.requires_grad),
            "peak_allocated_GiB": torch.cuda.max_memory_allocated()/2**30,
            "training_metrics": result.metrics, "validation_metrics": validation_metrics})
        print(validation_metrics)

if __name__ == "__main__":
    main()
