(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter27-a.html?v=1', './chapter27-b.html?v=1', './chapter27-c.html?v=1'];
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

  function initOpponentPoolLab() {
    const inputs = {
      rounds: $('#trainingRounds'),
      learningRate: $('#learningRate'),
      forgettingRate: $('#forgettingRate'),
      beta: $('#curriculumFocus')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const defaults = {
      rounds: 20,
      learningRate: 0.25,
      forgettingRate: 0.06,
      beta: 4
    };
    const initialScores = [0.55, 0.45, 0.35];

    const clamp = value => Math.max(0, Math.min(1, value));
    const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
    const minimum = values => Math.min(...values);
    const percent = value => (100 * value).toFixed(1) + '%';

    function setText(selector, value) {
      const element = $(selector);
      if (element) element.textContent = value;
    }

    function readValues() {
      return {
        rounds: Number(inputs.rounds.value),
        learningRate: Number(inputs.learningRate.value),
        forgettingRate: Number(inputs.forgettingRate.value),
        beta: Number(inputs.beta.value)
      };
    }

    function curriculumWeights(scores, beta) {
      const raw = scores.map(score => Math.exp(-beta * score));
      const normalizer = raw.reduce((sum, value) => sum + value, 0);
      return raw.map(value => value / normalizer);
    }

    function simulate(mode, parameters) {
      let scores = initialScores.slice();
      const history = [scores.slice()];

      for (let round = 0; round < parameters.rounds; round += 1) {
        const weights = mode === 'fixed'
          ? [1, 0, 0]
          : curriculumWeights(scores, parameters.beta);
        scores = scores.map((score, index) => clamp(
          score
          + parameters.learningRate * weights[index] * (1 - score)
          - parameters.forgettingRate * (1 - weights[index]) * score
        ));
        history.push(scores.slice());
      }

      return { scores, history };
    }

    function chartPoint(round, value, totalRounds) {
      const geometry = { left: 56, right: 690, top: 24, bottom: 270 };
      const x = geometry.left + (geometry.right - geometry.left) * round / totalRounds;
      const y = geometry.bottom - (geometry.bottom - geometry.top) * value;
      return { x, y };
    }

    function makePath(history, metric, totalRounds) {
      return history.map((scores, index) => {
        const point = chartPoint(index, metric(scores), totalRounds);
        return (index === 0 ? 'M' : 'L') + point.x.toFixed(2) + ' ' + point.y.toFixed(2);
      }).join(' ');
    }

    function setFinalPoint(selector, history, metric, totalRounds) {
      const point = chartPoint(totalRounds, metric(history[history.length - 1]), totalRounds);
      const element = $(selector);
      if (!element) return;
      element.setAttribute('cx', point.x.toFixed(2));
      element.setAttribute('cy', point.y.toFixed(2));
    }

    function drawGrid(totalRounds) {
      const grid = $('#poolChartGrid');
      if (!grid) return;
      const geometry = { left: 56, right: 690, top: 24, bottom: 270 };
      const pieces = [];

      for (let index = 0; index <= 4; index += 1) {
        const value = index / 4;
        const y = geometry.bottom - (geometry.bottom - geometry.top) * value;
        pieces.push('<line class="chart-grid" x1="' + geometry.left + '" y1="' + y.toFixed(2)
          + '" x2="' + geometry.right + '" y2="' + y.toFixed(2) + '"></line>');
        pieces.push('<text x="24" y="' + (y + 4).toFixed(2) + '">' + Math.round(value * 100) + '%</text>');
      }

      const tickRounds = [...new Set([0, Math.round(totalRounds / 4), Math.round(totalRounds / 2),
        Math.round(totalRounds * 3 / 4), totalRounds])].sort((a, b) => a - b);
      tickRounds.forEach(round => {
        const x = geometry.left + (geometry.right - geometry.left) * round / totalRounds;
        pieces.push('<line class="chart-grid" x1="' + x.toFixed(2) + '" y1="' + geometry.top
          + '" x2="' + x.toFixed(2) + '" y2="' + geometry.bottom + '"></line>');
        pieces.push('<text x="' + x.toFixed(2) + '" y="288" text-anchor="middle">' + round + '</text>');
      });
      pieces.push('<line class="chart-axis" x1="' + geometry.left + '" y1="' + geometry.bottom
        + '" x2="' + geometry.right + '" y2="' + geometry.bottom + '"></line>');
      pieces.push('<line class="chart-axis" x1="' + geometry.left + '" y1="' + geometry.top
        + '" x2="' + geometry.left + '" y2="' + geometry.bottom + '"></line>');
      grid.innerHTML = pieces.join('');
    }

    function renderChart(fixedHistory, poolHistory, totalRounds) {
      const paths = [
        ['#fixedSeenPath', fixedHistory, scores => scores[0]],
        ['#fixedMeanPath', fixedHistory, mean],
        ['#poolMeanPath', poolHistory, mean],
        ['#poolWorstPath', poolHistory, minimum]
      ];
      paths.forEach(([selector, history, metric]) => {
        const element = $(selector);
        if (element) element.setAttribute('d', makePath(history, metric, totalRounds));
      });

      setFinalPoint('#fixedSeenPoint', fixedHistory, scores => scores[0], totalRounds);
      setFinalPoint('#fixedMeanPoint', fixedHistory, mean, totalRounds);
      setFinalPoint('#poolMeanPoint', poolHistory, mean, totalRounds);
      setFinalPoint('#poolWorstPoint', poolHistory, minimum, totalRounds);
      drawGrid(totalRounds);
    }

    function render() {
      const parameters = readValues();
      const fixed = simulate('fixed', parameters);
      const pool = simulate('pool', parameters);
      const fixedMean = mean(fixed.scores);
      const fixedWorst = minimum(fixed.scores);
      const poolMean = mean(pool.scores);
      const poolWorst = minimum(pool.scores);
      const initialMean = mean(initialScores);

      setText('#trainingRoundsValue', String(parameters.rounds));
      setText('#learningRateValue', parameters.learningRate.toFixed(2));
      setText('#forgettingRateValue', parameters.forgettingRate.toFixed(2));
      setText('#curriculumFocusValue', parameters.beta.toFixed(1));
      setText('#fixedSeenScore', percent(fixed.scores[0]));
      setText('#fixedPoolMean', percent(fixedMean));
      setText('#fixedWorstScore', percent(fixedWorst));
      setText('#adaptivePoolScore', percent(poolMean) + ' / ' + percent(poolWorst));

      const direction = fixedMean >= initialMean ? '上升' : '下降';
      const change = Math.abs(fixedMean - initialMean) * 100;
      const observation = $('#poolObservation');
      if (observation) {
        if (parameters.forgettingRate === 0) {
          observation.textContent = '关闭遗忘后，固定对手分数为 ' + percent(fixed.scores[0])
            + '，三类均值为 ' + percent(fixedMean) + '、最差项仍停在 ' + percent(fixedWorst)
            + '；自适应池均值／最差项为 ' + percent(poolMean) + ' / ' + percent(poolWorst)
            + '。退化减弱了，但固定训练仍没有改善未练习对手。';
        } else {
          observation.textContent = '固定对手分数升至 ' + percent(fixed.scores[0])
            + '，三类均值却为 ' + percent(fixedMean) + '，较初始 ' + direction + ' '
            + change.toFixed(1) + ' 个百分点，最差项为 ' + percent(fixedWorst)
            + '；自适应池均值／最差项为 ' + percent(poolMean) + ' / ' + percent(poolWorst) + '。';
        }
      }

      const description = $('#poolChartDescription');
      if (description) {
        description.textContent = '训练 ' + parameters.rounds + ' 轮后，固定对手分数 '
          + percent(fixed.scores[0]) + '，固定策略跨对手均值 ' + percent(fixedMean)
          + '；自适应池均值 ' + percent(poolMean) + '，最差项 ' + percent(poolWorst) + '。';
      }
      renderChart(fixed.history, pool.history, parameters.rounds);
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));

    const noForgetting = $('#noForgetting');
    if (noForgetting) {
      noForgetting.addEventListener('click', () => {
        inputs.forgettingRate.value = '0';
        render();
      });
    }

    const reset = $('#poolReset');
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
    initOpponentPoolLab();
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
