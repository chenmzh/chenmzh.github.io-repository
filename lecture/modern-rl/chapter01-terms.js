(() => {
  'use strict';

  function renderMath(root) {
    if (!root || typeof renderMathInElement !== 'function') return;
    renderMathInElement(root, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      throwOnError: false
    });
  }

  function paragraphAfter(target, html, cls = 'mrl-term-intro') {
    if (!target || !target.parentNode) return null;
    const p = document.createElement('p');
    p.className = cls;
    p.innerHTML = html;
    target.insertAdjacentElement('afterend', p);
    renderMath(p);
    return p;
  }

  function explainTerms() {
    const hero = document.querySelector('#hero');
    if (!hero || hero.dataset.termsReady === '1') return false;
    hero.dataset.termsReady = '1';

    const eyebrow = hero.querySelector('.mrl-eyebrow');
    if (eyebrow) eyebrow.textContent = 'Chapter 01 · Reinforcement Learning (RL) / 强化学习';

    const lead = hero.querySelector('.lead');
    paragraphAfter(lead, `
      本章用 <strong>CartPole</strong>（一个经典倒立摆控制任务：左右推动小车，让杆子尽可能保持竖直）贯穿全章。最后会预览
      <strong>Proximal Policy Optimization（PPO，近端策略优化）</strong>：一种直接改进<strong>策略（policy）</strong>的强化学习算法。
      这里的 policy 就是“看到当前状态后，应该怎样选择动作”的决策规则；PPO 的第一层直觉只有一句话：<strong>根据新经验改策略，但一次不要改得太猛。</strong>
    `, 'mrl-term-opening');

    const roadmapLoop = hero.querySelector('a[href="#loop"] small');
    if (roadmapLoop) roadmapLoop.textContent = '状态 · 动作 · 奖励';
    const roadmapLab = hero.querySelector('a[href="#lab"] small');
    if (roadmapLab) roadmapLab.textContent = '亲手感受策略';
    const roadmapPpo = hero.querySelector('a[href="#ppo-preview"]');
    if (roadmapPpo) {
      const title = roadmapPpo.querySelector('span');
      const small = roadmapPpo.querySelector('small');
      if (title) title.textContent = 'PPO · 近端策略优化';
      if (small) small.textContent = '稳定地改进策略';
    }

    const start = document.querySelector('#start');
    if (start) {
      const leadStart = start.querySelector('.mrl-sec-lead');
      if (leadStart) {
        leadStart.innerHTML = '强化学习最容易被讲复杂的地方，是一上来就定义<strong>马尔可夫决策过程（Markov Decision Process，MDP）</strong>——一种用状态、动作、状态转移和奖励来形式化序贯决策问题的数学框架。这里先不急着上完整定义，我们先看强化学习到底改变了哪条机器学习假设。';
      }
      const agentLi = [...start.querySelectorAll('li')].find(li => li.textContent.includes('agent 自己行动产生'));
      if (agentLi) agentLi.innerHTML = '数据不是先给你的，而是<strong>智能体（agent）</strong>自己行动产生的；agent 就是那个观察环境、选择动作并根据反馈改进自己的决策系统。';
      const rewardP = [...start.querySelectorAll('p')].find(p => p.textContent.includes('一个叫 reward 的标签'));
      if (rewardP) rewardP.innerHTML = 'RL 不是“监督学习 + 一个叫 <strong>reward（奖励）</strong> 的标签”。Reward 是环境在交互后给出的反馈信号，它通常只评价结果，并不直接告诉你每一步的正确动作。真正困难的是：从结果反推哪些早期决策值得增加概率，哪些应该减少——这就是后面会不断出现的 <strong>credit assignment（信用分配）</strong>。';
    }

    const loop = document.querySelector('#loop');
    if (loop) {
      const leadLoop = loop.querySelector('.mrl-sec-lead');
      paragraphAfter(leadLoop, '在下面的闭环里，<strong>policy（策略）</strong>指 agent 的决策规则：给定当前状态，决定各个动作应该有多大概率被选择。后面会把它写成 $\\pi(a\\mid s)$。');
      const vizHeadP = loop.querySelector('.mrl-viz-head p');
      if (vizHeadP) vizHeadP.innerHTML = '一切现代 RL——包括后面会接触的<strong>大语言模型智能体（LLM agent）</strong>——都可以先从这个循环理解。';
    }

    const trajectory = document.querySelector('#trajectory');
    if (trajectory) {
      const caption = trajectory.querySelector('.mrl-caption');
      if (caption) caption.innerHTML = '这样一整串按时间排列的交互叫 <strong>trajectory（轨迹）</strong>，常写成 $\\tau=(s_0,a_0,r_0,s_1,a_1,r_1,\\ldots)$。它保留了“某个早期动作怎样影响后面结果”的时间结构。';
      const bridge = [...trajectory.querySelectorAll('.mrl-card p')].find(p => p.textContent.includes('Value function 本质'));
      if (bridge) bridge.innerHTML = '<strong>Value function（价值函数）</strong>估计“从某个状态开始，未来大概还能得到多少回报”；<strong>Advantage（优势）</strong>则衡量“某个具体动作比这个状态下的平均预期好多少”。把负责选择动作的策略网络与负责估计价值的网络配在一起训练，形成一大类 <strong>Actor-Critic（演员–评论家）</strong>方法。后面 PPO 正是建立在这些思想之上。';
    }

    const policy = document.querySelector('#policy');
    if (policy) {
      const leadPolicy = policy.querySelector('.mrl-sec-lead');
      if (leadPolicy) leadPolicy.innerHTML = 'Policy 的概念一旦真正吃透，后面的 <strong>policy gradient（策略梯度）</strong>就会自然很多：它指的是直接沿着“让高回报动作更可能出现”的方向调整 policy 参数的方法。PPO 属于这条路线。';
    }

    const ppo = document.querySelector('#ppo-preview');
    if (ppo) {
      const leadPpo = ppo.querySelector('.mrl-sec-lead');
      paragraphAfter(leadPpo, `
        先把这一节马上会出现的三个词说清楚：<strong>rollout（轨迹采样）</strong>是让当前策略在环境里实际跑一段并记录经验；
        <strong>Critic（评论家/价值网络）</strong>负责估计“当前状态大概有多好”；
        <strong>advantage（优势）</strong>则表示“这次动作相对原本预期到底好多少”。
        PPO 就利用这些信息来决定哪些动作概率该升、哪些该降。
      `, 'mrl-term-bridge');
      const caption = [...ppo.querySelectorAll('.mrl-caption')].find(p => p.textContent.includes('Actor-Critic'));
      if (caption) caption.innerHTML = '这是“为什么 PPO 比最直接的 policy gradient 更稳”的第一层直觉，不是完整推导。后面学习 Actor-Critic 时还会遇到 <strong>Generalized Advantage Estimation（GAE，广义优势估计）</strong>——一种把多步 TD 信息结合起来、更稳定地估计 advantage 的方法。';
    }

    const code = document.querySelector('#code');
    if (code) {
      const leadCode = code.querySelector('.mrl-sec-lead');
      if (leadCode) leadCode.innerHTML = '<strong>Gymnasium</strong> 是强化学习里常用的环境接口库：它把 reset、step、observation、reward 等交互过程统一成一套 API。第一次读 RL 代码时，先只认出交互循环，就已经抓住了骨架。';
      const neuralHeading = [...code.querySelectorAll('h3')].find(h => h.textContent.includes('policy 是一个神经网络'));
      paragraphAfter(neuralHeading, '<strong>Actor</strong> 是产生动作分布的策略网络。代码里的 <code>logits</code> 是网络输出的“未归一化动作分数”，<code>Categorical</code> 则表示从离散类别概率分布中采样动作；<strong>Critic</strong> 是另一个输出标量价值 $V(s)$ 的网络。', 'mrl-term-bridge');
    }

    return true;
  }

  function start() {
    if (explainTerms()) return;
    const root = document.querySelector('#chapterContent');
    if (!root) return;
    const observer = new MutationObserver(() => {
      if (explainTerms()) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
