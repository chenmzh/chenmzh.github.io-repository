(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const fragments = [
    './chapter20-a.html?v=1',
    './chapter20-b.html?v=1',
    './chapter20-c.html?v=1'
  ];

  async function loadChapter() {
    const container = $('#chapterContent');
    if (!container) throw new Error('Missing #chapterContent container.');

    try {
      const responses = await Promise.all(fragments.map(url => fetch(url)));
      const failed = responses.find(response => !response.ok);
      if (failed) throw new Error(`Failed to load ${failed.url}: HTTP ${failed.status}`);
      const html = await Promise.all(responses.map(response => response.text()));
      container.innerHTML = html.join('\n');
      return true;
    } catch (error) {
      console.error(error);
      container.innerHTML = `
        <section class="mrl-chapter-hero">
          <div class="mrl-eyebrow">Chapter load error</div>
          <h1>第二十章加载失败</h1>
          <p class="lead">${escapeHtml(error.message)}</p>
          <p>请通过本地 HTTP 服务或线上站点打开本页，并检查三个章节分片是否可访问。</p>
        </section>`;
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function initMath() {
    if (typeof window.renderMathInElement !== 'function') {
      console.error('KaTeX auto-render is unavailable.');
      return;
    }
    window.renderMathInElement($('#chapterContent'), {
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
      links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
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
      progress.style.width = `${percentage.toFixed(1)}%`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  function formatNumber(value, digits = 3) {
    const threshold = 0.5 * 10 ** -digits;
    const normalized = Math.abs(value) < threshold ? 0 : value;
    return normalized.toFixed(digits);
  }

  function formatSigned(value, digits = 3) {
    const threshold = 0.5 * 10 ** -digits;
    const normalized = Math.abs(value) < threshold ? 0 : value;
    if (normalized > 0) return `+${normalized.toFixed(digits)}`;
    if (normalized < 0) return `−${Math.abs(normalized).toFixed(digits)}`;
    return normalized.toFixed(digits);
  }

  function initCreditLab() {
    const inputs = {
      gamma: $('#creditGamma'),
      lambda: $('#creditLambda'),
      reward: $('#creditReward'),
      probability: $('#creditProbability'),
      alpha: $('#creditAlpha')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const defaults = {
      gamma: 0.8,
      lambda: 0.4,
      reward: 1,
      probability: 0.5,
      alpha: 1
    };

    const labels = {
      gamma: $('#creditGammaValue'),
      lambda: $('#creditLambdaValue'),
      reward: $('#creditRewardValue'),
      probability: $('#creditProbabilityValue'),
      alpha: $('#creditAlphaValue')
    };

    const setText = (selector, value) => {
      const element = $(selector);
      if (element) element.textContent = value;
    };

    const readValues = () => Object.fromEntries(
      Object.entries(inputs).map(([key, input]) => [key, Number(input.value)])
    );

    function render() {
      const value = readValues();
      const terminalReturn = value.gamma ** 3 * value.reward;
      const finalComponent = (1 - value.lambda) * value.reward;
      const shapedGoodReturn = value.lambda * value.reward + value.gamma ** 3 * finalComponent;
      const shapedBadReturn = value.gamma ** 3 * finalComponent;
      const baseline = (shapedGoodReturn + shapedBadReturn) / 2;
      const goodAdvantage = shapedGoodReturn - baseline;
      const badAdvantage = shapedBadReturn - baseline;

      const oldLogit = Math.log(value.probability / (1 - value.probability));
      const logitStep = value.alpha * (
        goodAdvantage * (1 - value.probability) +
        badAdvantage * (-value.probability)
      ) / 2;
      const updatedProbability = 1 / (1 + Math.exp(-(oldLogit + logitStep)));

      labels.gamma.textContent = value.gamma.toFixed(2);
      labels.lambda.textContent = value.lambda.toFixed(2);
      labels.reward.textContent = value.reward.toFixed(2);
      labels.probability.textContent = value.probability.toFixed(2);
      labels.alpha.textContent = value.alpha.toFixed(2);

      setText('#outcomeReturn', formatNumber(terminalReturn));
      setText('#outcomeAdvantage', formatNumber(0));
      setText('#outcomeProbability', formatNumber(value.probability));
      setText('#shapedGoodReturn', formatNumber(shapedGoodReturn));
      setText('#shapedBadReturn', formatNumber(shapedBadReturn));
      setText('#shapedAdvantages', `${formatSigned(goodAdvantage)} / ${formatSigned(badAdvantage)}`);
      setText('#shapedProbability', formatNumber(updatedProbability));
      setText('#outcomeSignalText', formatNumber(0));
      setText('#shapedSignalText', formatSigned(goodAdvantage));

      const outcomeBar = $('#outcomeSignalBar');
      const shapedBar = $('#shapedSignalBar');
      if (outcomeBar) outcomeBar.style.width = '0%';
      if (shapedBar) shapedBar.style.width = `${Math.min(100, value.lambda / 0.8 * 100).toFixed(1)}%`;

      const observation = $('#creditObservation');
      if (!observation) return;
      if (value.lambda === 0) {
        observation.textContent = `λ=0 时两种分配完全相同：两条轨迹的第一轮回报都是 ${formatNumber(terminalReturn)}，advantage 为 0，精确搜索概率保持 ${formatNumber(value.probability)}。折扣只能传播奖励，不能制造路径差异。`;
      } else {
        observation.textContent = `纯结果奖励下，两条轨迹的第一轮回报都为 ${formatNumber(terminalReturn)}；逐轮分配后，精确搜索比模糊搜索多得到 ${formatNumber(shapedGoodReturn - shapedBadReturn)} 的回报，优势为 ${formatSigned(goodAdvantage)}，一次简化更新把其概率从 ${formatNumber(value.probability)} 推到 ${formatNumber(updatedProbability)}。`;
      }
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    const reset = $('#creditReset');
    if (reset) {
      reset.addEventListener('click', () => {
        Object.entries(defaults).forEach(([key, defaultValue]) => {
          inputs[key].value = String(defaultValue);
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
    initCreditLab();
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
