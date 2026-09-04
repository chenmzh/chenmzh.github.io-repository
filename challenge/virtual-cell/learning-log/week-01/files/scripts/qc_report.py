#!/usr/bin/env python3
"""Create grouped, descriptive QC summaries from a documented count matrix.

从数据契约指定的 count matrix 生成分组 QC 描述统计。

The report is an audit aid, not an automatic filtering rule or an uncertainty
estimate. Always inspect additional biological and technical groupings.
本报告用于审计，不是自动过滤规则，也不提供不确定性估计。
"""

from __future__ import annotations

import argparse
from pathlib import Path

import anndata as ad
import numpy as np
import pandas as pd
from scipy import sparse


def _select_count_matrix(adata: ad.AnnData, counts_layer: str | None) -> sparse.csr_matrix:
    """Select the documented counts source and return a clean CSR copy."""
    if counts_layer is None:
        source = adata.X
    else:
        if counts_layer not in adata.layers:
            raise KeyError(f"Missing counts layer / 缺少 counts layer: {counts_layer}")
        source = adata.layers[counts_layer]

    # CSR is efficient for selecting groups of rows (cells). Eliminating explicit
    # zeros makes getnnz equal to the number of genes with observed count > 0.
    # CSR 适合按细胞切片；消除显式 0 后，getnnz 才等于检出基因数。
    X = sparse.csr_matrix(source, copy=True)
    X.eliminate_zeros()
    return X


def make_report(
    adata: ad.AnnData,
    group_col: str = "target_gene",
    counts_layer: str | None = "counts",
) -> pd.DataFrame:
    """Summarize cell count and QC distributions for each group.

    ``counts_layer='counts'`` follows the Week 1 data contract. Pass ``None``
    only when documentation explicitly states that ``adata.X`` contains counts.

    Grouping by one column is intentionally simple for first inspection. A real
    report should also stratify by cell type, donor, and batch so that a global
    median does not hide group-specific problems.
    """
    if group_col not in adata.obs:
        raise KeyError(f"Missing obs column / 缺少 obs 列: {group_col}")
    X_all = _select_count_matrix(adata, counts_layer)

    # Recompute pct_mito from the same selected count matrix whenever gene-level
    # mitochondrial annotation is available. This avoids mixing a QC value made
    # from one matrix with summaries from another transformed matrix.
    # 尽量从同一个 count matrix 重算 pct_mito，避免不同数据尺度混用。
    mito_mask = None
    if "is_mito" in adata.var:
        mito_mask = np.asarray(adata.var["is_mito"], dtype=bool)

    rows: list[dict[str, object]] = []
    groups = adata.obs[group_col].astype(str)
    for group in sorted(groups.unique()):
        # Convert the Pandas Series mask to NumPy before SciPy sparse indexing.
        # SciPy sparse 布尔索引前转成 NumPy，避免 Pandas Series 兼容问题。
        mask = np.asarray(groups == group)
        X = X_all[mask]
        totals = np.asarray(X.sum(axis=1)).ravel()
        detected = X.getnnz(axis=1)

        if mito_mask is not None:
            mito_counts = np.asarray(X[:, mito_mask].sum(axis=1)).ravel()
            pct_mito = np.divide(
                mito_counts,
                totals,
                out=np.zeros_like(mito_counts, dtype=float),
                where=totals > 0,
            ) * 100
        elif "pct_mito" in adata.obs:
            # Fallback only when no gene annotation exists. The caller must know
            # that this precomputed column matches the selected count source.
            pct_mito = np.asarray(adata.obs.loc[mask, "pct_mito"], dtype=float)
        else:
            pct_mito = np.full(mask.sum(), np.nan)

        # Medians are robust center summaries; IQR exposes spread. Neither is a
        # confidence interval or a replacement for replicate-level inference.
        rows.append(
            {
                group_col: group,
                "n_cells": int(mask.sum()),
                "median_library_size": float(np.median(totals)),
                "library_size_q25": float(np.quantile(totals, 0.25)),
                "library_size_q75": float(np.quantile(totals, 0.75)),
                "median_detected_genes": float(np.median(detected)),
                "median_pct_mito": float(np.nanmedian(pct_mito)),
                "zero_fraction": float(1.0 - X.nnz / np.prod(X.shape)),
            }
        )
    return pd.DataFrame(rows)


def main() -> None:
    """Load AnnData, write the QC table, and print it for immediate review."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    parser.add_argument("--group-col", default="target_gene")
    parser.add_argument(
        "--counts-layer",
        default="counts",
        help="Named raw-count layer; pass X to use adata.X / raw-count layer 名称；X 表示 adata.X",
    )
    parser.add_argument("--output", type=Path, default=Path("outputs/week01_qc.csv"))
    args = parser.parse_args()

    adata = ad.read_h5ad(args.path)
    layer = None if args.counts_layer == "X" else args.counts_layer
    report = make_report(adata, args.group_col, layer)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    report.to_csv(args.output, index=False)
    print(report.to_string(index=False))
    print(f"\nSaved / 已保存: {args.output}")
    print("Audit cell type, donor, and batch separately before choosing QC thresholds.")
    print("选择 QC 阈值前，还要分别审计 cell type、donor 和 batch。")


if __name__ == "__main__":
    main()
