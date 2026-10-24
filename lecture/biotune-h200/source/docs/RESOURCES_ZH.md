# 官方资料与阅读顺序

检索/核验日期：2026-10-24。优先采用原作者、模型发布者、软件维护者和数据提供机构的资料。代码使用固定教学基线，文档的 `main` 页面可能随时间变化，复现时应对照所装版本。

| 编号 | 资料与入口 | 本课程读什么 |
|---|---|---|
| R01 | NVIDIA H200：https://www.nvidia.com/en-us/data-center/h200/ | 141 GB HBM3e 规格；这是整卡标称值，不代替实际容器/MIG 可见显存 |
| R02 | PyTorch 安装：https://pytorch.org/get-started/locally/ | 选择与驱动兼容的 CUDA wheel 或管理员提供的环境，不盲装 CPU 版 |
| R03 | Hugging Face LLM Course 第 11 章：https://huggingface.co/learn/llm-course/chapter11/1 | Chat template、SFT、LoRA、评估，按课程顺序阅读 |
| R04 | Transformers 训练指南：https://huggingface.co/docs/transformers/en/training | Trainer、TrainingArguments、数据处理和训练过程 |
| R05 | TRL SFTTrainer：https://huggingface.co/docs/trl/sft_trainer | prompt/completion 数据和 completion-only loss；本包主脚本使用显式 labels 的 Transformers Trainer，而非依赖易变化的 TRL 参数 |
| R06 | PEFT 量化指南：https://huggingface.co/docs/peft/developer_guides/quantization | NF4、prepare_model_for_kbit_training、量化基座与可训练适配器 |
| R07 | LoRA 原论文：https://arxiv.org/abs/2106.09685 | 冻结权重、低秩更新、可训练参数规模；不用一开始推完全部公式 |
| R08 | QLoRA 原论文：https://arxiv.org/abs/2305.14314 | 4-bit 基座、NF4、double quantization；区分存储精度与计算/训练精度 |
| R09 | Qwen3-8B 官方模型卡：https://huggingface.co/Qwen/Qwen3-8B | 架构与许可、chat template、`enable_thinking=False`；本课程不声称它是当前最新或最强模型 |
| R10 | PubMedQA 原作者仓库：https://github.com/pubmedqa/pubmedqa | 数据下载、测试标签、官方切分与评估 |
| R11 | PubMedQA 项目页：https://pubmedqa.github.io/ | 1k 专家、61.2k 未标注、211.3k 人工构造实例的区别 |
| R12 | PubMedQA 原论文：https://aclanthology.org/D19-1259/ | 文献问题、去掉结论的摘要上下文、yes/no/maybe 任务定义 |
| R13 | PubMedQA HF 数据卡：https://huggingface.co/datasets/qiaojin/PubMedQA | 数据配置与官方测试集说明；HF 上 1,000 条不能全当训练集 |
| R14 | BioRED NCBI 仓库：https://github.com/ncbi/BioRED | 600 篇摘要上的实体、关系与新颖性标注，按文档分割 |
| R15 | BioRED 数据：https://ftp.ncbi.nlm.nih.gov/pub/lu/BioRED/BIORED.zip | 扩展任务下载入口；先阅读标注指南并独立核查使用条件 |
| R16 | ESM 官方文档（固定版本）：https://huggingface.co/docs/transformers/v4.56.2/en/model_doc/esm | 氨基酸 tokenizer、EsmForSequenceClassification、回归任务 |
| R17 | ESM-2 35M 模型卡：https://huggingface.co/facebook/esm2_t12_35M_UR50D | 序列掩码预训练模型及适合的下游任务；ESM-2 本体不等于带折叠头的 ESMFold |
| R18 | TAPE 原作者仓库：https://github.com/songlab-cal/tape | 原始数据 split、JSON 下载入口、基准与引用要求；不要复用其不再维护的旧训练环境 |
| R19 | TAPE 原论文：https://arxiv.org/abs/1906.08230 | 蛋白质表征评估、不同于简单随机切分的泛化问题 |
| R20 | TAPE 原始 JSON 数据：https://s3.amazonaws.com/songlabdata/proteindata/data_raw_pytorch/fluorescence.tar.gz | GFP 荧光数据；本包读取 JSON，不反序列化第三方 pickle |
| R21 | PMC OA 使用说明：https://pmc.ncbi.nlm.nih.gov/tools/openftlist/ | 并非全部 PMC 可随意复用；逐篇许可不同，自动获取方式有要求 |
| R22 | PubMed 帮助：https://pubmed.ncbi.nlm.nih.gov/help/ | PubMed 数据访问与使用说明 |
| R23 | PubMedQA 仓库许可：https://github.com/pubmedqa/pubmedqa/blob/master/LICENSE | 仓库 MIT 许可；不得自动扩大解释为所有第三方文献版权均已清除 |
| R24 | PEFT v0.17.1：https://github.com/huggingface/peft/releases/tag/v0.17.1 | 教学基线版本及其修复说明 |
| R25 | Accelerate v1.10.1：https://github.com/huggingface/accelerate/releases/tag/v1.10.1 | 教学基线版本；与 GPU 驱动版本是不同层面的兼容问题 |

## 建议阅读路径

入门先读 R03 → R09 → R10/R12 → R07/R06。做完第一组基线和 LoRA 后再读 R08。走序列路线再读 R16/R17/R18/R19。准备真实文献扩展语料时读 R21/R22；不要把“公开网页可读”当作“所有用途都获许可”。

## 本包使用的源文件身份

PubMedQA 原始文件来源以主分支 URL 获取，但使用已核验的 Git blob SHA 检查字节内容：

```text
data/ori_pqal.json
  Git blob SHA-1: 38db7750761c78950ed32303e7545bdaa513390c
  repository-reported bytes: 2584787

data/test_ground_truth.json
  Git blob SHA-1: 825bf8f262c3cca0e3bd1c6f38eecf5e581b0659
  repository-reported bytes: 11414
```

这是文件版本标识，不是代码运行或标签质量证明。每次成功下载还记录 SHA-256。TAPE 压缩包在本环境未下载，因此没有虚构其 SHA-256；脚本在用户端成功获取后生成记录。
