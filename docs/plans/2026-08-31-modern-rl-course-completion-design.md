# Modern RL 中文讲义续作设计

## 目标

在不重写已发布 Chapter 01–03 的前提下，把中文学习讲义扩展为 Chapter 01–27。本轮先完成第一批 Chapter 04–05，并为 Chapter 06–27 建立稳定的课程映射、术语规则和验收合同。

讲义继续服务于“学过机器学习导论、但没有系统学习强化学习”的读者。内容不是对上游课程逐句翻译，而是以一个连续问题链重新组织：

```text
现象 → 问题 → 直觉 → 概念 → 数学 → 数值例 → 代码 → 实验 → Insight → 后续连接
```

## 范围与编号

线上 Chapter 01–03 已分别覆盖 CartPole、探索与利用、MDP。上游逻辑 Chapter 02 被中文讲义拆成了 Chapter 02 和 Chapter 03，因此后续中文编号相对上游逻辑编号顺延一章。

| 中文讲义 | 核心主题 | 上游逻辑主题 | 主要源码目录 |
| --- | --- | --- | --- |
| 04 | 价值函数与贝尔曼方程 | Value Functions and Bellman Equations | `docs/chapter03_mdp/` |
| 05 | DP、MC、TD 与奖励设计 | Classical RL Methods | `docs/chapter03_mdp/` |
| 06 | DQN | Deep Q-Networks | `docs/chapter07_dqn/` |
| 07 | 策略梯度 | Policy Gradient Methods | `docs/chapter08_policy_gradient/` |
| 08 | Actor–Critic | Actor-Critic Methods | `docs/chapter09_actor_critic/` |
| 09 | TRPO、PPO 与 GAE | TRPO and PPO | `docs/chapter10_ppo/` |
| 10 | 连续控制与世界模型 | Continuous Control and World Models | `docs/chapter11_continuous_control/` |
| 11 | 离线强化学习 | Offline Reinforcement Learning | `docs/chapter12_offline_rl/` |
| 12 | 模仿、逆强化与元强化学习 | Imitation, Inverse RL, and Meta-RL | `docs/chapter13_imitation_meta_rl/` |
| 13 | 探索、多智能体与层级强化学习 | Exploration, Multi-Agent, and Hierarchical RL | `docs/chapter14_exploration_marl_hierarchical/` |
| 14 | RLHF 流水线 | The RLHF Training Pipeline | `docs/chapter15_rlhf/` |
| 15 | DPO 家族 | Preference Alignment and the DPO Family | `docs/chapter17_dpo/` |
| 16 | GRPO、RLVR 与验证器 | GRPO, RLVR, and Verifier Engineering | `docs/chapter18_grpo/` |
| 17 | 推理模型与推理时计算 | Reasoning Models and Inference-Time Compute | `docs/chapter19_reasoning/` |
| 18 | 过程奖励与推理时搜索 | Process Rewards and Inference-Time Search | `docs/chapter20_prm_search/` |
| 19 | 工业级大模型 RL | Industrial LLM RL | `docs/chapter16_llm_rl_industrial/` |
| 20 | Agentic RL 与多轮工具调用 | Tool Use, Multi-Turn Interaction, and Multi-Agent RL | `docs/chapter22_agentic/` |
| 21 | 代码智能体 RL | Reinforcement Learning for Coding Agents | `docs/chapter23_rl_based_swe/` |
| 22 | Deep Research 与浏览器智能体 | Deep Research and Browser Agents | `docs/chapter24_deep_research/` |
| 23 | Computer Use 与 GUI 智能体 | Computer Use and GUI Agents | `docs/chapter25_computer_use/` |
| 24 | 视觉语言模型 RL | Vision-Language Model RL | `docs/chapter26_vlm/` |
| 25 | 音频、具身与视觉生成 RL | Audio, Embodied Intelligence, and Visual Generation | `docs/chapter27_audio_rl/`, `chapter28_vla/`, `chapter29_visual_generation/` |
| 26 | 奖励黑客与 RL 评测 | Reward Hacking and RL Evaluation | `docs/chapter30_alignment_failures/` |
| 27 | 自博弈、规模化与研究前沿 | Self-Play, Scaling, and Research Frontiers | `docs/chapter32_selfplay/` |

上游内容基线固定为 `walkinglabs/hands-on-modern-rl@78d4e459dcd40844e030a3ce67378b8bcb9735bd`。物理目录编号不是课程编号，任何章节都必须通过上表映射来源。

## 第一批教学设计

### Chapter 04：怎样给未来的局面定价？

第三章已经定义状态、动作、转移、奖励与轨迹。本章从“两个即时奖励相同的状态，为什么长期前景不同”出发，区分一条实际轨迹的 return 与固定策略下许多可能轨迹的 expected return。随后引入 state-value function（状态价值函数）和 action-value function（动作价值函数），推导 Bellman expectation equation（贝尔曼期望方程），再通过网格世界的一步备份展示未来价值如何向当前传播。

本章只预告 optimal value 和 advantage，不展开价值迭代、Q-Learning、MC 或 TD 的算法细节。实验回答：固定策略、折扣因子和一步转移怎样共同决定当前价值？

### Chapter 05：等不到结局，能不能先学？

第四章说明价值满足递归关系，但尚未解释数据从哪里来、更新目标从哪里来。本章以“完整知道环境模型”“等到整局结束”“只等一步就更新”三种信息条件为主线，依次引入 dynamic programming（DP，动态规划）、Monte Carlo methods（MC，蒙特卡洛方法）和 temporal-difference learning（TD，时序差分学习）。

核心实验使用同一条短轨迹比较 MC target 与 TD target，并展示奖励改动或初始估计误差如何影响传播。On-policy、off-policy、bootstrapping、SARSA 和 Q-Learning 只讲到足以建立分类坐标；神经网络逼近留给 Chapter 06。

## 工程结构

每章沿用现有静态分片模式：

```text
lecture/modern-rl/chapterNN.html
lecture/modern-rl/chapterNN-a.html
lecture/modern-rl/chapterNN-b.html
lecture/modern-rl/chapterNN-c.html
lecture/modern-rl/chapterNN.css
lecture/modern-rl/chapterNN.js
```

`minimal.css`、`editorial.css`、Chapter 01–03 和 `lecture/iml26/katex/` 是只读基线。本批不引入框架、不建立通用组件库，也不重构已有章节 loader。只有 `index.html` 由集成步骤修改。

## 术语与符号合同

专业术语首次出现采用“英文全称（缩写，中文名）+ 一句话直觉”。标题、目录和实验标签也不能在正文定义之前偷跑缩写。

第一批统一使用：

| 对象 | 统一形式 | 首次正式解释 |
| --- | --- | --- |
| 回报 | $G_t$ | Chapter 01 已解释，Chapter 04 只简短回顾 |
| 状态价值 | $V^\pi(s)$ | Chapter 04 |
| 动作价值 | $Q^\pi(s,a)$ | Chapter 04 |
| 贝尔曼备份 | Bellman backup（贝尔曼备份） | Chapter 04 |
| 最优价值 | $V^*(s)$、$Q^*(s,a)$ | Chapter 04 只预告，Chapter 05 正式使用 |
| 动态规划 | Dynamic Programming（DP，动态规划） | Chapter 05 |
| 蒙特卡洛方法 | Monte Carlo methods（MC，蒙特卡洛方法） | Chapter 05 |
| 时序差分学习 | Temporal-Difference learning（TD，时序差分学习） | Chapter 05 |
| 自举 | bootstrapping（自举） | Chapter 05 |
| TD 误差 | $\delta_t$ | Chapter 05 |
| 同策略 | on-policy（同策略） | Chapter 05 |
| 异策略 | off-policy（异策略） | Chapter 05 |

## 每章完成标准

- 章节开头承接上一章留下的问题，结尾明确下一章的必要性。
- 每个核心公式先有问题，再有符号解释、人话翻译、数值例和代码变量映射。
- 3–6 个真正改变理解角度的 Insight；4–8 个折叠理解题。
- 至少一个有 Question、Prediction、Experiment、Observation、Interpretation、Limitation 的图或互动实验。
- 所有分片经 HTTP 返回 200；正文加载后 KaTeX 正常；浏览器控制台无错误。
- 1440×1000 与 390×844 下没有整页横向滚动，公式、表格、代码和实验均可用。
- 上一章、下一章、目录和上游来源链接正确；缓存版本号同步递增。
- 每个制作批次必须经过独立教学审稿门禁：由未参与该批写作的审稿 Agent 首审，主 Agent 按问题清单修改，再由同一个审稿 Agent 复审；只有得到明确 `PASS` 才算完成。

## 发布节奏

Chapter 04–05 作为一个批次完成、统一审稿和提交。Chapter 06–27 的每个后续批次也执行同一条强制流程：

```text
独立教学审稿 Agent 首审
→ 主 Agent 修改阻塞项
→ 同一个审稿 Agent 复审
→ 明确 PASS
→ 提交并推送 GitHub
```

审稿 Agent 不参与本批原始写作；若复审仍为 `FAIL`，继续由主 Agent 修改并交回同一个审稿 Agent，不能换审稿人规避问题。只有达到全部完成标准且获得明确 `PASS` 后，首页才把新章节标记为可阅读，并推进下一章状态。
