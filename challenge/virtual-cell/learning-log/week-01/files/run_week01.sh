#!/usr/bin/env bash
set -euo pipefail

# Rebuild all Week 1 artifacts / 重新生成第一周全部产物
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

uv run python scripts/check_environment.py --lang en
uv run python scripts/make_toy_perturbseq.py --seed 2026
uv run python scripts/inspect_h5ad.py data/week01_toy_perturbseq.h5ad
uv run python scripts/qc_report.py data/week01_toy_perturbseq.h5ad --output outputs/week01_qc.csv
uv run python scripts/pseudobulk.py data/week01_toy_perturbseq.h5ad --output outputs/week01_pseudobulk.h5ad
uv run pytest
uv run jupyter nbconvert --to notebook --execute notebooks/week01_teacher.ipynb --output week01_teacher.executed.ipynb --output-dir outputs --ExecutePreprocessor.timeout=180

printf '%s\n' "All Week 1 checks passed / 第一周全部检查通过。"
