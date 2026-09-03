#!/usr/bin/env python3
"""Verify the Week 1 Python environment / 检查第一周 Python 环境。"""

from __future__ import annotations

import argparse
import importlib
import importlib.metadata
import platform
import shutil
import tempfile
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", choices=["zh", "en"], default="zh")
    args = parser.parse_args()
    zh = args.lang == "zh"
    say = lambda cn, en: print(cn if zh else en)

    say("Virtual Cell 第一周环境检查", "Virtual Cell Week 1 environment check")
    print(f"Python: {platform.python_version()}")
    major, minor = map(int, platform.python_version_tuple()[:2])
    if not ((major, minor) >= (3, 11) and (major, minor) < (3, 13)):
        raise SystemExit("需要 Python 3.11/3.12 / Python 3.11 or 3.12 is required")

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
    loaded = {}
    for module_name, label in modules.items():
        module = importlib.import_module(module_name)
        loaded[module_name] = module
        print(f"[OK] {label}: {importlib.metadata.version(label)}")

    import numpy as np
    import pandas as pd
    from scipy import sparse
    import anndata as ad

    X = sparse.csr_matrix(np.array([[1, 0, 2], [0, 3, 1]], dtype=np.int32))
    probe = ad.AnnData(X=X, obs=pd.DataFrame(index=["c1", "c2"]), var=pd.DataFrame(index=["g1", "g2", "g3"]))
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "roundtrip.h5ad"
        probe.write_h5ad(path)
        restored = ad.read_h5ad(path)
        assert restored.shape == (2, 3)
        assert sparse.issparse(restored.X)
        assert int(restored.X.sum()) == 7
    say("[OK] AnnData 稀疏矩阵写入/读取测试通过。", "[OK] AnnData sparse round-trip passed.")

    if shutil.which("vcc"):
        say("[OK] 已找到 vcc 命令。", "[OK] vcc command found.")
    else:
        say("[WARN] 未找到 vcc；运行：uv tool install vcc-cli", "[WARN] vcc not found; run: uv tool install vcc-cli")

    say("环境检查完成。", "Environment check complete.")


if __name__ == "__main__":
    main()
