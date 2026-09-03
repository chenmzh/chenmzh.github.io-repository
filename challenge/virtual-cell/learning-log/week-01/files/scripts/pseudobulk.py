#!/usr/bin/env python3
"""Aggregate raw single-cell counts at the biological-replicate level.

按生物重复层级聚合单细胞 raw counts。
"""

from __future__ import annotations

import argparse
from pathlib import Path

import anndata as ad
import numpy as np
import pandas as pd
from scipy import sparse


def aggregate_pseudobulk(
    adata: ad.AnnData,
    group_cols: list[str],
    counts_layer: str | None = "counts",
) -> ad.AnnData:
    """Sum counts by groups and assert per-gene count conservation."""
    missing = [col for col in group_cols if col not in adata.obs]
    if missing:
        raise KeyError(f"Missing obs columns / 缺少 obs 列: {missing}")

    X = adata.layers[counts_layer] if counts_layer else adata.X
    X = sparse.csr_matrix(X)
    keys = adata.obs[group_cols].astype(str)
    key_tuples = list(map(tuple, keys.to_numpy()))
    unique_keys = sorted(set(key_tuples))

    rows: list[sparse.csr_matrix] = []
    metadata: list[dict[str, object]] = []
    for key in unique_keys:
        mask = np.array([value == key for value in key_tuples])
        summed = sparse.csr_matrix(X[mask].sum(axis=0))
        rows.append(summed)
        row = dict(zip(group_cols, key, strict=True))
        row["n_cells"] = int(mask.sum())
        metadata.append(row)

    pb_X = sparse.vstack(rows, format="csr", dtype=np.int64)
    before = np.asarray(X.sum(axis=0)).ravel()
    after = np.asarray(pb_X.sum(axis=0)).ravel()
    if not np.array_equal(before, after):
        raise AssertionError("Counts are not conserved / 聚合前后 counts 不守恒")

    pb_obs = pd.DataFrame(metadata)
    pb_obs.index = pd.Index(["|".join(key) for key in unique_keys], name="pseudobulk_sample")
    result = ad.AnnData(X=pb_X, obs=pb_obs, var=adata.var.copy())
    result.layers["counts"] = pb_X.copy()
    result.uns["aggregation"] = {
        "group_cols": group_cols,
        "counts_layer": counts_layer or "X",
        "operation": "sum",
        "count_conservation_checked": True,
    }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    parser.add_argument("--group-cols", nargs="+", default=["donor", "cell_type", "target_gene"])
    parser.add_argument("--counts-layer", default="counts", help="Use 'X' to aggregate adata.X")
    parser.add_argument("--output", type=Path, default=Path("outputs/week01_pseudobulk.h5ad"))
    args = parser.parse_args()

    adata = ad.read_h5ad(args.path)
    layer = None if args.counts_layer == "X" else args.counts_layer
    result = aggregate_pseudobulk(adata, args.group_cols, layer)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.write_h5ad(args.output, compression="gzip")
    print(f"Pseudobulk samples / 聚合样本数: {result.n_obs}")
    print(result.obs.head(12).to_string())
    print(f"\nSaved / 已保存: {args.output}")


if __name__ == "__main__":
    main()
