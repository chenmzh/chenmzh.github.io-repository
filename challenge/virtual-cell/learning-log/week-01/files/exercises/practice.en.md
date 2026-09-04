# Week 1 Exercises and Reference Answers

## How to use this page

Answer each question independently before opening “Show reference answer.” The answers are for conceptual correction, not wording to memorize. Complete coding tasks in the student notebook before comparing with the examples.

## A. Concept questions

### 1. Does `adata.X` necessarily contain raw counts? Why or why not?

Name at least three pieces of evidence that help identify matrix semantics.

:::details Show reference answer
No. `X` is only AnnData's main matrix location; it may hold raw counts, normalized expression, or log-transformed values.

Check data provenance and processing documentation, dtype, non-negativity, whether nonzero values are approximately integers, the scale of library sizes, and whether `layers["counts"]` exists. Integrality supports “possibly counts,” but alone does not prove that the data were never processed.
:::

### 2. How is a sparse zero different from a missing value?

Why should zero not automatically mean “the gene is not expressed”? 

:::details Show reference answer
A sparse zero usually means that zero UMIs were observed under finite sequencing; a missing value means unobserved or unknown. Their statistical meanings differ.

A truly expressed gene may still receive zero counts because of capture efficiency, sequencing depth, and sampling noise. Say “no molecule was observed,” not “the gene is absolutely absent.”
:::

### 3. Why are 2,400 cells not 2,400 independent biological replicates?

Identify the observational and independent-replicate units in the toy data.

:::details Show reference answer
Cells are observational units, but cells from one donor and experiment share genetics, culture conditions, and technical processing, so they are correlated.

The toy data contain 2,400 cell observations, while three donors define the independent-replicate structure. Treating every cell as independent exaggerates effective sample size and creates pseudoreplication.
:::

### 4. How does CRISPRi differ from a complete knockout?

Why does this distinction matter for prediction?

:::details Show reference answer
CRISPRi represses transcription and may produce incomplete, cell-variable knockdown. A knockout more often disrupts DNA sequence or gene function and can produce stronger loss of function.

Therefore, target-gene counts after CRISPRi need not be exactly zero, and effect sizes from knockout experiments should not be transferred to CRISPRi unconditionally.
:::

### 5. Why is whole-expression correlation insufficient for perturbation prediction?

:::details Show reference answer
Most genes change little between control and perturbation, so highly expressed background genes dominate whole-profile correlation. A model that predicts control for every perturbation may still look highly correlated.

The important signal is change relative to control: which downstream genes move, whether directions are correct, how large effects are, and whether perturbations are distinguishable.
:::

### 6. What do `library_size`, `detected_genes`, and `pct_mito` measure?

:::details Show reference answer
`library_size` is the sum of counts across genes in one cell and reflects capture and sequencing depth. `detected_genes` counts genes above zero and reflects expression complexity. `pct_mito` is the fraction of counts assigned to mitochondrial genes and can flag damage or stress.

They are diagnostic measurements, not absolute good/bad labels. Interpret them by cell type, batch, and perturbation.
:::

### 7. Why should QC thresholds not be copied blindly from another dataset?

:::details Show reference answer
Tissue, cell type, platform, depth, and sample processing all change QC distributions. Metabolically active cells, for example, can naturally have higher mitochondrial fractions.

Inspect distributions by important experimental groups, justify thresholds, report removals after each step, and test whether conclusions are threshold-sensitive.
:::

### 8. Why does pseudobulk usually sum raw counts?

:::details Show reference answer
Summing raw counts within an independent replicate combines observed molecule counts while preserving count and library-size interpretation, which is compatible with negative-binomial count models.

Averaging after `log1p` operates on a display scale and is not raw-count pseudobulk.
:::

### 9. What problem does pseudobulk reduce, and what information does it lose?

:::details Show reference answer
It reduces pseudoreplication from treating correlated cells as independent and stabilizes donor/replicate-level comparisons.

It loses subpopulation structure, response heterogeneity, and distribution shape. Pseudobulk is useful for stable mean responses but cannot replace the challenge's required single-cell distribution prediction.
:::

### 10. Propose a validation split that avoids random-cell leakage.

:::details Show reference answer
A starting point is leave-one-donor-out: train on donor_1 and donor_2, and hold out all of donor_3. A complete cell type or perturbation can also be held out for stronger generalization tests.

Never scatter cells from the same donor across train and validation. In the toy data, donor_3 is perfectly confounded with batch_2, so this split also creates a batch shift.
:::

## B. Coding tasks

### 1. Complete an AnnData audit

Run `inspect_h5ad.py` and record shape, matrix type, dtype, sparsity, count location, and key metadata columns.

:::details Show approach and command
```bash
uv run python scripts/inspect_h5ad.py data/week01_toy_perturbseq.h5ad
```

Expected core results are 2,400 cells × 500 genes, CSR sparse, `int32`, non-negative, and integer-like. By contract, both `X` and `layers["counts"]` contain raw counts.
:::

### 2. Find the 10 largest library sizes safely

Do not call `.toarray()` on the complete matrix.

:::details Show example code
```python
import numpy as np

library_size = np.asarray(adata.X.sum(axis=1)).ravel()
top10_position = np.argsort(library_size)[-10:][::-1]
adata.obs.iloc[top10_position].assign(
    library_size_recomputed=library_size[top10_position]
)
```

`sum(axis=1)` aggregates directly on the sparse matrix. Only 2,400 row sums become a dense vector; the 2,400 × 500 expression matrix does not.
:::

### 3. Summarize QC by cell type and perturbation

Compute cell count, median library size, and median pct_mito.

:::details Show example code
```python
qc_summary = (
    adata.obs
    .groupby(["cell_type", "target_gene"], observed=True)
    .agg(
        n_cells=("target_gene", "size"),
        median_library_size=("library_size", "median"),
        median_pct_mito=("pct_mito", "median"),
    )
)
qc_summary
```

A global median alone can hide differences caused by biology or technical processing.
:::

### 4. Propose and audit a QC rule

Report retained cells after every step and explain why `pct_mito > 10` should not be removed mechanically.

:::details Show an example approach
```python
import numpy as np

library_floor = np.quantile(adata.obs["library_size"], 0.01)
step1 = adata.obs["library_size"] >= library_floor
step2 = step1 & (adata.obs["pct_mito"] <= 15)

print("before:", adata.n_obs)
print("after library filter:", int(step1.sum()))
print("after mito filter:", int(step2.sum()))
```

This is a toy-data example, not a universal standard. In real data, inspect removal rates by cell type, batch, and perturbation; otherwise genuine stress or perturbation responses may be removed selectively.
:::

### 5. Build pseudobulk and prove count conservation

Aggregate by donor × cell type × target_gene.

:::details Show example code
```python
import numpy as np
from scripts.pseudobulk import aggregate_pseudobulk

pb = aggregate_pseudobulk(
    adata,
    group_cols=["donor", "cell_type", "target_gene"],
    counts_layer="counts",
)

before = np.asarray(adata.layers["counts"].sum(axis=0)).ravel()
after = np.asarray(pb.X.sum(axis=0)).ravel()
np.testing.assert_array_equal(before, after)
assert pb.n_obs == 24
```

Conservation detects dropped groups, double counting, and accidental filtering. The 24 samples are 3 donors × 2 cell types × 4 conditions.
:::

### 6. Check GENE_A on-target knockdown

Compare mean raw counts between control and GENE_A perturbation within type_alpha.

:::details Show example code
```python
import numpy as np

gene_index = adata.var_names.get_loc("GENE_A")
control = np.asarray(
    (adata.obs["cell_type"] == "type_alpha")
    & (adata.obs["target_gene"] == "non-targeting")
)
perturbed = np.asarray(
    (adata.obs["cell_type"] == "type_alpha")
    & (adata.obs["target_gene"] == "GENE_A")
)

control_mean = float(adata.X[control, gene_index].mean())
perturbed_mean = float(adata.X[perturbed, gene_index].mean())
control_mean, perturbed_mean
```

The perturbed mean should be much lower but not fixed at zero. Convert boolean masks to NumPy arrays to avoid SciPy sparse indexing incompatibility with Pandas Series.
:::

### 7. Compare the cell-type-specific PATH_A_01 response

Calculate GENE_A-perturbation versus control log2 fold-change in type_alpha and type_beta.

:::details Show example code
```python
import numpy as np

gene_index = adata.var_names.get_loc("PATH_A_01")
for cell_type in ["type_alpha", "type_beta"]:
    control = np.asarray(
        (adata.obs["cell_type"] == cell_type)
        & (adata.obs["target_gene"] == "non-targeting")
    )
    perturbed = np.asarray(
        (adata.obs["cell_type"] == cell_type)
        & (adata.obs["target_gene"] == "GENE_A")
    )
    control_mean = float(adata.X[control, gene_index].mean())
    perturbed_mean = float(adata.X[perturbed, gene_index].mean())
    log2fc = np.log2((perturbed_mean + 1) / (control_mean + 1))
    print(cell_type, log2fc)
```

Activation should be stronger in type_alpha. The `+1` pseudocount is only a Week 1 demonstration device, not a formal differential-expression method.
:::

### 8. Explain donor_3–batch_2 confounding

:::details Show reference answer
The generator always places donor_1 and donor_2 in batch_1 and donor_3 in batch_2. Any donor_3 difference could therefore come from donor, batch, or both.

A better design would include multiple donors per batch or measure the same donor across batches. A statistical model cannot recover independent information that the experiment never created.
:::

## C. Deliverables and grading

- a notebook that runs in order from a fresh kernel;
- a QC CSV and three basic figures;
- a pseudobulk `.h5ad`;
- a 300–500 word interpretation;
- a group-aware validation-split proposal.

Suggested grading: environment and audit 20%, QC 30%, pseudobulk 30%, concepts and reproducibility 20%. Reach at least 80% and pass all five hard requirements listed on the course page.
