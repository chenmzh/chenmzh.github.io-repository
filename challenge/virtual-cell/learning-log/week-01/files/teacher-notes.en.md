# Week 1 Instructor Notes (English)

## Teaching thread

Week 1 revolves around one question: **What does every number in the matrix, every metadata row, and every grouping variable mean experimentally?**

If the learner cannot answer that question, a more complex model only makes mistakes harder to detect.

## Measurable learning objectives

By the end of the week, the learner should be able to:

1. rebuild the course from a clean environment and report Python, package versions, and the random seed;
2. explain cell, gene, RNA, expression, control, and perturbation in their own words;
3. identify AnnData `X`, `obs`, `var`, `layers`, and `obsm` correctly;
4. locate raw counts and check non-negativity, integrality, and sparsity;
5. compute library size, detected genes, and mitochondrial fraction without densifying the full matrix;
6. separate observational units (cells) from independent inferential units (donors/replicates);
7. sum raw counts by donor × cell type × condition to create pseudobulk samples;
8. design validation splits that do not leak by randomly splitting cells.

## Day 1: environment, task map, and minimum biology

### Mini-lecture

Draw the challenge as three stages: target-cell control state → CRISPRi on a specified gene → predicted downstream expression distribution. Emphasize that CRISPRi reduces transcription but does not guarantee complete loss, and zero counts do not prove absolute absence of expression.

### Instructor questions

- Why does one cell have counts for thousands of genes?
- Why do two cells of the same type not have identical counts?
- What can differ between control and perturbation groups besides treatment?

### Practice and deliverable

Run `setup.sh`, the environment check, and the toy-data generator. Submit the version output and a diagram of experimental unit → observational unit → prediction target.

### Exit ticket

In three sentences, explain gene expression, the role of a control, and the prediction target.

## Day 2: AnnData, raw counts, and sparse matrices

### Mini-lecture

`X` is only a matrix location; it does not guarantee semantics. `adata.raw` is not guaranteed to contain true raw counts either. Meaning comes from provenance, numerical checks, and documentation. Sparse zeros are observed zeros, not missing values.

### Demonstration

- inspect shape, dtype, `nnz`, and `layers`;
- use `X.sum(axis=1)` and `X.getnnz(axis=1)`;
- densify only a tiny slice and estimate full dense-memory cost.

### Deliverable

Complete a data-audit table: cells, genes, matrix type, dtype, sparsity, count location, and key obs/var columns.

### Exit ticket

Explain why `adata.X.toarray()` is dangerous on challenge-scale data.

## Day 3: experimental design and QC

### Mini-lecture

Cells are observational units, while donors or experimental replicates are usually the independent inferential units. QC thresholds are not natural constants; they depend on distributions, groups, and purpose. High mitochondrial fraction is not automatically proof of a bad cell.

### Practice

Compare total counts, detected genes, and mitochondrial fraction by perturbation, cell type, and batch. Describe distributions before proposing filters, and report removals after every step. Roughly 3% of toy cells are transparently labeled simulated low-quality cells; use them to test reasoning rather than memorize a threshold.

### Exit ticket

Explain how over-aggressive QC can remove true perturbation responses.

## Day 4: first pseudobulk analysis

### Mini-lecture

Pseudobulk usually sums raw counts within the correct experimental groups. It reduces pseudoreplication from treating many correlated cells as independent replicates, but it loses subpopulation and single-cell heterogeneity.

### Practice

Use `scripts/pseudobulk.py` to aggregate by `donor × cell_type × target_gene`. Verify that every sample has metadata, per-gene counts are exactly conserved, and donor_3 is confounded with batch_2—so donor and batch effects cannot be claimed as separately identified.

### Exit ticket

Why is “log1p first, then average cells” not a raw-count pseudobulk procedure?

## Day 5: end-to-end mini-project

Restart the kernel and complete reading → audit → QC → pseudobulk → control/perturbation comparison → validation-split proposal.

### Assessment

- environment and data audit: 20%;
- QC report: 30%;
- pseudobulk analysis: 30%;
- concepts and reproducibility: 20%.

A suggested passing score is 80%, with hard requirements: do not confuse counts/log data; do not treat cells as independent replicates; do not densify the full matrix; rerun the notebook in order; use donor-, cell-type-, or perturbation-aware validation.

## Useful corrections

- Replace “0 means the gene is not expressed” with “0 UMIs were observed under finite sequencing depth.”
- Replace “there are 2,400 replicates” with “there are 2,400 cell observations; independent replicates are defined by donors/experimental design.”
- Replace “X is raw” with “the data contract and numerical checks show that this X contains raw integer counts.”
- Replace “the QC threshold is 10%” with “the threshold is justified from distributions, groups, and sensitivity analysis.”
