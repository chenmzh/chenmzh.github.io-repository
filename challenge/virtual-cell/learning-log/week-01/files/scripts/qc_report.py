#!/usr/bin/env python3
"""Create a simple per-perturbation QC table / 生成按扰动分组的基础 QC 表。"""

from __future__ import annotations

import argparse
from pathlib import Path

import anndata as ad
import numpy as np
import pandas as pd
from scipy import sparse


def make_report(adata: ad.AnnData, group_col: str = "target_gene") -> pd.DataFrame:
    if group_col not in adata.obs:
        raise KeyError(f"Missing obs column / 缺少 obs 列: {group_col}")
    rows = []
    for group in sorted(adata.obs[group_col].astype(str).unique()):
        mask = np.asarray(adata.obs[group_col].astype(str) == group)
        X = adata.X[mask]
        totals = np.asarray(X.sum(axis=1)).ravel()
        detected = X.getnnz(axis=1) if sparse.issparse(X) else np.count_nonzero(X, axis=1)
        if "pct_mito" in adata.obs:
            median_pct_mito = float(np.median(adata.obs.loc[mask, "pct_mito"]))
        elif "is_mito" in adata.var:
            mito = np.asarray(adata.var["is_mito"], dtype=bool)
            mito_counts = np.asarray(X[:, mito].sum(axis=1)).ravel()
            median_pct_mito = float(np.median(np.divide(mito_counts, totals, out=np.zeros_like(mito_counts, dtype=float), where=totals > 0) * 100))
        else:
            median_pct_mito = float("nan")
        rows.append(
            {
                group_col: group,
                "n_cells": int(mask.sum()),
                "median_library_size": float(np.median(totals)),
                "median_detected_genes": float(np.median(detected)),
                "median_pct_mito": median_pct_mito,
                "zero_fraction": float(1.0 - X.nnz / np.prod(X.shape)) if sparse.issparse(X) else float(np.mean(X == 0)),
            }
        )
    return pd.DataFrame(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    parser.add_argument("--group-col", default="target_gene")
    parser.add_argument("--output", type=Path, default=Path("outputs/week01_qc.csv"))
    args = parser.parse_args()

    adata = ad.read_h5ad(args.path)
    report = make_report(adata, args.group_col)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    report.to_csv(args.output, index=False)
    print(report.to_string(index=False))
    print(f"\nSaved / 已保存: {args.output}")


if __name__ == "__main__":
    main()
