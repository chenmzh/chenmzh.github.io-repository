# Virtual Cell Challenge 第一周教学包

## 本周主题

**从零搭环境，并学会正确阅读单细胞扰动数据。**

本周不训练复杂模型。目标是建立四个不会在后续比赛中返工的基础：

1. 区分 raw counts、normalized expression 和 log-transformed expression；
2. 安全操作 AnnData 与稀疏矩阵；
3. 识别 control、perturbation、cell type、donor、batch 和 replicate；
4. 按独立生物重复生成 pseudobulk，而不是把每个细胞当作独立重复。

## 快速开始

### macOS / Linux

```bash
cd files
bash setup.sh
uv run jupyter lab
```

### Windows PowerShell

```powershell
cd files
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
uv run jupyter lab
```

如果尚未安装 `uv`，先参考 <https://docs.astral.sh/uv/getting-started/installation/>。环境固定在 Python 3.11/3.12；`vcc-cli` 作为独立命令行工具安装。

## setup.sh 会做什么

1. 根据 `pyproject.toml` 创建 `.venv`；
2. 安装 AnnData、Scanpy、cell-eval2、Jupyter 和测试依赖；
3. 安装或更新 `vcc-cli`；
4. 运行环境 smoke test；
5. 生成教学用 toy Perturb-seq 数据；
6. 输出数据审计、QC 和 pseudobulk 文件；
7. 运行自动测试。

## 数据契约

`data/week01_toy_perturbseq.h5ad` 是合成教学数据，不是官方比赛数据。

- 2,400 cells；500 genes；
- 1 个 control + 3 个 perturbations；
- 2 个 cell types；3 个 donors；2 个 batches；
- `X` 与 `layers["counts"]` 都是 CSR 稀疏、非负整数 raw counts；
- `obs` 保存实验设计与 QC 字段；
- `var` 保存基因注释；
- `uns["ground_truth_log2fc"]` 保存教学用真实效应。

数据故意包含两个透明的教学陷阱：`donor_3` 与 `batch_2` 混杂；约 3% 细胞具有低 library size 和升高的线粒体比例。

## 五天安排

- Day 1：环境、比赛地图、最少细胞生物学；
- Day 2：AnnData、raw counts、sparse matrix；
- Day 3：实验设计与基础 QC；
- Day 4：按 donor × cell type × condition 做 pseudobulk；
- Day 5：从 fresh kernel 完成端到端小项目与短测。

## 文件说明

- `scripts/check_environment.py`：检查 Python、依赖、AnnData 稀疏读写和 vcc CLI；
- `scripts/make_toy_perturbseq.py`：生成可复现教学数据，并逐步注释统计假设；
- `scripts/inspect_h5ad.py`：不 densify 地审计 `.h5ad` 与 counts 证据；
- `scripts/qc_report.py`：从指定 counts layer 输出分组 QC 与 IQR；
- `scripts/pseudobulk.py`：验证 raw counts 后按独立重复求和，并检查逐基因守恒；
- `notebooks/week01_student.ipynb`：学生版实验；
- `notebooks/week01_teacher.ipynb`：教师版完整示范；
- `exercises/practice.zh-CN.md` 与 `practice.en.md`：练习和可折叠参考答案合并版；
- `tests/test_week01.py`：自动验收。

## 通过标准

总分建议达到 80%，并满足以下硬性条件：

- 不混淆 raw counts 与 normalized/log 数据；
- 不把细胞当独立生物重复；
- 不对完整稀疏矩阵调用 `.toarray()`；
- notebook 能从 fresh kernel 顺序运行；
- 能提出一种 group-aware validation split。
