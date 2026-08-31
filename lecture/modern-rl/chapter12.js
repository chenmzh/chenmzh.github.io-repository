(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter12-a.html?v=1', './chapter12-b.html?v=1', './chapter12-c.html?v=1'];
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

  function rolloutSeries(horizon, errorRate, recoveryRate) {
    const offSupport = [0];
    let onSupport = 1;
    for (let step = 1; step <= horizon; step += 1) {
      onSupport = onSupport * (1 - errorRate) + (1 - onSupport) * recoveryRate;
      offSupport.push(1 - onSupport);
    }
    return offSupport;
  }

  function drawSeries(chart, values, className, width, height) {
    const lastIndex = values.length - 1;
    const points = values.map((value, index) => ({
      x: lastIndex === 0 ? 0 : index / lastIndex * width,
      y: height - value * height
    }));

    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
      const segment = document.createElement('span');
      segment.className = 'mrl-chart-segment ' + className;
      segment.style.left = start.x + 'px';
      segment.style.top = start.y + 'px';
      segment.style.width = length + 'px';
      segment.style.transform = 'rotate(' + angle + 'deg)';
      chart.appendChild(segment);
    }

    [0, Math.floor(lastIndex / 2), lastIndex].forEach(index => {
      const dot = document.createElement('span');
      dot.className = 'mrl-chart-dot ' + className;
      dot.style.left = points[index].x + 'px';
      dot.style.top = points[index].y + 'px';
      chart.appendChild(dot);
    });
  }

  function initDaggerLab() {
    const inputs = {
      horizon: $('#horizonInput'),
      errorRate: $('#errorInput'),
      rounds: $('#roundInput')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const defaults = { horizon: 60, errorRate: 0.04, rounds: 5 };
    const chart = $('#rolloutChart');

    function setText(selector, value) {
      const element = $(selector);
      if (element) element.textContent = value;
    }

    function render() {
      const horizon = Number(inputs.horizon.value);
      const errorRate = Number(inputs.errorRate.value);
      const rounds = Number(inputs.rounds.value);
      const bcRecovery = 0.10;
      const daggerRecovery = Math.min(0.90, bcRecovery + rounds * 0.10);
      const bc = rolloutSeries(horizon, errorRate, bcRecovery);
      const dagger = rolloutSeries(horizon, errorRate, daggerRecovery);
      const bcEnd = bc[bc.length - 1];
      const daggerEnd = dagger[dagger.length - 1];
      const bcSteps = bc.slice(1).reduce((total, value) => total + value, 0);
      const daggerSteps = dagger.slice(1).reduce((total, value) => total + value, 0);

      setText('#horizonValue', String(horizon));
      setText('#errorValue', errorRate.toFixed(2));
      setText('#roundValue', String(rounds));
      setText('#chartMidLabel', 'step ' + Math.floor(horizon / 2));
      setText('#chartEndLabel', 'step ' + horizon);
      setText('#bcEndValue', (bcEnd * 100).toFixed(1) + '%');
      setText('#daggerEndValue', (daggerEnd * 100).toFixed(1) + '%');
      setText('#bcStepsValue', bcSteps.toFixed(1) + ' / ' + horizon);
      setText('#daggerStepsValue', daggerSteps.toFixed(1) + ' / ' + horizon);
      setText('#daggerRecoveryValue', daggerRecovery.toFixed(2));

      const reduction = bcSteps <= 0 ? 0 : (1 - daggerSteps / bcSteps) * 100;
      const observation = rounds === 0
        ? '聚合轮数为 0 时，两条曲线完全重合：两者恢复率都是 0.10，说明只换上 DAgger 名称而没有加入新标注，不会改变 rollout。'
        : '长度 ' + horizon + ' 的 rollout 中，BC 预计有 ' + bcSteps.toFixed(1)
          + ' 步处于支持区外；' + rounds + ' 轮聚合把恢复率提高到 '
          + daggerRecovery.toFixed(2) + '，预计离轨步数降到 ' + daggerSteps.toFixed(1)
          + '，减少 ' + reduction.toFixed(1) + '%。';
      setText('#daggerObservation', observation);
      setText('#daggerMechanism', rounds === 0
        ? '反事实提示：把聚合轮数从 0 调高。单步偏航率没有变化，但恢复状态获得专家标签后，绿色曲线会在后半程下移。'
        : '机制读法：这里没有降低专家支持区内的偏航率 ε；差距只来自 DAgger 对恢复状态的覆盖，使离轨以后回到支持区的概率 q 从 0.10 升到 '
          + daggerRecovery.toFixed(2) + '。');

      if (!chart) return;
      chart.replaceChildren();
      const width = chart.clientWidth;
      const height = chart.clientHeight;
      if (width <= 0 || height <= 0) return;
      drawSeries(chart, bc, 'bc', width, height);
      drawSeries(chart, dagger, 'dagger', width, height);
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    const reset = $('#daggerReset');
    if (reset) {
      reset.addEventListener('click', () => {
        inputs.horizon.value = String(defaults.horizon);
        inputs.errorRate.value = String(defaults.errorRate);
        inputs.rounds.value = String(defaults.rounds);
        render();
      });
    }
    window.addEventListener('resize', render);
    render();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initDaggerLab();
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
