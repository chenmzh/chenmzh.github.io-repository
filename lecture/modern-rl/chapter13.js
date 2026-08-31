(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter13-a.html?v=1', './chapter13-b.html?v=1', './chapter13-c.html?v=1'];
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

  function signed(value, digits = 3) {
    const normalized = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
    if (normalized > 0) return '+' + normalized.toFixed(digits);
    if (normalized < 0) return '−' + Math.abs(normalized).toFixed(digits);
    return normalized.toFixed(digits);
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = String(value);
  }

  function initIntrinsicLab() {
    const weight = $('#intrinsicWeight');
    const visits = $('#intrinsicVisits');
    if (!weight || !visits) return;
    const defaults = { weight: 0.30, visits: 0 };

    const render = () => {
      const eta = Number(weight.value);
      const count = Number(visits.value);
      const familiarNovelty = 0.10;
      const newNovelty = 1 / Math.sqrt(count + 1);
      const familiar = 0.20 + eta * familiarNovelty;
      const novel = eta * newNovelty;
      const gap = novel - familiar;

      setText('#intrinsicWeightValue', eta.toFixed(2));
      setText('#intrinsicVisitsValue', count.toFixed(0));
      setText('#familiarScore', familiar.toFixed(3));
      setText('#novelScore', novel.toFixed(3));
      setText('#familiarFormula', '0.20 + ' + eta.toFixed(2) + ' × 0.10');
      setText('#novelFormula', '0.00 + ' + eta.toFixed(2) + ' × ' + newNovelty.toFixed(3));

      if (Math.abs(gap) < 0.0005) {
        setText('#intrinsicObservation', '两条路的训练奖励相同（' + familiar.toFixed(3)
          + '）；这里正处在探索与熟路的决策翻转边界。');
      } else if (gap > 0) {
        setText('#intrinsicObservation', '新房间高 ' + gap.toFixed(3)
          + '；在这一步的贪心比较里，agent 会选择探索。');
      } else {
        setText('#intrinsicObservation', '熟路高 ' + Math.abs(gap).toFixed(3)
          + '；好奇心奖金已不足以盖过眼前外部进展。');
      }
    };

    weight.addEventListener('input', render);
    visits.addEventListener('input', render);
    const reset = $('#intrinsicReset');
    if (reset) reset.addEventListener('click', () => {
      weight.value = String(defaults.weight);
      visits.value = String(defaults.visits);
      render();
    });
    render();
  }

  function initCreditLab() {
    const inputs = {
      team: $('#teamReward'),
      A: $('#withoutA'),
      B: $('#withoutB'),
      C: $('#withoutC')
    };
    if (!Object.values(inputs).every(Boolean)) return;
    const defaults = { team: 12, A: 5, B: 8, C: 11 };

    const render = () => {
      const team = Number(inputs.team.value);
      const counterfactuals = {
        A: Number(inputs.A.value),
        B: Number(inputs.B.value),
        C: Number(inputs.C.value)
      };
      const credits = Object.fromEntries(
        Object.entries(counterfactuals).map(([agent, value]) => [agent, team - value])
      );

      setText('#teamRewardValue', team.toFixed(0));
      setText('#withoutAValue', counterfactuals.A.toFixed(0));
      setText('#withoutBValue', counterfactuals.B.toFixed(0));
      setText('#withoutCValue', counterfactuals.C.toFixed(0));
      ['A', 'B', 'C'].forEach(agent => {
        setText('#global' + agent, team.toFixed(0));
        setText('#counter' + agent, counterfactuals[agent].toFixed(0));
        setText('#credit' + agent, signed(credits[agent], 0));
      });

      const maximum = Math.max(...Object.values(credits));
      const leaders = Object.keys(credits).filter(agent => credits[agent] === maximum);
      const leaderText = leaders.length === 3 ? '三者并列' : leaders.join('、');
      const negative = Object.values(credits).some(value => value < 0);
      setText('#creditObservation', leaderText + ' 的边际信用最高（' + signed(maximum, 0)
        + '）；但三人看到的共享团队信号仍然都是 ' + team.toFixed(0) + '。'
        + (negative ? ' 负信用表示所选反事实比实际联合行为更好。' : ''));
    };

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    const reset = $('#creditReset');
    if (reset) reset.addEventListener('click', () => {
      inputs.team.value = String(defaults.team);
      inputs.A.value = String(defaults.A);
      inputs.B.value = String(defaults.B);
      inputs.C.value = String(defaults.C);
      render();
    });
    render();
  }

  function initOptionLab() {
    const horizon = $('#optionHorizon');
    const duration = $('#optionDuration');
    const gammaInput = $('#optionGamma');
    if (!horizon || !duration || !gammaInput) return;
    const defaults = { horizon: 120, duration: 10, gamma: 0.99 };

    const render = () => {
      const h = Number(horizon.value);
      const t = Number(duration.value);
      const gamma = Number(gammaInput.value);
      const highLevelDecisions = Math.ceil(h / t);
      const compression = h / highLevelDecisions;
      const correctDiscount = gamma ** h;
      const wrongDiscount = gamma ** highLevelDecisions;

      setText('#optionHorizonValue', h.toFixed(0));
      setText('#optionDurationValue', t.toFixed(0));
      setText('#optionGammaValue', gamma.toFixed(3));
      setText('#flatDecisions', h.toFixed(0));
      setText('#highDecisions', highLevelDecisions.toFixed(0));
      setText('#compressionValue', '压缩 ' + compression.toFixed(1) + '×');
      setText('#correctDiscount', correctDiscount.toFixed(3));
      setText('#wrongDiscount', wrongDiscount.toFixed(3));

      if (t === 1) {
        setText('#optionObservation', 'T=1 时 option 退化为原子动作：高层没有压缩，两个折扣也完全相同。');
      } else if (gamma === 1) {
        setText('#optionObservation', 'γ=1 时没有时间折扣；高层选择减少 '
          + compression.toFixed(1) + '×，两种终点权重都为 1。');
      } else {
        setText('#optionObservation', '高层选择减少 ' + compression.toFixed(1)
          + '×，但正确终点权重仍是 ' + correctDiscount.toFixed(3)
          + '；若每个 option 只折扣一次，会错误放大到 ' + wrongDiscount.toFixed(3) + '。');
      }
    };

    horizon.addEventListener('input', render);
    duration.addEventListener('input', render);
    gammaInput.addEventListener('input', render);
    const reset = $('#optionReset');
    if (reset) reset.addEventListener('click', () => {
      horizon.value = String(defaults.horizon);
      duration.value = String(defaults.duration);
      gammaInput.value = String(defaults.gamma);
      render();
    });
    render();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initIntrinsicLab();
    initCreditLab();
    initOptionLab();
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
