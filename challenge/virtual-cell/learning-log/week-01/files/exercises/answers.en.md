# Week 1 Reference Answers (English)

1. No. `X` is only the main matrix location and may store counts, normalized data, or log data. Check provenance, documentation, dtype, non-negativity, and integrality.
2. A sparse zero usually means zero counts were observed under finite sequencing; missing means unobserved or unknown. Their statistical meanings differ.
3. Cells from one donor/experiment share biological and technical factors and are correlated. Independent replicates are usually donors or experimental replicates.
4. CRISPRi usually represses transcription and may be incomplete. A knockout usually disrupts gene function, but does not guarantee complete loss of every phenotype.
5. Strong baseline expression can dominate correlation, while the target is the downstream change relative to control.
6. Total counts per cell, number of nonzero genes, and the fraction of counts assigned to mitochondrial genes.
7. Platform, tissue, cell type, depth, and processing change QC distributions. Thresholds need justification from the current dataset and task.
8. Summation preserves count-model and library-size meaning. Averaging after log transformation is no longer raw-count aggregation.
9. It reduces cell-level pseudoreplication and improves replicate-level stability, but loses subpopulation and heterogeneity information.
10. Example: leave one donor out, or hold out a complete cell type/perturbation; never randomly place cells from the same donor on both sides.

Coding tasks do not have one universal threshold. Full-credit work must be sparse-safe, conserve every gene's counts during pseudobulk aggregation, and state that donor_3 and batch_2 are perfectly confounded, so their effects cannot be estimated separately from this toy design.

Expected direction: mean GENE_A expression under GENE_A perturbation is much lower than control in type_alpha; PATH_A_01 activation is stronger in type_alpha than type_beta. Exact values vary due to sampling.
