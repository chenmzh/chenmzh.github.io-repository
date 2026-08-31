(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter07-a.html?v=1', './chapter07-b.html?v=1', './chapter07-c.html?v=1'];

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
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const percentage = Math.min(100, Math.max(0, window.scrollY / max * 100));
      progress.style.width = percentage.toFixed(1) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  function formatSigned(value, digits = 3) {
    const threshold = 0.5 * 10 ** -digits;
    const normalized = Math.abs(value) < threshold ? 0 : value;
    if (normalized > 0) return '+' + normalized.toFixed(digits);
    if (normalized < 0) return '−' + Math.abs(normalized).toFixed(digits);
    return normalized.toFixed(digits);
  }

  function initPolicyLab() {
    const inputs = {
      probability: $('#oldProbability'),
      returnValue: $('#returnInput'),
      baseline: $('#baselineInput'),
      alpha: $('#policyAlpha')
    };
    const chooseLeft = $('#chooseLeft');
    const chooseRight = $('#chooseRight');
    const reset = $('#policyReset');
    if (!Object.values(inputs).every(Boolean) || !chooseLeft || !chooseRight || !reset) return;

    const defaults = {
      probability: 0.4,
      returnValue: 3,
      baseline: 1,
      alpha: 0.4,
      action: 'right'
    };
    let selectedAction = defaults.action;

    function setText(selector, value) {
      const element = $(selector);
      if (element) element.textContent = value;
    }

    function setAction(action) {
      selectedAction = action;
      const isRight = action === 'right';
      chooseRight.setAttribute('aria-pressed', String(isRight));
      chooseLeft.setAttribute('aria-pressed', String(!isRight));
      chooseRight.classList.toggle('primary', isRight);
      chooseLeft.classList.toggle('primary', !isRight);
      render();
    }

    function render() {
      const probability = Number(inputs.probability.value);
      const returnValue = Number(inputs.returnValue.value);
      const baseline = Number(inputs.baseline.value);
      const alpha = Number(inputs.alpha.value);
      const selectedRight = selectedAction === 'right';

      const oldLogit = Math.log(probability / (1 - probability));
      const chosenProbability = selectedRight ? probability : 1 - probability;
      const logProbability = Math.log(chosenProbability);
      const score = selectedRight ? 1 - probability : -probability;
      const relativeReturn = returnValue - baseline;
      const gradient = score * relativeReturn;
      const nextLogit = oldLogit + alpha * gradient;
      const nextProbability = 1 / (1 + Math.exp(-nextLogit));
      const probabilityDelta = nextProbability - probability;

      setText('#oldProbabilityValue', probability.toFixed(2));
      setText('#returnValue', formatSigned(returnValue, 1));
      setText('#baselineValue', formatSigned(baseline, 1));
      setText('#policyAlphaValue', alpha.toFixed(2));
      setText('#beforeProbabilityText', (probability * 100).toFixed(1) + '%');
      setText('#afterProbabilityText', (nextProbability * 100).toFixed(1) + '%');
      setText('#chosenProbability', chosenProbability.toFixed(3));
      setText('#logProbability', formatSigned(logProbability));
      setText('#scoreValue', formatSigned(score));
      setText('#relativeReturn', formatSigned(relativeReturn));
      setText('#gradientContribution', formatSigned(gradient));
      setText('#logitUpdate', formatSigned(oldLogit) + ' → ' + formatSigned(nextLogit));

      const beforeBar = $('#beforeProbabilityBar');
      const afterBar = $('#afterProbabilityBar');
      if (beforeBar) beforeBar.style.width = (probability * 100).toFixed(2) + '%';
      if (afterBar) afterBar.style.width = (nextProbability * 100).toFixed(2) + '%';

      const actionName = selectedRight ? '右' : '左';
      const observation = $('#policyObservation');
      const interpretation = $('#policyInterpretation');
      if (!observation || !interpretation) return;

      if (Math.abs(relativeReturn) < 1e-10) {
        observation.textContent = 'G 与 baseline 相等，相对信号为 0；无论这次采到“' + actionName
          + '”的 score 是多少，logit 和右动作概率都保持不变。';
        interpretation.textContent = '当结果恰好达到及格线，本样本不支持强化或抑制已采动作。baseline 决定的是比较原点，不会改写环境给出的 G。';
        return;
      }

      const actionEffect = relativeReturn > 0 ? '强化' : '抑制';
      const rightDirection = probabilityDelta > 0 ? '上升' : '下降';
      observation.textContent = '本次采到“' + actionName + '”，G−b=' + formatSigned(relativeReturn)
        + '，所以该动作被' + actionEffect + '。右动作概率从 '
        + (probability * 100).toFixed(1) + '% ' + rightDirection + '到 '
        + (nextProbability * 100).toFixed(1) + '%。';

      const surprise = Math.abs(score);
      const surpriseDescription = surprise >= 0.7 ? '较意外' : surprise <= 0.3 ? '较符合当前策略' : '意外程度中等';
      interpretation.textContent = '这次选择对右 logit 的 score 为 ' + formatSigned(score)
        + '：它在当前分布下' + surpriseDescription + '。score 给方向与敏感度，G−b 给赞成或反对，学习率再决定实际步长。';
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    chooseLeft.addEventListener('click', () => setAction('left'));
    chooseRight.addEventListener('click', () => setAction('right'));
    reset.addEventListener('click', () => {
      inputs.probability.value = String(defaults.probability);
      inputs.returnValue.value = String(defaults.returnValue);
      inputs.baseline.value = String(defaults.baseline);
      inputs.alpha.value = String(defaults.alpha);
      setAction(defaults.action);
    });
    render();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initPolicyLab();
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
