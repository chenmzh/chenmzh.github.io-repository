(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter05-a.html?v=1', './chapter05-b.html?v=1', './chapter05-c.html?v=1'];
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
    const normalized = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
    if (normalized > 0) return '+' + normalized.toFixed(digits);
    if (normalized < 0) return '−' + Math.abs(normalized).toFixed(digits);
    return normalized.toFixed(digits);
  }

  function initTargetLab() {
    const inputs = {
      gamma: $('#targetGamma'),
      rewardNow: $('#targetRewardNow'),
      rewardLater: $('#targetRewardLater'),
      rewardTerminal: $('#targetRewardTerminal'),
      nextValue: $('#targetNextValue'),
      currentValue: $('#targetCurrentValue'),
      alpha: $('#targetAlpha')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const outputs = {
      gamma: '#targetGammaValue',
      rewardNow: '#targetRewardNowValue',
      rewardLater: '#targetRewardLaterValue',
      rewardTerminal: '#targetRewardTerminalValue',
      nextValue: '#targetNextValueValue',
      currentValue: '#targetCurrentValueValue',
      alpha: '#targetAlphaValue'
    };
    const defaults = {
      gamma: 0.9,
      rewardNow: -1,
      rewardLater: -1,
      rewardTerminal: 4,
      nextValue: 2,
      currentValue: 0,
      alpha: 0.3
    };

    function setText(selector, value) {
      const element = $(selector);
      if (element) element.textContent = value;
    }

    function readValues() {
      return Object.fromEntries(
        Object.entries(inputs).map(entry => [entry[0], Number(entry[1].value)])
      );
    }

    function placeMarker(selector, value, minimum, maximum) {
      const marker = $(selector);
      if (!marker) return;
      const percentage = Math.max(3, Math.min(97, (value - minimum) / (maximum - minimum) * 100));
      marker.style.left = percentage.toFixed(2) + '%';
      const label = $('span', marker);
      if (label) label.textContent = formatNumber(value);
    }

    function render() {
      const value = readValues();
      const mcTarget = value.rewardNow
        + value.gamma * value.rewardLater
        + value.gamma ** 2 * value.rewardTerminal;
      const tdTarget = value.rewardNow + value.gamma * value.nextValue;
      const mcError = mcTarget - value.currentValue;
      const tdError = tdTarget - value.currentValue;
      const mcUpdated = value.currentValue + value.alpha * mcError;
      const tdUpdated = value.currentValue + value.alpha * tdError;

      Object.entries(outputs).forEach(entry => {
        const key = entry[0];
        const digits = key === 'gamma' || key === 'alpha' ? 2 : 1;
        const text = key === 'gamma' || key === 'alpha'
          ? value[key].toFixed(digits)
          : formatNumber(value[key], digits);
        setText(entry[1], text);
      });

      setText('#labRewardNow', 'rₜ = ' + formatNumber(value.rewardNow, 1));
      setText('#labRewardLater', 'rₜ₊₁ = ' + formatNumber(value.rewardLater, 1));
      setText('#labRewardTerminal', 'rₜ₊₂ = ' + formatNumber(value.rewardTerminal, 1));
      setText('#labNextEstimate', '估计 ' + formatNumber(value.nextValue, 1));
      setText('#mcTargetValue', formatNumber(mcTarget));
      setText('#tdTargetValue', formatNumber(tdTarget));
      setText('#mcErrorValue', formatNumber(mcError));
      setText('#tdErrorValue', formatNumber(tdError));
      setText('#mcUpdatedValue', formatNumber(mcUpdated));
      setText('#tdUpdatedValue', formatNumber(tdUpdated));
      setText('#mcFormula', formatNumber(value.rewardNow, 1) + ' + '
        + value.gamma.toFixed(2) + '(' + formatNumber(value.rewardLater, 1) + ') + '
        + value.gamma.toFixed(2) + '²(' + formatNumber(value.rewardTerminal, 1) + ')');
      setText('#tdFormula', formatNumber(value.rewardNow, 1) + ' + '
        + value.gamma.toFixed(2) + '(' + formatNumber(value.nextValue, 1) + ')');

      let minimum = Math.floor(Math.min(value.currentValue, mcTarget, tdTarget) - 1);
      let maximum = Math.ceil(Math.max(value.currentValue, mcTarget, tdTarget) + 1);
      if (maximum - minimum < 2) maximum = minimum + 2;
      setText('#targetAxisMin', formatNumber(minimum, 0));
      setText('#targetAxisMax', formatNumber(maximum, 0));
      placeMarker('#currentMarker', value.currentValue, minimum, maximum);
      placeMarker('#mcMarker', mcTarget, minimum, maximum);
      placeMarker('#tdMarker', tdTarget, minimum, maximum);

      const observation = $('#targetObservation');
      if (!observation) return;
      const gap = mcTarget - tdTarget;
      if (value.gamma === 0) {
        observation.textContent = 'γ=0 时，两者都只看眼前奖励 rₜ，所以更新目标都为 '
          + formatNumber(mcTarget) + '；后续奖励与下一状态估计全部被折掉。';
      } else if (Math.abs(gap) < 1e-9) {
        const realizedTail = value.rewardLater + value.gamma * value.rewardTerminal;
        observation.textContent = '两个更新目标都为 ' + formatNumber(mcTarget)
          + '。这条轨迹已实现的尾部回报 ' + formatNumber(realizedTail)
          + ' 恰好等于下一状态估计 ' + formatNumber(value.nextValue) + '。';
      } else {
        const larger = gap > 0 ? '完整回报更新目标' : '一步时序差分更新目标';
        observation.textContent = larger + '更高，两者相差 ' + formatNumber(Math.abs(gap))
          + '。远端奖励只直接进入完整回报；下一状态估计只直接进入一步更新。';
      }
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    const reset = $('#targetReset');
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
    initTargetLab();
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
