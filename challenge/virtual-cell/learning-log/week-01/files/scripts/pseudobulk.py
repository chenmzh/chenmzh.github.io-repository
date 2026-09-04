#!/usr/bin/env python3
"""Aggregate raw single-cell counts at a biological-replicate-aware level.

按包含生物重复的分组聚合单细胞 raw counts。

Pseudobulk is a sum of raw counts, not an average of normalized/log values.
The caller is responsible for choosing a biologically valid grouping key.
Pseudobulk 是 raw counts 求和；调用者必须根据实验设计选择正确分组。
"""

from __future__ import annotations

import argparse
import warnings
from pathlib import Path

import anndata as ad
import numpy as np
import pandas as pd
from scipy import sparse


def _validated_counts(adata: ad.AnnData, counts_layer: str | None) -> sparse.csr_matrix:
    """Select, validate, and convert a candidate raw-count matrix to int64 CSR.

    Validation catches non-finite, negative, and fractional values. It cannot
    prove provenance, so dataset documentation must still identify the source
    as raw counts.
    """
    if counts_layer is None:
        source = adata.X
    else:
        if counts_layer not in adata.layers:
            raise KeyError(f"Missing counts layer / 缺少 counts layer: {counts_layer}")
        source = adata.layers[counts_layer]

    # CSR is efficient for selecting and summing groups of cell rows. Convert to
    # int64 before aggregation to reduce integer-overflow risk when many cells
    # are summed. This conversion is safe only after checking integer-like data.
    # CSR 适合按细胞行切片；求和前提升到 int64，降低大量 cells 求和时溢出风险。
    X_float_check = sparse.csr_matrix(source, copy=True)
    X_float_check.eliminate_zeros()
    values = X_float_check.data
    if not np.isfinite(values).all():
        raise ValueError("Counts contain NaN or infinity / counts 含 NaN 或无穷值")
    if values.size and (values < 0).any():
        raise ValueError("Counts contain negative values / counts 含负值")
    if values.size and not np.allclose(values, np.rint(values), atol=1e-6):
        raise ValueError("Counts are not integer-like / counts 不是近似整数")

    return sparse.csr_matrix(X_float_check, dtype=np.int64)


def aggregate_pseudobulk(
    adata: ad.AnnData,
    group_cols: list[str],
    counts_layer: str | None = "counts",
) -> ad.AnnData:
    """Sum raw counts by ``group_cols`` and verify per-gene conservation.

    A valid perturbation-analysis key normally includes an independent
    biological replicate (for example ``donor`` or ``replicate``), cell type,
    and condition. Count conservation proves that entries were not lost or
    duplicated; it does *not* prove that the grouping design is biologically
    valid or free of confounding.

    合理分组通常包含 donor/replicate、cell type 和 condition。counts 守恒只证明
    没有漏计或重复计数，不证明实验设计正确，也不证明不存在混杂。
    """
    if not group_cols:
        raise ValueError("group_cols must not be empty / group_cols 不能为空")
    missing = [column for column in group_cols if column not in adata.obs]
    if missing:
        raise KeyError(f"Missing obs columns / 缺少 obs 列: {missing}")

    # Missing group values must not silently become a literal "nan" category.
    # 分组键缺失不能静默变成字符串 "nan" 并被当作合法样本。
    missing_key_counts = adata.obs[group_cols].isna().sum()
    if int(missing_key_counts.sum()) > 0:
        details = missing_key_counts[missing_key_counts > 0].to_dict()
        raise ValueError(f"Missing group keys / 分组键存在缺失值: {details}")

    if not {"donor", "replicate"}.intersection(group_cols):
        warnings.warn(
            "No donor/replicate column in group_cols; verify the independent experimental unit. "
            "/ group_cols 不含 donor/replicate，请确认独立实验单位。",
            stacklevel=2,
        )

    X = _validated_counts(adata, counts_layer)
    key_frame = adata.obs[group_cols].astype(str)

    # Pandas returns integer row positions for each unique key. Using positions
    # avoids repeatedly comparing every cell against every group.
    # groupby.indices 直接给出每组行位置，避免对每个组重复扫描所有 cells。
    grouped_positions = key_frame.groupby(group_cols, sort=True, observed=True).indices
    if not grouped_positions:
        raise ValueError("No pseudobulk groups were formed / 未形成任何 pseudobulk 分组")

    rows: list[sparse.csr_matrix] = []
    metadata: list[dict[str, object]] = []
    sample_names: list[str] = []

    for raw_key, positions in grouped_positions.items():
        # With one group column Pandas may return a scalar; normalize both cases
        # to a tuple so metadata and sample names remain deterministic.
        key = raw_key if isinstance(raw_key, tuple) else (raw_key,)

        # Sparse axis=0 sum returns a 1 × genes matrix-like object. Wrap it back
        # into CSR so all pseudobulk rows can be stacked without densifying.
        # 稀疏矩阵 axis=0 求和返回 1×genes 对象；重新包装为 CSR 后再堆叠。
        summed = sparse.csr_matrix(X[np.asarray(positions)].sum(axis=0), dtype=np.int64)
        rows.append(summed)

        row = dict(zip(group_cols, key, strict=True))
        row["n_cells"] = int(len(positions))
        metadata.append(row)
        sample_names.append("|".join(map(str, key)))

    pb_X = sparse.vstack(rows, format="csr", dtype=np.int64)

    # Per-gene equality is stronger than checking only the grand total: it finds
    # gene-specific losses, duplicate rows, and accidental filtering.
    # 逐基因守恒比总和守恒更严格，可发现特定基因的漏计、重复或意外过滤。
    before = np.asarray(X.sum(axis=0)).ravel()
    after = np.asarray(pb_X.sum(axis=0)).ravel()
    if not np.array_equal(before, after):
        raise AssertionError("Counts are not conserved per gene / 聚合前后逐基因 counts 不守恒")

    pb_obs = pd.DataFrame(metadata)
    pb_obs.index = pd.Index(sample_names, name="pseudobulk_sample")
    result = ad.AnnData(X=pb_X, obs=pb_obs, var=adata.var.copy())
    result.layers["counts"] = pb_X.copy()
    result.uns["aggregation"] = {
        "group_cols": group_cols,
        "counts_layer": counts_layer or "X",
        "operation": "sum",
        "count_conservation_checked": True,
        "note": "Conservation does not validate the biological grouping design.",
    }
    return result


def main() -> None:
    """Run replicate-aware aggregation from the command line."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    parser.add_argument("--group-cols", nargs="+", default=["donor", "cell_type", "target_gene"])
    parser.add_argument("--counts-layer", default="counts", help="Use X to aggregate adata.X")
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
    print("Counts conserved per gene; now inspect design, depth, and confounding.")
    print("逐基因 counts 已守恒；下一步仍需检查设计、深度和混杂。")


if __name__ == "__main__":
    main()
