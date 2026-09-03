# Virtual Cell Challenge progress log / 进度记录维护说明

## 中文

公开页面：

- 中文：`/challenge/virtual-cell/`
- English：`/challenge/virtual-cell/en/`

两种语言的学习进度和测试记录共用 `progress.js`，每条记录同时包含中文和英文，避免两个页面出现状态不一致。

更新一次实验时：

1. 在 `progress.js` 中更新对应 milestone 或 test；
2. 只有存在 notebook、指标表、提交记录或其他可验证产出时，才把状态改为 `completed` / `passed`；
3. 更新日期和下一步；
4. 在本地分别打开中文、英文和移动端页面；
5. 运行 `node --check challenge/virtual-cell/progress.js` 和本地链接检查后再提交。

建议每次实验记录：假设、数据版本、划分、配置、随机种子、六项指标、分 context 结果、结论和下一步。

## English

Public pages:

- Chinese: `/challenge/virtual-cell/`
- English: `/challenge/virtual-cell/en/`

Both versions share `progress.js`. Every progress and test entry contains Chinese and English text so that the two pages cannot drift apart.

For each experiment update:

1. Update the corresponding milestone or test in `progress.js`;
2. Change a status to `completed` / `passed` only when a verifiable artifact exists, such as a notebook, metric table, or submission record;
3. Update the date and next action;
4. Open the Chinese, English, and mobile pages locally;
5. Run `node --check challenge/virtual-cell/progress.js` and the local-link check before committing.

Each experiment should record its hypothesis, data version, split, configuration, random seed, all six metrics, per-context results, conclusion, and next action.
