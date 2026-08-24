(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter01-a.html?v=2', './chapter01-b.html?v=2', './chapter01-c.html?v=2'];
    try {
      const responses = await Promise.all(files.map(url => fetch(url, { cache: 'no-cache' })));
      const bad = responses.find(r => !r.ok);
      if (bad) throw new Error(`HTTP ${bad.status}`);
      const parts = await Promise.all(responses.map(r => r.text()));
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
    const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    if (!links.length || !sections.length) return;

    const setActive = id => {
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
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

  function initReturnExplorer() {
    const slider = $('#gammaSlider');
    const gammaValue = $('#gammaValue');
    const returnValue = $('#returnValue');
    const returnFormula = $('#returnFormula');
    if (!slider || !gammaValue || !returnValue || !returnFormula) return;

    const update = () => {
      const gamma = Number(slider.value);
      gammaValue.textContent = gamma.toFixed(2);
      const terms = Array.from({ length: 8 }, (_, i) => Math.pow(gamma, i));
      returnValue.textContent = terms.reduce((a, b) => a + b, 0).toFixed(3);
      returnFormula.textContent = terms
        .map((_, i) => i === 0 ? '1' : `${gamma.toFixed(2)}^${i}`)
        .join(' + ');
    };
    slider.addEventListener('input', update);
    update();
  }

  const CP = {
    gravity: 9.8,
    massCart: 1.0,
    massPole: 0.1,
    length: 0.5,
    forceMag: 10.0,
    tau: 0.02,
    thetaThreshold: 12 * 2 * Math.PI / 360,
    xThreshold: 2.4,
    maxSteps: 500
  };
  CP.totalMass = CP.massCart + CP.massPole;
  CP.poleMassLength = CP.massPole * CP.length;

  function physicsStep(state, action) {
    let { x, xDot, theta, thetaDot } = state;
    const force = action === 1 ? CP.forceMag : -CP.forceMag;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const temp = (force + CP.poleMassLength * thetaDot * thetaDot * sinTheta) / CP.totalMass;
    const thetaAcc = (CP.gravity * sinTheta - cosTheta * temp) /
      (CP.length * (4 / 3 - CP.massPole * cosTheta * cosTheta / CP.totalMass));
    const xAcc = temp - CP.poleMassLength * thetaAcc * cosTheta / CP.totalMass;

    x += CP.tau * xDot;
    xDot += CP.tau * xAcc;
    theta += CP.tau * thetaDot;
    thetaDot += CP.tau * thetaAcc;

    return {
      state: { x, xDot, theta, thetaDot },
      done: Math.abs(x) > CP.xThreshold || Math.abs(theta) > CP.thetaThreshold
    };
  }

  const sigmoid = x => 1 / (1 + Math.exp(-x));
  const feedbackScore = s => 0.1 * s.x + 0.2 * s.xDot + 8.0 * s.theta + 2.0 * s.thetaDot;

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

  function randomInitial(rng = Math.random) {
    const sample = () => (rng() * 2 - 1) * 0.05;
    return { x: sample(), xDot: sample(), theta: sample(), thetaDot: sample() };
  }

  function chooseAction(policy, state, rng = Math.random) {
    if (policy === 'feedback') {
      const score = feedbackScore(state);
      return { action: score > 0 ? 1 : 0, pRight: sigmoid(score * 2.2) };
    }
    if (policy === 'random') return { action: rng() < .5 ? 1 : 0, pRight: .5 };
    return { action: null, pRight: .5 };
  }

  function runEpisode(policy, rng) {
    let state = randomInitial(rng);
    for (let step = 1; step <= CP.maxSteps; step++) {
      const decision = chooseAction(policy, state, rng);
      const out = physicsStep(state, decision.action);
      state = out.state;
      if (out.done) return step;
    }
    return CP.maxSteps;
  }

  function initCartPole() {
    const svg = $('#cartpoleSvg');
    if (!svg) return;

    const cart = $('#cpCart');
    const pole = $('#cpPole');
    const tip = $('#cpTip');
    const circles = $$('circle', svg);
    const wheelLeft = circles[0];
    const wheelRight = circles[1];
    const pivot = circles[2];
    const forceArrow = $('#cpForceArrow');
    const forceLabel = $('#cpForceLabel');
    const status = $('#cpStatus');
    const policySelect = $('#policySelect');
    const angleSlider = $('#angleSlider');
    const angleValue = $('#angleValue');
    const startBtn = $('#cpStart');
    const stepBtn = $('#cpStep');
    const resetBtn = $('#cpReset');
    const leftBtn = $('#cpLeft');
    const rightBtn = $('#cpRight');
    const runCompare = $('#runComparison');
    const resultRandom = $('#resultRandom');
    const resultFeedback = $('#resultFeedback');
    const barRandom = $('#barRandom');
    const barFeedback = $('#barFeedback');
    const statX = $('#statX');
    const statXDot = $('#statXDot');
    const statTheta = $('#statTheta');
    const statThetaDot = $('#statThetaDot');
    const probLeft = $('#probLeft');
    const probRight = $('#probRight');
    const fillLeft = $('#fillLeft');
    const fillRight = $('#fillRight');
    const scoreEl = $('#feedbackScore');
    const stepEl = $('#cpStepCount');
    const rewardEl = $('#cpReward');

    if (![cart, pole, tip, forceArrow, policySelect, angleSlider].every(Boolean)) return;

    let state;
    let steps = 0;
    let reward = 0;
    let timer = null;
    let done = false;
    let lastAction = null;

    const toDeg = radians => radians * 180 / Math.PI;
    const toRad = degrees => degrees * Math.PI / 180;

    function stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      if (startBtn) startBtn.textContent = '自动运行';
    }

    function reset() {
      stop();
      state = { x: 0, xDot: 0, theta: toRad(Number(angleSlider.value)), thetaDot: 0 };
      steps = 0;
      reward = 0;
      done = false;
      lastAction = null;
      if (status) status.textContent = '等待动作';
      render();
    }

    function policyDecision() {
      if (policySelect.value === 'manual') return null;
      return chooseAction(policySelect.value, state, Math.random).action;
    }

    function advance(action) {
      if (done || action === null || action === undefined) return;
      lastAction = action;
      const out = physicsStep(state, action);
      state = out.state;
      steps += 1;
      reward += 1;
      done = out.done || steps >= CP.maxSteps;
      if (done) {
        stop();
        if (status) status.textContent = out.done ? `回合结束：存活 ${steps} 步` : '成功撑满 500 步';
      } else if (status) {
        status.textContent = action === 1 ? '向右施力 →' : '← 向左施力';
      }
      render();
    }

    function render() {
      const cartX = 380 + (state.x / CP.xThreshold) * 255;
      const cartY = 224;
      const pivotY = cartY - 18;
      const poleLen = 112;
      const tipX = cartX + Math.sin(state.theta) * poleLen;
      const tipY = pivotY - Math.cos(state.theta) * poleLen;

      cart.setAttribute('x', (cartX - 38).toFixed(1));
      if (wheelLeft) wheelLeft.setAttribute('cx', (cartX - 25).toFixed(1));
      if (wheelRight) wheelRight.setAttribute('cx', (cartX + 25).toFixed(1));
      if (pivot) pivot.setAttribute('cx', cartX.toFixed(1));
      pole.setAttribute('x1', cartX.toFixed(1));
      pole.setAttribute('y1', pivotY.toFixed(1));
      pole.setAttribute('x2', tipX.toFixed(1));
      pole.setAttribute('y2', tipY.toFixed(1));
      tip.setAttribute('cx', tipX.toFixed(1));
      tip.setAttribute('cy', tipY.toFixed(1));

      if (lastAction === null) {
        forceArrow.setAttribute('opacity', '0');
        forceLabel?.setAttribute('opacity', '0');
      } else {
        const dir = lastAction === 1 ? 1 : -1;
        forceArrow.setAttribute('x1', cartX.toFixed(1));
        forceArrow.setAttribute('x2', (cartX + dir * 64).toFixed(1));
        forceArrow.setAttribute('marker-end', dir === 1 ? 'url(#arrowRight)' : 'url(#arrowLeft)');
        forceArrow.setAttribute('opacity', '.9');
        if (forceLabel) {
          forceLabel.setAttribute('x', (cartX + dir * 72).toFixed(1));
          forceLabel.setAttribute('text-anchor', dir === 1 ? 'start' : 'end');
          forceLabel.textContent = lastAction === 1 ? 'action = 1' : 'action = 0';
          forceLabel.setAttribute('opacity', '1');
        }
      }

      if (statX) statX.textContent = state.x.toFixed(3);
      if (statXDot) statXDot.textContent = state.xDot.toFixed(3);
      if (statTheta) statTheta.textContent = `${toDeg(state.theta).toFixed(2)}°`;
      if (statThetaDot) statThetaDot.textContent = `${toDeg(state.thetaDot).toFixed(2)}°/s`;
      if (stepEl) stepEl.textContent = steps;
      if (rewardEl) rewardEl.textContent = reward;

      const score = feedbackScore(state);
      let pRight = .5;
      if (policySelect.value === 'feedback') pRight = sigmoid(score * 2.2);
      else if (policySelect.value === 'manual' && lastAction !== null) pRight = lastAction === 1 ? 1 : 0;
      const pLeft = 1 - pRight;
      if (probLeft) probLeft.textContent = pLeft.toFixed(2);
      if (probRight) probRight.textContent = pRight.toFixed(2);
      if (fillLeft) fillLeft.style.width = `${pLeft * 100}%`;
      if (fillRight) fillRight.style.width = `${pRight * 100}%`;
      if (scoreEl) scoreEl.textContent = score.toFixed(3);

      const manual = policySelect.value === 'manual';
      if (leftBtn) leftBtn.disabled = !manual || done;
      if (rightBtn) rightBtn.disabled = !manual || done;
      if (stepBtn) stepBtn.disabled = manual || done;
      if (startBtn) startBtn.disabled = manual || done;
    }

    angleSlider.addEventListener('input', () => {
      if (angleValue) angleValue.textContent = `${Number(angleSlider.value).toFixed(1)}°`;
      reset();
    });
    policySelect.addEventListener('change', () => {
      stop();
      if (status) status.textContent = policySelect.value === 'manual' ? '手动模式：试着救杆子' : '策略已切换';
      render();
    });
    resetBtn?.addEventListener('click', reset);
    stepBtn?.addEventListener('click', () => advance(policyDecision()));
    leftBtn?.addEventListener('click', () => advance(0));
    rightBtn?.addEventListener('click', () => advance(1));
    startBtn?.addEventListener('click', () => {
      if (timer !== null) {
        stop();
        if (status) status.textContent = '已暂停';
        return;
      }
      timer = setInterval(() => {
        if (done) return stop();
        advance(policyDecision());
      }, 44);
      startBtn.textContent = '暂停';
    });

    runCompare?.addEventListener('click', () => {
      runCompare.disabled = true;
      runCompare.textContent = '正在跑 60 个回合…';
      setTimeout(() => {
        const randomScores = [];
        const feedbackScores = [];
        for (let i = 0; i < 30; i++) {
          randomScores.push(runEpisode('random', mulberry32(1000 + i)));
          feedbackScores.push(runEpisode('feedback', mulberry32(2000 + i)));
        }
        const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
        const rMean = mean(randomScores);
        const fMean = mean(feedbackScores);
        if (resultRandom) resultRandom.textContent = rMean.toFixed(1);
        if (resultFeedback) resultFeedback.textContent = fMean.toFixed(1);
        if (barRandom) barRandom.style.width = `${Math.min(100, rMean / CP.maxSteps * 100)}%`;
        if (barFeedback) barFeedback.style.width = `${Math.min(100, fMean / CP.maxSteps * 100)}%`;
        runCompare.disabled = false;
        runCompare.textContent = '重新比较 30 + 30 回合';
      }, 30);
    });

    if (angleValue) angleValue.textContent = `${Number(angleSlider.value).toFixed(1)}°`;
    reset();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initReturnExplorer();
    initCartPole();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
