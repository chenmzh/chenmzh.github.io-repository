(function attachCloudQuizData(root) {
  "use strict";

  const RL_REPO = "https://github.com/walkinglabs/hands-on-modern-rl";
  const RL_SOURCES = Object.freeze({
    basics: `${RL_REPO}/blob/main/docs/chapter03_mdp/mdp.md`,
    bellman: `${RL_REPO}/blob/main/docs/chapter03_mdp/value-bellman.md`,
    dqn: `${RL_REPO}/blob/main/docs/chapter07_dqn/dqn-components.md`,
    policy: `${RL_REPO}/blob/main/docs/chapter08_policy_gradient/reinforce.md`,
    actorCritic: `${RL_REPO}/blob/main/docs/chapter09_actor_critic/actor-critic.md`,
    ppo: `${RL_REPO}/blob/main/docs/chapter10_ppo/trust-region-clipping.md`,
    offline: `${RL_REPO}/blob/main/docs/chapter12_offline_rl/offline-data-distribution-shift.md`,
    alignment: `${RL_REPO}/blob/main/docs/chapter15_rlhf/standard-rlhf-pipeline.md`,
    dpo: `${RL_REPO}/blob/main/docs/chapter17_dpo/dpo-objective-derivation.md`,
    grpo: `${RL_REPO}/blob/main/docs/chapter18_grpo/grpo-practice-and-mechanism.md`,
    rlvr: `${RL_REPO}/blob/main/docs/chapter18_grpo/rlvr.md`,
    agentic: `${RL_REPO}/blob/main/docs/chapter22_agentic/overview.md`,
    evaluation: `${RL_REPO}/blob/main/docs/chapter30_alignment_failures/classical-failures.md`,
  });

  const QUIZ_CONFIG = Object.freeze({
    math: Object.freeze({
      id: "math", label: "数学挑战", english: "MATH COUNTER",
      icon: "∑", description: "心算、比例、概率与逻辑。算得越稳，连对小费越高。",
      baseReward: 10, streakStep: 2, streakCap: 6, perfectBonus: 12,
    }),
    general: Object.freeze({
      id: "general", label: "常识问答", english: "CURIOSITY DESK",
      icon: "?", description: "科学、历史、地理、艺术与计算机基础，轻松但不敷衍。",
      baseReward: 9, streakStep: 1, streakCap: 4, perfectBonus: 10,
    }),
    rl: Object.freeze({
      id: "rl", label: "RL 研修", english: "POLICY LAB",
      icon: "π", description: "从 Bellman 到 PPO、GRPO 与 Agentic RL，难度和收益都是最高档。",
      baseReward: 14, streakStep: 2, streakCap: 8, perfectBonus: 15,
      sourceUrl: RL_REPO,
      sourceLabel: "题目依据 Hands-On Modern RL · CC BY-NC-SA 4.0",
    }),
  });

  const MATH_QUESTIONS = [
    { id: "math-percent-240", prompt: "240 的 15% 是多少？", options: ["24", "30", "36", "40"], answer: 2, explanation: "240 × 0.15 = 36。" },
    { id: "math-linear-3x", prompt: "若 3x + 7 = 25，那么 x 等于？", options: ["4", "5", "6", "8"], answer: 2, explanation: "先减 7 得 3x = 18，再除以 3，x = 6。" },
    { id: "math-ratio-35", prompt: "红蓝糖果数量比为 2:3，共有 35 颗。红糖果有多少颗？", options: ["12", "14", "15", "21"], answer: 1, explanation: "总份数是 5，每份 7 颗；红糖果占 2 份，共 14 颗。" },
    { id: "math-average-four", prompt: "12、18、20、10 的平均数是多少？", options: ["14", "15", "16", "17"], answer: 1, explanation: "四个数之和为 60，60 ÷ 4 = 15。" },
    { id: "math-decimal-quarter", prompt: "0.25 × 80 等于？", options: ["16", "20", "24", "32"], answer: 1, explanation: "0.25 就是四分之一，80 的四分之一是 20。" },
    { id: "math-die-even", prompt: "掷一枚公平六面骰子，得到偶数的概率是？", options: ["1/6", "1/3", "1/2", "2/3"], answer: 2, explanation: "偶数结果有 2、4、6，共 3 个；3/6 = 1/2。" },
    { id: "math-sequence-product", prompt: "数列 2、6、12、20 的下一项是？", options: ["24", "28", "30", "32"], answer: 2, explanation: "各项可写成 1×2、2×3、3×4、4×5，下一项是 5×6 = 30。" },
    { id: "math-rectangle-area", prompt: "长方形周长为 30，长为 9，面积是多少？", options: ["45", "48", "54", "63"], answer: 2, explanation: "2×(长+宽)=30，所以宽为 6，面积 9×6 = 54。" },
    { id: "math-powers-two", prompt: "2⁵ × 2³ 等于？", options: ["64", "128", "256", "512"], answer: 2, explanation: "同底数幂相乘指数相加：2⁸ = 256。" },
    { id: "math-fractions", prompt: "3/4 + 1/8 等于？", options: ["4/12", "5/8", "7/8", "1"], answer: 2, explanation: "3/4 化为 6/8，再加 1/8 得 7/8。" },
    { id: "math-discount", prompt: "一件 150 元的商品打八折，售价是多少？", options: ["110", "120", "125", "130"], answer: 1, explanation: "八折是原价的 80%，150 × 0.8 = 120。" },
    { id: "math-speed", prompt: "3 小时行驶 180 千米，平均速度是多少？", options: ["45 千米/时", "50 千米/时", "60 千米/时", "90 千米/时"], answer: 2, explanation: "平均速度 = 路程 ÷ 时间 = 180 ÷ 3 = 60 千米/时。" },
    { id: "math-circle-area", prompt: "半径为 3 的圆，面积是多少？", options: ["3π", "6π", "9π", "18π"], answer: 2, explanation: "圆面积为 πr²，r = 3，因此面积是 9π。" },
    { id: "math-worker-days", prompt: "5 人用 8 天完成同样工作。效率相同，10 人需要几天？", options: ["2 天", "4 天", "5 天", "16 天"], answer: 1, explanation: "工作量是 5×8 = 40 人天；40 ÷ 10 = 4 天。" },
    { id: "math-median", prompt: "3、7、8、9、20 的中位数是？", options: ["7", "8", "9", "9.4"], answer: 1, explanation: "五个数已排序，正中间的第三个数是 8。" },
    { id: "math-two-variable", prompt: "若 x=4、y=3，那么 2x + 3y 等于？", options: ["14", "15", "17", "21"], answer: 2, explanation: "2×4 + 3×3 = 8 + 9 = 17。" },
    { id: "math-compound-growth", prompt: "100 连续两次增长 10%，结果是多少？", options: ["110", "120", "121", "122"], answer: 2, explanation: "两次增长是 100×1.1×1.1 = 121，不是简单加 20。" },
    { id: "math-two-coins", prompt: "同时抛两枚公平硬币，恰好一枚正面的概率是？", options: ["1/4", "1/3", "1/2", "3/4"], answer: 2, explanation: "四种等可能结果中，正反、反正符合条件，因此概率是 2/4 = 1/2。" },
    { id: "math-root-plus", prompt: "√144 + 6 等于？", options: ["12", "16", "18", "20"], answer: 2, explanation: "√144 = 12，再加 6 得 18。" },
    { id: "math-logic-cats", prompt: "所有云猫都会打呼噜；米糕是一只云猫。必然能推出什么？", options: ["米糕会打呼噜", "会打呼噜的都是云猫", "米糕不会打呼噜", "没有必然结论"], answer: 0, explanation: "这是从“所有 A 都是 B”和“米糕是 A”推出“米糕是 B”的有效演绎。" },
  ];

  const GENERAL_QUESTIONS = [
    { id: "general-ocean", prompt: "地球上面积最大的海洋是？", options: ["大西洋", "印度洋", "太平洋", "北冰洋"], answer: 2, explanation: "太平洋是地球上面积最大、最深的海洋。" },
    { id: "general-photosynthesis", prompt: "绿色植物进行光合作用时主要吸收哪种气体？", options: ["氧气", "二氧化碳", "氮气", "氦气"], answer: 1, explanation: "植物利用二氧化碳和水合成有机物，并释放氧气。" },
    { id: "general-water-freezing", prompt: "在标准大气压下，纯水的冰点是？", options: ["0°C", "10°C", "32°C", "100°C"], answer: 0, explanation: "标准大气压下纯水在 0°C 冻结；32°F 也是同一温度，但不是 32°C。" },
    { id: "general-heart", prompt: "人体中负责泵送血液的器官是？", options: ["肺", "肝脏", "心脏", "肾脏"], answer: 2, explanation: "心脏通过有节律的收缩推动血液循环。" },
    { id: "general-dna", prompt: "DNA 的中文名称是？", options: ["核糖核酸", "脱氧核糖核酸", "氨基酸", "腺苷三磷酸"], answer: 1, explanation: "DNA 是 deoxyribonucleic acid，即脱氧核糖核酸。" },
    { id: "general-moon", prompt: "地球唯一的天然卫星是？", options: ["火星", "金星", "月球", "太阳"], answer: 2, explanation: "月球是地球唯一的天然卫星。" },
    { id: "general-gold", prompt: "金元素的化学符号是？", options: ["Ag", "Au", "Fe", "Gd"], answer: 1, explanation: "金的元素符号是 Au，来自拉丁语 aurum。" },
    { id: "general-world-war-two", prompt: "第二次世界大战结束于哪一年？", options: ["1918", "1939", "1945", "1950"], answer: 2, explanation: "第二次世界大战于 1945 年结束。" },
    { id: "general-colosseum", prompt: "古罗马斗兽场位于今天的哪个国家？", options: ["希腊", "意大利", "西班牙", "土耳其"], answer: 1, explanation: "斗兽场位于意大利首都罗马。" },
    { id: "general-great-wall", prompt: "长城主要位于哪个国家？", options: ["中国", "印度", "埃及", "墨西哥"], answer: 0, explanation: "长城是中国古代修建的大型防御工程体系。" },
    { id: "general-mona-lisa", prompt: "《蒙娜丽莎》的作者是？", options: ["米开朗基罗", "拉斐尔", "达·芬奇", "梵高"], answer: 2, explanation: "《蒙娜丽莎》由意大利文艺复兴时期艺术家列奥纳多·达·芬奇创作。" },
    { id: "general-1984", prompt: "小说《1984》的作者是？", options: ["乔治·奥威尔", "海明威", "托尔斯泰", "卡夫卡"], answer: 0, explanation: "《1984》是英国作家乔治·奥威尔的反乌托邦小说。" },
    { id: "general-http", prompt: "HTTP 中的 H 代表什么？", options: ["High", "Hypertext", "Host", "Hybrid"], answer: 1, explanation: "HTTP 是 Hypertext Transfer Protocol，即超文本传输协议。" },
    { id: "general-binary-ten", prompt: "二进制数 1010 对应十进制多少？", options: ["8", "9", "10", "12"], answer: 2, explanation: "1010₂ = 1×8 + 0×4 + 1×2 + 0×1 = 10。" },
    { id: "general-html", prompt: "HTML 在网页中的主要职责是？", options: ["描述内容结构", "训练神经网络", "压缩图片", "管理数据库事务"], answer: 0, explanation: "HTML 用标记描述网页内容与语义结构；样式通常由 CSS 负责。" },
    { id: "general-prime", prompt: "小于 20 的最大质数是？", options: ["15", "17", "18", "19"], answer: 3, explanation: "19 只能被 1 和自身整除，是小于 20 的最大质数。" },
    { id: "general-prime-meridian", prompt: "传统上，0° 经线穿过英国的哪个地区？", options: ["牛津", "剑桥", "格林尼治", "曼彻斯特"], answer: 2, explanation: "本初子午线传统上以伦敦格林尼治天文台为基准。" },
    { id: "general-largest-organ", prompt: "人体面积最大的器官是？", options: ["心脏", "肝脏", "皮肤", "肺"], answer: 2, explanation: "皮肤覆盖全身，是人体面积最大的器官。" },
    { id: "general-beethoven-nine", prompt: "《第九交响曲》的作曲者是？", options: ["莫扎特", "贝多芬", "肖邦", "德彪西"], answer: 1, explanation: "《第九交响曲》是路德维希·凡·贝多芬晚期的代表作。" },
    { id: "general-hydrogen", prompt: "原子序数为 1 的元素是？", options: ["氢", "氦", "锂", "氧"], answer: 0, explanation: "氢的原子核通常只有一个质子，因此原子序数为 1。" },
  ];

  const RL_QUESTIONS = [
    { id: "rl-agent-action", prompt: "在强化学习中，智能体对环境做出的选择通常称为？", options: ["状态", "动作", "回报", "模型"], answer: 1, explanation: "智能体在状态下选择动作，环境再返回新状态与奖励。", sourceUrl: RL_SOURCES.basics },
    { id: "rl-reward-return", prompt: "即时奖励 rₜ 与回报 Gₜ 的主要区别是什么？", options: ["两者完全相同", "Gₜ 汇总当前及未来奖励", "rₜ 一定更大", "Gₜ 只看下一状态"], answer: 1, explanation: "奖励是单步反馈；回报通常是从当前时刻起未来奖励的折扣和。", sourceUrl: RL_SOURCES.bellman },
    { id: "rl-gamma", prompt: "折扣因子 γ 越接近 1，通常意味着策略怎样看待未来奖励？", options: ["更重视", "完全忽略", "只保留负奖励", "把未来奖励变成状态"], answer: 0, explanation: "γ 越接近 1，越保留远期奖励的权重；较小的 γ 更偏重眼前。", sourceUrl: RL_SOURCES.bellman },
    { id: "rl-state-value", prompt: "状态价值 Vπ(s) 表示什么？", options: ["动作数量", "从 s 出发遵循 π 的期望回报", "环境的随机种子", "当前一步的奖励"], answer: 1, explanation: "Vπ(s) 衡量从状态 s 出发并遵循策略 π 时，未来能获得的期望回报。", sourceUrl: RL_SOURCES.bellman },
    { id: "rl-bellman", prompt: "Bellman 方程最核心的递归结构是？", options: ["当前价值 = 当前奖励 + 折扣后的后继价值", "价值 = 参数数量", "奖励 = 状态数量", "策略 = 随机噪声"], answer: 0, explanation: "Bellman 方程把长期价值拆成当前一步奖励与下一状态折扣价值。", sourceUrl: RL_SOURCES.bellman },
    { id: "rl-mc-td", prompt: "相比蒙特卡洛方法，TD 学习最典型的特点是？", options: ["必须等 episode 完整结束", "可用下一步价值估计进行自举更新", "完全不使用奖励", "只能用于无状态问题"], answer: 1, explanation: "TD 用当前奖励和下一状态的价值估计更新，因此不必总等完整回合结束。", sourceUrl: RL_SOURCES.dqn },
    { id: "rl-q-value", prompt: "Qπ(s,a) 主要衡量什么？", options: ["在 s 采取 a 后遵循 π 的期望回报", "状态 s 的像素数量", "动作 a 的执行时间", "策略网络层数"], answer: 0, explanation: "动作价值函数评价在状态 s 先采取动作 a，再遵循策略 π 的长期收益。", sourceUrl: RL_SOURCES.dqn },
    { id: "rl-dqn-replay", prompt: "DQN 中经验回放的主要作用是？", options: ["删除所有旧经验", "随机复用经验并减弱样本相关性", "固定所有 Q 值", "把离散动作变成连续动作"], answer: 1, explanation: "回放池随机抽取历史转移，既可复用数据，也减弱连续样本的相关性。", sourceUrl: RL_SOURCES.dqn },
    { id: "rl-dqn-target", prompt: "DQN 使用目标网络主要为了？", options: ["增加动作数量", "让 TD 目标短期内更稳定", "替代奖励函数", "保证每次探索相同"], answer: 1, explanation: "目标网络延迟更新，使学习目标不会和在线网络同时快速移动。", sourceUrl: RL_SOURCES.dqn },
    { id: "rl-epsilon-greedy", prompt: "ε-greedy 策略在概率 ε 下通常会？", options: ["随机选择动作", "终止训练", "总选 Q 值最小动作", "重置环境模型"], answer: 0, explanation: "ε-greedy 以 ε 的概率随机探索，否则选择当前估计最优动作。", sourceUrl: RL_SOURCES.dqn },
    { id: "rl-policy-based", prompt: "Policy-Based 方法与 Value-Based 方法的核心差别是？", options: ["直接学习动作概率分布", "不需要任何数据", "只能处理确定性环境", "永远不探索"], answer: 0, explanation: "策略方法直接参数化 πθ(a|s)，而价值方法通常先学习 Q 值再间接选动作。", sourceUrl: RL_SOURCES.policy },
    { id: "rl-reinforce-update", prompt: "REINFORCE 中，一个动作带来较大正回报时，更新倾向于？", options: ["降低该动作概率", "提高该动作概率", "删除该状态", "把 γ 设为 0"], answer: 1, explanation: "策略梯度用回报加权对数概率梯度：好结果会提升相应动作再次出现的概率。", sourceUrl: RL_SOURCES.policy },
    { id: "rl-reinforce-episode", prompt: "朴素 REINFORCE 为什么通常要等完整 episode 后再更新？", options: ["需要知道每步到终点的完整回报", "策略没有参数", "环境不返回状态", "只能使用最终动作"], answer: 0, explanation: "每一步的 Gₜ 依赖该时刻之后的全部奖励，所以需等轨迹结束才能完整计算。", sourceUrl: RL_SOURCES.policy },
    { id: "rl-baseline", prompt: "在策略梯度中加入不依赖动作的 baseline，主要目的是什么？", options: ["增大奖励尺度", "降低梯度估计方差", "取消探索", "改变动作空间"], answer: 1, explanation: "合适的 baseline 不改变梯度期望方向，却能显著降低回报波动带来的方差。", sourceUrl: RL_SOURCES.actorCritic },
    { id: "rl-actor-critic", prompt: "Actor-Critic 中 Actor 和 Critic 通常分别负责什么？", options: ["Actor 选动作，Critic 估计价值", "Actor 估计价值，Critic 采集像素", "两者只复制数据", "两者都固定不更新"], answer: 0, explanation: "Actor 表示策略并做决策；Critic 评估状态或动作价值，为策略更新提供较稳信号。", sourceUrl: RL_SOURCES.actorCritic },
    { id: "rl-advantage", prompt: "优势函数 A(s,a) 为正通常表示？", options: ["该动作比当前基准表现更好", "该状态必定终止", "奖励函数失效", "策略概率必须为零"], answer: 0, explanation: "优势衡量某动作相对状态基准价值的好坏；正值说明它优于通常表现。", sourceUrl: RL_SOURCES.actorCritic },
    { id: "rl-ppo-ratio", prompt: "PPO 的策略比率 rₜ(θ) 比较的是？", options: ["新旧策略对同一动作的概率", "两个环境的奖励总和", "状态与动作的维度", "训练集与测试集大小"], answer: 0, explanation: "rₜ(θ)=πθ(aₜ|sₜ)/πold(aₜ|sₜ)，衡量新策略相对旧策略的概率变化。", sourceUrl: RL_SOURCES.ppo },
    { id: "rl-ppo-clip", prompt: "PPO 的 clipping 主要想限制什么？", options: ["单次策略更新幅度", "episode 的最短长度", "奖励必须为正", "神经网络层数"], answer: 0, explanation: "裁剪概率比率会抑制过大的策略变化，让同一批 on-policy 数据能更安全地复用几轮。", sourceUrl: RL_SOURCES.ppo },
    { id: "rl-offline-shift", prompt: "离线 RL 的典型难点“分布外动作”来自哪里？", options: ["策略选到数据集中很少出现的动作", "奖励永远为零", "环境没有状态", "所有轨迹完全相同"], answer: 0, explanation: "只用固定数据训练时，策略可能偏爱缺少可靠价值证据的分布外动作，导致估计误差放大。", sourceUrl: RL_SOURCES.offline },
    { id: "rl-rlhf", prompt: "RLHF 中，奖励模型通常学习什么？", options: ["人类对不同回答的偏好信号", "网页的 CSS", "环境的物理方程", "随机数生成规则"], answer: 0, explanation: "奖励模型把人类比较或排序偏好转成可用于策略优化的标量信号。", sourceUrl: RL_SOURCES.alignment },
    { id: "rl-dpo", prompt: "DPO 与经典 RLHF-PPO 流程相比，一个常见特点是？", options: ["直接用偏好对优化策略，不显式运行在线 RL", "必须训练环境模型", "只能处理图像", "不使用任何偏好数据"], answer: 0, explanation: "DPO 把偏好学习写成直接的策略优化目标，省去显式奖励模型加在线 PPO 的部分复杂度。", sourceUrl: RL_SOURCES.dpo },
    { id: "rl-grpo-group", prompt: "GRPO 的“组内相对优势”主要如何得到？", options: ["比较同一 prompt 多个回答的奖励", "只看单个 token 长度", "固定写死为 1", "由用户余额决定"], answer: 0, explanation: "GRPO 对同一 prompt 采样一组回答，用每个回答相对组内均值（常配合标准差）的表现构造优势。", sourceUrl: RL_SOURCES.grpo },
    { id: "rl-grpo-critic", prompt: "课程中的 GRPO 机制相对 PPO Actor-Critic，关键简化是？", options: ["用组内相对奖励替代单独训练的 Critic", "删除策略网络", "不再生成回答", "让所有回答奖励相同"], answer: 0, explanation: "GRPO 保留在线组采样、概率比率与 PPO-style 裁剪，但不单独训练 Critic。", sourceUrl: RL_SOURCES.grpo },
    { id: "rl-rlvr", prompt: "RLVR 中“可验证奖励”最适合哪类任务？", options: ["答案能由规则或程序可靠核验的任务", "完全没有判定标准的审美偏好", "无法执行的工具调用", "只要求文本更长"], answer: 0, explanation: "数学、代码等任务常能用确定规则或执行结果核验，减少主观奖励噪声。", sourceUrl: RL_SOURCES.rlvr },
    { id: "rl-agent-loop", prompt: "Agentic Loop 的典型循环是？", options: ["观察→推理→动作→新观察", "奖励→删除→暂停→复制", "训练→发布→永不反馈", "状态→只输出最终答案"], answer: 0, explanation: "Agent 持续感知环境、决定下一步、调用工具或执行动作，再接收新的观察，直到终止。", sourceUrl: RL_SOURCES.agentic },
    { id: "rl-agent-trajectory", prompt: "在 Agentic RL 中，一条 trajectory 通常包含什么？", options: ["多轮状态、动作、工具返回与环境变化", "只有最终一句答案", "只有模型参数", "一张静态图片"], answer: 0, explanation: "Agent 轨迹混合模型输出、结构化工具调用、工具响应和环境状态变化，是完整交互记录。", sourceUrl: RL_SOURCES.agentic },
    { id: "rl-credit-assignment", prompt: "长程 Agent 任务中的 credit assignment 问题指什么？", options: ["最终成败应归因到哪些早期动作", "如何压缩模型文件", "如何选择字体", "怎样固定所有奖励"], answer: 0, explanation: "最终奖励很晚才出现，需要判断轨迹中的哪些步骤真正促成成功或导致失败。", sourceUrl: RL_SOURCES.agentic },
    { id: "rl-reward-hacking", prompt: "“奖励投机（reward hacking）”最准确的描述是？", options: ["策略钻奖励规则漏洞拿高分，却没完成真实目标", "奖励数值太小", "训练速度过慢", "用户忘记保存模型"], answer: 0, explanation: "当奖励只是目标的代理指标，策略可能优化这个指标的漏洞，而不是我们真正关心的行为。", sourceUrl: RL_SOURCES.evaluation },
  ];

  const QUESTION_BANKS = Object.freeze({
    math: Object.freeze(MATH_QUESTIONS.map(Object.freeze)),
    general: Object.freeze(GENERAL_QUESTIONS.map(Object.freeze)),
    rl: Object.freeze(RL_QUESTIONS.map(Object.freeze)),
  });

  const API = Object.freeze({ RL_REPO, RL_SOURCES, QUIZ_CONFIG, QUESTION_BANKS });
  root.CloudQuizData = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : window);
