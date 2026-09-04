#!/usr/bin/env bash
# Rebuild every Week 1 artifact after source changes and execute the teacher lab.
# 修改源码后，重新生成第一周全部产物并执行教师 notebook。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# 1. Record versions and verify sparse AnnData round-trip behavior.
uv run python scripts/check_environment.py --lang en

# 2. Recreate deterministic raw counts instead of reusing stale output.
uv run python scripts/make_toy_perturbseq.py --seed 2026

# 3. Audit the documented counts layer and write descriptive QC output.
uv run python scripts/inspect_h5ad.py data/week01_toy_perturbseq.h5ad --layer counts
uv run python scripts/qc_report.py \
  data/week01_toy_perturbseq.h5ad \
  --counts-layer counts \
  --output outputs/week01_qc.csv

# 4. Aggregate at donor × cell type × perturbation and verify conservation.
uv run python scripts/pseudobulk.py \
  data/week01_toy_perturbseq.h5ad \
  --output outputs/week01_pseudobulk.h5ad

# 5. Check invariants before running the notebook as a fresh-kernel test.
uv run pytest
uv run jupyter nbconvert \
  --to notebook \
  --execute notebooks/week01_teacher.ipynb \
  --output week01_teacher.executed.ipynb \
  --output-dir outputs \
  --ExecutePreprocessor.timeout=180

printf '%s\n' "All Week 1 checks passed / 第一周全部检查通过。"
