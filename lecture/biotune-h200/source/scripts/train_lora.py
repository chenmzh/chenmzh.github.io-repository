"""Completion-only SFT with BF16 LoRA; optional single-GPU 4-bit QLoRA."""
from __future__ import annotations
import argparse
import os
from pathlib import Path
from common import read_jsonl, encode_completion, write_json

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--model", default="Qwen/Qwen3-8B")
    p.add_argument("--model-revision", help="HF model commit; resolved and logged when omitted")
    p.add_argument("--train", default="data/pubmedqa/train.jsonl")
    p.add_argument("--validation", default="data/pubmedqa/validation.jsonl")
    p.add_argument("--out", default="runs/qwen3-8b-lora")
    p.add_argument("--base-adapter", help="Continue training an adapter from a prior weak-label stage")
    p.add_argument("--qlora", action="store_true")
    p.add_argument("--max-length", type=int, default=4096)
    p.add_argument("--batch-size", type=int, default=2)
    p.add_argument("--grad-accum", type=int, default=8)
    p.add_argument("--epochs", type=float, default=3)
    p.add_argument("--lr", type=float, default=1e-4)
    p.add_argument("--rank", type=int, default=16)
    p.add_argument("--alpha", type=int, default=32)
    p.add_argument("--max-steps", type=int, default=-1)
    p.add_argument("--seed", type=int, default=42)
    a = p.parse_args()
    import torch
    from datasets import Dataset
    from huggingface_hub import HfApi
    from transformers import (AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig,
                              DataCollatorForSeq2Seq, Trainer, TrainingArguments, set_seed)
    from peft import LoraConfig, PeftModel, PeftConfig, get_peft_model, prepare_model_for_kbit_training
    if not torch.cuda.is_available() or not torch.cuda.is_bf16_supported():
        raise RuntimeError("This training profile requires a BF16-capable CUDA GPU")
    world = int(os.environ.get("WORLD_SIZE", "1"))
    if a.qlora and world > 1:
        raise ValueError("This starter supports single-GPU QLoRA only. Use BF16 LoRA for its DDP example.")
    if Path(a.out).exists() and any(Path(a.out).iterdir()):
        raise FileExistsError(f"Use a fresh output directory to prevent accidental overwrites: {a.out}")
    set_seed(a.seed)
    revision = a.model_revision
    if not Path(a.model).exists() and revision is None:
        revision = HfApi().model_info(a.model).sha
    tokenizer = AutoTokenizer.from_pretrained(a.model, revision=revision, trust_remote_code=False)
    tokenizer.padding_side = "right"
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    train_rows, val_rows = read_jsonl(a.train), read_jsonl(a.validation)
    train_ids, val_ids = {r['id'] for r in train_rows}, {r['id'] for r in val_rows}
    if train_ids & val_ids:
        raise ValueError("Train/validation IDs overlap")
    train_ds = Dataset.from_list([encode_completion(tokenizer, r, a.max_length) for r in train_rows])
    val_ds = Dataset.from_list([encode_completion(tokenizer, r, a.max_length) for r in val_rows])
    kwargs = dict(revision=revision, torch_dtype=torch.bfloat16, attn_implementation="sdpa", trust_remote_code=False)
    if a.qlora:
        kwargs["quantization_config"] = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.bfloat16)
        kwargs["device_map"] = {"": int(os.environ.get("LOCAL_RANK", "0"))}
    model = AutoModelForCausalLM.from_pretrained(a.model, **kwargs)
    model.config.use_cache = False
    if a.qlora:
        model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True,
                                              gradient_checkpointing_kwargs={"use_reentrant": False})
    if a.base_adapter:
        cfg = PeftConfig.from_pretrained(a.base_adapter)
        if cfg.base_model_name_or_path != a.model:
            raise ValueError("Adapter/base-model mismatch")
        previous_path = Path(a.base_adapter) / "run_config.json"
        if previous_path.exists():
            import json
            previous = json.loads(previous_path.read_text())
            if previous.get("resolved_model_revision") != revision:
                raise ValueError("Pin --model-revision to the previous stage's resolved_model_revision")
        model = PeftModel.from_pretrained(model, a.base_adapter, is_trainable=True)
    else:
        model = get_peft_model(model, LoraConfig(task_type="CAUSAL_LM", target_modules="all-linear",
            r=a.rank, lora_alpha=a.alpha, lora_dropout=0.05, bias="none"))
    model.print_trainable_parameters()
    args = TrainingArguments(output_dir=a.out, per_device_train_batch_size=a.batch_size,
        per_device_eval_batch_size=1, gradient_accumulation_steps=a.grad_accum,
        learning_rate=a.lr, num_train_epochs=a.epochs, max_steps=a.max_steps,
        warmup_ratio=0.05, lr_scheduler_type="cosine", weight_decay=0.01,
        bf16=True, tf32=True, optim="adamw_torch", max_grad_norm=1.0,
        gradient_checkpointing=True, gradient_checkpointing_kwargs={"use_reentrant": False},
        logging_steps=5, eval_strategy="epoch", save_strategy="epoch", save_total_limit=2,
        load_best_model_at_end=True, metric_for_best_model="eval_loss", greater_is_better=False,
        prediction_loss_only=True, report_to="none", seed=a.seed, data_seed=a.seed,
        ddp_find_unused_parameters=False, dataloader_num_workers=2)
    trainer = Trainer(model=model, args=args, train_dataset=train_ds, eval_dataset=val_ds,
        processing_class=tokenizer, data_collator=DataCollatorForSeq2Seq(tokenizer,
            padding=True, pad_to_multiple_of=8, label_pad_token_id=-100))
    torch.cuda.reset_peak_memory_stats()
    result = trainer.train()
    trainer.save_model(a.out)
    if trainer.is_world_process_zero():
        tokenizer.save_pretrained(a.out)
        config = vars(a) | {"resolved_model_revision": revision, "world_size": world,
            "effective_batch_size": a.batch_size*a.grad_accum*world,
            "train_examples": len(train_ds), "validation_examples": len(val_ds),
            "train_input_tokens": sum(len(x['input_ids']) for x in train_ds),
            "supervised_target_tokens": sum(sum(t != -100 for t in x['labels']) for x in train_ds),
            "peak_allocated_GiB_rank0": torch.cuda.max_memory_allocated()/2**30,
            "peak_reserved_GiB_rank0": torch.cuda.max_memory_reserved()/2**30,
            "best_checkpoint": trainer.state.best_model_checkpoint,
            "selection_metric": "validation completion loss; verify task metrics separately",
            "metrics": result.metrics}
        write_json(Path(a.out)/"run_config.json", config)
        import subprocess
        with (Path(a.out)/"pip-freeze.txt").open("w") as f:
            subprocess.run([os.sys.executable, "-m", "pip", "freeze"], stdout=f, check=True)

if __name__ == "__main__":
    main()
