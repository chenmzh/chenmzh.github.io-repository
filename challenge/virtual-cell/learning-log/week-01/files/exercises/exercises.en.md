# Week 1 Exercises (English)

## A. Concept questions

1. Does `adata.X` necessarily contain raw counts? Why or why not?
2. How is a sparse zero different from a missing value?
3. Why are 2,400 cells not 2,400 independent biological replicates?
4. How does CRISPRi differ from a complete knockout?
5. Why is whole-expression correlation insufficient for perturbation prediction?
6. What do `library_size`, `detected_genes`, and `pct_mito` measure?
7. Why should QC thresholds not be copied blindly from another dataset?
8. Why does pseudobulk usually sum raw counts?
9. What problem does pseudobulk reduce, and what information does it lose?
10. Propose a validation split that does not leak by randomly splitting cells.

## B. Coding tasks

1. Run `inspect_h5ad.py` and complete a data-audit table.
2. Find the 10 cells with the largest library sizes without calling `.toarray()` on the complete matrix.
3. Compute cell count, median library size, and median pct_mito by `cell_type` and `target_gene`.
4. Propose a QC rule, report retained cells after each step, and explain why you would not blindly remove every cell with `pct_mito > 10`.
5. Use `aggregate_pseudobulk` by donor × cell_type × target_gene and prove per-gene count conservation.
6. Compare mean GENE_A expression between control and GENE_A perturbation within type_alpha.
7. Test whether the PATH_A_01 response is the same in type_alpha and type_beta.
8. Explain how confounding between donor_3 and batch_2 limits your conclusions.

## C. Deliverables

- a notebook that runs in order from a fresh kernel;
- a QC CSV and three basic figures;
- a pseudobulk `.h5ad`;
- a 300–500 word interpretation;
- a group-aware validation-split proposal.
