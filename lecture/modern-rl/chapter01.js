(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function initMath() {
    if (typeof renderMathInElement !== 'function') return;
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }

  function initToc() {
    const links = $$('.mrl-toc a[href^="#"]');
    const sections = links
      .map(a => $(a.getAttribute('href')))
      .filter(Boolean);
    if (!links.length || !sections.length) return;

    const setActive = id => {
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
    };

    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, .2, .8] });

    sections.forEach(section => observer.observe(section));

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

    const rewards = [1, 1, 1, 1, 1, 1, 1, 1];
    const update = () => {
      const gamma = Number(slider.value);
      gammaValue.textContent = gamma.toFixed(2);
      const terms = rewards.map((r, i) => Math.pow(gamma, i) * r);
      const G = terms.reduce((a, b) => a + b, 0);
      returnValue.textContent = G.toFixed(3);
      returnFormula.textContent = terms
        .map((v, i) => i === 0 ? '1' : `${gamma.toFixed(2)}^${i}`)
        .join(' + ');
    };
    slider.addEventListener('input', update);
    update();
  }

  /* -------------------------------------------------------------
     Browser CartPole — dynamics follow the classic-control equations
     used by the standard CartPole environment. This is a teaching
     implementation: no library, no neural network, no hidden training.
     ------------------------------------------------------------- */
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

    const done = Math.abs(x) > CP.xThreshold || Math.abs(theta) > CP.thetaThreshold;
    return { state: { x, xDot, theta, thetaDot }, done };
  }

  const sigmoid = x => 1 / (1 + Math.exp(-x));

  function feedbackScore(s) {
    return 0.1 * s.x + 0.2 * s.xDot + 8.0 * s.theta + 2.0 * s.thetaDot;
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

  function randomInitial(rng = Math.random) {
    const sample = () => (rng() * 2 - 1) * 0.05;
    return { x: sample(), xDot: sample(), theta: sample(), thetaDot: sample() };
  }

  function chooseAction(policy, state, rng = Math.random) {
    if (policy === 'feedback') {
      const score = feedbackScore(state);
      const pRight = sigmoid(score * 2.2);
      return { action: score > 0 ? 1 : 0, pRight };
    }
    if (policy === 'random') {
      return { action: rng() < .5 ? 1 : 0, pRight: .5 };
    }
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

    let state;
    let steps = 0;
    let reward = 0;
    let timer = null;
    let done = false;
    let lastAction = null;

    const deg = rad => rad * 180 / Math.PI;
    const rad = deg => deg * Math.PI / 180;

    function reset() {
      stop();
      const theta = rad(Number(angleSlider.value));
      state = { x: 0, xDot: 0, theta, thetaDot: 0 };
      steps = 0;
      reward = 0;
      done = false;
      lastAction = null;
      status.textContent = '等待动作';
      startBtn.textContent = '自动运行';
      render();
    }

    function stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      if (startBtn) startBtn.textContent = '自动运行';
    }

    function policyDecision() {
      const policy = policySelect.value;
      if (policy === 'manual') return null;
      return chooseAction(policy, state, Math.random).action;
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
        status.textContent = out.done ? `回合结束：存活 ${steps} 步` : '成功撑满 500 步';
      } else {
        status.textContent = action === 1 ? '向右施力 →' : '← 向左施力';
      }
      render();
    }

    function render() {
      const cartX = 380 + (state.x / CP.xThreshold) * 255;
      const cartY = 224;
      const poleLen = 112;
      const pivotY = cartY - 18;
      const tipX = cartX + Math.sin(state.theta) * poleLen;
      const tipY = pivotY - Math.cos(state.theta) * poleLen;

      cart.setAttribute('x', (cartX - 38).toFixed(1));
      pole.setAttribute('x1', cartX.toFixed(1));
      pole.setAttribute('y1', pivotY.toFixed(1));
      pole.setAttribute('x2', tipX.toFixed(1));
      pole.setAttribute('y2', tipY.toFixed(1));
      tip.setAttribute('cx', tipX.toFixed(1));
      tip.setAttribute('cy', tipY.toFixed(1));

      if (lastAction === null) {
        forceArrow.setAttribute('opacity', '0');
        forceLabel.setAttribute('opacity', '0');
      } else {
        const dir = lastAction === 1 ? 1 : -1;
        forceArrow.setAttribute('x1', cartX.toFixed(1));
        forceArrow.setAttribute('x2', (cartX + dir * 64).toFixed(1));
        forceArrow.setAttribute('y1', '270');
        forceArrow.setAttribute('y2', '270');
        forceArrow.setAttribute('marker-end', dir === 1 ? 'url(#arrowRight)' : 'url(#arrowLeft)');
        forceArrow.setAttribute('opacity', '.9');
        forceLabel.setAttribute('x', (cartX + dir * 72).toFixed(1));
        forceLabel.setAttribute('text-anchor', dir === 1 ? 'start' : 'end');
        forceLabel.textContent = lastAction === 1 ? 'action = 1' : 'action = 0';
        forceLabel.setAttribute('opacity', '1');
      }

      statX.textContent = state.x.toFixed(3);
      statXDot.textContent = state.xDot.toFixed(3);
      statTheta.textContent = `${deg(state.theta).toFixed(2)}°`;
      statThetaDot.textContent = `${deg(state.thetaDot).toFixed(2)}°/s`;
      stepEl.textContent = steps;
      rewardEl.textContent = reward;

      const score = feedbackScore(state);
      let pRight;
      if (policySelect.value === 'feedback') pRight = sigmoid(score * 2.2);
      else if (policySelect.value === 'random') pRight = .5;
      else pRight = lastAction === null ? .5 : (lastAction === 1 ? 1 : 0);
      const pLeft = 1 - pRight;
      probLeft.textContent = pLeft.toFixed(2);
      probRight.textContent = pRight.toFixed(2);
      fillLeft.style.width = `${pLeft * 100}%`;
      fillRight.style.width = `${pRight * 100}%`;
      scoreEl.textContent = score.toFixed(3);

      const manual = policySelect.value === 'manual';
      leftBtn.disabled = !manual || done;
      rightBtn.disabled = !manual || done;
      stepBtn.disabled = manual || done;
      startBtn.disabled = manual || done;
    }

    angleSlider.addEventListener('input', () => {
      angleValue.textContent = `${Number(angleSlider.value).toFixed(1)}°`;
      reset();
    });
    policySelect.addEventListener('change', () => {
      stop();
      status.textContent = policySelect.value === 'manual' ? '手动模式：试着救杆子' : '策略已切换';
      render();
    });
    resetBtn.addEventListener('click', reset);
    stepBtn.addEventListener('click', () => advance(policyDecision()));
    leftBtn.addEventListener('click', () => advance(0));
    rightBtn.addEventListener('click', () => advance(1));
    startBtn.addEventListener('click', () => {
      if (timer !== null) {
        stop();
        status.textContent = '已暂停';
        return;
      }
      timer = setInterval(() => {
        if (done) return stop();
        advance(policyDecision());
      }, 44);
      startBtn.textContent = '暂停';
    });

    runCompare.addEventListener('click', () => {
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
        resultRandom.textContent = rMean.toFixed(1);
        resultFeedback.textContent = fMean.toFixed(1);
        barRandom.style.width = `${Math.min(100, rMean / CP.maxSteps * 100)}%`;
        barFeedback.style.width = `${Math.min(100, fMean / CP.maxSteps * 100)}%`;
        runCompare.disabled = false;
        runCompare.textContent = '重新比较 30 + 30 回合';
      }, 30);
    });

    angleValue.textContent = `${Number(angleSlider.value).toFixed(1)}°`;
    reset();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMath();
    initToc();
    initReturnExplorer();
    initCartPole();
  });
})();
