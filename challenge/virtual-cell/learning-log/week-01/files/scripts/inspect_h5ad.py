#!/usr/bin/env python3
"""Inspect an .h5ad without densifying its expression matrix.

在不把表达矩阵转成 dense 的前提下检查 .h5ad。
"""

from __future__ import annotations

import argparse
from pathlib import Path

import anndata as ad
import numpy as np
from scipy import sparse


def summarize(path: Path) -> dict[str, object]:
    adata = ad.read_h5ad(path)
    X = adata.X
    values = X.data if sparse.issparse(X) else np.asarray(X).ravel()
    totals = np.asarray(X.sum(axis=1)).ravel()
    detected = X.getnnz(axis=1) if sparse.issparse(X) else np.count_nonzero(X, axis=1)
    finite = bool(np.isfinite(values).all())
    nonnegative = bool((values >= 0).all()) if values.size else True
    integer_like = bool(np.allclose(values, np.rint(values), atol=1e-6)) if values.size else True

    return {
        "path": str(path),
        "cells": adata.n_obs,
        "genes": adata.n_vars,
        "matrix_type": type(X).__name__,
        "sparse": sparse.issparse(X),
        "dtype": str(X.dtype),
        "finite": finite,
        "nonnegative": nonnegative,
        "integer_like": integer_like,
        "median_library_size": float(np.median(totals)),
        "median_detected_genes": float(np.median(detected)),
        "obs_columns": list(map(str, adata.obs.columns)),
        "var_columns": list(map(str, adata.var.columns)),
        "layers": list(map(str, adata.layers.keys())),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    result = summarize(args.path)

    labels = {
        "path": "File / 文件",
        "cells": "Cells / 细胞数",
        "genes": "Genes / 基因数",
        "matrix_type": "Matrix type / 矩阵类型",
        "sparse": "Sparse / 是否稀疏",
        "dtype": "Dtype / 数据类型",
        "finite": "Finite / 是否有限",
        "nonnegative": "Non-negative / 是否非负",
        "integer_like": "Integer-like / 是否为整数",
        "median_library_size": "Median library size / 中位总 counts",
        "median_detected_genes": "Median detected genes / 中位检出基因数",
        "obs_columns": "obs columns / 细胞元数据列",
        "var_columns": "var columns / 基因元数据列",
        "layers": "Layers / 数据层",
    }
    print("\nAnnData inspection / AnnData 检查")
    print("=" * 54)
    for key, value in result.items():
        print(f"{labels[key]:42s} {value}")

    if not (result["finite"] and result["nonnegative"] and result["integer_like"]):
        raise SystemExit("Count checks failed / counts 检查未通过")


if __name__ == "__main__":
    main()
