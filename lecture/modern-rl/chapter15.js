(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter15-a.html?v=1', './chapter15-b.html?v=1', './chapter15-c.html?v=1'];
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

  function formatSigned(value, digits = 2) {
    const threshold = 0.5 * 10 ** -digits;
    if (Math.abs(value) < threshold) return (0).toFixed(digits);
    return (value > 0 ? '+' : '−') + Math.abs(value).toFixed(digits);
  }

  function sigmoid(value) {
    if (value >= 0) return 1 / (1 + Math.exp(-value));
    const exponential = Math.exp(value);
    return exponential / (1 + exponential);
  }

  function initRatioLab() {
    const chosenInput = $('#chosenRatio');
    const rejectedInput = $('#rejectedRatio');
    const betaInput = $('#dpoBeta');
    if (!chosenInput || !rejectedInput || !betaInput) return;

    const defaults = { chosen: 1, rejected: -0.5, beta: 0.5 };

    function setText(selector, text) {
      const element = $(selector);
      if (element) element.textContent = text;
    }

    function placeMarker(selector, value) {
      const marker = $(selector);
      if (!marker) return;
      const percentage = Math.max(2, Math.min(98, (value + 3) / 6 * 100));
      marker.style.left = percentage.toFixed(2) + '%';
      const label = $('span', marker);
      if (label) label.textContent = formatSigned(value);
    }

    function render() {
      const chosen = Number(chosenInput.value);
      const rejected = Number(rejectedInput.value);
      const beta = Number(betaInput.value);
      const delta = chosen - rejected;
      const logit = beta * delta;
      const probability = sigmoid(logit);
      const loss = Math.log1p(Math.exp(-logit));
      const gradient = -beta * (1 - probability);

      setText('#chosenRatioValue', formatSigned(chosen));
      setText('#rejectedRatioValue', formatSigned(rejected));
      setText('#betaValue', beta.toFixed(2));
      setText('#deltaValue', formatSigned(delta));
      setText('#scaledMarginValue', formatSigned(logit));
      setText('#preferenceValue', probability.toFixed(3));
      setText('#lossValue', loss.toFixed(3));
      setText('#gradientValue', formatSigned(gradient, 3));
      setText('#probabilityLabel', 'chosen ' + (probability * 100).toFixed(1) + '%');
      placeMarker('#chosenMarker', chosen);
      placeMarker('#rejectedMarker', rejected);

      const fill = $('#probabilityFill');
      if (fill) fill.style.width = (probability * 100).toFixed(2) + '%';

      const observation = $('#ratioObservation');
      const interpretation = $('#ratioInterpretation');
      if (!observation || !interpretation) return;

      observation.textContent = '当前 Δ=' + formatSigned(delta)
        + '、β=' + beta.toFixed(2)
        + '，chosen 胜出的概率为 ' + probability.toFixed(3)
        + '，loss 为 ' + loss.toFixed(3)
        + '，margin 梯度为 ' + formatSigned(gradient, 3) + '。';

      if (Math.abs(delta) < 0.05) {
        interpretation.textContent = '两个 log-ratio 相同，所以偏好概率固定为 0.5、loss 固定为 ln 2；β 不改变当前判断，却把纠正梯度的绝对值缩放为 β/2。';
      } else if (delta < 0) {
        interpretation.textContent = '当前排序与标签相反。增大 β 会让模型对错误排序更确信：概率更低、loss 更高，同时产生更强的纠正梯度，把 Δ 往正方向推。';
      } else if (logit > 4) {
        interpretation.textContent = '当前排序已正确且 βΔ 很大，偏好概率接近 1。sigmoid 进入饱和区，loss 与梯度都接近 0，继续拉开 margin 的收益很小。';
      } else {
        interpretation.textContent = '当前排序与标签一致。负梯度意味着梯度下降继续增大 Δ；改变 β 会同时缩放 logit 和梯度，但其效果还取决于 sigmoid 是否开始饱和。';
      }
    }

    [chosenInput, rejectedInput, betaInput].forEach(input => input.addEventListener('input', render));
    const reset = $('#ratioReset');
    if (reset) {
      reset.addEventListener('click', () => {
        chosenInput.value = String(defaults.chosen);
        rejectedInput.value = String(defaults.rejected);
        betaInput.value = String(defaults.beta);
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
    initRatioLab();
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
