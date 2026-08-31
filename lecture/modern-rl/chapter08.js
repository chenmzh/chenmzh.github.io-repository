(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter08-a.html?v=1', './chapter08-b.html?v=1', './chapter08-c.html?v=1'];

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

  function formatNumber(value, digits = 2) {
    const threshold = 0.5 * 10 ** -digits;
    const normalized = Math.abs(value) < threshold ? 0 : value;
    if (normalized > 0) return '+' + normalized.toFixed(digits);
    if (normalized < 0) return '−' + Math.abs(normalized).toFixed(digits);
    return normalized.toFixed(digits);
  }

  function initAdvantageLab() {
    const inputs = {
      gamma: $('#labGamma'),
      terminalReward: $('#labTerminalReward'),
      value0: $('#labValue0'),
      value1: $('#labValue1'),
      value2: $('#labValue2')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const defaults = {
      gamma: 0.9,
      terminalReward: 4,
      value0: 3,
      value1: 2.5,
      value2: 1
    };

    const outputSelectors = {
      gamma: '#labGammaValue',
      terminalReward: '#labTerminalRewardValue',
      value0: '#labValue0Value',
      value1: '#labValue1Value',
      value2: '#labValue2Value'
    };

    function setText(selector, value) {
      const element = $(selector);
      if (element) element.textContent = value;
    }

    function readValues() {
      return Object.fromEntries(
        Object.entries(inputs).map(([key, input]) => [key, Number(input.value)])
      );
    }

    function direction(mcAdvantage, tdAdvantage) {
      const epsilon = 1e-9;
      const mcSign = Math.abs(mcAdvantage) < epsilon ? 0 : Math.sign(mcAdvantage);
      const tdSign = Math.abs(tdAdvantage) < epsilon ? 0 : Math.sign(tdAdvantage);
      if (mcSign * tdSign < 0) return { text: '暂时异号', split: true, kind: 'opposite' };
      if (mcSign !== tdSign) return { text: '一方近零', split: true, kind: 'zero' };
      if (mcSign > 0) return { text: '都鼓励', split: false };
      if (mcSign < 0) return { text: '都抑制', split: false };
      return { text: '都近零', split: false };
    }

    function render() {
      const values = readValues();
      const rewards = [1, 0, values.terminalReward];
      const criticValues = [values.value0, values.value1, values.value2];
      const returns = [
        rewards[0] + values.gamma * rewards[1] + values.gamma ** 2 * rewards[2],
        rewards[1] + values.gamma * rewards[2],
        rewards[2]
      ];
      const nextValues = [criticValues[1], criticValues[2], 0];
      const mcAdvantages = returns.map((value, index) => value - criticValues[index]);
      const tdAdvantages = rewards.map((reward, index) => (
        reward + values.gamma * nextValues[index] - criticValues[index]
      ));

      Object.entries(outputSelectors).forEach(([key, selector]) => {
        const text = key === 'gamma'
          ? values[key].toFixed(2)
          : formatNumber(values[key], 1);
        setText(selector, text);
      });
      setText('#labTrajectoryReward', 'r₂=' + formatNumber(values.terminalReward, 1));

      const oppositeRows = [];
      const zeroRows = [];
      for (let index = 0; index < 3; index += 1) {
        setText('#labReturn' + index, formatNumber(returns[index]));
        setText('#labValueOut' + index, formatNumber(criticValues[index]));
        setText('#labMcAdv' + index, formatNumber(mcAdvantages[index]));
        setText('#labTdAdv' + index, formatNumber(tdAdvantages[index]));

        const rowDirection = direction(mcAdvantages[index], tdAdvantages[index]);
        setText('#labDirection' + index, rowDirection.text);
        const row = $('#advantageRow' + index);
        if (row) {
          row.classList.toggle('sign-split', rowDirection.split);
          row.classList.toggle('sign-agree', !rowDirection.split);
        }
        if (rowDirection.kind === 'opposite') oppositeRows.push('t=' + index);
        if (rowDirection.kind === 'zero') zeroRows.push('t=' + index);
      }

      const observation = $('#advantageObservation');
      if (!observation) return;
      if (oppositeRows.length) {
        observation.textContent = oppositeRows.join('、')
          + ' 的 MC advantage 与单步 TD error 异号。完整尾部与 Critic 当前的一步预测正在给出不同判断。';
      } else if (zeroRows.length) {
        observation.textContent = zeroRows.join('、')
          + ' 中一种估计接近 0、另一种仍有方向；两种估计器对尾部信息的使用仍不一致。';
      } else {
        observation.textContent = '三步中两种 advantage estimate 的方向目前一致；数值仍不同，因为一个使用完整尾部，另一个在一步后 bootstrap。';
      }
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    const reset = $('#advantageReset');
    if (reset) {
      reset.addEventListener('click', () => {
        Object.entries(defaults).forEach(([key, value]) => {
          inputs[key].value = String(value);
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
    initAdvantageLab();
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
