(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter06-a.html?v=1', './chapter06-b.html?v=1', './chapter06-c.html?v=1'];

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

  function initStabilityLab() {
    const gammaInput = $('#stabilityGamma');
    const driftInput = $('#onlineDrift');
    const sequentialButton = $('#sampleSequential');
    const replayButton = $('#sampleReplay');
    const driftButton = $('#driftOnline');
    const syncButton = $('#syncTarget');
    const resetButton = $('#stabilityReset');
    const strip = $('#bufferStrip');

    if (![gammaInput, driftInput, sequentialButton, replayButton, driftButton, syncButton, resetButton, strip].every(Boolean)) return;

    const experiences = [
      { id: 'A1', group: '高空下降', reward: 0.0, nextQ: 4.0, terminal: false },
      { id: 'A2', group: '高空下降', reward: 0.1, nextQ: 4.2, terminal: false },
      { id: 'A3', group: '高空下降', reward: -0.1, nextQ: 3.8, terminal: false },
      { id: 'A4', group: '高空下降', reward: 0.0, nextQ: 4.1, terminal: false },
      { id: 'B1', group: '成功着陆', reward: 5.0, nextQ: 0.0, terminal: true },
      { id: 'C1', group: '快速失速', reward: -4.0, nextQ: -1.0, terminal: false },
      { id: 'D1', group: '恢复姿态', reward: 1.0, nextQ: 6.0, terminal: false },
      { id: 'E1', group: '高空探索', reward: 0.0, nextQ: 2.0, terminal: false }
    ];
    const replayBatches = [
      [0, 4, 5, 6],
      [2, 7, 1, 5],
      [4, 3, 6, 7],
      [5, 0, 2, 7]
    ];
    const defaults = { gamma: 0.9, drift: 2 };

    let batchIndices = [0, 1, 2, 3];
    let batchMode = '连续';
    let replayRound = 0;
    let onlineOffset = 0;
    let targetOffset = 0;
    let driftCount = 0;

    strip.innerHTML = experiences.map(experience => (
      '<div class="mrl-buffer-item" data-experience="' + experience.id + '">'
      + '<span>' + experience.id + '</span>'
      + '<strong>' + experience.group + '</strong>'
      + '<small>r=' + formatNumber(experience.reward, 1)
      + (experience.terminal ? ' · terminal' : ' · nextQ=' + formatNumber(experience.nextQ, 1))
      + '</small></div>'
    )).join('');

    function setText(selector, value) {
      const element = $(selector);
      if (element) element.textContent = value;
    }

    function targetFor(experience, gamma, offset) {
      const continuation = experience.terminal ? 0 : experience.nextQ + offset;
      return experience.reward + gamma * continuation;
    }

    function meanTarget(gamma, offset) {
      const sum = batchIndices.reduce((total, index) => (
        total + targetFor(experiences[index], gamma, offset)
      ), 0);
      return sum / batchIndices.length;
    }

    function render() {
      const gamma = Number(gammaInput.value);
      const drift = Number(driftInput.value);
      const activeIds = new Set(batchIndices.map(index => experiences[index].id));
      const groups = new Set(batchIndices.map(index => experiences[index].group));
      const onlineMean = meanTarget(gamma, onlineOffset);
      const frozenMean = meanTarget(gamma, targetOffset);
      const gap = onlineMean - frozenMean;

      setText('#stabilityGammaValue', gamma.toFixed(2));
      setText('#onlineDriftValue', formatNumber(drift, 1));
      setText('#coverageValue', groups.size + ' / 4 类局面');
      setText('#batchLabels', batchMode + '采样：' + batchIndices.map(index => experiences[index].id).join(', '));
      setText('#onlineTargetMean', formatNumber(onlineMean));
      setText('#frozenTargetMean', formatNumber(frozenMean));
      setText('#onlineOffset', 'online ' + formatNumber(onlineOffset, 1));
      setText('#targetOffset', 'target ' + formatNumber(targetOffset, 1));
      setText('#syncAge', driftCount === 0 ? '尚未发生在线漂移' : '距离上次同步有 ' + driftCount + ' 次在线变化');

      $$('.mrl-buffer-item', strip).forEach(item => {
        item.classList.toggle('active', activeIds.has(item.dataset.experience));
      });

      const coverageText = batchMode === '连续'
        ? '连续 batch 只覆盖同一段高空下降，四条经验彼此很像。'
        : '打散 batch 当前覆盖 ' + groups.size + ' 类局面；单次随机回放不保证覆盖全部类型，但不会固定困在最近四步。';
      const targetText = Math.abs(gap) < 1e-9
        ? ' 两种 target 暂时相同，因为在线参数与目标快照仍在同一位置。'
        : ' 在线参数漂移后，同网 target 比冻结 target ' + (gap > 0 ? '高' : '低')
          + ' ' + formatNumber(Math.abs(gap)) + '；冻结靶尚未追随。';
      setText('#stabilityObservation', coverageText + targetText);

      const interpretation = groups.size === 1
        ? '此时主要暴露数据相关：即使 target 冻结，batch 仍被一个局面垄断。换成打散回放才能改变样本覆盖。'
        : (Math.abs(gap) < 1e-9
            ? '样本覆盖已经改善；接着让在线网络变化，才能单独看见目标网络如何隔离 target 的即时漂移。'
            : '回放负责让 batch 跨越不同局面；目标网络负责让这些样本的 bootstrap target 不随当前梯度立即移动。');
      setText('#stabilityInterpretation', interpretation);
    }

    sequentialButton.addEventListener('click', () => {
      batchIndices = [0, 1, 2, 3];
      batchMode = '连续';
      render();
    });

    replayButton.addEventListener('click', () => {
      batchIndices = replayBatches[replayRound % replayBatches.length].slice();
      replayRound += 1;
      batchMode = '打散';
      render();
    });

    driftButton.addEventListener('click', () => {
      onlineOffset += Number(driftInput.value);
      driftCount += 1;
      render();
    });

    syncButton.addEventListener('click', () => {
      targetOffset = onlineOffset;
      driftCount = 0;
      render();
    });

    resetButton.addEventListener('click', () => {
      gammaInput.value = String(defaults.gamma);
      driftInput.value = String(defaults.drift);
      batchIndices = [0, 1, 2, 3];
      batchMode = '连续';
      replayRound = 0;
      onlineOffset = 0;
      targetOffset = 0;
      driftCount = 0;
      render();
    });

    gammaInput.addEventListener('input', render);
    driftInput.addEventListener('input', render);
    render();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initStabilityLab();
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
