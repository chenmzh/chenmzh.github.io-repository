# Week 1 Instructor Notes (English)

## How to use these notes

This is not a vocabulary list to memorize. It is a reasoning chain from experiment to matrix and from matrix to statistical conclusion. For every concept, answer three questions:

1. What does it represent in the biological experiment?
2. Where does it live in AnnData?
3. What goes wrong if its meaning is misunderstood?

Week 1 deliberately avoids complex model training. First build reliable habits around data semantics, experimental units, and sparse-matrix operations.

## Capabilities to reach by the end of the week

The learner should be able to:

1. rebuild the course from a clean environment and report Python, package versions, and the random seed;
2. explain gene, RNA, transcription, gene expression, control, CRISPRi, and perturbation;
3. describe the measurement chain from biological process to RNA capture, UMI, and count matrix;
4. identify AnnData `X`, `obs`, `var`, `layers`, `obsm`, and `uns` correctly;
5. distinguish raw counts, library-size-normalized expression, and log1p expression;
6. compute library size, detected genes, and pct_mito without densifying the full matrix;
7. distinguish cell observations, experimental units, biological replicates, and technical replicates;
8. explain pseudoreplication, batch effects, and confounding;
9. sum raw counts by donor × cell type × condition to create pseudobulk;
10. design a group-aware validation split that matches a stated generalization target.

## Fixed terminology

- **Cell**: one observed object, usually one row of `X`.
- **Gene**: a functional DNA unit that can be transcribed, usually one column of `X`.
- **RNA molecule**: a product of transcription; scRNA-seq captures only a subset.
- **Raw counts**: observed UMI numbers for each cell × gene pair.
- **Perturbation**: an intervention applied to a cell, such as repressing one gene.
- **Control**: a reference group without the target intervention, used to estimate what would happen without it.
- **Biological replicate**: an independently produced biological sample, such as a donor.
- **Technical replicate**: repeated measurement of the same biological material; it does not automatically add independent biological samples.
- **Pseudoreplication**: incorrectly treating correlated cells as many independent replicates.
- **Confounding**: two factors always change together, so their effects cannot be identified separately.

## Day 1: From biology to a count matrix

### 1.1 What gene expression means

A gene is not a number in a matrix. Matrix numbers come from this measurement chain:

1. a gene in DNA is transcribed;
2. RNA molecules are produced inside the cell;
3. the single-cell assay lyses or fixes the cell and captures only some RNA;
4. RNA is reverse-transcribed and labeled with a cell barcode and UMI;
5. reads are deduplicated and assigned to genes;
6. the result is a UMI count for one cell × gene pair.

A count is therefore the number of molecules observed after finite capture and sequencing, not an error-free measurement of total intracellular RNA.

A minimal matrix looks like this:

```text
             GENE_A  GENE_B  GENE_C
cell_001          0       4       1
cell_002          2       0       7
cell_003          1       3       0
```

Rows are cells and columns are genes. `cell_001, GENE_A = 0` only means that zero UMIs were observed. It may arise from truly low expression or from finite capture efficiency and sampling noise.

### 1.2 Why cells of one type still differ

Variation has at least two sources:

- **Biological variation**: cell cycle, state, stochastic transcription, subpopulations, and real perturbation response;
- **Technical variation**: capture efficiency, sequencing depth, batch, guide efficiency, and alignment error.

A model should learn stable biological response, but both sources are mixed in the data. Week 1 teaches how to label and audit them before interpreting every difference as biology.

### 1.3 CRISPRi, controls, and Perturb-seq

CRISPRi directs inactive Cas9 with a repressive domain to a gene-regulatory region and reduces transcription. It is usually a knockdown and does not guarantee zero expression.

Perturb-seq measures perturbation identity and single-cell RNA expression together:

- `guide_id` says which guide a cell received;
- `target_gene` records the intended target;
- a non-targeting control (NTC) guide targets no specific gene and estimates the reference state;
- the on-target effect is reduction of the target gene itself;
- the downstream response is the change in other genes and pathways.

The Virtual Cell Challenge is not only about on-target knockdown. It asks for downstream transcriptomic responses and single-cell distributions conditioned on the control state.

### 1.4 Demonstration

```bash
bash setup.sh
uv run python scripts/check_environment.py --lang en
uv run python scripts/make_toy_perturbseq.py --seed 2026
```

A fixed seed makes the toy dataset reproducible for debugging and comparison. It does not replace biological replication in a real experiment.

### 1.5 Understanding check

- Why does zero counts not prove absolute absence of expression?
- Why should CRISPRi not be assumed to be a complete knockout?
- What counterfactual reference does an NTC control provide?
- Which sources of variation may be biological, and which may be technical?

**Deliverable:** an environment report and a diagram from gene → RNA → UMI → matrix → prediction.

## Day 2: AnnData, data scales, and sparse matrices

### 2.1 AnnData is a labeled matrix container

For `adata.shape == (n_cells, n_genes)`:

- `adata.X`: the main expression matrix, cells × genes; its position is fixed but its semantics are not;
- `adata.obs`: cell metadata, with each row aligned to one row of `X`;
- `adata.var`: gene metadata, with each row aligned to one column of `X`;
- `adata.layers[name]`: alternative expression matrices with the same shape as `X`, such as `layers["counts"]`;
- `adata.obsm[name]`: multidimensional cell-level representations such as PCA coordinates;
- `adata.uns`: settings, descriptions, or results not aligned to the cell/gene axes.

Trace one object: `adata.obs_names[0]` identifies the first cell, `adata.var_names[0]` identifies the first gene, and `adata.X[0, 0]` is their intersection.

### 2.2 `X` does not mean raw counts

`X` may hold:

1. raw counts, such as `[0, 10, 90]`;
2. library-size-normalized values, such as scaling total counts 100 to 10,000 and obtaining `[0, 1000, 9000]`;
3. log1p values, such as `[0, 6.91, 9.11]`.

To identify raw counts, jointly inspect:

- provenance and processing documentation;
- dtype and numerical range;
- finiteness, non-negativity, and approximate integrality;
- the scale of per-cell total counts;
- whether a documented `layers["counts"]` exists.

Important boundary: non-negative integers are evidence, not sufficient proof of provenance. A processed matrix could also be rounded to integers.

### 2.3 Why sparse matrices matter

Single-cell matrices contain many zeros. CSR sparse matrices store values and indices for nonzero entries instead of allocating full memory for every zero.

- `X.data` contains explicitly stored values, not implicit zeros;
- `X.sum(axis=1)` computes row sums directly;
- `X.getnnz(axis=1)` counts stored entries; if explicit zeros exist, call `eliminate_zeros()` first;
- `np.asarray(X.sum(axis=1)).ravel()` densifies only a small vector of row sums;
- `X.toarray()` expands the full matrix and may exhaust memory at challenge scale.

The toy generator creates a dense matrix and converts it to CSR only for readability. A real large-data pipeline should avoid constructing the complete dense matrix in the first place.

### 2.4 Demonstration

```bash
uv run python scripts/inspect_h5ad.py data/week01_toy_perturbseq.h5ad
```

The report should include shape, CSR status, dtype, finite, non-negative, integer-like, obs/var columns, and layers. Do not let `integer_like=True` replace provenance checks.

### 2.5 Understanding check

- Which axes do `obs` and `var` align to?
- Why must `layers["counts"]` have the same shape as `X`?
- What are normalized and log1p values useful for, and why must the final submission still use raw integer counts?
- When is it acceptable to call `.toarray()` on a very small slice?

**Deliverable:** a data-audit table and one sentence locating raw counts with supporting evidence.

## Day 3: Experimental units, confounding, and QC

### 3.1 Observational units are not experimental units

- **Observational unit**: one recorded row; here, a cell.
- **Experimental unit**: an independently treated unit that could be randomized.
- **Biological replicate**: an independent biological source such as a donor.
- **Technical replicate**: repeated processing or sequencing of the same biological material.

Many cells from one donor share background and cannot be treated as independent replicates. Calling 2,400 cells “2,400 independent replicates” underestimates standard errors and exaggerates significance.

The toy hierarchy is:

```text
3 donors
└── 2 cell types per donor
    └── 4 conditions per cell type
        └── 100 cell observations per group
```

### 3.2 Batch effects and confounding

A batch effect is systematic variation from library date, reagent lot, instrument, or operator.

The toy data intentionally use:

```text
donor_1 → batch_1
donor_2 → batch_1
donor_3 → batch_2
```

Donor_3 and batch_2 are perfectly confounded. A donor_3 difference cannot be separated into donor and batch effects. A more complex model cannot reconstruct independent information missing from the experimental design.

### 3.3 Three basic QC measurements

For cell c, gene g, and raw count `x[c,g]`:

```text
library_size[c]   = sum over genes g of x[c,g]
detected_genes[c] = sum over genes g of I(x[c,g] > 0)
pct_mito[c]       = 100 × mitochondrial_counts[c] / library_size[c]
```

Zero library size requires explicit division-by-zero handling. Mitochondrial genes should be identified from annotation; the toy data use `var["is_mito"]`.

Interpretation:

- very low library size may indicate capture failure;
- very few detected genes may indicate low complexity;
- high pct_mito may indicate damage, but can also reflect real state or cell-type biology.

### 3.4 Thresholds are not natural constants

Use this order:

1. inspect distributions by cell type, condition, donor, and batch;
2. propose an interpretable threshold;
3. report removals after every step;
4. check whether one group is removed selectively;
5. vary thresholds in a sensitivity analysis.

If a perturbation truly causes stress and elevated pct_mito, mechanical filtering may delete the strongest responders and distort the target signal.

### 3.5 Demonstration

```bash
uv run python scripts/qc_report.py \
  data/week01_toy_perturbseq.h5ad \
  --group-col target_gene
```

A single `target_gene` summary is useful for a first audit but can hide cell-type, donor, and batch differences. A formal report should stratify further and inspect quantiles or figures; a median is not an uncertainty estimate.

**Deliverable:** QC summary, three distribution figures, a filter log, and threshold rationale.

## Day 4: Pseudobulk and count-model intuition

### 4.1 Why pseudobulk is needed

Treating hundreds of cells per donor as independent creates pseudoreplication. Pseudobulk sums raw counts inside each independent replicate and biological-condition combination:

```text
pseudobulk[donor, cell_type, condition, gene]
= sum of raw counts across cells in that group
```

The course key is `donor × cell_type × target_gene`, so the expected number is:

```text
3 donors × 2 cell types × 4 conditions = 24 pseudobulk samples
```

Aggregating only by condition merges all donors and leaves no replicate-level variation for uncertainty estimation.

### 4.2 What count conservation proves

For every gene after aggregation:

```text
sum before aggregation = sum after aggregation
```

This catches dropped groups, double counting, or accidental filtering. It does not prove that the biological grouping key is correct or that confounding is absent.

### 4.3 Statistical work remains after pseudobulk

Pseudobulk samples may contain different cell numbers or sequencing depths, so raw totals should not be compared without adjustment. Later analysis commonly needs:

- library-size normalization or suitable size factors;
- a replicate-level model;
- effect size and uncertainty;
- modeling consistent with batch and experimental design.

Week 1 performs correct aggregation and descriptive comparison only. Raw single-cell means are not treated as formal inference.

### 4.4 Why the toy counts use Gamma–Poisson

Single-cell counts are often overdispersed, meaning variance exceeds the mean. A Gamma–Poisson mixture corresponds to a negative-binomial parameterization:

```text
Var(Y) = μ + μ² / θ
```

Here μ is expected count and smaller θ creates more extra variation. The generator converts log2 fold-change into a mean multiplier using `2 ** log2FC`: log2FC = 1 doubles the mean, while -1 halves it.

This is a teaching model. It does not fully represent real gene-gene correlation, guide efficiency, off-target effects, or complex dropout.

### 4.5 Demonstration

```bash
uv run python scripts/pseudobulk.py \
  data/week01_toy_perturbseq.h5ad \
  --group-cols donor cell_type target_gene
```

**Deliverable:** 24 pseudobulk samples, aligned metadata, per-gene conservation proof, and an explanation of what pseudobulk gains and loses.

## Day 5: Description, inference, and leakage-aware validation

### 5.1 Descriptive comparison is not formal inference

Comparing control and perturbation means helps understand direction, but it does not automatically provide a reliable p-value or cross-donor conclusion.

Formal inference uses donors/replicates as samples, estimates between-sample variation, and states model assumptions. Week 1 raw means and simple log2FC values are teaching-level descriptive statistics.

### 5.2 A split must answer a specific generalization question

- **Leave-one-donor-out**: can the model transfer to a new donor?
- **Leave-one-cell-type-out**: can it transfer to a new cell type or context?
- **Leave-one-perturbation-out**: can it predict an unseen perturbation?
- **Final challenge-style split**: can it handle both new contexts and a new perturbation panel?

State the desired generalization first, then choose the split. Randomly splitting cells usually places the same donor, batch, guide, or near-identical state on both sides and produces optimistic validation.

### 5.3 Connection to the Virtual Cell Challenge

The toy data reveal cell type, donor, batch, and ground-truth effects for teaching. Real challenge contexts are anonymous, perturbation responses are hidden, and submissions require 400 raw-count single-cell profiles per perturbation.

Week 1 habits directly affect later work:

- misunderstanding data scale can produce invalid submissions;
- random cell splits overestimate generalization;
- predicting only a mean loses single-cell variation;
- whole-profile correlation can hide true perturbation-response failure.

### 5.4 End-to-end assessment

From a fresh kernel:

1. read and audit AnnData;
2. locate raw counts;
3. compute QC with sparse-safe operations;
4. aggregate pseudobulk according to the design;
5. inspect one on-target and one downstream response;
6. explain donor–batch confounding;
7. propose a split that matches a stated target;
8. write conclusions, evidence, and limitations.

## Script map

- `check_environment.py`: validates the interpreter, packages, AnnData sparse round-trip, and VCC CLI;
- `make_toy_perturbseq.py`: creates known effects, overdispersion, and transparent confounding;
- `inspect_h5ad.py`: audits evidence about matrix semantics without densifying;
- `qc_report.py`: produces grouped descriptive QC statistics;
- `pseudobulk.py`: sums by replicate-aware groups and verifies count conservation.

## Common errors and corrections

- Replace “zero means the gene is not expressed” with “zero UMIs were observed under finite sequencing.”
- Replace “there are 2,400 replicates” with “there are 2,400 cell observations; independent replicates come from the design.”
- Replace “`X` is raw” with “provenance, the data contract, and numerical checks show that this `X` stores raw counts.”
- Replace “the QC threshold is always 10%” with “the threshold follows grouped distributions and sensitivity analysis.”
- Replace “conservation proves the pseudobulk is correct” with “conservation proves only that counts were not dropped or duplicated.”
- Replace “different means imply significance” with “a mean difference is descriptive; inference requires replicate-level uncertainty.”

## Grading

- environment and data audit: 20%;
- QC mini-report: 30%;
- pseudobulk analysis: 30%;
- concepts, reproducibility, and leakage explanation: 20%.

A suggested passing score is 80%, with hard requirements: do not confuse counts and log data; do not treat cells as independent replicates; do not densify the complete matrix; rerun the notebook from a fresh kernel; and match validation design to the stated generalization target.
