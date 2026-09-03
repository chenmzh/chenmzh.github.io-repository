from __future__ import annotations

import numpy as np
from scipy import sparse

from scripts.make_toy_perturbseq import build_dataset
from scripts.pseudobulk import aggregate_pseudobulk
from scripts.qc_report import make_report


def test_toy_dataset_contract() -> None:
    adata = build_dataset(cells_per_group=12, n_genes=140, seed=2026)
    assert adata.shape == (4 * 2 * 3 * 12, 140)
    assert sparse.isspmatrix_csr(adata.X)
    assert np.issubdtype(adata.X.dtype, np.integer)
    assert adata.X.data.min(initial=0) >= 0
    assert {"target_gene", "cell_type", "donor", "batch", "pct_mito"}.issubset(adata.obs.columns)
    assert {"is_mito", "is_true_response", "gene_id"}.issubset(adata.var.columns)
    assert set(adata.obs["target_gene"]) == {"non-targeting", "GENE_A", "GENE_B", "GENE_C"}


def test_seed_is_reproducible() -> None:
    first = build_dataset(cells_per_group=5, n_genes=120, seed=7)
    second = build_dataset(cells_per_group=5, n_genes=120, seed=7)
    assert (first.X != second.X).nnz == 0
    assert first.obs.equals(second.obs)


def test_on_target_knockdown_is_visible() -> None:
    adata = build_dataset(cells_per_group=40, n_genes=140, seed=11)
    for cell_type, target in [("type_alpha", "GENE_A"), ("type_beta", "GENE_B")]:
        target_index = adata.var_names.get_loc(target)
        control_mask = np.asarray((adata.obs["cell_type"] == cell_type) & (adata.obs["target_gene"] == "non-targeting"))
        pert_mask = np.asarray((adata.obs["cell_type"] == cell_type) & (adata.obs["target_gene"] == target))
        control_mean = float(adata.X[control_mask, target_index].mean())
        pert_mean = float(adata.X[pert_mask, target_index].mean())
        assert pert_mean < 0.45 * control_mean


def test_pseudobulk_conserves_counts() -> None:
    adata = build_dataset(cells_per_group=6, n_genes=120, seed=17)
    result = aggregate_pseudobulk(adata, ["donor", "cell_type", "target_gene"], "counts")
    assert result.n_obs == 3 * 2 * 4
    assert np.array_equal(
        np.asarray(adata.layers["counts"].sum(axis=0)).ravel(),
        np.asarray(result.X.sum(axis=0)).ravel(),
    )
    assert (result.obs["n_cells"] == 6).all()


def test_qc_report_has_all_conditions() -> None:
    adata = build_dataset(cells_per_group=8, n_genes=120, seed=23)
    report = make_report(adata)
    assert len(report) == 4
    assert report["n_cells"].sum() == adata.n_obs
    assert report["median_library_size"].gt(0).all()
    assert report["median_pct_mito"].ge(0).all()
