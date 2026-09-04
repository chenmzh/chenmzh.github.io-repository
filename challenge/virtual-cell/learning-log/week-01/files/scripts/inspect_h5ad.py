#!/usr/bin/env python3
"""Audit an .h5ad matrix without densifying the full expression matrix.

在不把完整表达矩阵转成 dense 的前提下审计 .h5ad。

Numerical checks provide evidence about matrix semantics, but they do not prove
provenance. Always combine this report with the dataset documentation.
数值检查只能提供矩阵语义的证据，不能替代数据来源和处理文档。
"""

from __future__ import annotations

import argparse
from pathlib import Path

import anndata as ad
import numpy as np
from scipy import sparse


def summarize(path: Path, layer: str | None = None) -> dict[str, object]:
    """Return a sparse-safe audit summary for ``X`` or one named layer.

    Parameters
    ----------
    path:
        Input AnnData file.
    layer:
        ``None`` audits ``adata.X``; otherwise audit ``adata.layers[layer]``.

    Notes
    -----
    Non-negative, integer-like values are consistent with raw counts, but are
    not sufficient proof that no normalization or rounding occurred.
    非负、近似整数与 raw counts 一致，但不能单独证明数据从未被处理。
    """
    adata = ad.read_h5ad(path)

    # ``X`` has no universal semantics. A named counts layer is often safer when
    # the data contract explicitly documents it.
    # ``X`` 没有固定语义；若数据契约明确指定 counts layer，应优先检查该层。
    if layer is None:
        X = adata.X
        matrix_source = "X"
    else:
        if layer not in adata.layers:
            raise KeyError(f"Missing layer / 缺少数据层: {layer}")
        X = adata.layers[layer]
        matrix_source = f"layers[{layer!r}]"

    if sparse.issparse(X):
        # Sparse ``.data`` stores only explicit entries. Implicit zeros are not
        # present there. Explicitly stored zeros can make getnnz misleading, so
        # audit and remove them in a copy before computing detected genes.
        # ``.data`` 只含显式值；先在副本中消除显式 0，再统计检出基因数。
        explicit_zero_count = int(np.count_nonzero(X.data == 0))
        clean_X = sparse.csr_matrix(X, copy=True)
        clean_X.eliminate_zeros()
        values = clean_X.data
        detected = clean_X.getnnz(axis=1)
        totals = np.asarray(clean_X.sum(axis=1)).ravel()
        matrix_for_stats = clean_X
    else:
        matrix_for_stats = np.asarray(X)
        explicit_zero_count = 0
        values = matrix_for_stats.ravel()
        detected = np.count_nonzero(matrix_for_stats, axis=1)
        totals = np.asarray(matrix_for_stats.sum(axis=1)).ravel()

    # Only small one-dimensional summaries become dense here. The cells × genes
    # matrix remains sparse throughout the audit.
    # 这里只 densify 行汇总向量，不会展开 cells × genes 完整矩阵。
    finite = bool(np.isfinite(values).all())
    nonnegative = bool((values >= 0).all()) if values.size else True
    integer_like = bool(np.allclose(values, np.rint(values), atol=1e-6)) if values.size else True

    return {
        "path": str(path),
        "matrix_source": matrix_source,
        "cells": adata.n_obs,
        "genes": adata.n_vars,
        "matrix_type": type(X).__name__,
        "sparse": sparse.issparse(X),
        "dtype": str(X.dtype),
        "finite": finite,
        "nonnegative": nonnegative,
        "integer_like": integer_like,
        "explicit_stored_zeros": explicit_zero_count,
        "median_library_size": float(np.median(totals)),
        "median_detected_genes": float(np.median(detected)),
        "stored_entries": int(matrix_for_stats.nnz) if sparse.issparse(matrix_for_stats) else int(matrix_for_stats.size),
        "obs_columns": list(map(str, adata.obs.columns)),
        "var_columns": list(map(str, adata.var.columns)),
        "layers": list(map(str, adata.layers.keys())),
    }


def main() -> None:
    """Parse CLI arguments, print the audit, and fail on invalid count values."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="Input .h5ad / 输入 .h5ad")
    parser.add_argument("--layer", help="Audit a named layer instead of X / 检查指定 layer")
    args = parser.parse_args()
    result = summarize(args.path, args.layer)

    labels = {
        "path": "File / 文件",
        "matrix_source": "Matrix source / 矩阵来源",
        "cells": "Cells / 细胞数",
        "genes": "Genes / 基因数",
        "matrix_type": "Matrix type / 矩阵类型",
        "sparse": "Sparse / 是否稀疏",
        "dtype": "Dtype / 数据类型",
        "finite": "Finite / 是否有限",
        "nonnegative": "Non-negative / 是否非负",
        "integer_like": "Integer-like / 是否为整数",
        "explicit_stored_zeros": "Explicit zeros / 显式存储零",
        "median_library_size": "Median library size / 中位总 counts",
        "median_detected_genes": "Median detected genes / 中位检出基因数",
        "stored_entries": "Stored entries / 存储条目数",
        "obs_columns": "obs columns / 细胞元数据列",
        "var_columns": "var columns / 基因元数据列",
        "layers": "Layers / 数据层",
    }
    print("\nAnnData inspection / AnnData 检查")
    print("=" * 58)
    for key, value in result.items():
        print(f"{labels[key]:42s} {value}")

    # These are hard validity requirements for a raw-count candidate. They still
    # do not replace provenance/documentation checks.
    if not (result["finite"] and result["nonnegative"] and result["integer_like"]):
        raise SystemExit("Count checks failed / counts 检查未通过")
    print("\nNote: numerical checks support, but do not prove, raw-count provenance.")
    print("提示：数值检查支持 raw-count 判断，但不能单独证明数据来源。")


if __name__ == "__main__":
    main()
