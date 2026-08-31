(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter09-a.html?v=1', './chapter09-b.html?v=1', './chapter09-c.html?v=1'];

    try {
      const responses = await Promise.all(files.map(url => fetch(url, { cache: 'no-cache' })));
      const bad = responses.find(response => !response.ok);
      if (bad) throw new Error('HTTP ' + bad.status + ' while loading ' + bad.url);
      const parts = await Promise.all(responses.map(response => response.text()));
      host.innerHTML = parts.join('\n');
      return true;
    } catch (error) {
      host.innerHTML = '<section class="mrl-chapter-hero">'
        + '<div class="mrl-eyebrow">Chapter load error</div>'
        + '<h1>章节内容没有加载成功</h1>'
        + '<p class="lead">请刷新页面。如果问题持续存在，可以从课程目录重新进入。</p>'
        + '<p class="mrl-small">' + String(error) + '</p></section>';
      return false;
    }
  }

  function initMath() {
    if (typeof renderMathInElement !== 'function') {
      console.warn('KaTeX auto-render not available');
      return;
    }

    renderMathInElement($('#chapterContent') || document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      throwOnError: false
    });
  }

  function initToc() {
    const links = $$('.mrl-toc a[href^="#"]');
    const sections = links.map(link => $(link.getAttribute('href'))).filter(Boolean);
    if (!links.length || !sections.length) return;

    const setActive = id => {
      links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === '#' + id));
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.2, 0.8] });
      sections.forEach(section => observer.observe(section));
    }

    const progress = $('#readingProgress');
    const updateProgress = () => {
      if (!progress) return;
      const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const percentage = Math.min(100, Math.max(0, window.scrollY / maximum * 100));
      progress.style.width = percentage.toFixed(1) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function formatSigned(value, digits = 2) {
    const threshold = 0.5 * 10 ** -digits;
    const normalized = Math.abs(value) < threshold ? 0 : value;
    if (normalized > 0) return '+' + normalized.toFixed(digits);
    if (normalized < 0) return '−' + Math.abs(normalized).toFixed(digits);
    return normalized.toFixed(digits);
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }

  function initRatioLab() {
    const inputs = {
      oldProbability: $('#oldProb'),
      newProbability: $('#newProb'),
      advantage: $('#advantage'),
      epsilon: $('#clipEpsilon')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const defaults = {
      oldProbability: 0.40,
      newProbability: 0.52,
      advantage: 2.0,
      epsilon: 0.20
    };

    function readValues() {
      return Object.fromEntries(
        Object.entries(inputs).map(entry => [entry[0], Number(entry[1].value)])
      );
    }

    function placeMarker(selector, value, maximum) {
      const marker = $(selector);
      if (!marker) return;
      const percentage = clamp(value / maximum * 100, 4, 96);
      marker.style.left = percentage.toFixed(2) + '%';
      const label = $('span', marker);
      if (label) label.textContent = value.toFixed(2);
    }

    function render() {
      const value = readValues();
      const ratio = value.newProbability / value.oldProbability;
      const lower = 1 - value.epsilon;
      const upper = 1 + value.epsilon;
      const clippedRatio = clamp(ratio, lower, upper);
      const rawObjective = ratio * value.advantage;
      const clippedObjective = clippedRatio * value.advantage;
      const chosenObjective = Math.min(rawObjective, clippedObjective);
      const neutral = Math.abs(value.advantage) < 1e-10;
      const favorableOvershoot = (value.advantage > 0 && ratio > upper)
        || (value.advantage < 0 && ratio < lower);
      const oppositeOvershoot = (value.advantage > 0 && ratio < lower)
        || (value.advantage < 0 && ratio > upper);
      const withinBand = ratio >= lower && ratio <= upper;

      setText('#oldProbValue', value.oldProbability.toFixed(2));
      setText('#newProbValue', value.newProbability.toFixed(2));
      setText('#advantageValue', formatSigned(value.advantage));
      setText('#clipEpsilonValue', value.epsilon.toFixed(2));
      setText('#oldProbReadout', value.oldProbability.toFixed(2));
      setText('#newProbReadout', value.newProbability.toFixed(2));
      setText('#ratioValue', ratio.toFixed(3));
      setText('#ratioFormula', value.newProbability.toFixed(2) + ' ÷ ' + value.oldProbability.toFixed(2));
      setText('#rawObjective', formatSigned(rawObjective, 3));
      setText('#clippedObjective', formatSigned(clippedObjective, 3));
      setText('#chosenObjective', formatSigned(chosenObjective, 3));

      const oldBar = $('#oldProbBar');
      const newBar = $('#newProbBar');
      if (oldBar) oldBar.style.width = (value.oldProbability * 100).toFixed(1) + '%';
      if (newBar) newBar.style.width = (value.newProbability * 100).toFixed(1) + '%';

      const axisMaximum = Math.max(2, ratio * 1.16, upper * 1.35);
      setText('#ratioAxisMax', axisMaximum.toFixed(2));
      placeMarker('#lowerMarker', lower, axisMaximum);
      placeMarker('#ratioMarker', ratio, axisMaximum);
      placeMarker('#upperMarker', upper, axisMaximum);
      const safeBand = $('#ratioSafeBand');
      if (safeBand) {
        const left = clamp(lower / axisMaximum * 100, 0, 100);
        const right = clamp(upper / axisMaximum * 100, 0, 100);
        safeBand.style.left = left.toFixed(2) + '%';
        safeBand.style.width = Math.max(0, right - left).toFixed(2) + '%';
      }

      if (neutral) {
        setText('#chosenBranch', 'neutral · zero signal');
        setText('#ratioObservation', '优势为 0 时，两条 surrogate 都为 0；无论 ratio 在哪里，这个样本都不推动 Actor。');
        setText('#ratioInterpretation', '概率变化只有和优势方向结合才成为策略改进信号；ratio 本身不说明动作应该增加还是减少。');
      } else if (favorableOvershoot) {
        const direction = value.advantage > 0 ? '提高好动作概率' : '降低坏动作概率';
        const boundary = value.advantage > 0 ? '上界 ' + upper.toFixed(2) : '下界 ' + lower.toFixed(2);
        setText('#chosenBranch', 'clipped · plateau');
        setText('#ratioObservation', 'ratio=' + ratio.toFixed(3) + ' 已沿“' + direction + '”的有利方向越过' + boundary + '，PPO 选择常数裁剪项。');
        setText('#ratioInterpretation', '更新方向仍可能是对的，但旧样本不再为继续走远提供额外收益；这正是方向性平台的作用。');
      } else if (oppositeOvershoot) {
        const desired = value.advantage > 0 ? '增大 ratio' : '减小 ratio';
        setText('#chosenBranch', 'raw · corrective');
        setText('#ratioObservation', 'ratio=' + ratio.toFixed(3) + ' 越出了与优势相反的一侧；PPO 选择未裁剪项，保留纠偏梯度。');
        setText('#ratioInterpretation', '外层 min 防止纯 clip 在错误一侧也变成水平线；当前样本仍会推动策略' + desired + '。');
      } else if (withinBand) {
        setText('#chosenBranch', 'equal · active');
        setText('#ratioObservation', 'ratio=' + ratio.toFixed(3) + ' 位于 [' + lower.toFixed(2) + ', ' + upper.toFixed(2) + '] 内，未裁剪项与裁剪项相等。');
        setText('#ratioInterpretation', '在采样策略附近，PPO 保留普通重要性加权目标，让优势按正常梯度方向更新动作概率。');
      } else {
        setText('#chosenBranch', 'raw · boundary case');
        setText('#ratioObservation', '当前比率落在边界附近，数值舍入后两项可能看似相同；目标仍按逐样本最小值计算。');
        setText('#ratioInterpretation', '判断裁剪不能只看 ratio 是否越界，还要检查优势符号和两项实际大小。');
      }
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    const reset = $('#ratioReset');
    if (reset) {
      reset.addEventListener('click', () => {
        Object.entries(defaults).forEach(entry => {
          inputs[entry[0]].value = String(entry[1]);
        });
        render();
      });
    }
    render();
  }

  function initGaeLab() {
    const inputs = {
      lambda: $('#gaeLambda'),
      gamma: $('#gaeGamma'),
      terminalReward: $('#terminalReward'),
      criticScale: $('#criticScale')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const defaults = {
      lambda: 0.50,
      gamma: 1.00,
      terminalReward: 1.00,
      criticScale: 1.00
    };
    const baseValues = [0.1, 0.2, 0.3, 0.5, 0.8];

    function readValues() {
      return Object.fromEntries(
        Object.entries(inputs).map(entry => [entry[0], Number(entry[1].value)])
      );
    }

    function computeGae(terminalReward, gamma, lambdaValue, criticScale) {
      const values = baseValues.map((number, index) => index === 0 ? number : number * criticScale);
      const rewards = [0, 0, 0, 0, terminalReward];
      const deltas = rewards.map((reward, index) => {
        const nextValue = index === rewards.length - 1 ? 0 : values[index + 1];
        return reward + gamma * nextValue - values[index];
      });
      const advantages = new Array(rewards.length).fill(0);
      let nextAdvantage = 0;
      for (let index = rewards.length - 1; index >= 0; index -= 1) {
        nextAdvantage = deltas[index] + gamma * lambdaValue * nextAdvantage;
        advantages[index] = nextAdvantage;
      }
      return { values, deltas, advantages };
    }

    function render() {
      const value = readValues();
      const current = computeGae(
        value.terminalReward,
        value.gamma,
        value.lambda,
        value.criticScale
      );
      const referenceCritic = computeGae(
        value.terminalReward,
        value.gamma,
        value.lambda,
        1.0
      );
      const magnitude = Math.abs(value.terminalReward);
      const positiveEnding = computeGae(magnitude, value.gamma, value.lambda, value.criticScale);
      const negativeEnding = computeGae(-magnitude, value.gamma, value.lambda, value.criticScale);
      const endingSpread = Math.abs(positiveEnding.advantages[0] - negativeEnding.advantages[0]);
      const criticSensitivity = Math.abs(current.advantages[0] - referenceCritic.advantages[0]);
      const propagation = value.gamma * value.lambda;
      const terminalWeight = propagation ** 4;

      setText('#gaeLambdaValue', value.lambda.toFixed(2));
      setText('#gaeGammaValue', value.gamma.toFixed(2));
      setText('#terminalRewardValue', formatSigned(value.terminalReward));
      setText('#criticScaleValue', value.criticScale.toFixed(2) + '×');
      setText('#oneStepA0', formatSigned(current.deltas[0], 3));
      setText('#gaeStartValue', formatSigned(current.advantages[0], 3));
      setText('#terminalWeight', terminalWeight.toFixed(3));
      setText('#endingSpread', endingSpread.toFixed(3));
      setText('#criticSensitivity', criticSensitivity.toFixed(3));
      setText('#gaeExpansion', 'δ₀ + ' + propagation.toFixed(2) + 'δ₁ + '
        + (propagation ** 2).toFixed(2) + 'δ₂ + …');

      const maximumMagnitude = Math.max(0.15, ...current.advantages.map(number => Math.abs(number)));
      current.advantages.forEach((advantage, index) => {
        setText('#gaeA' + index, formatSigned(advantage, 3));
        setText('#gaeDelta' + index, 'δ = ' + formatSigned(current.deltas[index], 3));
        const bar = $('#gaeBar' + index);
        if (bar) {
          bar.style.width = (Math.abs(advantage) / maximumMagnitude * 100).toFixed(1) + '%';
          bar.classList.toggle('negative', advantage < 0);
        }
      });

      if (value.lambda < 1e-10) {
        setText('#gaeObservation', 'λ=0 时，起点 GAE 完全等于 δ₀=' + formatSigned(current.deltas[0], 3)
          + '；终点在四步之外，对起点的直接权重为 0。');
        setText('#gaeInterpretation', '优势只相信一步真实奖励和下一状态 Critic：轨迹噪声最短，但后续 value 估计若有系统误差，会直接控制起点标签。');
      } else if (Math.abs(value.lambda - 1) < 1e-10) {
        setText('#gaeObservation', 'λ=1 时，完整残差链给出 A₀=' + formatSigned(current.advantages[0], 3)
          + '；正负终点使起点相差 ' + endingSpread.toFixed(3) + '。');
        setText('#gaeInterpretation', '在这个真正终止的 episode 中，中间 Critic 项望远镜抵消，只保留实际折扣回报与起点基线；代价是整条结局随机性进入标签。');
      } else {
        setText('#gaeObservation', '当前 (γλ)⁴=' + terminalWeight.toFixed(3)
          + '，正负终点让 A₀ 相差 ' + endingSpread.toFixed(3)
          + '；相对标准 Critic，缩放后 A₀ 改变 ' + criticSensitivity.toFixed(3) + '。');
        setText('#gaeInterpretation', 'λ=' + value.lambda.toFixed(2)
          + ' 在一步自举与完整残差链之间：调大 λ 会增强远端结果传播，同时通过更多中间抵消降低对单个后续 value 的依赖。');
      }
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    const reset = $('#gaeReset');
    if (reset) {
      reset.addEventListener('click', () => {
        Object.entries(defaults).forEach(entry => {
          inputs[entry[0]].value = String(entry[1]);
        });
        render();
      });
    }
    render();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initRatioLab();
    initGaeLab();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
