#!/usr/bin/env python3
"""Create a reproducible Perturb-seq-like AnnData dataset for teaching.

生成可复现的 Perturb-seq 风格 AnnData 教学数据。

This is synthetic teaching data—not challenge data and not a realistic cell
simulator. It makes selected assumptions visible so students can inspect raw
counts, cell-type-specific effects, QC signals, replicates, and confounding.
本脚本只用于教学，不是官方数据或真实细胞模拟器；所有关键假设均显式说明。
"""

from __future__ import annotations

import argparse
from pathlib import Path

import anndata as ad
import numpy as np
import pandas as pd
from scipy import sparse

# Experimental design / 实验设计
CONDITIONS = ("non-targeting", "GENE_A", "GENE_B", "GENE_C")
CELL_TYPES = ("type_alpha", "type_beta")
DONORS = ("donor_1", "donor_2", "donor_3")

# Stable gene-index layout. Named slices make the teaching mechanism explicit
# and prevent unexplained "magic numbers" inside the simulation.
# 固定的基因索引布局：用命名 slice 说明每段基因在模拟中的含义。
TARGET_A, TARGET_B, TARGET_C = 0, 1, 2
MITO = slice(3, 13)
PATH_A_UP, PATH_A_DOWN = slice(13, 18), slice(18, 23)
PATH_B_UP, PATH_B_DOWN = slice(23, 28), slice(28, 33)
PATH_C_UP, PATH_C_DOWN = slice(33, 38), slice(38, 43)
ALPHA_MARKERS, BETA_MARKERS = slice(43, 63), slice(63, 83)
HOUSEKEEPING = slice(83, 93)


def gene_names(n_genes: int) -> list[str]:
    """Return unique, human-readable toy gene symbols.

    The first 93 positions have predefined teaching roles; remaining genes are
    generic background features. 至少需要 120 genes，保证预定义区段和背景均存在。
    """
    if n_genes < 120:
        raise ValueError("n_genes must be at least 120 / n_genes 至少为 120")

    names = ["GENE_A", "GENE_B", "GENE_C"]
    names += [f"MT-{index:02d}" for index in range(1, 11)]
    names += [f"PATH_A_{index:02d}" for index in range(1, 11)]
    names += [f"PATH_B_{index:02d}" for index in range(1, 11)]
    names += [f"PATH_C_{index:02d}" for index in range(1, 11)]
    names += [f"ALPHA_MARKER_{index:02d}" for index in range(1, 21)]
    names += [f"BETA_MARKER_{index:02d}" for index in range(1, 21)]
    names += [f"HOUSEKEEPING_{index:02d}" for index in range(1, 11)]
    names += [f"GENE_{index:04d}" for index in range(1, n_genes - len(names) + 1)]
    return names[:n_genes]


def perturbation_log2fc(condition: str, cell_type: str, n_genes: int) -> np.ndarray:
    """Define an interpretable, cell-type-specific ground-truth response.

    A log2 fold-change is converted later through ``2 ** log2FC``:
    +1 means multiply the expected count by 2; -1 means multiply by 0.5.
    log2FC 稍后通过 ``2 ** log2FC`` 转成均值乘数。
    """
    effect = np.zeros(n_genes, dtype=np.float32)

    if condition == "GENE_A":
        effect[TARGET_A] = np.log2(0.18)  # strong but incomplete on-target knockdown
        effect[PATH_A_UP] = np.log2(2.4 if cell_type == "type_alpha" else 1.4)
        effect[PATH_A_DOWN] = np.log2(0.50)
    elif condition == "GENE_B":
        effect[TARGET_B] = np.log2(0.22)
        effect[PATH_B_UP] = np.log2(2.0)
        effect[PATH_B_DOWN] = np.log2(0.48 if cell_type == "type_beta" else 0.68)
    elif condition == "GENE_C":
        effect[TARGET_C] = np.log2(0.25)
        effect[PATH_C_UP] = np.log2(2.3 if cell_type == "type_beta" else 1.3)
        effect[PATH_C_DOWN] = np.log2(0.55)
    # non-targeting remains an all-zero log2FC vector / NTC 不施加表达效应
    return effect


def gamma_poisson(
    rng: np.random.Generator,
    mean: np.ndarray,
    theta: float = 8.0,
) -> np.ndarray:
    """Sample overdispersed integer counts with a Gamma–Poisson mixture.

    Conditional Poisson rates vary according to a Gamma distribution. Marginally
    this corresponds to a negative-binomial parameterization with approximately
    ``Var(Y) = mean + mean**2 / theta``. Smaller theta means more extra variation.

    先从 Gamma 抽取每个 cell×gene 的 Poisson rate，再抽取整数 counts；边际上
    对应负二项式式过度离散，theta 越小，额外变异越强。
    """
    positive_mean = np.maximum(mean, 1e-8)
    gamma_rate = rng.gamma(shape=theta, scale=positive_mean / theta)
    return rng.poisson(gamma_rate).astype(np.int32)


def build_dataset(
    cells_per_group: int = 100,
    n_genes: int = 500,
    seed: int = 2026,
) -> ad.AnnData:
    """Build raw counts for 4 conditions × 2 cell types × 3 donors.

    The default produces 24 groups and 2,400 cells. ``X`` and
    ``layers['counts']`` both contain non-negative integer counts by contract.
    """
    if cells_per_group <= 0:
        raise ValueError("cells_per_group must be positive / cells_per_group 必须大于 0")

    # default_rng keeps all stochasticity controlled by one explicit seed.
    # 所有随机性由一个显式 seed 控制，便于完全复现。
    rng = np.random.default_rng(seed)
    genes = gene_names(n_genes)

    # Gene-specific baseline means create a long-tailed expression distribution.
    # The designated targets and housekeeping genes receive readable levels.
    # 基因基础均值采用长尾分布，并给 target/housekeeping 设置易观察的表达量。
    base_mean = rng.lognormal(mean=0.0, sigma=0.85, size=n_genes)
    base_mean[:3] = [7.0, 6.0, 5.5]
    base_mean[MITO] = 0.7
    base_mean[HOUSEKEEPING] = 8.0

    count_blocks: list[np.ndarray] = []
    obs_rows: list[dict[str, object]] = []
    truth_rows: list[np.ndarray] = []
    truth_index: list[str] = []

    for cell_type in CELL_TYPES:
        # Cell identity changes marker-gene means. The multiplier is a biological
        # baseline effect, distinct from the perturbation response below.
        # cell-type effect 改变 marker 基因基础均值，与扰动响应分开建模。
        cell_type_effect = np.ones(n_genes)
        if cell_type == "type_alpha":
            cell_type_effect[ALPHA_MARKERS] = 4.0
            cell_type_effect[BETA_MARKERS] = 0.35
        else:
            cell_type_effect[ALPHA_MARKERS] = 0.35
            cell_type_effect[BETA_MARKERS] = 4.0

        for condition in CONDITIONS:
            # One truth vector is shared by donors in a cell type. Real biology
            # may have donor-specific effects; this simplification is explicit.
            # 同一 cell type 的 donors 共用 truth effect，是教学简化。
            log2fc = perturbation_log2fc(condition, cell_type, n_genes)
            truth_rows.append(log2fc)
            truth_index.append(f"{cell_type}|{condition}")

            for donor_index, donor in enumerate(DONORS):
                # Intentional complete confounding: donor_3 always equals batch_2.
                # This teaches that no statistical model can separate two factors
                # that never vary independently in the design.
                # 刻意完全混杂：donor_3 永远属于 batch_2。
                batch = "batch_1" if donor_index < 2 else "batch_2"
                guide_pool = (
                    [f"NTC_{index:02d}" for index in range(1, 6)]
                    if condition == "non-targeting"
                    else [f"{condition}_g1", f"{condition}_g2"]
                )

                # Donor scale acts globally. Batch 2 additionally raises the last
                # 20 background genes, making a visible technical signature.
                # donor_scale 为全局差异；batch_2 额外改变最后 20 个背景基因。
                donor_scale = (0.92, 1.00, 1.08)[donor_index]
                batch_effect = np.ones(n_genes)
                if batch == "batch_2":
                    batch_effect[-20:] = 1.45

                # Log-normal library factors create cell-to-cell depth variation.
                # The mean correction keeps E[library_factor] approximately 1.
                # 少量 low-quality cells 同时降低总深度并提高线粒体占比。
                library_factor = rng.lognormal(
                    mean=-0.5 * 0.38**2,
                    sigma=0.38,
                    size=cells_per_group,
                )
                low_quality = rng.random(cells_per_group) < 0.03
                library_factor[low_quality] *= 0.28

                # Broadcasting shapes:
                # library_factor[:, None] -> cells × 1
                # every gene effect[None, :] -> 1 × genes
                # result ``mean`` -> cells × genes.
                # ``np.exp2(log2fc)`` converts log2 effects into mean multipliers.
                mean = (
                    library_factor[:, None]
                    * donor_scale
                    * base_mean[None, :]
                    * cell_type_effect[None, :]
                    * batch_effect[None, :]
                    * np.exp2(log2fc)[None, :]
                )
                mean[low_quality, MITO] *= 25.0

                counts = gamma_poisson(rng, mean)
                count_blocks.append(counts)

                # obs contains experimental-design fields, not expression values.
                # Guide assignment alternates deterministically inside each group;
                # this toy does not model guide-specific efficiency.
                # obs 保存实验设计；toy 未模拟不同 guide efficiency。
                for cell_index in range(cells_per_group):
                    obs_rows.append(
                        {
                            "target_gene": condition,
                            "guide_id": guide_pool[cell_index % len(guide_pool)],
                            "context": "toy_context_A",
                            "cell_type": cell_type,
                            "donor": donor,
                            "replicate": donor,
                            "batch": batch,
                            "is_control": condition == "non-targeting",
                            "low_quality_simulated": bool(low_quality[cell_index]),
                        }
                    )

    # Creating a complete dense matrix before CSR conversion is acceptable only
    # because this toy dataset is tiny. Do not copy this pattern for challenge-
    # scale matrices; generate or load sparse blocks directly instead.
    # 先 dense 后 CSR 只适合小型 toy；大规模数据必须直接使用 sparse/block 流程。
    dense_counts = np.vstack(count_blocks)
    X = sparse.csr_matrix(dense_counts, dtype=np.int32)

    obs = pd.DataFrame(obs_rows)
    obs.index = pd.Index([f"cell_{index:05d}" for index in range(X.shape[0])], name="cell_id")

    # Sparse-safe per-cell QC: only one-dimensional result vectors become dense.
    # 稀疏安全 QC：只将每细胞汇总向量转成 dense。
    obs["library_size"] = np.asarray(X.sum(axis=1)).ravel().astype(np.int64)
    obs["detected_genes"] = X.getnnz(axis=1).astype(np.int32)
    mt_counts = np.asarray(X[:, MITO].sum(axis=1)).ravel()
    obs["pct_mito"] = np.divide(
        mt_counts,
        obs["library_size"],
        out=np.zeros_like(mt_counts, dtype=float),
        where=obs["library_size"] > 0,
    ) * 100

    # var metadata aligns one-to-one with columns of X.
    # var 每行与 X 的一个 gene column 严格对齐。
    var = pd.DataFrame(index=pd.Index(genes, name="gene_symbol"))
    var["gene_id"] = [f"TOY{index:05d}" for index in range(n_genes)]
    var["feature_type"] = "Gene Expression"
    var["is_target_gene"] = var.index.isin(["GENE_A", "GENE_B", "GENE_C"])
    var["is_mito"] = var.index.str.startswith("MT-")
    var["is_true_response"] = np.any(np.abs(np.vstack(truth_rows)) > 1e-8, axis=0)

    adata = ad.AnnData(X=X, obs=obs, var=var)
    adata.layers["counts"] = X.copy()
    adata.uns["ground_truth_log2fc"] = pd.DataFrame(
        truth_rows,
        index=truth_index,
        columns=genes,
    )
    adata.uns["course"] = {
        "name": "Virtual Cell Challenge Week 1",
        "language": "zh-CN + en",
        "synthetic": True,
        "seed": seed,
        "data_contract": "X and layers['counts'] contain raw non-negative integer counts.",
        "teaching_traps": "donor_3 is confounded with batch_2; 3% cells have low library size and elevated mitochondrial fraction.",
        "limitations": "No realistic gene correlation, guide efficiency, off-target effect, or complex dropout model.",
    }
    return adata


def main() -> None:
    """Generate the dataset from CLI arguments and write a compressed .h5ad."""
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
    print("Teaching data only; do not treat this simulator as biological ground truth.")
    print("仅供教学；不要把该模拟器当作真实生物 ground truth。")


if __name__ == "__main__":
    main()
