(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter02-a.html?v=1', './chapter02-b.html?v=1', './chapter02-c.html?v=1'];
    try {
      const responses = await Promise.all(files.map(url => fetch(url, { cache: 'no-cache' })));
      const bad = responses.find(response => !response.ok);
      if (bad) throw new Error(`HTTP ${bad.status}`);
      const parts = await Promise.all(responses.map(response => response.text()));
      host.innerHTML = parts.join('\n');

      // Keep first-use terminology strict in the rendered page: do not surface
      // “bandit” in the hero metadata before the full term is explained below.
      const labPill = $$('.mrl-meta .mrl-pill', host)
        .find(node => node.textContent.toLowerCase().includes('bandit'));
      if (labPill) labPill.textContent = '实验：纯浏览器双动作实验';

      // Default to a deterministic run that clearly exposes greedy lock-in.
      const seedSelect = $('#banditSeed', host);
      if (seedSelect) seedSelect.value = '31';
      return true;
    } catch (err) {
      host.innerHTML = `
        <section class="mrl-chapter-hero">
          <div class="mrl-eyebrow">Chapter load error</div>
          <h1>章节内容没有加载成功</h1>
          <p class="lead">请刷新页面。如果问题持续存在，可以从课程目录重新进入。</p>
          <p class="mrl-small">${String(err)}</p>
        </section>`;
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
      links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, .2, .8] });
      sections.forEach(section => observer.observe(section));
    }

    const progress = $('#readingProgress');
    const updateProgress = () => {
      if (!progress) return;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.max(0, window.scrollY / max * 100));
      progress.style.width = `${pct.toFixed(1)}%`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function bernoulli(rng, p) {
    return rng() < p ? 1 : 0;
  }

  function randomArgmax(values, rng) {
    const max = Math.max(...values);
    const candidates = [];
    values.forEach((value, index) => {
      if (Math.abs(value - max) < 1e-12) candidates.push(index);
    });
    return candidates[Math.floor(rng() * candidates.length)];
  }

  function initSampleLab() {
    const nSlider = $('#sampleNSlider');
    const gapSlider = $('#gapSlider');
    const nValue = $('#sampleNValue');
    const gapValue = $('#gapValue');
    const truth = $('#sampleTruth');
    const observed = $('#sampleObserved');
    const observedNote = $('#sampleObservedNote');
    const errorRate = $('#sampleErrorRate');
    const tieRate = $('#sampleTieRate');
    const runBtn = $('#runSampleLab');
    if (![nSlider, gapSlider, truth, observed, errorRate, tieRate].every(Boolean)) return;

    let rerun = 0;

    function probabilities() {
      const gap = Number(gapSlider.value) / 100;
      return { pA: .5 + gap / 2, pB: .5 - gap / 2 };
    }

    function updateLabels() {
      const n = Number(nSlider.value);
      const gapPoints = Number(gapSlider.value);
      const { pA, pB } = probabilities();
      if (nValue) nValue.textContent = String(n);
      if (gapValue) gapValue.textContent = String(gapPoints);
      truth.textContent = `A ${(pA * 100).toFixed(0)}% · B ${(pB * 100).toFixed(0)}%`;
    }

    function simulate() {
      updateLabels();
      const n = Number(nSlider.value);
      const gapPoints = Number(gapSlider.value);
      const { pA, pB } = probabilities();
      const rng = mulberry32(2202 + n * 101 + gapPoints * 1009 + rerun * 7919);

      let exampleA = 0;
      let exampleB = 0;
      for (let i = 0; i < n; i++) {
        exampleA += bernoulli(rng, pA);
        exampleB += bernoulli(rng, pB);
      }
      const exampleMeanA = exampleA / n;
      const exampleMeanB = exampleB / n;
      observed.textContent = `A ${exampleA}/${n} · B ${exampleB}/${n}`;
      if (observedNote) {
        if (exampleMeanA > exampleMeanB) observedNote.textContent = `这一次样本把 A 排在前面：${exampleMeanA.toFixed(2)} > ${exampleMeanB.toFixed(2)}`;
        else if (exampleMeanA < exampleMeanB) observedNote.textContent = `这一次样本误把 B 排在前面：${exampleMeanA.toFixed(2)} < ${exampleMeanB.toFixed(2)}`;
        else observedNote.textContent = `这一次样本打平：两边都是 ${exampleMeanA.toFixed(2)}`;
      }

      const reps = 2000;
      let wrong = 0;
      let ties = 0;
      for (let rep = 0; rep < reps; rep++) {
        let winsA = 0;
        let winsB = 0;
        for (let i = 0; i < n; i++) {
          winsA += bernoulli(rng, pA);
          winsB += bernoulli(rng, pB);
        }
        if (winsB > winsA) wrong += 1;
        else if (winsB === winsA) ties += 1;
      }
      errorRate.textContent = `误判 ${(wrong / reps * 100).toFixed(1)}%`;
      tieRate.textContent = `另有 ${(ties / reps * 100).toFixed(1)}% 的重复实验无法分出高下`;
    }

    nSlider.addEventListener('input', updateLabels);
    gapSlider.addEventListener('input', updateLabels);
    nSlider.addEventListener('change', simulate);
    gapSlider.addEventListener('change', simulate);
    runBtn?.addEventListener('click', () => {
      rerun += 1;
      simulate();
    });
    simulate();
  }

  function initSingleBanditLab() {
    const strategySelect = $('#banditStrategy');
    const seedSelect = $('#banditSeed');
    const stepBtn = $('#banditStep');
    const runBtn = $('#banditRun');
    const resetBtn = $('#banditReset');
    const status = $('#banditStatus');
    const stepCount = $('#banditStepCount');
    const rewardEl = $('#banditReward');
    const avgRewardEl = $('#banditAvgReward');
    const regretEl = $('#banditRegretPlain');
    const estimateEls = [$('#armAEstimate'), $('#armBEstimate')];
    const countEls = [$('#armACount'), $('#armBCount')];
    const fillEls = [$('#armAFill'), $('#armBFill')];
    const armBoxes = [$('#armABox'), $('#armBBox')];
    const timeline = $('#banditTimeline');
    if (![strategySelect, seedSelect, stepBtn, runBtn, resetBtn, timeline].every(Boolean)) return;

    const probs = [.6, .4];
    const horizon = 80;
    let rng;
    let q;
    let counts;
    let steps;
    let rewardSum;
    let regret;
    let history;
    let lastAction;

    function reset() {
      rng = mulberry32(Number(seedSelect.value));
      q = [0, 0];
      counts = [0, 0];
      steps = 0;
      rewardSum = 0;
      regret = 0;
      history = [];
      lastAction = null;
      if (status) status.textContent = '已重置。先走几步，观察估计值怎样被早期奖励推来推去。';
      render();
    }

    function chooseAction() {
      if (strategySelect.value === 'random') return rng() < .5 ? 0 : 1;
      return randomArgmax(q, rng);
    }

    function advance() {
      if (steps >= horizon) return;
      const action = chooseAction();
      const reward = bernoulli(rng, probs[action]);
      counts[action] += 1;
      q[action] += (reward - q[action]) / counts[action];
      rewardSum += reward;
      regret += probs[0] - probs[action];
      steps += 1;
      lastAction = action;
      history.push({ action, reward });
      if (history.length > 64) history.shift();
      if (status) {
        const label = action === 0 ? 'A' : 'B';
        status.textContent = `第 ${steps} 步选择 ${label}，得到 reward=${reward}。当前估计 A=${q[0].toFixed(3)}，B=${q[1].toFixed(3)}。`;
      }
      render();
    }

    function render() {
      if (stepCount) stepCount.textContent = `${steps} / ${horizon}`;
      if (rewardEl) rewardEl.textContent = String(rewardSum);
      if (avgRewardEl) avgRewardEl.textContent = steps ? (rewardSum / steps).toFixed(3) : '—';
      if (regretEl) regretEl.textContent = regret.toFixed(2);
      for (let a = 0; a < 2; a++) {
        if (estimateEls[a]) estimateEls[a].textContent = q[a].toFixed(3);
        if (countEls[a]) countEls[a].textContent = String(counts[a]);
        if (fillEls[a]) fillEls[a].style.width = `${Math.max(0, Math.min(100, q[a] * 100))}%`;
        armBoxes[a]?.classList.toggle('is-chosen', lastAction === a);
      }
      timeline.innerHTML = '';
      history.forEach(item => {
        const tick = document.createElement('span');
        tick.className = `mrl-bandit-tick ${item.action === 0 ? 'arm-a' : 'arm-b'} ${item.reward ? 'win' : 'loss'}`;
        tick.title = `${item.action === 0 ? 'A' : 'B'} · reward ${item.reward}`;
        timeline.appendChild(tick);
      });
      const done = steps >= horizon;
      stepBtn.disabled = done;
      runBtn.disabled = done;
      if (done && status) {
        status.textContent = `80 步结束：平均奖励 ${(rewardSum / horizon).toFixed(3)}，A 被选 ${counts[0]} 次，B 被选 ${counts[1]} 次。`;
      }
    }

    strategySelect.addEventListener('change', reset);
    seedSelect.addEventListener('change', reset);
    resetBtn.addEventListener('click', reset);
    stepBtn.addEventListener('click', advance);
    runBtn.addEventListener('click', () => {
      while (steps < horizon) advance();
    });
    reset();
  }

  function simulateStrategy(strategy, seed, epsilon, horizon = 300, ucbC = .5) {
    const rng = mulberry32(seed);
    const probs = [.6, .4];
    const q = [0, 0];
    const counts = [0, 0];
    const regrets = new Array(horizon);
    let rewardSum = 0;
    let cumulativeRegret = 0;
    let optimalLast = 0;

    for (let t = 1; t <= horizon; t++) {
      let action;
      if (strategy === 'random') {
        action = rng() < .5 ? 0 : 1;
      } else if (strategy === 'greedy') {
        action = randomArgmax(q, rng);
      } else if (strategy === 'epsilon') {
        action = rng() < epsilon ? (rng() < .5 ? 0 : 1) : randomArgmax(q, rng);
      } else {
        if (counts[0] === 0) action = 0;
        else if (counts[1] === 0) action = 1;
        else {
          const scores = q.map((estimate, a) => estimate + ucbC * Math.sqrt(Math.log(t) / counts[a]));
          action = randomArgmax(scores, rng);
        }
      }

      const reward = bernoulli(rng, probs[action]);
      rewardSum += reward;
      counts[action] += 1;
      q[action] += (reward - q[action]) / counts[action];
      cumulativeRegret += probs[0] - probs[action];
      regrets[t - 1] = cumulativeRegret;
      if (t > horizon - 50 && action === 0) optimalLast += 1;
    }

    return {
      regrets,
      meanReward: rewardSum / horizon,
      finalRegret: cumulativeRegret,
      optimalLast: optimalLast / 50
    };
  }

  function initComparisonLab() {
    const runBtn = $('#runComparison');
    const epsilonSlider = $('#epsilonSlider');
    const epsilonValue = $('#epsilonValue');
    const grid = $('#regretGrid');
    const lines = {
      random: $('#lineRandom'),
      greedy: $('#lineGreedy'),
      epsilon: $('#lineEpsilon'),
      ucb: $('#lineUcb')
    };
    if (![runBtn, epsilonSlider, grid, lines.random, lines.greedy, lines.epsilon, lines.ucb].every(Boolean)) return;

    const table = {
      random: [$('#cmpRandomReward'), $('#cmpRandomOptimal'), $('#cmpRandomRegret')],
      greedy: [$('#cmpGreedyReward'), $('#cmpGreedyOptimal'), $('#cmpGreedyRegret')],
      epsilon: [$('#cmpEpsilonReward'), $('#cmpEpsilonOptimal'), $('#cmpEpsilonRegret')],
      ucb: [$('#cmpUcbReward'), $('#cmpUcbOptimal'), $('#cmpUcbRegret')]
    };
    const horizon = 300;
    const runs = 400;
    let experimentRound = 0;

    function updateEpsilonLabel() {
      if (epsilonValue) epsilonValue.textContent = Number(epsilonSlider.value).toFixed(2);
    }

    function draw(aggregates) {
      const finalMax = Math.max(...Object.values(aggregates).map(item => item.regrets[horizon - 1]));
      const yMax = Math.max(5, Math.ceil(finalMax * 1.15 / 5) * 5);
      const left = 58;
      const right = 735;
      const top = 28;
      const bottom = 275;
      const width = right - left;
      const height = bottom - top;

      let gridMarkup = '';
      for (let i = 0; i <= 4; i++) {
        const frac = i / 4;
        const y = bottom - frac * height;
        const value = frac * yMax;
        gridMarkup += `<line class="mrl-chart-grid" x1="58" y1="${y.toFixed(1)}" x2="735" y2="${y.toFixed(1)}"></line>`;
        gridMarkup += `<text class="mrl-chart-label" x="18" y="${(y + 4).toFixed(1)}">${value.toFixed(0)}</text>`;
      }
      grid.innerHTML = gridMarkup;

      Object.entries(aggregates).forEach(([key, item]) => {
        const points = item.regrets.map((value, index) => {
          const x = left + index / (horizon - 1) * width;
          const y = bottom - value / yMax * height;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        lines[key].setAttribute('points', points);
      });
    }

    function runExperiment() {
      experimentRound += 1;
      const epsilon = Number(epsilonSlider.value);
      updateEpsilonLabel();
      runBtn.disabled = true;
      runBtn.textContent = '计算 1600 条轨迹…';

      window.setTimeout(() => {
        const strategies = ['random', 'greedy', 'epsilon', 'ucb'];
        const aggregates = {};
        strategies.forEach(strategy => {
          aggregates[strategy] = {
            regrets: new Array(horizon).fill(0),
            meanReward: 0,
            finalRegret: 0,
            optimalLast: 0
          };
        });

        for (let run = 0; run < runs; run++) {
          strategies.forEach((strategy, strategyIndex) => {
            const seed = 50000 + experimentRound * 100000 + run * 97 + strategyIndex * 10007;
            const result = simulateStrategy(strategy, seed, epsilon, horizon, .5);
            const agg = aggregates[strategy];
            for (let t = 0; t < horizon; t++) agg.regrets[t] += result.regrets[t] / runs;
            agg.meanReward += result.meanReward / runs;
            agg.finalRegret += result.finalRegret / runs;
            agg.optimalLast += result.optimalLast / runs;
          });
        }

        Object.entries(aggregates).forEach(([key, item]) => {
          const cells = table[key];
          if (cells[0]) cells[0].textContent = item.meanReward.toFixed(3);
          if (cells[1]) cells[1].textContent = `${(item.optimalLast * 100).toFixed(1)}%`;
          if (cells[2]) cells[2].textContent = item.finalRegret.toFixed(2);
        });
        draw(aggregates);
        runBtn.disabled = false;
        runBtn.textContent = '重新运行比较';
      }, 20);
    }

    epsilonSlider.addEventListener('input', updateEpsilonLabel);
    epsilonSlider.addEventListener('change', runExperiment);
    runBtn.addEventListener('click', runExperiment);
    updateEpsilonLabel();
    runExperiment();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initSampleLab();
    initSingleBanditLab();
    initComparisonLab();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
