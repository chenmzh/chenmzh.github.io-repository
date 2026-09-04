# 第一周教师讲义（中文）

## 如何使用这份讲义

这不是需要背诵的名词表，而是一条从实验到矩阵、再从矩阵到统计结论的推理链。每个概念都要回答三个问题：

1. 它在生物实验中代表什么？
2. 它在 AnnData 中存在哪里？
3. 如果理解错误，会让分析产生什么后果？

第一周暂不训练复杂模型。目标是先建立可靠的数据语义、实验单位和稀疏矩阵操作习惯。

## 本周结束时应达到的能力

学习者应能：

1. 从干净环境重建课程，并报告 Python、关键包版本和随机种子；
2. 解释 gene、RNA、transcription、gene expression、control、CRISPRi 和 perturbation；
3. 说明“生物过程 → RNA 捕获 → UMI → count matrix”的测量链；
4. 正确指出 AnnData 的 `X`、`obs`、`var`、`layers`、`obsm` 和 `uns`；
5. 区分 raw counts、library-size normalized expression 与 log1p expression；
6. 在不 densify 全矩阵的情况下计算 library size、detected genes 和 pct_mito；
7. 区分 cell observation、experimental unit、biological replicate 和 technical replicate；
8. 解释 pseudoreplication、batch effect 与 confounding；
9. 按 donor × cell type × condition 对 raw counts 求和形成 pseudobulk；
10. 根据泛化目标设计 group-aware validation split。

## 固定术语表

- **cell / 细胞**：表达矩阵中的一个观测对象，通常对应 `X` 的一行。
- **gene / 基因**：可被转录的 DNA 功能单元，通常对应 `X` 的一列。
- **RNA / RNA 分子**：基因转录后的产物；scRNA-seq 只捕获其中一部分。
- **raw counts / 原始计数**：每个 cell × gene 组合中观察到的 UMI 数量。
- **perturbation / 扰动**：对细胞施加的干预，例如抑制某个基因。
- **control / 对照**：不针对具体基因的参考组，用来估计“如果没有目标扰动会怎样”。
- **biological replicate / 生物重复**：独立产生的生物样本，例如不同 donor。
- **technical replicate / 技术重复**：对同一生物样本重复测量，不能自动增加独立生物样本数。
- **pseudoreplication / 伪重复**：把相关的细胞误当成大量独立重复。
- **confounding / 混杂**：两个因素总是一起变化，导致其作用无法分别识别。

## Day 1：从生物过程到 count matrix

### 1.1 Gene expression 到底是什么

一个基因不是矩阵里的数字。矩阵数字来自以下测量链：

1. DNA 上的 gene 被细胞转录；
2. 细胞中产生 RNA molecules；
3. 单细胞实验裂解或固定细胞并捕获其中一部分 RNA；
4. RNA 被逆转录、加上 cell barcode 与 UMI；
5. 测序 reads 经过去重和基因比对；
6. 最终得到某个 cell × gene 的 UMI count。

因此 count 是“经过有限捕获和测序后观察到的分子数”，不是细胞内真实 RNA 总量的无误差测量。

一个最小矩阵可以写成：

```text
             GENE_A  GENE_B  GENE_C
cell_001          0       4       1
cell_002          2       0       7
cell_003          1       3       0
```

行是细胞，列是基因。`cell_001, GENE_A = 0` 只表示这次测量观察到 0 个 UMI；它可能来自真实低表达，也可能来自有限 capture efficiency 和 sampling noise。

### 1.2 为什么同类细胞也不完全一样

变异至少来自两类来源：

- **Biological variation**：细胞周期、状态、随机转录、亚群差异、真实扰动响应；
- **Technical variation**：捕获效率、测序深度、批次、guide efficiency、比对误差。

模型需要学习稳定的生物响应，但数据中两类变异混合在一起。第一周先学会标记和审计这些来源，而不是急于把所有差异都解释为生物学。

### 1.3 CRISPRi、control 与 Perturb-seq

CRISPRi 使用失活 Cas9 与抑制结构域定位到基因调控区域，从而降低转录。它通常是 knockdown，不保证目标基因完全为 0。

Perturb-seq 把 perturbation identity 与单细胞 RNA 表达同时测量：

- `guide_id` 表示细胞收到哪个 guide；
- `target_gene` 表示目标基因；
- non-targeting control（NTC）guide 不针对目标基因，用于估计参考状态；
- on-target effect 是目标基因本身下降；
- downstream response 是其他基因和通路随之变化。

Virtual Cell Challenge 的核心不是只预测 on-target knockdown，而是根据 control 状态预测下游转录组响应和单细胞分布。

### 1.4 本日演示

```bash
bash setup.sh
uv run python scripts/check_environment.py --lang zh
uv run python scripts/make_toy_perturbseq.py --seed 2026
```

固定 seed 的意义是让相同代码得到相同 toy 数据，便于排错和比较。真实实验重复性不能由固定随机种子替代。

### 1.5 理解检查

- 为什么 0 count 不等于“基因绝对不表达”？
- CRISPRi 为什么不应被假设为完全 knockout？
- NTC control 提供了什么反事实参考？
- 哪些变异可能是 biological，哪些可能是 technical？

**本日产出：**环境版本报告，以及一张“gene → RNA → UMI → matrix → prediction”的流程图。

## Day 2：AnnData、数据尺度与稀疏矩阵

### 2.1 AnnData 是带标签的矩阵容器

对于 `adata.shape == (n_cells, n_genes)`：

- `adata.X`：主表达矩阵，shape 为 cells × genes；位置固定，语义不固定；
- `adata.obs`：细胞元数据，每一行必须与 `X` 的一行对齐；
- `adata.var`：基因元数据，每一行必须与 `X` 的一列对齐；
- `adata.layers[name]`：与 `X` 同形的替代表达矩阵，例如 `layers["counts"]`；
- `adata.obsm[name]`：每个细胞的多维表示，例如 PCA coordinates；
- `adata.uns`：不沿 cell/gene 轴对齐的配置、说明或结果。

追踪一个对象：`adata.obs_names[0]` 指向第一个细胞；`adata.var_names[0]` 指向第一个基因；`adata.X[0, 0]` 是这两者交叉位置的数值。

### 2.2 `X` 不等于 raw counts

`X` 可能保存：

1. raw counts，例如 `[0, 10, 90]`；
2. library-size normalized values，例如把总 counts 100 缩放到 10,000 后得到 `[0, 1000, 9000]`；
3. log1p values，例如 `[0, 6.91, 9.11]`。

判断 raw counts 时应联合检查：

- 数据生成流程和官方文档；
- dtype 与数值范围；
- 非负性、有限性和近似整数性；
- 每细胞总 counts 的数量级；
- 是否存在明确的 `layers["counts"]`。

重要边界：非负整数检查只是证据，不是 provenance 的充分证明。一个处理后的矩阵也可以被四舍五入成整数。

### 2.3 为什么要使用 sparse matrix

单细胞矩阵中大量位置为 0。CSR sparse matrix 只存储非零位置及索引，避免为每个 0 分配完整内存。

- `X.data` 只包含显式存储值，不包含隐式零；
- `X.sum(axis=1)` 可以直接计算每行总和；
- `X.getnnz(axis=1)` 统计存储的非零项；若数据含显式存储的 0，应先 `eliminate_zeros()`；
- `np.asarray(X.sum(axis=1)).ravel()` 只把行总和变成小型一维数组；
- `X.toarray()` 会把完整矩阵展开，真实比赛规模下可能耗尽内存。

在 toy 数据里先生成 dense 再转 CSR 只是为了代码易读；真实大数据流程应从开始就避免构造完整 dense matrix。

### 2.4 本日演示

```bash
uv run python scripts/inspect_h5ad.py data/week01_toy_perturbseq.h5ad
```

检查结果应包括 shape、CSR、dtype、finite、non-negative、integer-like、obs/var columns 与 layers。不要看到 `integer_like=True` 就跳过数据来源确认。

### 2.5 理解检查

- `obs` 和 `var` 分别沿哪条轴对齐？
- `layers["counts"]` 与 `X` 为什么必须同形？
- normalized 与 log1p 的用途是什么？为什么最后提交仍要求 raw integer counts？
- 什么时候可以对一个很小的切片调用 `.toarray()`？

**本日产出：**一张数据审计表，并用一句话说明 raw counts 的位置与证据。

## Day 3：实验单位、混杂与质量控制

### 3.1 观测单位不等于实验单位

- **Observational unit**：实际记录的一行数据；这里是一枚 cell。
- **Experimental unit**：独立接受处理、可被随机分配的单位。
- **Biological replicate**：独立生物来源，例如 donor。
- **Technical replicate**：同一生物材料的重复上机或建库。

同一 donor 中的许多细胞共享背景，因此不能把 2,400 个细胞写成 2,400 个独立重复。否则标准误会被低估，显著性被夸大。

Toy 数据的嵌套关系是：

```text
3 donors
└── 2 cell types per donor
    └── 4 conditions per cell type
        └── 100 cell observations per group
```

### 3.2 Batch effect 与 confounding

Batch effect 是由建库日期、试剂、仪器或操作者等技术因素引入的系统差异。

Toy 数据故意设置：

```text
donor_1 → batch_1
donor_2 → batch_1
donor_3 → batch_2
```

因此 donor_3 与 batch_2 完全混杂。看到 donor_3 的差异时，无法分别估计 donor effect 与 batch effect。增加更复杂的模型不能弥补实验设计中不存在的交叉信息。

### 3.3 三个基础 QC 指标

对于细胞 c 和基因 g 的 raw count `x[c,g]`：

```text
library_size[c]   = sum over genes g of x[c,g]
detected_genes[c] = sum over genes g of I(x[c,g] > 0)
pct_mito[c]       = 100 × mitochondrial_counts[c] / library_size[c]
```

如果 library size 为 0，比例计算必须显式避免除零。线粒体基因通常由基因注释识别；toy 数据使用 `var["is_mito"]`。

指标解释：

- 很低 library size 可能表示捕获失败；
- 很低 detected genes 可能表示低复杂度；
- 高 pct_mito 可能提示细胞受损，也可能是真实细胞状态或 cell-type 特征。

### 3.4 阈值不是自然常数

正确顺序是：

1. 按 cell type、condition、donor、batch 观察分布；
2. 提出可解释的阈值；
3. 报告每一步删除多少细胞；
4. 检查某一组是否被选择性删除；
5. 改变阈值做 sensitivity analysis。

如果 perturbation 本身导致应激和 pct_mito 升高，机械过滤可能删除最强响应细胞，从而扭曲任务目标。

### 3.5 本日演示

```bash
uv run python scripts/qc_report.py \
  data/week01_toy_perturbseq.h5ad \
  --group-col target_gene
```

按单一 `target_gene` 汇总适合第一眼审计，但会掩盖 cell type、donor 和 batch 差异。正式报告必须进一步分层，并同时查看分位数或图形；中位数不是不确定性估计。

**本日产出：**QC 汇总表、三幅分布图、过滤前后记录与阈值理由。

## Day 4：Pseudobulk 与 count model 直觉

### 4.1 为什么需要 pseudobulk

如果每个 donor 有数百个细胞，直接把细胞当独立样本会产生 pseudoreplication。Pseudobulk 在每个独立重复和生物条件组合内对 raw counts 求和：

```text
pseudobulk[donor, cell_type, condition, gene]
= sum of raw counts across cells in that group
```

本课程的 group key 为 `donor × cell_type × target_gene`，因此理论上有：

```text
3 donors × 2 cell types × 4 conditions = 24 pseudobulk samples
```

只按 condition 聚合会把所有 donor 合并，导致没有 replicate 可用于估计不确定性。

### 4.2 Counts 守恒证明什么

聚合后应满足每个基因：

```text
sum before aggregation = sum after aggregation
```

它可以发现漏组、重复计数或意外过滤。但守恒不证明 group key 在生物学上正确，也不证明没有 confounding。

### 4.3 Pseudobulk 后仍然需要统计处理

不同 pseudobulk 样本可能包含不同细胞数或测序深度，因此不能只比较未经校正的总 counts。后续通常还需要：

- library-size normalization 或适当的 size factor；
- replicate-level model；
- effect size 与 uncertainty；
- 对 batch 和实验设计的合理建模。

本周只完成正确聚合和描述性比较，不把 raw 单细胞均值当作正式推断。

### 4.4 为什么 toy counts 使用 Gamma–Poisson

单细胞 counts 常表现为 variance 大于 mean，即 overdispersion。Gamma–Poisson mixture 等价于一种 negative-binomial parameterization：

```text
Var(Y) = μ + μ² / θ
```

其中 μ 是期望 count，θ 越小表示额外变异越强。生成器用 `2 ** log2FC` 把 log2 fold-change 转成均值乘数：log2FC = 1 表示均值乘 2，log2FC = -1 表示均值乘 0.5。

这只是教学模拟：它没有完整模拟真实基因相关结构、guide efficiency、off-target effects 或复杂 dropout。

### 4.5 本日演示

```bash
uv run python scripts/pseudobulk.py \
  data/week01_toy_perturbseq.h5ad \
  --group-cols donor cell_type target_gene
```

**本日产出：**24 个 pseudobulk 样本、对应 metadata、逐基因 counts 守恒证明，以及一段“pseudobulk 得到什么、失去什么”的解释。

## Day 5：描述、推断与防泄漏验证

### 5.1 描述性比较不等于正式推断

比较某个基因在 control 与 perturbation 下的均值，可以帮助理解方向，但不自动提供可靠的 p-value 或跨 donor 结论。

正式推断需要把 donor/replicate 作为样本，估计样本间变异，并明确模型假设。第一周的 raw mean 和简单 log2FC 是教学性描述统计。

### 5.2 Split 必须回答具体泛化问题

- **Leave-one-donor-out**：模型能否迁移到新 donor？
- **Leave-one-cell-type-out**：能否迁移到新细胞类型或 context？
- **Leave-one-perturbation-out**：能否预测未见扰动？
- **Final challenge-style split**：同时更换 context 与 perturbation panel。

先写出想测试的泛化目标，再选择 split。随机按 cell 切分通常让同一 donor、batch、guide 或近似状态同时出现在训练和验证中，得到过于乐观的结果。

### 5.3 与 Virtual Cell Challenge 的连接

Toy 数据公开了 cell type、donor、batch 和 ground truth effect，便于教学；真实比赛 context 匿名、扰动响应隐藏，并要求生成 400 个单细胞 raw-count profiles。

本周形成的习惯会直接影响后续比赛：

- 数据尺度理解错误会导致非法提交；
- 随机 cell split 会高估模型泛化；
- 只预测均值会丢失单细胞变异；
- 只看总体相关性会忽略真正的 perturbation response。

### 5.4 端到端验收

从 fresh kernel 完成：

1. 读取并审计 AnnData；
2. 定位 raw counts；
3. 稀疏安全地计算 QC；
4. 按实验设计聚合 pseudobulk；
5. 检查 on-target 与一个 downstream response；
6. 说明 donor–batch confounding；
7. 提出一个与目标一致的 group-aware split；
8. 写出结论、证据和限制。

## 脚本地图

- `check_environment.py`：验证解释器、包、AnnData sparse round-trip 和 VCC CLI；
- `make_toy_perturbseq.py`：生成带已知效应、过度离散和透明混杂的 toy 数据；
- `inspect_h5ad.py`：不 densify 地审计矩阵语义证据；
- `qc_report.py`：生成分组 QC 描述统计；
- `pseudobulk.py`：按独立重复分组求和并检查 counts 守恒。

## 常见错误与纠正

- 不说“0 表示基因没有表达”，而说“本次有限测序中观察到 0 UMI”。
- 不说“有 2,400 个重复”，而说“有 2,400 个细胞观测，独立重复由实验设计定义”。
- 不说“`X` 就是 raw”，而说“根据 provenance、数据契约和数值检查，当前 `X` 保存 raw counts”。
- 不说“QC 阈值固定为 10%”，而说“阈值来自当前分组分布和 sensitivity analysis”。
- 不说“counts 守恒证明 pseudobulk 正确”，而说“守恒只证明没有漏计或重复计数”。
- 不说“均值不同就是显著”，而说“均值差是描述性 effect，需要 replicate-level uncertainty 才能推断”。

## 评分标准

- 环境与数据审计：20%；
- QC 小报告：30%；
- pseudobulk 分析：30%；
- 概念、复现与防泄漏解释：20%。

建议通过线为 80%，且必须满足：不混淆 counts/log；不把细胞当独立重复；不 densify 完整矩阵；notebook 可从 fresh kernel 运行；validation split 与声明的泛化目标一致。
