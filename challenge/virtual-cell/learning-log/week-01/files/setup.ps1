$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Virtual Cell Week 1 setup / Virtual Cell 第一周环境安装
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
  Write-Error "uv is required / 需要先安装 uv: https://docs.astral.sh/uv/getting-started/installation/"
}

uv sync
if (Get-Command vcc -ErrorAction SilentlyContinue) {
  uv tool upgrade vcc-cli
} else {
  uv tool install vcc-cli
}

uv run python scripts/check_environment.py --lang zh
uv run python scripts/make_toy_perturbseq.py
uv run python scripts/inspect_h5ad.py data/week01_toy_perturbseq.h5ad
uv run python scripts/qc_report.py data/week01_toy_perturbseq.h5ad
uv run python scripts/pseudobulk.py data/week01_toy_perturbseq.h5ad
uv run pytest

Write-Host "Setup complete / 环境与示例数据准备完成。"
Write-Host "Start Jupyter / 启动 Jupyter: uv run jupyter lab"
