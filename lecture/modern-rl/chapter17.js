(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const svgNamespace = 'http://www.w3.org/2000/svg';

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter17-a.html?v=1', './chapter17-b.html?v=1', './chapter17-c.html?v=1'];
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

  function independentCoverage(probability, count) {
    return 1 - (1 - probability) ** count;
  }

  function correlatedCoverage(probability, count, correlation) {
    return correlation * probability
      + (1 - correlation) * independentCoverage(probability, count);
  }

  function formatPercent(value) {
    return (value * 100).toFixed(2) + '%';
  }

  function formatInteger(value) {
    return Math.round(value).toLocaleString('en-US');
  }

  function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS(svgNamespace, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function initScalingLab() {
    const inputs = {
      probability: $('#sampleProbability'),
      count: $('#sampleCount'),
      tokens: $('#tokensPerSample'),
      correlation: $('#sampleCorrelation'),
      selector: $('#selectorReliability')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const defaults = {
      probability: 0.20,
      count: 8,
      tokens: 500,
      correlation: 0.40,
      selector: 0.90
    };
    const chart = $('#scalingChart');
    const grid = $('#chartGrid');
    const plot = { left: 56, right: 692, top: 24, bottom: 254 };
    const maximumCount = 32;

    function readValues() {
      return {
        probability: Number(inputs.probability.value),
        count: Number(inputs.count.value),
        tokens: Number(inputs.tokens.value),
        correlation: Number(inputs.correlation.value),
        selector: Number(inputs.selector.value)
      };
    }

    function setText(selector, value) {
      const element = $(selector);
      if (element) element.textContent = value;
    }

    function xForCount(count) {
      return plot.left + (count - 1) / (maximumCount - 1) * (plot.right - plot.left);
    }

    function yForProbability(probability) {
      return plot.bottom - probability * (plot.bottom - plot.top);
    }

    function linePath(values) {
      return values.map((value, index) => {
        const command = index === 0 ? 'M' : 'L';
        return command + xForCount(index + 1).toFixed(2) + ' ' + yForProbability(value).toFixed(2);
      }).join(' ');
    }

    function drawGrid(tokensPerSample) {
      if (!chart || !grid) return;
      grid.replaceChildren();
      [0, 0.25, 0.5, 0.75, 1].forEach(value => {
        const y = yForProbability(value);
        grid.appendChild(createSvgElement('line', {
          class: value === 0 ? 'chart-axis' : 'chart-grid',
          x1: plot.left,
          x2: plot.right,
          y1: y,
          y2: y
        }));
        const label = createSvgElement('text', { x: 24, y: y + 3 });
        label.textContent = Math.round(value * 100) + '%';
        grid.appendChild(label);
      });
      [1, 8, 16, 24, 32].forEach(count => {
        const x = xForCount(count);
        grid.appendChild(createSvgElement('line', {
          class: count === 1 ? 'chart-axis' : 'chart-grid',
          x1: x,
          x2: x,
          y1: plot.top,
          y2: plot.bottom
        }));
        const label = createSvgElement('text', { x: x - 8, y: 270 });
        label.textContent = count === 1 ? '1×L' : count + '×L';
        grid.appendChild(label);
      });
      setText('#budgetAxisStart', formatInteger(tokensPerSample) + ' token');
      setText('#budgetAxisEnd', formatInteger(maximumCount * tokensPerSample) + ' token');
    }

    function placePoint(selector, count, probability) {
      const point = $(selector);
      if (!point) return;
      point.setAttribute('cx', xForCount(count).toFixed(2));
      point.setAttribute('cy', yForProbability(probability).toFixed(2));
    }

    function render() {
      const value = readValues();
      const independent = independentCoverage(value.probability, value.count);
      const correlated = correlatedCoverage(value.probability, value.count, value.correlation);
      const delivered = correlated * value.selector;
      const totalTokens = value.count * value.tokens;
      const nextIndependentGain = value.probability * (1 - value.probability) ** value.count;
      const nextCorrelatedGain = (1 - value.correlation) * nextIndependentGain;

      setText('#sampleProbabilityValue', value.probability.toFixed(2));
      setText('#sampleCountValue', String(value.count));
      setText('#tokensPerSampleValue', formatInteger(value.tokens) + ' token');
      setText('#sampleCorrelationValue', value.correlation.toFixed(2));
      setText('#selectorReliabilityValue', value.selector.toFixed(2));
      setText('#independentCoverage', formatPercent(independent));
      setText('#correlatedCoverage', formatPercent(correlated));
      setText('#deliveredAccuracy', formatPercent(delivered));
      setText('#generationCost', formatInteger(totalTokens));

      const lossFromCorrelation = independent - correlated;
      const selectionLoss = correlated - delivered;
      setText('#scalingObservation',
        '当前用 ' + formatInteger(totalTokens) + ' 个生成 token：独立公式给出 '
        + formatPercent(independent) + ' 覆盖率；相关错误把它压低 '
        + (lossFromCorrelation * 100).toFixed(2) + ' 个百分点，选择器再损失 '
        + (selectionLoss * 100).toFixed(2) + ' 个百分点。第 ' + (value.count + 1)
        + ' 条候选在该相关模型下只新增约 ' + (nextCorrelatedGain * 100).toFixed(2)
        + ' 个百分点覆盖。');

      const independentValues = [];
      const correlatedValues = [];
      const deliveredValues = [];
      for (let count = 1; count <= maximumCount; count += 1) {
        const independentAtCount = independentCoverage(value.probability, count);
        const correlatedAtCount = correlatedCoverage(
          value.probability,
          count,
          value.correlation
        );
        independentValues.push(independentAtCount);
        correlatedValues.push(correlatedAtCount);
        deliveredValues.push(correlatedAtCount * value.selector);
      }

      const independentPath = $('#independentPath');
      const correlatedPath = $('#correlatedPath');
      const deliveredPath = $('#deliveredPath');
      if (independentPath) independentPath.setAttribute('d', linePath(independentValues));
      if (correlatedPath) correlatedPath.setAttribute('d', linePath(correlatedValues));
      if (deliveredPath) deliveredPath.setAttribute('d', linePath(deliveredValues));

      const budgetLine = $('#currentBudgetLine');
      if (budgetLine) {
        const x = xForCount(value.count).toFixed(2);
        budgetLine.setAttribute('x1', x);
        budgetLine.setAttribute('x2', x);
      }
      placePoint('#currentIndependentPoint', value.count, independent);
      placePoint('#currentCorrelatedPoint', value.count, correlated);
      placePoint('#currentDeliveredPoint', value.count, delivered);
      drawGrid(value.tokens);
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    const reset = $('#scalingReset');
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
    initScalingLab();
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
