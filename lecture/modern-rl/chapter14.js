(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter14-a.html?v=1', './chapter14-b.html?v=1', './chapter14-c.html?v=1'];
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
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const percentage = Math.min(100, Math.max(0, window.scrollY / max * 100));
      progress.style.width = percentage.toFixed(1) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  function signed(value, digits = 3) {
    const normalized = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
    if (normalized > 0) return '+' + normalized.toFixed(digits);
    if (normalized < 0) return '−' + Math.abs(normalized).toFixed(digits);
    return normalized.toFixed(digits);
  }

  function initSignalLab() {
    const source = $('#feedbackSource');
    const rule = $('#constitutionRule');
    const learningRate = $('#rmLearningRate');
    const beta = $('#klBeta');
    if (!source || !rule || !learningRate || !beta) return;

    const initialScoreA = 0.4;
    const initialScoreB = 0.2;
    const sampledLogRatio = 0.4;

    const setText = (selector, value) => {
      const element = $(selector);
      if (element) element.textContent = value;
    };

    function render() {
      const eta = Number(learningRate.value);
      const klBeta = Number(beta.value);
      const isHuman = source.value === 'human';
      const chosenA = isHuman || rule.checked;
      rule.disabled = isHuman;

      const chosenScore = chosenA ? initialScoreA : initialScoreB;
      const rejectedScore = chosenA ? initialScoreB : initialScoreA;
      const probability = 1 / (1 + Math.exp(-(chosenScore - rejectedScore)));
      const loss = -Math.log(probability);
      const correction = eta * (1 - probability);
      const scoreAAfter = initialScoreA + (chosenA ? correction : -correction);
      const scoreBAfter = initialScoreB + (chosenA ? -correction : correction);
      const klPenalty = klBeta * sampledLogRatio;
      const totalRewardA = scoreAAfter - klPenalty;

      setText('#rmLearningRateValue', eta.toFixed(2));
      setText('#klBetaValue', klBeta.toFixed(2));
      setText('#signalChosen', chosenA ? 'A chosen · B rejected' : 'B chosen · A rejected');
      setText('#signalRuleStatus', isHuman
        ? '人类多数票 · 显式原则不参与'
        : rule.checked
          ? 'AI judge · 有明确比例原则'
          : 'AI judge · 只有模糊安全指令');
      setText('#signalScores', 'r′A = ' + signed(scoreAAfter) + ' · r′B = ' + signed(scoreBAfter));
      setText('#signalTotalReward', 'R̂A = ' + signed(totalRewardA));
      setText('#signalProbability', probability.toFixed(3));
      setText('#signalLoss', loss.toFixed(3));
      setText('#signalRAfter', signed(scoreAAfter));
      setText('#signalPenalty', klPenalty.toFixed(3));
      setText('#signalDirection', eta === 0
        ? 'η=0，RM 分数不更新'
        : chosenA ? 'RM 梯度上推 A' : 'RM 梯度下压 A');

      if (isHuman) {
        setText('#signalObservation', '教学设定中的人类多数票选择 A。它与“带明确比例原则的 AI judge”交付同一个偏好标签，因此当前 RM 概率、loss、一步更新和回答 A 的 PPO 样本奖励完全相同；来源只保留在元数据里。');
      } else if (rule.checked) {
        setText('#signalObservation', 'AI judge 依据“允许安全科普、按实际风险决定拒绝强度”选择 A。标签与 Human 模式相同，所以下游数值不变；这验证了来源名称本身不会进入 Bradley–Terry loss。');
      } else {
        setText('#signalObservation', '移除比例原则后，本教学 judge 把敏感话题一律拒绝，改选 B。偏好顺序翻转使 RM 对回答 A 的梯度从上推变成下压；规则先改变数据，更新后的分数才改变 PPO 奖励。');
      }
    }

    [source, rule, learningRate, beta].forEach(control => control.addEventListener('input', render));
    const reset = $('#signalReset');
    if (reset) {
      reset.addEventListener('click', () => {
        source.value = 'human';
        rule.checked = true;
        learningRate.value = '0.5';
        beta.value = '0.05';
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
    initSignalLab();
    if (window.location.hash) {
      window.requestAnimationFrame(() => {
        const target = document.querySelector(window.location.hash);
        if (target) target.scrollIntoView();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
