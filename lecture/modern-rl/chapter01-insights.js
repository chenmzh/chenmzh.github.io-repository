(() => {
  'use strict';

  const insights = [
    {
      id: '01',
      title: '在 RL 里，policy 不只是用数据，它还会制造数据',
      html: `
        <p>监督学习里，模型通常面对一个先收集好的数据集；强化学习里，情况更像一个反馈回路：<strong>policy 决定动作 → 动作决定你会到达哪些状态 → 这些状态又变成下一轮训练数据</strong>。</p>
        <p class="mrl-insight-key">所以 distribution shift 在 RL 里不是偶然噪声，而是问题结构的一部分。一个策略如果从不探索某片状态空间，它甚至没有机会知道那里是否存在更好的行为。</p>
      `,
      target: () => {
        const section = document.querySelector('#start');
        if (!section) return null;
        return [...section.querySelectorAll('p')].find(p => p.textContent.includes('这意味着一个很深的变化')) || null;
      }
    },
    {
      id: '02',
      title: 'State 不是“环境里所有信息”，而是对未来足够有用的压缩',
      html: `
        <p>只给杆子的角度 $\\theta$，却不给角速度 $\\dot\\theta$，会出现一种麻烦：两个看起来一样的 observation，未来却可能完全不同。一个正在快速倒下，另一个正在回正。</p>
        <p>这类现象可以理解为 <strong>state aliasing</strong>：不同真实局面被压成了同一个观测。再大的网络也无法恢复从未观察到的信息。</p>
        <p class="mrl-insight-key">以后看到 Markov property 时，可以先记一个工程直觉：好的 state 表示，应该让“知道当前 state 和 action”尽可能足以预测接下来会发生什么，而不必反复翻完整历史。</p>
      `,
      target: () => document.querySelector('#loop table')
    },
    {
      id: '03',
      title: '“能控制”不等于“会学习”——这正好说明 RL 多做了什么',
      html: `
        <p>这个简单反馈控制器可能已经能把杆子稳住，但它的权重是我们手写的。它没有从 reward 中发现规则，也没有根据失败经验改变自己。</p>
        <p class="mrl-insight-key">RL 真正增加的不是“控制”本身，而是一个从 interaction + objective 中自动改进 policy 的机制。</p>
        <p>这也给出一个成熟的工程判断：如果系统动力学很清楚、控制规律容易设计，RL 未必是首选。RL 的价值通常出现在规则难手写、环境复杂、目标只能通过交互评价的地方。</p>
      `,
      target: () => {
        const section = document.querySelector('#lab');
        if (!section) return null;
        const captions = [...section.querySelectorAll('.mrl-caption')];
        const cap = captions.find(p => p.textContent.includes('这个比较不能证明反馈控制器'));
        return cap ? cap.closest('.mrl-viz') : null;
      }
    },
    {
      id: '04',
      title: 'γ 不只是“耐心程度”，它还粗略决定了问题的时间尺度',
      html: `
        <p>一个很实用的近似是把有效时间尺度想成 $1/(1-\\gamma)$。它不是严格的 episode 长度，但能帮助你感受一个 reward 要隔多远，才仍然对今天的决策有明显影响。</p>
        <div class="mrl-insight-metric"><span>$\\gamma=0.9$ → 约 <b>10</b> 步</span><span>$\\gamma=0.99$ → 约 <b>100</b> 步</span><span>$\\gamma=0.999$ → 约 <b>1000</b> 步</span></div>
        <p class="mrl-insight-key">更大的 $\\gamma$ 不一定“更高级”：它也会把 credit assignment 拉得更长，让估计更容易积累噪声。长期视野和训练难度通常一起上升。</p>
      `,
      target: () => {
        const slider = document.querySelector('#gammaSlider');
        return slider ? slider.closest('.mrl-viz') : null;
      }
    },
    {
      id: '05',
      title: 'PPO 的数据是“会过期的”',
      html: `
        <p>rollout 是在旧策略 $\\pi_{old}$ 下采到的。它告诉我们：<em>如果继续按旧策略行动，这些状态和动作通常会带来什么后果</em>。</p>
        <p>一旦新策略变化太大，它会开始访问不同的状态、选择不同的动作；此时同一批旧数据就越来越不能代表新策略真正会遇到的世界。</p>
        <p class="mrl-insight-key">所以 clipping 不只是“数值稳定技巧”。更深一层，它是在限制我们对旧数据的外推距离：数据既然来自旧 policy，就不要用它把新 policy 一脚推得太远。</p>
      `,
      target: () => {
        const section = document.querySelector('#ppo-preview');
        if (!section) return null;
        return [...section.querySelectorAll('p')].find(p => p.textContent.includes('PPO 不希望每个好样本')) || null;
      }
    }
  ];

  function renderMath(root) {
    if (!root || typeof renderMathInElement !== 'function') return;
    renderMathInElement(root, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }

  function makeInsight(item) {
    const aside = document.createElement('aside');
    aside.className = 'mrl-insight';
    aside.dataset.insightId = item.id;
    aside.innerHTML = `
      <div class="mrl-insight-index">Insight ${item.id}</div>
      <div class="mrl-insight-body">
        <h3>${item.title}</h3>
        ${item.html}
      </div>
    `;
    return aside;
  }

  function enhance() {
    let remaining = 0;
    insights.forEach(item => {
      if (document.querySelector(`[data-insight-id="${item.id}"]`)) return;
      const target = item.target();
      if (!target || !target.parentNode) {
        remaining += 1;
        return;
      }
      const node = makeInsight(item);
      target.insertAdjacentElement('afterend', node);
      renderMath(node);
    });
    return remaining;
  }

  function start() {
    enhance();
    const root = document.querySelector('#chapterContent');
    if (!root) return;
    const observer = new MutationObserver(() => {
      const remaining = enhance();
      if (remaining === 0) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
