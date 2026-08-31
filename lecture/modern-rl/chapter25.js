(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter25-a.html?v=1', './chapter25-b.html?v=1', './chapter25-c.html?v=1'];
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

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }

  function formatProbability(value) {
    if (value === 0) return '0';
    if (value < 0.0001) return value.toExponential(2);
    return value.toFixed(5);
  }

  function initAudioDelayLab() {
    const controls = {
      duration: $('#audioDuration'),
      frameRate: $('#audioFrameRate'),
      codebooks: $('#audioCodebooks'),
      gamma: $('#audioGamma')
    };
    if (!Object.values(controls).every(Boolean)) return;

    const defaults = { duration: 10, frameRate: 75, codebooks: 8, gamma: 0.999 };

    function render() {
      const duration = Number(controls.duration.value);
      const frameRate = Number(controls.frameRate.value);
      const codebooks = Number(controls.codebooks.value);
      const gamma = Number(controls.gamma.value);
      const actionCount = Math.max(1, Math.round(duration * frameRate * codebooks));
      const firstWeight = gamma ** (actionCount - 1);
      const attenuation = (1 - firstWeight) * 100;

      setText('#audioDurationValue', duration.toFixed(0) + ' s');
      setText('#audioGammaValue', gamma.toFixed(4));
      setText('#audioTokenCount', actionCount.toLocaleString('zh-CN'));
      setText('#audioFirstWeight', formatProbability(firstWeight));
      setText('#audioAttenuation', attenuation.toFixed(2) + '%');

      const bar = $('#audioWeightBar');
      if (bar) bar.style.width = Math.min(100, firstWeight * 100).toFixed(6) + '%';

      setText('#audioDelayObservation', '当前配置得到 ' + actionCount.toLocaleString('zh-CN')
        + ' 个 codec token；终点奖励为 1 时，第一个动作的折扣权重为 '
        + formatProbability(firstWeight) + '，数值衰减 ' + attenuation.toFixed(2) + '%。');

      if (gamma === 1) {
        setText('#audioDelayInterpretation', 'γ=1 时第一步保留完整终点分数，折扣衰减消失；但同一个整体评分仍广播给 '
          + actionCount.toLocaleString('zh-CN') + ' 个动作，无法自动定位哪一段声学行为造成结果。');
      } else if (firstWeight < 0.01) {
        setText('#audioDelayInterpretation', '这条链已把第一步的终点信号压到 1% 以下。链长解释数值衰减；分段奖励、声学检查或更细优势归因仍负责定位。');
      } else {
        setText('#audioDelayInterpretation', '第一步仍保留部分终点信号，但动作越多，γ 的连乘越强。降低序列粒度能缓解衰减，却不会自动提供声学错误的位置。');
      }
    }

    Object.values(controls).forEach(control => control.addEventListener('input', render));
    const reset = $('#audioReset');
    if (reset) {
      reset.addEventListener('click', () => {
        Object.entries(defaults).forEach(([key, value]) => {
          controls[key].value = String(value);
        });
        render();
      });
    }
    render();
  }

  function initRewardVectorLab() {
    const controls = {
      quality: $('#rewardWeightQuality'),
      alignment: $('#rewardWeightAlignment'),
      temporal: $('#rewardWeightTemporal'),
      physics: $('#rewardWeightPhysics')
    };
    if (!Object.values(controls).every(Boolean)) return;

    const candidates = {
      A: { quality: 0.90, alignment: 0.80, temporal: 0.30, physics: 0.35 },
      B: { quality: 0.60, alignment: 0.55, temporal: 0.60, physics: 0.65 }
    };

    function weightedScore(candidate, weights) {
      return Object.keys(weights).reduce((sum, key) => sum + weights[key] * candidate[key], 0);
    }

    function renderFormula(weights, scoreA) {
      const tex = 'R_A=' + weights.quality.toFixed(3) + '(0.90)+'
        + weights.alignment.toFixed(3) + '(0.80)+'
        + weights.temporal.toFixed(3) + '(0.30)+'
        + weights.physics.toFixed(3) + '(0.35)=' + scoreA.toFixed(4);
      const host = $('#rewardVectorFormula');
      if (!host) return;
      if (typeof katex === 'object' && typeof katex.render === 'function') {
        katex.render(tex, host, { throwOnError: false });
      } else {
        host.textContent = tex.replaceAll('(', ' × (');
      }
    }

    function render() {
      const raw = Object.fromEntries(
        Object.entries(controls).map(([key, control]) => [key, Number(control.value)])
      );
      const total = Object.values(raw).reduce((sum, value) => sum + value, 0);
      const weights = Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [key, value / total])
      );
      const scoreA = weightedScore(candidates.A, weights);
      const scoreB = weightedScore(candidates.B, weights);
      const gap = Math.abs(scoreA - scoreB);

      Object.keys(weights).forEach(key => {
        const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
        setText('#rewardWeight' + capitalized + 'Value', (weights[key] * 100).toFixed(1) + '%');
      });
      setText('#candidateAScore', scoreA.toFixed(3));
      setText('#candidateBScore', scoreB.toFixed(3));

      const barA = $('#candidateABar');
      const barB = $('#candidateBBar');
      if (barA) barA.style.width = (scoreA * 100).toFixed(1) + '%';
      if (barB) barB.style.width = (scoreB * 100).toFixed(1) + '%';

      let winner = '平局';
      if (scoreA > scoreB + 1e-9) winner = 'A';
      if (scoreB > scoreA + 1e-9) winner = 'B';
      setText('#rewardWinner', winner);
      setText('#rewardMargin', winner === '平局' ? '两者总分相同' : '领先 ' + gap.toFixed(3));

      if (winner === '平局') {
        setText('#rewardVectorObservation', '当前归一化权重让 A 与 B 同分；四项原始评分没有改变，只是正负优势恰好抵消。');
      } else {
        setText('#rewardVectorObservation', '当前权重下，A 得 ' + scoreA.toFixed(3) + '，B 得 '
          + scoreB.toFixed(3) + '，' + winner + ' 以 ' + gap.toFixed(3) + ' 分领先。');
      }

      const presentationWeight = weights.quality + weights.alignment;
      const dynamicsWeight = weights.temporal + weights.physics;
      if (presentationWeight > dynamicsWeight + 0.05) {
        setText('#rewardVectorInterpretation', '权重更偏向画质与提示词对齐，因此 A 的清晰、贴题优势被放大；时序与物理退化在总分中更便宜。');
      } else if (dynamicsWeight > presentationWeight + 0.05) {
        setText('#rewardVectorInterpretation', '权重更偏向时序与物理，因此 B 的连贯运动优势被放大；单帧画质和对齐差距不再主导。');
      } else {
        setText('#rewardVectorInterpretation', '呈现维度与动态维度权重接近。A 在画质/对齐领先，B 在时序/物理领先；总分暴露的是当前取舍，而不是无条件的客观质量。');
      }
      renderFormula(weights, scoreA);
    }

    Object.values(controls).forEach(control => control.addEventListener('input', render));
    const reset = $('#rewardVectorReset');
    if (reset) {
      reset.addEventListener('click', () => {
        Object.values(controls).forEach(control => { control.value = '1'; });
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
    initAudioDelayLab();
    initRewardVectorLab();
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
