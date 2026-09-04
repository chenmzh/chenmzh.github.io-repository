# Build and verify the complete isolated Week 1 environment on Windows.
# 在 Windows 上创建并验证第一周隔离环境。
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# uv owns the project-local .venv and leaves the global Python installation
# untouched. uv 仅管理本项目 .venv，不污染系统 Python。
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
  Write-Error "uv is required / 需要先安装 uv: https://docs.astral.sh/uv/getting-started/installation/"
}

Write-Host "[1/7] Syncing locked Python environment / 同步锁定环境"
uv sync

# Keep the VCC application isolated from notebook/library dependencies.
Write-Host "[2/7] Installing official VCC CLI / 安装官方 VCC CLI"
if (Get-Command vcc -ErrorAction SilentlyContinue) {
  uv tool upgrade vcc-cli
} else {
  uv tool install vcc-cli
}

Write-Host "[3/7] Checking environment and sparse I/O / 检查环境与稀疏读写"
uv run python scripts/check_environment.py --lang zh

# A fixed seed makes the teaching dataset reproducible across machines.
Write-Host "[4/7] Generating reproducible toy data / 生成可复现教学数据"
uv run python scripts/make_toy_perturbseq.py --seed 2026

Write-Host "[5/7] Auditing counts and QC / 审计 counts 与 QC"
uv run python scripts/inspect_h5ad.py data/week01_toy_perturbseq.h5ad --layer counts
uv run python scripts/qc_report.py data/week01_toy_perturbseq.h5ad --counts-layer counts

Write-Host "[6/7] Building replicate-aware pseudobulk / 生成 pseudobulk"
uv run python scripts/pseudobulk.py data/week01_toy_perturbseq.h5ad

Write-Host "[7/7] Running automated invariants / 运行自动测试"
uv run pytest

Write-Host "Setup complete / 环境与示例数据准备完成。"
Write-Host "Start Jupyter / 启动 Jupyter: uv run jupyter lab"
