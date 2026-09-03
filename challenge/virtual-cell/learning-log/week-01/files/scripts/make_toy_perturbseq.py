#!/usr/bin/env python3
"""Create a small, reproducible Perturb-seq-like AnnData file.

生成一个小型、可复现的 Perturb-seq 风格 AnnData 文件。
The data are synthetic and for teaching only; they are not challenge data.
该数据仅用于教学，不是比赛数据。
"""

from __future__ import annotations

import argparse
from pathlib import Path

import anndata as ad
import numpy as np
import pandas as pd
from scipy import sparse

CONDITIONS = ("non-targeting", "GENE_A", "GENE_B", "GENE_C")
CELL_TYPES = ("type_alpha", "type_beta")
DONORS = ("donor_1", "donor_2", "donor_3")


def gene_names(n_genes: int) -> list[str]:
    """Return unique, human-readable toy gene symbols / 返回唯一的教学基因名。"""
    if n_genes < 120:
        raise ValueError("n_genes must be at least 120 / n_genes 至少为 120")
    names = ["GENE_A", "GENE_B", "GENE_C"]
    names += [f"MT-{i:02d}" for i in range(1, 11)]
    names += [f"PATH_A_{i:02d}" for i in range(1, 11)]
    names += [f"PATH_B_{i:02d}" for i in range(1, 11)]
    names += [f"PATH_C_{i:02d}" for i in range(1, 11)]
    names += [f"ALPHA_MARKER_{i:02d}" for i in range(1, 21)]
    names += [f"BETA_MARKER_{i:02d}" for i in range(1, 21)]
    names += [f"HOUSEKEEPING_{i:02d}" for i in range(1, 11)]
    names += [f"GENE_{i:04d}" for i in range(1, n_genes - len(names) + 1)]
    return names[:n_genes]


def perturbation_log2fc(condition: str, cell_type: str, n_genes: int) -> np.ndarray:
    """Define interpretable cell-type-specific ground-truth effects."""
    effect = np.zeros(n_genes, dtype=np.float32)
    if condition == "GENE_A":
        effect[0] = np.log2(0.18)
        effect[13:18] = np.log2(2.4 if cell_type == "type_alpha" else 1.4)
        effect[18:23] = np.log2(0.50)
    elif condition == "GENE_B":
        effect[1] = np.log2(0.22)
        effect[23:28] = np.log2(2.0)
        effect[28:33] = np.log2(0.48 if cell_type == "type_beta" else 0.68)
    elif condition == "GENE_C":
        effect[2] = np.log2(0.25)
        effect[33:38] = np.log2(2.3 if cell_type == "type_beta" else 1.3)
        effect[38:43] = np.log2(0.55)
    return effect


def gamma_poisson(rng: np.random.Generator, mean: np.ndarray, theta: float = 8.0) -> np.ndarray:
    """Sample overdispersed integer counts / 采样过度离散的整数 counts。"""
    gamma_rate = rng.gamma(shape=theta, scale=np.maximum(mean, 1e-8) / theta)
    return rng.poisson(gamma_rate).astype(np.int32)


def build_dataset(
    cells_per_group: int = 100,
    n_genes: int = 500,
    seed: int = 2026,
) -> ad.AnnData:
    """Build raw counts for 4 conditions × 2 cell types × 3 donors."""
    rng = np.random.default_rng(seed)
    genes = gene_names(n_genes)

    base_mean = rng.lognormal(mean=0.0, sigma=0.85, size=n_genes)
    base_mean[:3] = [7.0, 6.0, 5.5]
    base_mean[3:13] = 0.7
    base_mean[83:93] = 8.0

    count_blocks: list[np.ndarray] = []
    obs_rows: list[dict[str, object]] = []
    truth_rows: list[np.ndarray] = []
    truth_index: list[str] = []

    for cell_type in CELL_TYPES:
        cell_type_effect = np.ones(n_genes)
        if cell_type == "type_alpha":
            cell_type_effect[43:63] = 4.0
            cell_type_effect[63:83] = 0.35
        else:
            cell_type_effect[43:63] = 0.35
            cell_type_effect[63:83] = 4.0

        for condition in CONDITIONS:
            log2fc = perturbation_log2fc(condition, cell_type, n_genes)
            truth_rows.append(log2fc)
            truth_index.append(f"{cell_type}|{condition}")

            for donor_index, donor in enumerate(DONORS):
                batch = "batch_1" if donor_index < 2 else "batch_2"
                guide_pool = [f"NTC_{i:02d}" for i in range(1, 6)] if condition == "non-targeting" else [f"{condition}_g1", f"{condition}_g2"]

                donor_scale = (0.92, 1.00, 1.08)[donor_index]
                batch_effect = np.ones(n_genes)
                if batch == "batch_2":
                    batch_effect[-20:] = 1.45  # visible batch signature / 可见批次信号

                library_factor = rng.lognormal(mean=-0.5 * 0.38**2, sigma=0.38, size=cells_per_group)
                low_quality = rng.random(cells_per_group) < 0.03
                library_factor[low_quality] *= 0.28

                mean = (
                    library_factor[:, None]
                    * donor_scale
                    * base_mean[None, :]
                    * cell_type_effect[None, :]
                    * batch_effect[None, :]
                    * np.exp2(log2fc)[None, :]
                )
                mean[low_quality, 3:13] *= 25.0
                counts = gamma_poisson(rng, mean)
                count_blocks.append(counts)

                for i in range(cells_per_group):
                    obs_rows.append(
                        {
                            "target_gene": condition,
                            "guide_id": guide_pool[i % len(guide_pool)],
                            "context": "toy_context_A",
                            "cell_type": cell_type,
                            "donor": donor,
                            "replicate": donor,
                            "batch": batch,
                            "is_control": condition == "non-targeting",
                            "low_quality_simulated": bool(low_quality[i]),
                        }
                    )

    dense_counts = np.vstack(count_blocks)
    X = sparse.csr_matrix(dense_counts, dtype=np.int32)
    obs = pd.DataFrame(obs_rows)
    obs.index = pd.Index([f"cell_{i:05d}" for i in range(X.shape[0])], name="cell_id")
    obs["library_size"] = np.asarray(X.sum(axis=1)).ravel().astype(np.int64)
    obs["detected_genes"] = X.getnnz(axis=1).astype(np.int32)
    mt_counts = np.asarray(X[:, 3:13].sum(axis=1)).ravel()
    obs["pct_mito"] = np.divide(mt_counts, obs["library_size"], out=np.zeros_like(mt_counts, dtype=float), where=obs["library_size"] > 0) * 100

    var = pd.DataFrame(index=pd.Index(genes, name="gene_symbol"))
    var["gene_id"] = [f"TOY{i:05d}" for i in range(n_genes)]
    var["feature_type"] = "Gene Expression"
    var["is_target_gene"] = var.index.isin(["GENE_A", "GENE_B", "GENE_C"])
    var["is_mito"] = var.index.str.startswith("MT-")
    var["is_true_response"] = np.any(np.abs(np.vstack(truth_rows)) > 1e-8, axis=0)

    adata = ad.AnnData(X=X, obs=obs, var=var)
    adata.layers["counts"] = X.copy()
    adata.uns["ground_truth_log2fc"] = pd.DataFrame(truth_rows, index=truth_index, columns=genes)
    adata.uns["course"] = {
        "name": "Virtual Cell Challenge Week 1",
        "language": "zh-CN + en",
        "synthetic": True,
        "seed": seed,
        "data_contract": "X and layers['counts'] contain raw non-negative integer counts.",
        "teaching_traps": "donor_3 is confounded with batch_2; 3% cells have low library size and elevated mitochondrial fraction.",
    }
    return adata


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/week01_toy_perturbseq.h5ad"))
    parser.add_argument("--cells-per-group", type=int, default=100)
    parser.add_argument("--genes", type=int, default=500)
    parser.add_argument("--seed", type=int, default=2026)
    args = parser.parse_args()

    adata = build_dataset(args.cells_per_group, args.genes, args.seed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    adata.write_h5ad(args.output, compression="gzip")
    print(f"Created / 已生成: {args.output}")
    print(f"Shape / 形状: {adata.n_obs:,} cells × {adata.n_vars:,} genes")
    print(adata.obs.groupby(["cell_type", "target_gene"], observed=True).size().to_string())


if __name__ == "__main__":
    main()
