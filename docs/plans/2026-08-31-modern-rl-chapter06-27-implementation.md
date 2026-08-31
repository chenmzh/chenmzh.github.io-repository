# Modern RL Chapter 06–27 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在保持 Chapter 01–05 教学、视觉、工程与审稿框架不变的前提下，完成 Chapter 06–27，并把经典深度强化学习自然连接到 LLM 对齐、推理、Agentic RL、多模态与研究前沿。

**Architecture:** 每章继续使用一个 shell、三个 HTML 分片、一个章节 CSS 和一个章节 JavaScript。各章内容文件可并行研究与制作，但课程首页、前后章导航、术语连续性、教学审稿和发布必须按知识依赖分批集成。所有知识来源固定为 `walkinglabs/hands-on-modern-rl@78d4e459dcd40844e030a3ce67378b8bcb9735bd`。

**Tech Stack:** HTML5、CSS、原生 JavaScript、仓库内 KaTeX、Node.js 静态验证、Python HTTP 服务、浏览器/CDP、GitHub Actions 与 GitHub Pages。

---

## 全章共享合同

每章创建：

```text
lecture/modern-rl/chapterNN.html
lecture/modern-rl/chapterNN-a.html
lecture/modern-rl/chapterNN-b.html
lecture/modern-rl/chapterNN-c.html
lecture/modern-rl/chapterNN.css
lecture/modern-rl/chapterNN.js
```

每章必须满足：

- 从上一章留下的未解决问题出发，按“现象 → 问题 → 直觉 → 概念 → 数学 → 数值例 → 代码 → 实验 → Insight → 后续连接”组织。
- 面向“学过机器学习导论，但没有系统学习 RL”的读者；专业术语首次出现使用“英文全称（缩写，中文名）+ 一句话直觉”。
- 关键公式先交代为什么需要，再逐个解释符号、逐步推导、给数值例和程序变量映射。
- 3–6 个 Insight，4–8 道默认折叠的理解题；不把总结句伪装成 Insight。
- 至少一个带 Question、Prediction、Experiment、Observation、Interpretation、Limitation 的教学实验或静态对照；图下 caption 必须指出真正要观察的因果关系。
- 继承 `minimal.css` 与 `editorial.css` 的 editorial minimalism，不修改共享样式，不引入框架或组件库。
- shell 负责加载三个分片并在加载完成后渲染 KaTeX、初始化目录和实验；失败必须显式显示加载错误。
- 页尾链接上一章、课程目录、下一章和固定 commit 的上游来源；不提前展开下一章核心术语。
- 作者 Agent 只能编辑自己负责的 `chapterNN*` 文件，不修改 `index.html`、相邻章节、共享 CSS/JS、验证脚本或计划文档。

## 批次与课程边界

### Batch A：从价值表到稳定策略优化（Chapter 06–10）

| 章节 | 核心问题 | 上游来源 | 主要教学实验 |
| --- | --- | --- | --- |
| 06 · DQN | 状态太多，Q 表写不下怎么办？ | `docs/chapter07_dqn/`, `code/chapter04_dqn/` | 在线网络、目标网络与 replay target 的稳定性对照 |
| 07 · 策略梯度 | 连续动作或随机策略无法逐项 `max Q` 时，怎样直接改策略？ | `docs/chapter08_policy_gradient/`, `code/chapter05_policy_gradient/` | 二动作 softmax 的 log-prob × return 梯度方向 |
| 08 · Actor–Critic | 纯回报监督方差太大，谁来评价动作？ | `docs/chapter09_actor_critic/`, `code/chapter06_actor_critic/` | 同一 trajectory 下 return、value、advantage 对照 |
| 09 · TRPO、PPO、GAE | 策略更新太猛会破坏数据分布，怎样限制步幅？ | `docs/chapter10_ppo/`, `code/chapter07_ppo/` | probability ratio、clipping 与 GAE 的偏差—方差旋钮 |
| 10 · 连续控制与世界模型 | 动作连续、真实交互昂贵时怎么办？ | `docs/chapter11_continuous_control/`, `code/chapter09_continuous_control/` | DDPG/TD3/SAC target 与 model rollout 误差传播对照 |

Batch A 结束时，读者应能从 Bellman/TD 重新推出 DQN，从 policy gradient 走到 Actor–Critic 与 PPO，并理解连续控制为什么需要不同的策略分布和稳定化结构。

### Batch B：数据边界与复杂决策结构（Chapter 11–13）

| 章节 | 核心问题 | 上游来源 | 主要教学实验 |
| --- | --- | --- | --- |
| 11 · 离线强化学习 | 不能再采数据时，策略为何会被分布外动作欺骗？ | `docs/chapter12_offline_rl/` | dataset support 与 extrapolation error 可视化 |
| 12 · 模仿、逆强化与元强化学习 | 没有明确 reward，能否从示范和任务族学习？ | `docs/chapter13_imitation_meta_rl/` | behavior cloning covariate shift 与 DAgger 修正 |
| 13 · 探索、多智能体与层级强化学习 | 稀疏奖励、多个 agent、长任务怎样改变问题结构？ | `docs/chapter14_exploration_marl_hierarchical/` | intrinsic reward、credit assignment 与 option 时间尺度对照 |

### Batch C：大模型对齐与推理（Chapter 14–19）

| 章节 | 核心问题 | 上游来源 | 主要教学实验 |
| --- | --- | --- | --- |
| 14 · RLHF、Constitutional AI 与 RLAIF | 如何把人类或 AI 的偏好反馈变成可优化训练信号？ | `docs/chapter15_rlhf/`, `docs/chapter21_cai_rlvr/`, `code/chapter08_rlhf/` | SFT → feedback model → PPO，以及 human feedback 与 AI feedback 的来源对照 |
| 15 · DPO 家族 | 能否不用在线 RL，直接从偏好对学习？ | `docs/chapter17_dpo/`, `code/chapter17_dpo/`, `code/chapter09_alignment/` | chosen/rejected log-ratio 与 β 的影响 |
| 16 · GRPO、RLVR 与验证器 | 没有 Critic 时，怎样从组内结果和可验证奖励学习？ | `docs/chapter18_grpo/`, `code/chapter09_grpo_rlvr/`, `code/chapter18_grpo/verl_code_rlvr/` | group-relative advantage 与 verifier failure |
| 17 · 推理模型与推理时计算 | 为什么增加思考 token 和采样次数能改善推理？ | `docs/chapter19_reasoning/` | pass@k、best-of-N 与计算预算曲线 |
| 18 · 过程奖励与推理时搜索 | 只看最终答案为何不足，怎样评价中间步骤？ | `docs/chapter20_prm_search/` | outcome reward 与 process reward 的路径排序 |
| 19 · 工业级大模型 RL | 教科书算法进入大规模集群后，真正瓶颈在哪里？ | `docs/chapter16_llm_rl_industrial/`, `docs/appendix_industrial_training/` | rollout、训练、同步吞吐与 staleness 对照 |

### Batch D：Agent 与多模态环境（Chapter 20–24）

| 章节 | 核心问题 | 上游来源 | 主要教学实验 |
| --- | --- | --- | --- |
| 20 · Agentic RL | 多轮工具调用怎样写成 RL trajectory？ | `docs/chapter22_agentic/`, `code/chapter10_agentic_rl/` | 工具调用轨迹与跨轮 credit assignment |
| 21 · 代码智能体 RL | 如何把 repository、patch、test 组成可验证环境？ | `docs/chapter23_rl_based_swe/`, `code/chapter18_grpo/verl_code_rlvr/` | patch reward、测试 verifier 与 reward hacking |
| 22 · Deep Research 与浏览器智能体 | 搜索、阅读、引用如何形成长轨迹？ | `docs/chapter24_deep_research/` | browser harness 状态、动作与证据覆盖率 |
| 23 · Computer Use 与 GUI 智能体 | 像素、鼠标和不可逆操作如何训练与评测？ | `docs/chapter25_computer_use/` | 屏幕状态、动作风险与安全中止 |
| 24 · 视觉语言模型 RL | 多模态输入如何改变 rollout、reward 与 verifier？ | `docs/chapter26_vlm/`, `code/chapter11_vlm_rl/` | 几何推理的格式、答案与视觉 grounding 奖励 |

### Batch E：多模态生成、安全与前沿（Chapter 25–27）

| 章节 | 核心问题 | 上游来源 | 主要教学实验 |
| --- | --- | --- | --- |
| 25 · 音频、具身与视觉生成 RL | 不同模态的 state、action、trajectory 与奖励延迟怎样改变训练？ | `docs/chapter27_audio_rl/`, `docs/chapter29_visual_generation/`, `modelscope-space/hands-on-modern-rl-experiment08-maniskill/`, `modelscope-space/hands-on-modern-rl-experiment10-minestudio/`, `modelscope-space/hands-on-modern-rl-experiment11-unity-mlagents/`, `modelscope-space/hands-on-modern-rl-experiment12-ai2thor-embodied/` | 音频序列奖励、具身部分可观测长轨迹、扩散去噪轨迹三种机制对照；再观察 reward vector 权重冲突 |
| 26 · 奖励黑客与 RL 评测 | 指标变好为什么仍可能行为变坏？ | `docs/chapter30_alignment_failures/`, `code/appendix_common_pitfalls/` | proxy reward 与真实目标的 Goodhart 缺口 |
| 27 · 自博弈、规模化与研究前沿 | 没有固定数据和对手时，能力怎样自我扩展？ | `docs/chapter32_selfplay/`, `code/chapter12_future_trends/` | opponent pool 与非平稳学习曲线 |

Chapter 25 的固定上游 commit 中 `docs/chapter28_vla/` 为空，因此不得把它写成知识来源。具身部分必须从上述仓库内可执行实验提取：ManiSkill 负责连续机器人控制，MineStudio 负责长时开放世界任务，Unity ML-Agents 负责多样化模拟环境，AI2-THOR 负责第一视角部分可观测交互。音频、具身和视觉生成需要分别建立 state/action/trajectory 映射，不能用一个通用 reward slider 代替三类机制。

## 高碰撞概念的章节所有权

并行作者必须遵守下表。`首次正式解释` 负责完整动机、定义、公式、数值例和代码映射；`后续只回顾` 最多用一个短段重新定位，不得重复授课；`明确不展开` 留给指定后章。

| 概念 | 首次正式解释 | 后续只回顾 | 明确不展开的边界 |
| --- | --- | --- | --- |
| experience replay 与 target network | Chapter 06 | Chapter 10、11 | Chapter 06 不正式讲 offline distribution shift |
| off-policy continuous control | Chapter 10 | Chapter 11、13 | Chapter 10 不展开固定数据集的 OOD 误差 |
| dataset support / distribution shift | Chapter 11 | Chapter 13、21 | Chapter 11 不展开通用探索算法 |
| advantage function | Chapter 08 | Chapter 09、14、16 | Chapter 08 不展开 GAE 或 group-relative normalization |
| Generalized Advantage Estimation（GAE） | Chapter 09 | Chapter 14 | Chapter 09 不进入 RLHF 系统工程 |
| PPO ratio、clipping 与 old policy | Chapter 09 | Chapter 14、19 | `old policy` 不得与 LLM 的 `reference policy` 混为一谈 |
| KL regularization 与 reference policy | Chapter 14 | Chapter 15、16、19 | Chapter 14 只给对齐中的 KL 作用，DPO log-ratio 推导留给 Chapter 15 |
| preference reward model | Chapter 14 | Chapter 15、19、26 | Chapter 15 解释隐式 reward，不重讲 reward-model 训练流水线 |
| Constitutional AI（CAI）与 RLAIF | Chapter 14 | Chapter 26 | Chapter 26 只讨论 judge bias、self-preference 与过度优化失败，不重讲 CAI 流水线 |
| group-relative advantage、GRPO | Chapter 16 | Chapter 17、19 | Chapter 16 不展开 process reward search |
| outcome verifier 与 RLVR | Chapter 16 | Chapter 18、21、24、26 | Chapter 16 只建立可验证结果奖励；步骤级监督留给 Chapter 18 |
| Process Reward Model（PRM） | Chapter 18 | Chapter 20、26 | Chapter 18 不展开代码测试或视觉 grounding verifier |
| repository/test verifier | Chapter 21 | Chapter 22、26 | Chapter 21 不把单元测试描述成普适真值 |
| multimodal verifier | Chapter 24 | Chapter 26 | Chapter 24 不系统讲 Goodhart 与 reward hacking 分类 |
| reward hacking / Goodhart 缺口 | Chapter 26 | Chapter 27 只回顾 | 早期章节只指出局部风险，不建立完整失败类型学 |
| intrinsic exploration | Chapter 13 | Chapter 20、27 | Chapter 13 不展开浏览器/工具轨迹或 self-play population |
| multi-agent RL 与个体 credit assignment | Chapter 13 | Chapter 20、27 | Chapter 20 聚焦协作工具系统，Chapter 27 聚焦对手与非平稳 curriculum |
| world model（学习环境动力学） | Chapter 10 | Chapter 21 | Chapter 21 的 repository/world model 只能作迁移类比，不重新定义动力学模型 |

两条跨批主链必须保持以下分工：

```text
Chapter 13：多智能体环境与 credit assignment 的基本问题
→ Chapter 20：多轮工具调用和协作 Agent 的 trajectory/credit
→ Chapter 27：对手池、自博弈 curriculum 与非平稳共同进化
```

```text
Chapter 14：人类/AI 反馈、reward model、PPO/KL 对齐流水线
→ Chapter 15：偏好对上的 DPO log-ratio
→ Chapter 16：组内相对优势、GRPO、RLVR outcome verifier
→ Chapter 18：步骤级过程奖励与推理时搜索
→ Chapter 26：judge/verifier/reward 的系统性失败与评测
```

## Task 1：并行制作独立章节文件

**Files:** Create `lecture/modern-rl/chapter06*` through `lecture/modern-rl/chapter27*`.

**Step 1:** 每名作者 Agent 先读取 Chapter 04–05 的 shell、分片、CSS、JS 与本计划，再读取自己章节对应的全部上游文档和代码。

**Step 2:** 在不编辑共享文件的前提下，创建本章六个文件，并用本章专属实验回答一个明确问题。

**Step 3:** 运行 `node --check lecture/modern-rl/chapterNN.js`。

**Step 4:** 运行 `node scripts/validate-modern-rl.mjs NN`；若验证器因章节尚未集成而失败，先修复本章内部问题并在交付说明中记录剩余集成依赖。

## Task 2：在每批审稿前完成本地集成

**Files:** Modify `lecture/modern-rl/index.html` and each batch边界章节的上一章/下一章链接。

**Step 1:** 核对 Chapter 06–27 的标题、编号和上游映射与课程设计一致。

**Step 2:** 在本地集成稿中把本批章节配置为 `READ`、下一章配置为 `NEXT`，使审稿人能够检查最终目录、导航与桥梁；只有本批获得 `PASS` 后，这个本地状态才允许提交和推送。

**Step 3:** 检查 Chapter 05→06、10→11、13→14、19→20、24→25 与 27→课程目录的桥梁。

## Task 3：逐批执行独立教学审稿门禁与发布闭环

每个 Batch 使用一名未参与该批写作的独立教学审稿 Agent，并按以下完整顺序执行：

```text
作者完成本批独立文件
→ 主 Agent 在本地集成首页、相邻导航和跨章桥梁
→ 首审（只读，PASS/FAIL + 阻塞清单）
→ 主 Agent 修改
→ 同一个审稿 Agent 复审
→ 若 FAIL，继续修改并交回同一审稿人
→ 明确 PASS
→ 本批技术验证 + 已发布章节回归
→ 本批提交、推送和线上核验
→ 进入下一批
```

审稿必须检查：读者画像、术语首现、公式动机与推导、数值例、代码映射、实验六要素、Insight 质量、理解题、认知负荷、跨章重复、上一章承接与下一章必要性。

## Task 4：逐批技术验证与最终全量验证

**Step 1:** 每批发布前运行 `node scripts/validate-modern-rl.mjs 01 ... NN`，其中 `NN` 是本批末章；Batch E 完成后再运行一次 Chapter 01–27 全量验证。

**Step 2:** 对所有 `lecture/modern-rl/*.js` 运行 `node --check`。

**Step 3:** 通过本地 HTTP 检查所有 shell、分片、CSS、JS 和 KaTeX 资源返回 200。

**Step 4:** 每批发布前在 1440×1000 与 390×844 下真实检查本批每章 `clientWidth === scrollWidth`、KaTeX error 为 0、加载占位消失、目录目标完整；已发布章节用结构验证做回归，Batch E 再做全课程抽样浏览器回归。

**Step 5:** 对互动实验执行默认值、至少一个反事实参数和 reset/恢复，并与手算核对。对静态实验核对输入、图中数值、对照结论、caption 与至少一个明确的反事实推论，不要求虚构交互状态或 reset。

## Task 5：提交、推送与线上核验

每个 Batch 独立获得审稿 Agent 的明确 `PASS` 且通过该批 Task 4 验证后，就形成一个清晰提交并推送，不等待其余批次。推送前先 `git fetch origin master` 并检查远端是否有不相关新提交；禁止 force push。GitHub Actions Pages 成功后，确认本批公开 shell、分片和至少一个复审修订标记可在线读取，再进入下一批。
