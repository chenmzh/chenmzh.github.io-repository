(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter04-a.html?v=1', './chapter04-b.html?v=1', './chapter04-c.html?v=1'];

    try {
      const responses = await Promise.all(files.map(url => fetch(url, { cache: 'no-cache' })));
      const bad = responses.find(response => !response.ok);
      if (bad) throw new Error(`HTTP ${bad.status}`);
      const parts = await Promise.all(responses.map(response => response.text()));
      host.innerHTML = parts.join('\n');
      return true;
    } catch (error) {
      host.innerHTML = `
        <section class="mrl-chapter-hero">
          <div class="mrl-eyebrow">Chapter load error</div>
          <h1>章节内容没有加载成功</h1>
          <p class="lead">请刷新页面。如果问题持续存在，可以从课程目录重新进入。</p>
          <p class="mrl-small">${String(error)}</p>
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
      }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.2, 0.8] });
      sections.forEach(section => observer.observe(section));
    }

    const progress = $('#readingProgress');
    const updateProgress = () => {
      if (!progress) return;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const percent = Math.min(100, Math.max(0, window.scrollY / max * 100));
      progress.style.width = `${percent.toFixed(1)}%`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  function initBellmanLab() {
    const gammaSlider = $('#gammaSlider');
    const gammaValue = $('#gammaValue');
    const backupButton = $('#backupOnce');
    const resetButton = $('#resetBackup');
    const roundReadout = $('#backupRound');
    const oldTable = $('#oldValueTable');
    const newTable = $('#newValueTable');
    const observation = $('#labObservation');
    const interpretation = $('#labInterpretation');
    const cells = $$('.mrl-corridor-state');
    if (![gammaSlider, gammaValue, backupButton, resetButton, roundReadout, oldTable, newTable, observation, interpretation].every(Boolean) || cells.length !== 4) return;

    const rewards = [0, 0, 1];
    let values = [0, 0, 0, 0];
    let previousValues = values.slice();
    let round = 0;
    let changed = [];

    const formatValues = array => `[${array.map(value => value.toFixed(3)).join(', ')}]`;

    function render() {
      const gamma = Number(gammaSlider.value);
      gammaValue.textContent = gamma.toFixed(2);
      roundReadout.textContent = `k=${round}`;
      oldTable.textContent = `V${Math.max(0, round - 1)} = ${formatValues(previousValues)}`;
      newTable.textContent = `V${round} = ${formatValues(values)}`;

      cells.forEach((cell, index) => {
        const value = $('strong', cell);
        if (value) value.textContent = values[index].toFixed(3);
        cell.classList.toggle('changed', changed.includes(index));
      });

      if (round === 0) {
        observation.textContent = '第 0 轮所有估计都是 0。先预测：第一次备份会从哪个状态开始出现非零值？';
        interpretation.textContent = '贝尔曼右侧把下一状态的旧估计搬回当前状态；反复应用后，远期奖励才会逐层影响更早的状态。';
        return;
      }

      if (changed.length) {
        const names = changed.map(index => `S${index}`).join('、');
        observation.textContent = `第 ${round} 轮后，本轮发生变化的是 ${names}。当前表为 ${formatValues(values)}。`;
      } else {
        observation.textContent = `第 ${round} 轮后没有数值继续变化；这张固定策略价值表已经与一步关系一致。`;
      }

      const frontier = values.findIndex(value => value > 1e-10);
      if (frontier >= 0) {
        interpretation.textContent = `非零价值目前最远传播到 S${frontier}。同步备份每轮只读取旧表，所以信息不会在同一轮跨越多条边。`;
      }
    }

    function backup() {
      const gamma = Number(gammaSlider.value);
      previousValues = values.slice();
      const next = previousValues.slice();

      for (let state = 0; state < 3; state += 1) {
        next[state] = rewards[state] + gamma * previousValues[state + 1];
      }
      next[3] = 0;

      changed = next
        .map((value, index) => Math.abs(value - previousValues[index]) > 1e-10 ? index : -1)
        .filter(index => index >= 0);
      values = next;
      round += 1;
      render();
    }

    function reset() {
      values = [0, 0, 0, 0];
      previousValues = values.slice();
      round = 0;
      changed = [];
      render();
    }

    gammaSlider.addEventListener('input', reset);
    backupButton.addEventListener('click', backup);
    resetButton.addEventListener('click', reset);
    render();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initBellmanLab();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
