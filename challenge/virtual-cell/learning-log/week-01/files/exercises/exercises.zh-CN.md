# 第一周练习（中文）

## A. 概念短题

1. `adata.X` 是否必然存放 raw counts？为什么？
2. 稀疏矩阵中的 0 与缺失值有什么区别？
3. 为什么 2,400 个细胞不等于 2,400 个独立生物重复？
4. CRISPRi 与完全 knockout 有什么区别？
5. 为什么不能仅凭总体表达相关性判断扰动预测是否准确？
6. `library_size`、`detected_genes`、`pct_mito` 分别衡量什么？
7. 为什么 QC 阈值不应直接从另一数据集照搬？
8. Pseudobulk 为什么通常对 raw counts 求和？
9. Pseudobulk 缓解了什么问题，又损失了什么？
10. 给出一种不会按细胞随机泄漏的 validation split。

## B. 编程任务

1. 运行 `inspect_h5ad.py`，填写数据审计表。
2. 在不调用完整矩阵 `.toarray()` 的情况下，找出 library size 最大的 10 个细胞。
3. 按 `cell_type` 和 `target_gene` 计算细胞数、中位 library size 和中位 pct_mito。
4. 设计一个 QC 规则，报告每一步保留的细胞数，并解释为什么不直接删除所有 `pct_mito > 10` 的细胞。
5. 使用 `aggregate_pseudobulk` 按 donor × cell_type × target_gene 聚合，并证明每个基因总 counts 守恒。
6. 比较 GENE_A 在 type_alpha 中的 control 与 GENE_A perturbation 均值。
7. 比较 PATH_A_01 的响应在 type_alpha 与 type_beta 中是否相同。
8. 解释 donor_3 与 batch_2 的混杂对结论有什么影响。

## C. 提交物

- 可从 fresh kernel 顺序运行的 notebook；
- QC 汇总 CSV 和三幅基础图；
- pseudobulk `.h5ad`；
- 300–500 字结果说明；
- 一段 group-aware validation split 说明。
