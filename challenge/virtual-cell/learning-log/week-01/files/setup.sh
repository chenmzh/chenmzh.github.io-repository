#!/usr/bin/env bash
set -euo pipefail

# Virtual Cell Week 1 setup / Virtual Cell 第一周环境安装
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required / 需要先安装 uv: https://docs.astral.sh/uv/getting-started/installation/"
  exit 1
fi

uv sync
if command -v vcc >/dev/null 2>&1; then
  uv tool upgrade vcc-cli || true
else
  uv tool install vcc-cli
fi

uv run python scripts/check_environment.py --lang zh
uv run python scripts/make_toy_perturbseq.py
uv run python scripts/inspect_h5ad.py data/week01_toy_perturbseq.h5ad
uv run python scripts/qc_report.py data/week01_toy_perturbseq.h5ad
uv run python scripts/pseudobulk.py data/week01_toy_perturbseq.h5ad
uv run pytest

echo
printf '%s\n' "Setup complete / 环境与示例数据准备完成。" \
  "Start Jupyter / 启动 Jupyter: uv run jupyter lab"
