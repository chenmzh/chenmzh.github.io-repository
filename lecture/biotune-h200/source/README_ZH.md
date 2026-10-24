# H200 生物方向模型微调实训包

版本：2026-10-24。面向有 Python 基础、能使用 Linux/CUDA 服务器的学习者。

**默认路线：单张完整 H200 → Qwen3-8B → BF16 LoRA → PubMedQA 文献证据判断。**

**生物序列路线：ESM-2 35M → GFP 荧光回归 → 冻结编码器与全参数微调对照。**

这不是“训练完成的模型”，也不是临床系统。本包包含中文课程、原创流程样例、公开数据下载/转换脚本、训练与评估脚本。当前交付环境未能成功下载完整公开数据，也没有执行 GPU 训练；已通过的检查见 `VALIDATION.md`。不能把脚本静态检查或玩具样例通过解释为模型效果得到验证。

## 文件导航

| 文件 | 用途 |
|---|---|
| `docs/COURSE_ZH.md` | 4 周、12 课：概念、实验、作业、验收与阅读材料 |
| `docs/DATASETS_ZH.md` | 数据集清单、切分方案、许可边界、字段与扩展方案 |
| `docs/RESOURCES_ZH.md` | 核验过的官方文档、原论文和数据源 |
| `scripts/prepare_pubmedqa.py` | 下载并校验原始文件；450/50/500 切分；可选 PQA-A |
| `scripts/train_lora.py` | 完整参数命令行的 BF16 LoRA / 单卡 QLoRA 训练 |
| `scripts/evaluate_llm.py` | 原模型与适配器评估；格式失败计错；测试集显式解封 |
| `scripts/majority_baseline.py` | 从训练集选择多数类的无模型基线 |
| `scripts/compare_runs.py` | 同一批题目的配对 bootstrap 准确率差异区间 |
| `scripts/prepare_fluorescence.py` | 从 TAPE 官方 JSON 压缩包准备 GFP 数据 |
| `scripts/train_protein.py` | ESM-2 回归头训练、全量微调与独立最终测试 |
| `data/smoke_*.jsonl` | 12 条原创虚构测试样例；不是科学数据 |
| `tests/test_core.py` | 无需 GPU 的数据与监督掩码单元测试 |

## 1. 环境

使用 Linux、Python 3.11，并先由服务器管理员提供或按 PyTorch 官方安装页安装**与 NVIDIA 驱动兼容的 CUDA 版 PyTorch**。不要在未知驱动版本时直接照抄某个 CUDA wheel 命令。官方入口见资料页。

在隔离环境中执行以下命令，前提是该环境已经能 `import torch` 并识别 GPU：

```bash
python -m pip install -r requirements.txt
python scripts/check_environment.py
python -m pytest -q tests
```

依赖文件是有意固定的教学基线，不是“2026 年最新版本”。不要把当前最新版 Transformers / PEFT / TRL 的代码片段直接混入固定版本环境。`environment_report.json` 记录真实显存、GPU 数量和软件版本；最终以它及 `nvidia-smi` 为准，尤其注意 MIG/容器可见显存。

QLoRA 为选修实验，另装：

```bash
python -m pip install -r requirements-qlora.txt
```

## 2. 获取正式文献数据

```bash
python scripts/prepare_pubmedqa.py
```

默认下载原作者 GitHub 的 `ori_pqal.json`、`test_ground_truth.json` 和许可文件。两份数据检查已核验的 Git blob SHA；来源变动将报错，而不是静默使用新版本。输出：

```text
data/pubmedqa/
  train.jsonl             # 450 条
  validation.jsonl        # 50 条
  test.inputs.jsonl       # 官方 500 条，仅输入
  test.labels.jsonl       # 官方 500 条，仅参考标签
  manifest.json           # 来源、哈希、切分策略
  audit.json              # 标签分布、精确重复检查
```

官方 500 条测试集保持不变；另外 500 条按种子 42 分层拆成 450/50。**后者是课程自定义开发切分，不是论文官方 10 折交叉验证。** 需要复现论文时使用原仓库的交叉验证协议。

网络受限时，在可访问网络的机器上从资料页指定源获取两份 JSON，放入目录，再执行：

```bash
python scripts/prepare_pubmedqa.py --source-dir /path/to/official_pubmedqa_files
```

不要把 `LONG_ANSWER` 或 `reasoning_*_pred` 放入 prompt。脚本只允许问题与上下文进入输入。`maybe` 是原任务的“不确定/混合结论”，不等于模型自报置信度。

## 3. 固定模型版本并测基线

```bash
export MODEL_REVISION=$(python -c "from huggingface_hub import HfApi; print(HfApi().model_info('Qwen/Qwen3-8B').sha)")
echo "$MODEL_REVISION"

python scripts/majority_baseline.py
python scripts/evaluate_llm.py \
  --model-revision "$MODEL_REVISION" \
  --data data/pubmedqa/validation.jsonl \
  --out runs/base-validation
```

英文证据、英文系统提示和统一 JSON 输出先保持不变，以减少变量。课程讲解使用中文；中文专业解释是后续单独的数据与评估任务，不会凭英文微调自动得到验证。

## 4. 先做流程测试，再做正式 LoRA

原创测试样例只能检查软件流程。其分数没有科学意义，不要与 PubMedQA 指标混报。

```bash
python scripts/train_lora.py \
  --model-revision "$MODEL_REVISION" \
  --train data/smoke_train.jsonl \
  --validation data/smoke_validation.jsonl \
  --max-steps 5 --out runs/smoke-only

python scripts/train_lora.py \
  --model-revision "$MODEL_REVISION" \
  --out runs/qwen3-8b-lora
```

默认：BF16、LoRA rank 16 / alpha 32、所有线性层、dropout 0.05、最大长度 4096、micro-batch 2、梯度累积 8、学习率 1e-4、最多 3 epoch。它们是起跑配置，不是经过你的数据验证的最优值。只有 assistant 目标及结束符计算 loss；prompt 与 padding 均忽略。

模型基座被冻结，保存的是适配器。按验证集 completion loss 选 checkpoint；真正的任务效果还需独立评估，不能仅看 loss。超过长度的记录显式报错，避免截掉关键证据后继续训练。

## 5. 评估并比较

```bash
python scripts/evaluate_llm.py \
  --adapter runs/qwen3-8b-lora \
  --data data/pubmedqa/validation.jsonl \
  --out runs/lora-validation

python scripts/compare_runs.py \
  --baseline runs/base-validation/predictions.jsonl \
  --candidate runs/lora-validation/predictions.jsonl \
  --out runs/paired-validation-comparison.json
```

输出 Accuracy、Macro-F1、各类表现、混淆矩阵、非法 JSON 比率、逐题原始回答和准确率 Wilson 区间。非法输出统一计错，不被当作 `maybe`；不从长解释中用正则“捞出”一个标签。配对区间用于描述差异，不替代多重试验控制。50 条验证集只适合入门，正式研究应采用更充分的开发评估。

模型和超参数选定后才解封官方测试集：

```bash
python scripts/evaluate_llm.py \
  --model-revision "$MODEL_REVISION" \
  --data data/pubmedqa/test.inputs.jsonl \
  --labels data/pubmedqa/test.labels.jsonl \
  --final-test-confirm --out runs/base-final-test

python scripts/evaluate_llm.py \
  --adapter runs/qwen3-8b-lora \
  --data data/pubmedqa/test.inputs.jsonl \
  --labels data/pubmedqa/test.labels.jsonl \
  --final-test-confirm --out runs/lora-final-test
```

公有基准可能已出现在基座模型的预训练资料中；训练/测试去重不能证明“模型从未见过这些题”。不要因此宣称发现了新的生物学知识或临床有效性。

## 6. QLoRA 与规模扩展

```bash
python scripts/train_lora.py --qlora \
  --model-revision "$MODEL_REVISION" --out runs/qwen3-8b-qlora
python scripts/evaluate_llm.py --qlora \
  --model-revision "$MODEL_REVISION" --out runs/base-nf4-validation
python scripts/evaluate_llm.py --qlora \
  --adapter runs/qwen3-8b-qlora --out runs/qlora-validation
```

QLoRA 训练冻结的 NF4 量化基座上的 LoRA 参数；不是把所有参数都以 4-bit 更新。比较时要把量化基座的影响与微调的影响分开。先不要合并量化适配器或引入 FP8 / 自定义 attention kernel，让第一组结果更容易解释。

多卡可以先做并行随机种子实验；需要 DDP 时，本包 BF16 路径示例为：

```bash
torchrun --standalone --nproc_per_node=2 scripts/train_lora.py \
  --model-revision "$MODEL_REVISION" --grad-accum 4 --out runs/lora-ddp2
```

这里保持有效 batch 为 2×4×2=16。DDP 每卡保留一份模型，不会自动把显存合并成一张大卡。本包没有实现 FSDP / ZeRO 配置；QLoRA 路径明确限单卡。

扩充弱标注数据是选修，不是默认依赖：

```bash
python scripts/prepare_pubmedqa.py --artificial 10000
python scripts/train_lora.py \
  --model-revision "$MODEL_REVISION" \
  --train data/pubmedqa/artificial_train.jsonl \
  --epochs 1 --out runs/weak-stage
python scripts/train_lora.py \
  --model-revision "$MODEL_REVISION" \
  --base-adapter runs/weak-stage --lr 5e-5 \
  --out runs/weak-then-expert
```

弱标注阶段排除全部 PQA-L 的 PMID、标准化问题和上下文精确重复，并记录 HF 数据集 commit。它不执行语义近重复检测；相关论文/改写题仍需额外审核。先弱标注训练、后专家数据训练，与“仅专家数据”做消融。不能把人工生成标签冒充人工专家标签。

## 7. 生物序列实训

```bash
python scripts/prepare_fluorescence.py

python scripts/train_protein.py --mode head --out runs/esm2-gfp-head
python scripts/train_protein.py --mode full --out runs/esm2-gfp-full

# 只有模型选择完成后，才对选中的 checkpoint 做最终测试：
python scripts/train_protein.py --evaluate-test-only \
  --checkpoint runs/esm2-gfp-full --out runs/esm2-gfp-final-test
```

任务是输入氨基酸序列，回归 TAPE 的 `log_fluorescence`。不是自然语言聊天，也不是蛋白质结构预测。保留原始 train/valid/test；不要把同一蛋白的近邻突变体全部混合后随机切分。标签标准化仅用训练集统计，评估还原至原始 log 尺度，报告 Spearman、RMSE、MAE。

默认 35M 是为了观察数据与训练差异，不是为了占满 H200。确认流程后再考虑 ESM-2 650M，以及家族隔离、外部数据和预训练污染检查。

## 8. 交付一份合格实验记录

保留：模型与数据版本、来源和许可、数据哈希、切分、prompt、随机种子、环境、配置、验证过程、最终测试输出、峰值显存、错误案例与局限。至少比较原模型/多数类/BF16 LoRA；性能没有提高也应如实记录并分析，不以“必须超过基线”鼓励挑选测试集结果。

更深入的逐课说明、BioRED 扩展和评分标准见 `docs/COURSE_ZH.md`。
