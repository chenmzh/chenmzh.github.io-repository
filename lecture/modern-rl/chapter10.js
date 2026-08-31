(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter10-a.html?v=1', './chapter10-b.html?v=1', './chapter10-c.html?v=1'];
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

  function normalized(value, digits) {
    return Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
  }

  function formatPlain(value, digits = 2) {
    const result = normalized(value, digits);
    if (result < 0) return '−' + Math.abs(result).toFixed(digits);
    return result.toFixed(digits);
  }

  function formatSigned(value, digits = 2) {
    const result = normalized(value, digits);
    if (result > 0) return '+' + result.toFixed(digits);
    if (result < 0) return '−' + Math.abs(result).toFixed(digits);
    return result.toFixed(digits);
  }

  function initTargetLab() {
    const inputs = {
      reward: $('#targetReward'),
      gamma: $('#targetGamma'),
      q1: $('#targetQ1'),
      q2: $('#targetQ2'),
      logProb: $('#targetLogProb'),
      alpha: $('#targetAlpha')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const defaults = {
      reward: -1,
      gamma: 0.99,
      q1: 12,
      q2: 9,
      logProb: -0.7,
      alpha: 0.2
    };

    const outputConfig = {
      reward: { selector: '#targetRewardValue', digits: 1 },
      gamma: { selector: '#targetGammaValue', digits: 2 },
      q1: { selector: '#targetQ1Value', digits: 1 },
      q2: { selector: '#targetQ2Value', digits: 1 },
      logProb: { selector: '#targetLogProbValue', digits: 2 },
      alpha: { selector: '#targetAlphaValue', digits: 2 }
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

    function render() {
      const value = readValues();
      const minimumQ = Math.min(value.q1, value.q2);
      const entropyTerm = -value.alpha * value.logProb;
      const ddpgTarget = value.reward + value.gamma * value.q1;
      const td3Target = value.reward + value.gamma * minimumQ;
      const sacTarget = value.reward + value.gamma * (minimumQ + entropyTerm);

      Object.entries(outputConfig).forEach(([key, config]) => {
        setText(config.selector, formatPlain(value[key], config.digits));
      });

      setText('#ddpgTargetValue', formatSigned(ddpgTarget));
      setText('#td3TargetValue', formatSigned(td3Target));
      setText('#sacTargetValue', formatSigned(sacTarget));
      setText('#ddpgTargetFormula', formatPlain(value.reward, 1) + ' + '
        + value.gamma.toFixed(2) + ' × ' + formatPlain(value.q1, 1));
      setText('#td3TargetFormula', formatPlain(value.reward, 1) + ' + '
        + value.gamma.toFixed(2) + ' × min('
        + formatPlain(value.q1, 1) + ', ' + formatPlain(value.q2, 1) + ')');
      setText('#sacTargetFormula', formatPlain(value.reward, 1) + ' + '
        + value.gamma.toFixed(2) + ' × [' + formatPlain(minimumQ, 1) + ' − '
        + value.alpha.toFixed(2) + '(' + formatPlain(value.logProb, 2) + ')]');

      const observation = $('#targetObservation');
      if (!observation) return;
      if (value.gamma === 0) {
        observation.textContent = 'γ=0 时，三个 target 都只剩即时奖励 '
          + formatSigned(value.reward) + '；双 Critic 与熵项全部被折扣因子关闭。';
        return;
      }

      const twinReduction = ddpgTarget - td3Target;
      const entropyLift = sacTarget - td3Target;
      const criticMessage = value.q1 > value.q2
        ? '第一个 Critic 比第二个高 ' + formatPlain(value.q1 - value.q2)
          + '；双 Critic 让 TD3 target 比 DDPG 低 ' + formatPlain(twinReduction) + '。'
        : '第一个 Critic 没有高于第二个；本组输入中 min 仍取 Q₁，所以 TD3 与 DDPG 的诊断 target 相同。';
      const entropyMessage = entropyLift > 0
        ? 'SAC 的熵项再把 target 提高 ' + formatPlain(entropyLift) + '。'
        : '当前 α 或 −log π 为 0，SAC target 与 TD3 target 相同。';
      observation.textContent = criticMessage + entropyMessage;
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    const reset = $('#targetReset');
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
