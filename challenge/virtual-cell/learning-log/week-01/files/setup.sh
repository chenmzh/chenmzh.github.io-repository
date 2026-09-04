#!/usr/bin/env bash
# Build the complete isolated Week 1 environment and verify every teaching step.
# 创建第一周隔离环境，并逐步验证教学流程。
set -euo pipefail

# Resolve paths from this script instead of assuming the learner's current
# directory. 这样从任意目录运行 setup.sh 都会进入正确课程目录。
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# uv manages the project environment and lockfile without modifying the global
# Python installation. uv 只管理项目环境，不污染系统 Python。
if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required / 需要先安装 uv: https://docs.astral.sh/uv/getting-started/installation/"
  exit 1
fi

echo "[1/7] Syncing locked Python environment / 同步锁定的 Python 环境"
uv sync

# vcc-cli is an application, not a library imported by the notebooks. Installing
# it as an isolated uv tool prevents dependency conflicts with the course env.
# vcc-cli 作为独立工具安装，避免与课程 Python 依赖冲突。
echo "[2/7] Installing official VCC CLI / 安装官方 VCC CLI"
if command -v vcc >/dev/null 2>&1; then
  uv tool upgrade vcc-cli || true
else
  uv tool install vcc-cli
fi

echo "[3/7] Checking interpreter, packages, and sparse I/O / 检查环境与稀疏读写"
uv run python scripts/check_environment.py --lang zh

# Regenerate from a fixed seed so every learner starts from identical toy data.
echo "[4/7] Generating reproducible toy Perturb-seq / 生成可复现教学数据"
uv run python scripts/make_toy_perturbseq.py --seed 2026

echo "[5/7] Auditing counts and QC / 审计 counts 与 QC"
uv run python scripts/inspect_h5ad.py data/week01_toy_perturbseq.h5ad --layer counts
uv run python scripts/qc_report.py data/week01_toy_perturbseq.h5ad --counts-layer counts

echo "[6/7] Building replicate-aware pseudobulk / 生成包含重复层级的 pseudobulk"
uv run python scripts/pseudobulk.py data/week01_toy_perturbseq.h5ad

echo "[7/7] Running automated invariants / 运行自动不变量测试"
uv run pytest

echo
printf '%s\n' "Setup complete / 环境与示例数据准备完成。" \
  "Start Jupyter / 启动 Jupyter: uv run jupyter lab"
