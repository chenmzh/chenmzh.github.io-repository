(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter03-a.html?v=1', './chapter03-b.html?v=1', './chapter03-c.html?v=1'];
    try {
      const responses = await Promise.all(files.map(url => fetch(url, { cache: 'no-cache' })));
      const bad = responses.find(response => !response.ok);
      if (bad) throw new Error(`HTTP ${bad.status}`);
      const parts = await Promise.all(responses.map(response => response.text()));
      host.innerHTML = parts.join('\n');
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

  function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(hi, value));
  }

  function signed(value) {
    if (value > 0) return `+${value}`;
    if (value < 0) return `−${Math.abs(value)}`;
    return '0';
  }

  function initStateLab() {
    const representation = $('#stateRepresentation');
    const actionSelect = $('#stateAction');
    const obsA = $('#stateObsA');
    const obsB = $('#stateObsB');
    const actA = $('#stateActA');
    const actB = $('#stateActB');
    const nextVA = $('#stateNextVA');
    const nextVB = $('#stateNextVB');
    const nextXA = $('#stateNextXA');
    const nextXB = $('#stateNextXB');
    const verdict = $('#stateVerdict');
    if (![representation, actionSelect, obsA, obsB, nextVA, nextVB, nextXA, nextXB, verdict].every(Boolean)) return;

    const worlds = [
      { x: 2, v: -1 },
      { x: 2, v: 1 }
    ];

    function step(world, acceleration) {
      const v = clamp(world.v + acceleration, -2, 2);
      const x = clamp(world.x + v, 0, 4);
      return { x, v };
    }

    function render() {
      const acceleration = Number(actionSelect.value);
      const full = representation.value === 'full';
      const next = worlds.map(world => step(world, acceleration));

      obsA.textContent = full ? `[x=2, v=${signed(worlds[0].v)}]` : '[x=2]';
      obsB.textContent = full ? `[x=2, v=${signed(worlds[1].v)}]` : '[x=2]';
      if (actA) actA.textContent = `a = ${signed(acceleration)}`;
      if (actB) actB.textContent = `a = ${signed(acceleration)}`;
      nextVA.textContent = signed(next[0].v);
      nextVB.textContent = signed(next[1].v);
      nextXA.textContent = `x′ = ${next[0].x}`;
      nextXB.textContent = `x′ = ${next[1].x}`;

      verdict.classList.toggle('good', full);
      verdict.classList.toggle('bad', !full);
      const strong = $('strong', verdict);
      if (!strong) return;
      if (full) {
        strong.textContent = '当前表示已经把两种局面区分成 [x=2, v=−1] 与 [x=2, v=+1]。在这个玩具动力学里，预测下一步不再需要回头查“刚才从哪边来”。';
      } else {
        strong.textContent = '两个真实世界对 agent 看起来都是 [x=2]，同一个动作却产生不同下一位置。说明位置 alone 丢掉了会影响未来的速度信息。';
      }
    }

    representation.addEventListener('change', render);
    actionSelect.addEventListener('change', render);
    render();
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

  const GRID = 4;
  const CURRENT = [1, 1];
  const GOAL = [0, 3];
  const TRAP = [2, 2];
  const ACTIONS = {
    up: [-1, 0],
    down: [1, 0],
    left: [0, -1],
    right: [0, 1]
  };
  const SIDES = {
    up: ['left', 'right'],
    down: ['right', 'left'],
    left: ['down', 'up'],
    right: ['up', 'down']
  };

  function sameCell(a, b) {
    return a[0] === b[0] && a[1] === b[1];
  }

  function move(state, action) {
    const delta = ACTIONS[action];
    const row = clamp(state[0] + delta[0], 0, GRID - 1);
    const col = clamp(state[1] + delta[1], 0, GRID - 1);
    return [row, col];
  }

  function transitionDistribution(action, slip) {
    const branches = [
      { action, p: 1 - slip },
      { action: SIDES[action][0], p: slip / 2 },
      { action: SIDES[action][1], p: slip / 2 }
    ];
    const map = new Map();
    branches.forEach(branch => {
      if (branch.p <= 0) return;
      const next = move(CURRENT, branch.action);
      const key = `${next[0]},${next[1]}`;
      const existing = map.get(key) || { state: next, p: 0 };
      existing.p += branch.p;
      map.set(key, existing);
    });
    return [...map.values()].sort((a, b) => b.p - a.p);
  }

  function initTransitionLab() {
    const actionSelect = $('#transitionAction');
    const slipSlider = $('#slipSlider');
    const slipValue = $('#slipValue');
    const grid = $('#transitionGrid');
    const rows = $('#transitionProbRows');
    const samples = $('#transitionSamples');
    const sampleBtn = $('#sampleTransitions');
    if (![actionSelect, slipSlider, slipValue, grid, rows, samples, sampleBtn].every(Boolean)) return;

    let round = 0;

    function renderGrid(distribution) {
      const probs = new Map(distribution.map(item => [`${item.state[0]},${item.state[1]}`, item.p]));
      grid.innerHTML = '';
      for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
          const cell = document.createElement('div');
          cell.className = 'mrl-mini-cell';
          const state = [row, col];
          if (sameCell(state, GOAL)) cell.classList.add('goal');
          if (sameCell(state, TRAP)) cell.classList.add('trap');
          if (sameCell(state, CURRENT)) {
            cell.classList.add('current');
            cell.textContent = 'Sₜ';
          }
          const p = probs.get(`${row},${col}`);
          if (p !== undefined) {
            cell.classList.add('possible');
            cell.dataset.prob = `${Math.round(p * 100)}%`;
          }
          grid.appendChild(cell);
        }
      }
    }

    function renderRows(distribution) {
      rows.innerHTML = '';
      distribution.forEach(item => {
        const row = document.createElement('div');
        row.className = 'mrl-prob-row';
        row.innerHTML = `
          <span>$s' = (${item.state[0]},${item.state[1]})$</span>
          <div class="mrl-prob-track"><div class="mrl-prob-fill" style="width:${(item.p * 100).toFixed(1)}%"></div></div>
          <strong>${(item.p * 100).toFixed(0)}%</strong>`;
        rows.appendChild(row);
        if (typeof renderMathInElement === 'function') {
          renderMathInElement(row, {
            delimiters: [{ left: '$', right: '$', display: false }],
            throwOnError: false
          });
        }
      });
    }

    function currentDistribution() {
      const slip = Number(slipSlider.value);
      slipValue.textContent = slip.toFixed(2);
      return transitionDistribution(actionSelect.value, slip);
    }

    function renderTheory() {
      const distribution = currentDistribution();
      renderGrid(distribution);
      renderRows(distribution);
      samples.textContent = '参数已更新。点击“重新采样 100 次”，比较经验频率与上面的理论概率。';
    }

    function sample() {
      round += 1;
      const distribution = currentDistribution();
      renderGrid(distribution);
      renderRows(distribution);
      const seed = 30300 + round * 7919 + Math.round(Number(slipSlider.value) * 1000) + actionSelect.selectedIndex * 10007;
      const rng = mulberry32(seed);
      const counts = new Map(distribution.map(item => [`${item.state[0]},${item.state[1]}`, 0]));

      for (let i = 0; i < 100; i++) {
        const u = rng();
        let cumulative = 0;
        let selected = distribution[distribution.length - 1];
        for (const item of distribution) {
          cumulative += item.p;
          if (u < cumulative) {
            selected = item;
            break;
          }
        }
        const key = `${selected.state[0]},${selected.state[1]}`;
        counts.set(key, counts.get(key) + 1);
      }

      const text = distribution.map(item => {
        const key = `${item.state[0]},${item.state[1]}`;
        const count = counts.get(key);
        return `<b>(${key})</b>：${count}/100`;
      }).join(' · ');
      samples.innerHTML = `100 次实际 transition：${text}<br><span class="mrl-small">有限样本会波动；重新采样时数字会变，但长期频率会靠近理论分布。</span>`;
    }

    actionSelect.addEventListener('change', renderTheory);
    slipSlider.addEventListener('input', renderTheory);
    sampleBtn.addEventListener('click', sample);
    renderTheory();
    sample();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initStateLab();
    initTransitionLab();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
