# 第一周练习参考答案（中文）

1. 不必然。`X` 只是主矩阵位置，可能存 counts、normalized 或 log 数据；必须检查数据来源、文档、dtype、非负性和整数性。
2. 稀疏 0 通常表示在有限测序中观察到 0 counts；缺失值表示没有观测或未知，统计含义不同。
3. 同一 donor/实验中的细胞共享生物与技术因素，彼此相关；独立重复通常由 donor 或实验 replicate 定义。
4. CRISPRi 通常抑制转录，效果可能不完全；knockout 通常指破坏基因功能，但也不保证所有表型完全消失。
5. 基础表达强的基因可主导总体相关性，而真正需要预测的是相对 control 的下游变化。
6. 分别是每细胞总 counts、非零基因数、线粒体基因 counts 占总 counts 的比例。
7. 平台、组织、细胞类型、深度和处理都会改变 QC 分布；应结合当前数据分组和任务作决定。
8. 求和保留 count 模型和 library size 的统计含义；log 后平均不再是原始计数聚合。
9. 它缓解细胞层级伪重复、提高 replicate 层级稳定性，但损失亚群与异质性。
10. 示例：按 donor 留一验证；或者完整留出一个 cell type/perturbation，绝不把同一 donor 的细胞随机分到两侧。

编程任务没有唯一阈值。满分答案必须稀疏安全，pseudobulk 前后按基因 counts 完全守恒，并明确指出 donor_3 与 batch_2 完全混杂，因此无法从该 toy 设计中单独估计二者效应。

预期方向：type_alpha 的 GENE_A perturbation 中 GENE_A 均值显著低于 control；PATH_A_01 在 type_alpha 中的上调强于 type_beta。具体数值受随机采样影响。
