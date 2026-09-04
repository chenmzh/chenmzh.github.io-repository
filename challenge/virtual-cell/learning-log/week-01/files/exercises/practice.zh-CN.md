# 第一周练习与参考答案

## 使用方法

先独立作答，再展开每道题下面的“查看参考答案”。参考答案用于校正概念，不是需要背诵的唯一表述。编程题应先在学生 notebook 中完成，再对照示例。

## A. 概念短题

### 1. `adata.X` 是否必然存放 raw counts？为什么？

写出至少三项可以帮助你判断矩阵语义的证据。

:::details 查看参考答案
不必然。`X` 只是 AnnData 的主矩阵位置，可能保存 raw counts、归一化表达量或 log-transformed 数据。

应检查：数据来源和处理文档、dtype、数值是否非负、非零值是否接近整数、library size 的数量级，以及 `layers["counts"]` 是否存在。整数性只能支持“可能是 counts”，不能单独证明数据从未被处理。
:::

### 2. 稀疏矩阵中的 0 与缺失值有什么区别？

为什么不能把所有 0 都理解成“基因没有表达”？

:::details 查看参考答案
稀疏矩阵中的 0 通常表示本次有限测序中观察到 0 个 UMI；缺失值表示没有观测或未知。两者统计含义不同。

一个真实表达的基因也可能因为 capture efficiency、测序深度和抽样噪声而得到 0 counts。因此更准确的说法是“未观察到分子”，而不是“基因绝对不表达”。
:::

### 3. 为什么 2,400 个细胞不等于 2,400 个独立生物重复？

请指出 toy 数据中的观测单位与独立重复单位。

:::details 查看参考答案
细胞是观测单位，但来自同一 donor 和同一实验流程的细胞共享遗传背景、培养条件与技术批次，因此彼此相关。

本 toy 数据有 2,400 个细胞观测，但独立重复结构由 3 个 donor 表示。把每个细胞都当成独立重复会夸大有效样本量，产生 pseudoreplication。
:::

### 4. CRISPRi 与完全 knockout 有什么区别？

这一区别为什么会影响预测任务？

:::details 查看参考答案
CRISPRi 通常通过抑制转录降低目标基因表达，敲低程度可能不完全，也可能随细胞变化。Knockout 通常通过破坏 DNA 序列或基因功能实现更强的功能丧失。

因此不能假设 CRISPRi 后目标基因 counts 一定为 0，也不能直接把 knockout 数据中的效应量无条件迁移到 CRISPRi。
:::

### 5. 为什么不能只凭总体表达相关性判断扰动预测是否准确？

:::details 查看参考答案
大多数基因在 control 与 perturbation 之间变化很小，高表达背景基因会主导总体相关性。即使模型把所有扰动都预测成 control，也可能得到很高的相关性。

比赛真正关心的是相对 control 的扰动响应：哪些下游基因改变、方向是否正确、效应量多大，以及不同扰动是否可区分。
:::

### 6. `library_size`、`detected_genes`、`pct_mito` 分别衡量什么？

:::details 查看参考答案
`library_size` 是每个细胞所有基因 counts 的总和，反映捕获和测序深度；`detected_genes` 是 counts 大于 0 的基因数，反映表达复杂度；`pct_mito` 是线粒体基因 counts 占总 counts 的比例，常用于提示受损或应激细胞。

这些都是诊断指标，不是细胞好坏的绝对标签。解释时必须比较不同 cell type、batch 和 perturbation 的分布。
:::

### 7. 为什么 QC 阈值不能从另一数据集直接照搬？

:::details 查看参考答案
组织、细胞类型、测序平台、测序深度和样本处理都会改变 QC 分布。例如代谢活跃的细胞可能天然具有更高线粒体比例。

合理流程是先按关键实验分组观察分布，再提出阈值，报告每一步删除数量，并检查结论对阈值是否敏感。
:::

### 8. Pseudobulk 为什么通常对 raw counts 求和？

:::details 查看参考答案
对同一独立重复中的 raw counts 求和，相当于合并该组观测到的分子计数，保留 count 数据和 library size 的统计意义，也更适合负二项等 count 模型。

先 `log1p` 再平均得到的是展示尺度上的平均值，不再是 raw-count pseudobulk。
:::

### 9. Pseudobulk 缓解什么问题，又损失什么信息？

:::details 查看参考答案
它缓解把大量相关细胞当作独立重复的 pseudoreplication，并让 donor/replicate 层面的比较更稳定。

代价是丢失细胞亚群、响应异质性和分布形状。因此 pseudobulk 适合稳定估计平均响应，但不能替代比赛最终要求的单细胞分布预测。
:::

### 10. 给出一种不会按细胞随机泄漏的 validation split。

:::details 查看参考答案
一个起点是 leave-one-donor-out：训练集使用 donor_1 与 donor_2，验证集完整保留 donor_3。也可以完整留出某个 cell type 或 perturbation 来检验更强的泛化。

关键是同一 donor 或实验重复的细胞不能随机分散到训练和验证两侧。注意 toy 数据中 donor_3 与 batch_2 完全混杂，所以该划分同时发生 donor 与 batch 转移。
:::

## B. 编程任务

### 1. 完成 AnnData 数据审计

运行 `inspect_h5ad.py`，记录 shape、matrix type、dtype、sparsity、counts 位置以及关键元数据列。

:::details 查看思路与命令
```bash
uv run python scripts/inspect_h5ad.py data/week01_toy_perturbseq.h5ad
```

预期核心结果为 2,400 cells × 500 genes、CSR sparse、`int32`、非负且整数。`X` 与 `layers["counts"]` 均按数据契约保存 raw counts。
:::

### 2. 稀疏安全地找出 library size 最大的 10 个细胞

禁止对完整矩阵调用 `.toarray()`。

:::details 查看示例代码
```python
import numpy as np

library_size = np.asarray(adata.X.sum(axis=1)).ravel()
top10_position = np.argsort(library_size)[-10:][::-1]
adata.obs.iloc[top10_position].assign(
    library_size_recomputed=library_size[top10_position]
)
```

`sum(axis=1)` 在稀疏矩阵上直接聚合；这里只把 2,400 个行总和转成一维数组，而不是把 2,400 × 500 的表达矩阵 densify。
:::

### 3. 按 cell type 与 perturbation 汇总 QC

计算细胞数、中位 library size 和中位 pct_mito。

:::details 查看示例代码
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

不能只看全体中位数，因为分组差异可能来自真实生物状态，也可能来自技术问题。
:::

### 4. 提出并审计一个 QC 规则

报告每一步保留的细胞数，并解释为什么不应机械删除所有 `pct_mito > 10` 的细胞。

:::details 查看示例思路
```python
import numpy as np

library_floor = np.quantile(adata.obs["library_size"], 0.01)
step1 = adata.obs["library_size"] >= library_floor
step2 = step1 & (adata.obs["pct_mito"] <= 15)

print("before:", adata.n_obs)
print("after library filter:", int(step1.sum()))
print("after mito filter:", int(step2.sum()))
```

这只是 toy 数据的示例规则，不是通用标准。真实数据中必须按 cell type、batch 和 perturbation 检查被删除比例；否则可能选择性删除真实应激或扰动响应。
:::

### 5. 构建 pseudobulk 并证明 counts 守恒

按 donor × cell type × target_gene 聚合。

:::details 查看示例代码
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

守恒检查能发现分组丢失、重复计数或错误过滤。24 来自 3 donors × 2 cell types × 4 conditions。
:::

### 6. 检查 GENE_A 的 on-target knockdown

比较 type_alpha 中 control 与 GENE_A perturbation 的平均 raw counts。

:::details 查看示例代码
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

预期 perturbation 均值明显更低，但不会固定等于 0。布尔掩码先转成 NumPy 数组，以避免 SciPy sparse 与 Pandas Series 的索引兼容问题。
:::

### 7. 比较 PATH_A_01 的 cell-type-specific response

分别计算 type_alpha 与 type_beta 中 GENE_A perturbation 相对 control 的 log2 fold-change。

:::details 查看示例代码
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

预期 type_alpha 的上调强于 type_beta。`+1` 只是本周用于稳定演示的 pseudocount，不代表正式差异表达方法。
:::

### 8. 解释 donor_3 与 batch_2 的混杂

:::details 查看参考答案
在生成脚本中，donor_1 和 donor_2 总属于 batch_1，而 donor_3 总属于 batch_2。因此看到 donor_3 与其他 donor 的差异时，无法判断原因是 donor、batch，还是两者共同作用。

解决方法需要更好的实验设计，例如让每个 batch 都包含多个 donor，或让同一 donor 跨 batch 测量。统计模型不能凭空恢复设计中不存在的独立信息。
:::

## C. 提交物与评分

- 可从 fresh kernel 顺序运行的 notebook；
- QC 汇总 CSV 与三幅基础图；
- pseudobulk `.h5ad`；
- 300–500 字结果说明；
- 一段 group-aware validation split 说明。

建议评分：环境与审计 20%，QC 30%，pseudobulk 30%，概念与复现 20%。总分至少 80%，并通过课程页列出的五项硬性要求。
