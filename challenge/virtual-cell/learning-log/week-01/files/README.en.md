# Virtual Cell Challenge — Week 1 Teaching Pack

## Theme

**Build the environment from scratch and learn to read perturbational single-cell data correctly.**

This week does not train a complex model. It establishes four foundations that should not need to be rebuilt later:

1. distinguish raw counts, normalized expression, and log-transformed expression;
2. operate on AnnData and sparse matrices safely;
3. identify controls, perturbations, cell types, donors, batches, and replicates;
4. create pseudobulk samples at the independent biological-replicate level instead of treating every cell as an independent replicate.

## Quick start

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

If `uv` is not installed, follow <https://docs.astral.sh/uv/getting-started/installation/> first. The environment targets Python 3.11/3.12; `vcc-cli` is installed as a separate command-line tool.

## What setup.sh does

1. creates `.venv` from `pyproject.toml`;
2. installs AnnData, Scanpy, cell-eval2, Jupyter, and test dependencies;
3. installs or updates `vcc-cli`;
4. runs an environment smoke test;
5. generates the toy Perturb-seq dataset;
6. writes data-audit, QC, and pseudobulk artifacts;
7. runs the automated tests.

## Data contract

`data/week01_toy_perturbseq.h5ad` is synthetic teaching data, not official challenge data.

- 2,400 cells and 500 genes;
- one control and three perturbations;
- two cell types, three donors, and two batches;
- `X` and `layers["counts"]` contain CSR sparse, non-negative integer raw counts;
- `obs` stores experimental-design and QC fields;
- `var` stores gene annotations;
- `uns["ground_truth_log2fc"]` stores teaching ground truth.

The dataset contains two explicit teaching traps: `donor_3` is confounded with `batch_2`, and roughly 3% of cells have low library sizes with elevated mitochondrial fractions.

## Five-day plan

- Day 1: environment, challenge map, and minimum viable cell biology;
- Day 2: AnnData, raw counts, and sparse matrices;
- Day 3: experimental design and basic QC;
- Day 4: pseudobulk by donor × cell type × condition;
- Day 5: fresh-kernel end-to-end mini-project and assessment.

## Files

- `scripts/check_environment.py`: checks Python, dependencies, AnnData round-trip, and the vcc CLI;
- `scripts/make_toy_perturbseq.py`: generates reproducible teaching data;
- `scripts/inspect_h5ad.py`: audits `.h5ad` without densifying;
- `scripts/qc_report.py`: writes per-perturbation QC summaries;
- `scripts/pseudobulk.py`: sums at the replicate level and checks count conservation;
- `notebooks/week01_student.ipynb`: student lab;
- `notebooks/week01_teacher.ipynb`: complete instructor walkthrough;
- `exercises/`: bilingual exercises and solutions;
- `tests/test_week01.py`: automated acceptance tests.

## Passing criteria

A suggested overall score is at least 80%, with all hard requirements below:

- do not confuse raw counts with normalized/log data;
- do not treat cells as independent biological replicates;
- do not call `.toarray()` on the complete sparse matrix;
- rerun the notebook from a fresh kernel;
- propose a group-aware validation split.
