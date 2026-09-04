#!/usr/bin/env python3
"""Verify the complete Week 1 runtime with one small end-to-end smoke test.

验证第一周运行环境，并用一个小型端到端 smoke test 检查关键能力。

This script checks more than "can Python import the package?" It verifies:
1. the supported Python version;
2. the installed distribution versions;
3. sparse AnnData write/read behavior;
4. whether the official ``vcc`` command is available.

本脚本不只检查“能否 import”：它还检查 Python 版本、包版本、稀疏 AnnData
写入/读取，以及官方 ``vcc`` 命令是否可用。
"""

from __future__ import annotations

import argparse
import importlib
import importlib.metadata
import platform
import shutil
import tempfile
from pathlib import Path

# The toy-data generator uses this seed by default. Reporting it next to package
# versions makes the environment report sufficient for reproducing Week 1 output.
# Toy 数据生成器默认使用该随机种子；和包版本一起报告，便于复现实验。
COURSE_SEED = 2026


def main() -> None:
    """Run all environment checks and exit nonzero when a hard check fails."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lang", choices=["zh", "en"], default="zh")
    args = parser.parse_args()
    zh = args.lang == "zh"

    # Keep console messages bilingual without duplicating the checking logic.
    # 用一个小函数切换输出语言，避免复制两套检查逻辑。
    def say(cn: str, en: str) -> None:
        print(cn if zh else en)

    say("Virtual Cell 第一周环境检查", "Virtual Cell Week 1 environment check")
    print(f"Python: {platform.python_version()}")
    print(f"Course seed / 课程随机种子: {COURSE_SEED}")

    # Python 3.11/3.12 is intentionally pinned because scientific packages and
    # the official tools may not support the newest interpreter immediately.
    # 固定 3.11/3.12，避免科学计算包尚未兼容最新解释器。
    major, minor = map(int, platform.python_version_tuple()[:2])
    if not ((major, minor) >= (3, 11) and (major, minor) < (3, 13)):
        raise SystemExit("需要 Python 3.11/3.12 / Python 3.11 or 3.12 is required")

    # Import names and distribution names sometimes differ. For example, code
    # imports ``sklearn`` but package metadata calls it ``scikit-learn``.
    # import 名与安装包名可能不同，例如 sklearn / scikit-learn。
    modules = {
        "numpy": "numpy",
        "pandas": "pandas",
        "scipy": "scipy",
        "anndata": "anndata",
        "scanpy": "scanpy",
        "sklearn": "scikit-learn",
        "matplotlib": "matplotlib",
        "cell_eval2": "cell-eval2",
    }
    for module_name, distribution_name in modules.items():
        importlib.import_module(module_name)
        version = importlib.metadata.version(distribution_name)
        print(f"[OK] {distribution_name}: {version}")

    # Imports stay inside main so an early version failure gives a clearer error.
    import anndata as ad
    import numpy as np
    import pandas as pd
    from scipy import sparse

    # A round-trip test verifies that the HDF5 stack can preserve a sparse,
    # integer matrix—not merely that ``anndata`` imports successfully.
    # round-trip 检查稀疏整数矩阵能否真正写入并恢复，而不只是能否 import。
    X = sparse.csr_matrix(np.array([[1, 0, 2], [0, 3, 1]], dtype=np.int32))
    probe = ad.AnnData(
        X=X,
        obs=pd.DataFrame(index=["c1", "c2"]),
        var=pd.DataFrame(index=["g1", "g2", "g3"]),
    )
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "roundtrip.h5ad"
        probe.write_h5ad(path)
        restored = ad.read_h5ad(path)
        if restored.shape != (2, 3):
            raise RuntimeError("AnnData shape changed during round-trip / AnnData 形状在读写后改变")
        if not sparse.issparse(restored.X):
            raise RuntimeError("Sparse matrix became dense / 稀疏矩阵在读写后变成 dense")
        if int(restored.X.sum()) != 7:
            raise RuntimeError("Counts changed during round-trip / counts 在读写后改变")
    say("[OK] AnnData 稀疏矩阵写入/读取测试通过。", "[OK] AnnData sparse round-trip passed.")

    # vcc-cli is installed as an isolated uv tool, so it is checked through PATH
    # rather than imported into the course environment.
    # vcc-cli 是独立 uv tool，因此通过 PATH 检查，而不是在环境中 import。
    if shutil.which("vcc"):
        say("[OK] 已找到 vcc 命令。", "[OK] vcc command found.")
    else:
        say("[WARN] 未找到 vcc；运行：uv tool install vcc-cli", "[WARN] vcc not found; run: uv tool install vcc-cli")

    say("环境检查完成。", "Environment check complete.")


if __name__ == "__main__":
    main()
