# Modern RL Chapter 04–05 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成并验证 Modern RL 中文讲义 Chapter 04–05，使价值递归自然过渡到 DP、MC、TD 和下一章 DQN。

**Architecture:** 沿用现有静态章节 shell + 三个 HTML 分片 + 章节 CSS/JS 的结构。Chapter 04 与 Chapter 05 文件彼此独立，最后由单一集成步骤修改课程首页和前后章导航。

**Tech Stack:** HTML5、CSS、原生 JavaScript、仓库内 KaTeX、GitHub Pages、Python 静态 HTTP 服务、Node.js 语法检查、浏览器截图验证。

---

### Task 1: 冻结课程与章节合同

**Files:**
- Create: `docs/plans/2026-08-31-modern-rl-course-completion-design.md`
- Create: `docs/plans/2026-08-31-modern-rl-chapter04-05-implementation.md`

**Step 1: 记录课程编号映射**

写明中文 Chapter 04–27 与上游逻辑章节、物理文档目录之间的对应关系，并固定上游 commit。

**Step 2: 记录第一批术语与符号合同**

明确 $V^\pi$、$Q^\pi$、DP、MC、TD、bootstrapping、on-policy 和 off-policy 的首次正式解释章节。

**Step 3: 验证文档存在**

Run: `test -s docs/plans/2026-08-31-modern-rl-course-completion-design.md && test -s docs/plans/2026-08-31-modern-rl-chapter04-05-implementation.md`

Expected: exit code 0。

### Task 2: 实现 Chapter 04 章节内容

**Files:**
- Create: `lecture/modern-rl/chapter04.html`
- Create: `lecture/modern-rl/chapter04-a.html`
- Create: `lecture/modern-rl/chapter04-b.html`
- Create: `lecture/modern-rl/chapter04-c.html`
- Create: `lecture/modern-rl/chapter04.css`
- Create: `lecture/modern-rl/chapter04.js`

**Step 1: 写章节 shell 与目录**

从 Chapter 03 的结构出发，建立 Chapter 04 独立 shell、目录 anchor、KaTeX 和缓存版本。

**Step 2: 写问题驱动正文**

按以下顺序完成三个分片：即时奖励的局限；return 与 value；$V^\pi$；Bellman 一步拆分；$Q^\pi$ 与 $V^\pi$；模型边界；理解检查；Chapter 05 连接。

**Step 3: 实现 Bellman 传播实验**

使用固定的小型网格或走廊 MDP。控件至少包含固定策略或当前动作、折扣因子、单步备份和重置；页面明确列出 Question、Prediction、Observation、Interpretation、Limitation。

**Step 4: 验证脚本语法**

Run: `node --check lecture/modern-rl/chapter04.js`

Expected: exit code 0，无输出。

**Step 5: 验证内容合同**

Run: `rg -n "state-value function|action-value function|Bellman expectation equation|Question|Prediction|Limitation|理解检查" lecture/modern-rl/chapter04-*.html`

Expected: 每个关键术语或章节组件至少命中一次。

### Task 3: 实现 Chapter 05 章节内容

**Files:**
- Create: `lecture/modern-rl/chapter05.html`
- Create: `lecture/modern-rl/chapter05-a.html`
- Create: `lecture/modern-rl/chapter05-b.html`
- Create: `lecture/modern-rl/chapter05-c.html`
- Create: `lecture/modern-rl/chapter05.css`
- Create: `lecture/modern-rl/chapter05.js`

**Step 1: 写章节 shell 与目录**

承接 Chapter 04 的“如何得到价值”问题，建立独立分片加载和章节导航。

**Step 2: 写 DP、MC、TD 教学链**

先比较三种可用信息，再分别解释完整模型备份、完整回合回报和一步 bootstrap。给出 MC target、TD target、TD error 和增量更新的逐步推导。

**Step 3: 解释策略与数据来源**

用最小场景解释 on-policy、off-policy、SARSA 和 Q-Learning 的区别；不展开 DQN。

**Step 4: 实现目标比较实验**

让读者修改折扣因子、下一状态估计或轨迹奖励，比较 MC target 与 TD target；明确实验不能证明算法在任意环境中的收敛速度。

**Step 5: 验证脚本语法与内容合同**

Run: `node --check lecture/modern-rl/chapter05.js`

Expected: exit code 0，无输出。

Run: `rg -n "Dynamic Programming|Monte Carlo|Temporal-Difference|bootstrapping|on-policy|off-policy|Question|Prediction|Limitation|理解检查" lecture/modern-rl/chapter05-*.html`

Expected: 每个关键术语或章节组件至少命中一次。

### Task 4: 集成首页和章节导航

**Files:**
- Modify: `lecture/modern-rl/index.html`
- Modify: `lecture/modern-rl/chapter03-c.html`

**Step 1: 更新课程首页**

把 Chapter 04–05 添加为可阅读章节，新增 Chapter 06 “用神经网络近似动作价值”作为 NEXT，并保持首页 editorial list 风格。

**Step 2: 建立连续导航**

Chapter 03 结尾链接 Chapter 04；Chapter 04 有上一章/下一章；Chapter 05 有上一章并预告 Chapter 06。

**Step 3: 检查所有相对链接**

Run: `rg -n "chapter0[3-6]\.html" lecture/modern-rl/index.html lecture/modern-rl/chapter0[3-5]*.html`

Expected: 首页与章末导航都包含预期链接。

### Task 5: 本地 HTTP 与浏览器验证

**Files:**
- Verify: `lecture/modern-rl/chapter04*`
- Verify: `lecture/modern-rl/chapter05*`
- Regression: `lecture/modern-rl/chapter01.html`, `chapter02.html`, `chapter03.html`

**Step 1: 启动仓库根目录 HTTP 服务**

Run: `python3 -m http.server 8000`

Expected: 服务监听 `127.0.0.1:8000`，章节分片可被 fetch。

**Step 2: 检查静态资源与分片**

Run: `for f in chapter04.html chapter04-a.html chapter04-b.html chapter04-c.html chapter04.css chapter04.js chapter05.html chapter05-a.html chapter05-b.html chapter05-c.html chapter05.css chapter05.js; do curl -fsS "http://127.0.0.1:8000/lecture/modern-rl/$f" >/dev/null; done`

Expected: exit code 0。

**Step 3: 桌面浏览器验证**

以 1440×1000 检查 Chapter 04、05：加载占位已消失、KaTeX 渲染、目录 anchor 工作、控制台无错误、所有控件可操作、无整页横向滚动。

**Step 4: 移动端浏览器验证**

以 390×844 检查 Chapter 04、05：公式、代码、表格、SVG 和实验可阅读，布局不被截断。

**Step 5: 回归 Chapter 01–03**

确认三章仍可加载，首页和共享视觉语言没有退化。

### Task 6: 最终审查与提交

**Files:**
- Review: all changed files

**Step 1: 检查空白和意外改动**

Run: `git diff --check && git status --short`

Expected: 无 whitespace error，变更只包含计划、Chapter 04–05 和必要导航文件。

**Step 2: 审查内容与实验**

核对术语首现、公式推导、数值例、Insight 数量、理解题数量和实验六要素。

**Step 3: 提交第一批**

```bash
git add docs/plans lecture/modern-rl
git commit -m "feat: add modern RL value learning chapters"
```

Expected: commit 成功，工作树干净。
