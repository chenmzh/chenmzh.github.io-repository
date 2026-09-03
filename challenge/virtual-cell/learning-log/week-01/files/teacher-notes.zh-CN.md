# 第一周教师讲义（中文）

## 教学主线

第一周只围绕一个问题：**这个矩阵中的每一个数字、每一行元数据和每一个分组，在实验上代表什么？**

如果学习者不能回答这个问题，后续模型越复杂，错误越难发现。

## 可测量学习目标

完成本周后，学习者应能：

1. 从干净环境重建课程并报告 Python、包版本和随机种子；
2. 用自己的话解释 cell、gene、RNA、expression、control 和 perturbation；
3. 正确指出 AnnData 的 `X`、`obs`、`var`、`layers`、`obsm`；
4. 判断 raw counts 所在位置，并检查非负、整数和 sparse 属性；
5. 在不 densify 全矩阵的情况下计算 library size、detected genes 和 mitochondrial fraction；
6. 区分观测单位（cell）与独立推断单位（donor/replicate）；
7. 按 donor × cell type × condition 对 raw counts 求和形成 pseudobulk；
8. 设计不按细胞随机泄漏的验证划分。

## Day 1：环境、任务地图和最少细胞生物学

### 讲课

把比赛画成三段：目标细胞的 control 状态 → 指定基因 CRISPRi → 预测下游表达分布。强调 CRISPRi 降低转录，不等于一定完全消失；零 counts 也不等于绝对不表达。

### 教师提问

- 一个细胞为什么会有数千个基因的 counts？
- 为什么相同细胞类型的两个细胞 counts 不完全相同？
- control 与 perturbation 之间除了处理之外，还可能有哪些差异？

### 实践与产出

运行 `setup.sh` 和环境检查；生成 toy 数据；提交版本输出，以及一张“实验单位—观测单位—预测目标”图。

### Exit ticket

用三句话解释：gene expression 是什么、control 的作用是什么、比赛需要预测什么。

## Day 2：AnnData、raw counts 和稀疏矩阵

### 讲课

`X` 只是主矩阵位置，不保证语义；`adata.raw` 也不保证一定是真实 raw counts。语义必须来自数据生成流程、数值检查和文档。零值是观测到的零，不是缺失值。

### 教师演示

- 检查 shape、dtype、`nnz` 和 `layers`；
- 用 `X.sum(axis=1)` 与 `X.getnnz(axis=1)`；
- 只对极小切片演示 dense；估算完整矩阵 dense 后的内存。

### 实践与产出

填写数据审计表：cells、genes、matrix type、dtype、sparsity、counts layer、obs/var columns。

### Exit ticket

解释为什么 `adata.X.toarray()` 在真实比赛数据上危险。

## Day 3：实验设计与 QC

### 讲课

细胞是观测单位，但 donor/实验 replicate 通常才是独立推断单位。QC 阈值不是自然常数，应看分布、分组和实验目的；高 mitochondrial fraction 不必然是坏细胞。

### 实践

按 perturbation、cell type 和 batch 比较：

- total counts；
- detected genes；
- mitochondrial fraction。

要求先描述分布，再提出过滤规则，并报告每一步删除数量。toy 数据中约 3% 细胞是透明标注的低质量模拟细胞，可用于检验规则而不是死记阈值。

### Exit ticket

解释“过度 QC 可能删除真实扰动响应”的原因。

## Day 4：Pseudobulk 初体验

### 讲课

Pseudobulk 通常在正确实验分组内对 raw counts 求和。它缓解把大量相关细胞当作独立重复的伪重复问题，但会丢失亚群和单细胞异质性。

### 实践

使用 `scripts/pseudobulk.py` 按 `donor × cell_type × target_gene` 聚合。必须验证：

- 每个 pseudobulk 样本有对应 metadata；
- 聚合前后每个基因总 counts 完全守恒；
- donor_3 与 batch_2 混杂，不能声称分离了 donor 与 batch effect。

### Exit ticket

回答：为什么不能先 log1p，再对细胞求平均并称为 raw-count pseudobulk？

## Day 5：端到端小项目

关闭并重启 kernel，从头完成：读取 → 审计 → QC → pseudobulk → control/perturbation 比较 → 验证划分建议。

### 验收

- 环境与数据审计：20%；
- QC 小报告：30%；
- pseudobulk 分析：30%；
- 概念与复现：20%。

通过线建议为 80%，且必须满足：不混淆 counts/log；不把细胞当独立重复；不 densify 完整矩阵；notebook 可顺序运行；验证划分尊重 donor、cell type 或 perturbation 分组。

## 常见纠正语句

- 不说“0 表示基因没有表达”，改说“本次有限测序中观察到 0 UMI”。
- 不说“有 2,400 个重复”，改说“有 2,400 个细胞观测，独立重复由 donor/实验设计定义”。
- 不说“X 就是 raw”，改说“根据数据契约和数值检查，当前 X 保存 raw integer counts”。
- 不说“QC 阈值是 10%”，改说“结合分布、分组和任务提出阈值，并报告敏感性”。
