(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter11-a.html?v=1', './chapter11-b.html?v=1', './chapter11-c.html?v=1'];
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

  function initOfflineLab() {
    const inputs = {
      oodQ: $('#oodQ'),
      oodCount: $('#oodCount'),
      alpha: $('#conservativeAlpha')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const defaults = { oodQ: 9.2, oodCount: 0, alpha: 4 };
    const fixedActions = [
      { key: 'hard-left', label: '强左', count: 18, raw: 3.2, truth: 3.0 },
      { key: 'soft-left', label: '微左', count: 64, raw: 4.8, truth: 4.7 },
      { key: 'straight', label: '直行', count: 120, raw: 6.0, truth: 5.8 },
      { key: 'soft-right', label: '微右', count: 52, raw: 5.2, truth: 5.0 }
    ];

    const signed = (value, digits = 2) => {
      const normalized = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
      if (normalized > 0) return '+' + normalized.toFixed(digits);
      if (normalized < 0) return '−' + Math.abs(normalized).toFixed(digits);
      return normalized.toFixed(digits);
    };
    const maximumBy = (items, field) => items.reduce(
      (best, item) => item[field] > best[field] ? item : best,
      items[0]
    );

    function readValues() {
      return {
        oodQ: Number(inputs.oodQ.value),
        oodCount: Number(inputs.oodCount.value),
        alpha: Number(inputs.alpha.value)
      };
    }

    function render() {
      const value = readValues();
      const actions = fixedActions.concat({
        key: 'hard-right',
        label: '强右',
        count: value.oodCount,
        raw: value.oodQ,
        truth: -2.0,
        ood: value.oodCount === 0
      }).map(action => {
        const penalty = value.alpha / Math.sqrt(action.count + 1);
        return { ...action, penalty, conservative: action.raw - penalty };
      });

      const greedy = maximumBy(actions, 'raw');
      const conservative = maximumBy(actions, 'conservative');

      $('#oodQValue').textContent = value.oodQ.toFixed(1);
      $('#oodCountValue').textContent = String(value.oodCount);
      $('#conservativeAlphaValue').textContent = value.alpha.toFixed(1);
      $('#greedyChoice').textContent = greedy.label + ' · ' + greedy.raw.toFixed(2);
      $('#greedyReason').textContent = '原始 Q 最大；日志数 ' + greedy.count;
      $('#conservativeChoice').textContent = conservative.label + ' · ' + conservative.conservative.toFixed(2);
      $('#conservativeReason').textContent = '惩罚 ' + conservative.penalty.toFixed(2) + ' 后最高';
      $('#auditReturn').textContent = 'Greedy ' + signed(greedy.truth, 1)
        + ' · Conservative ' + signed(conservative.truth, 1);

      const supportBars = $('#supportBars');
      supportBars.innerHTML = actions.map(action => {
        const height = 5 + Math.min(1, action.count / 120) * 105;
        const classes = ['mrl-support-bar'];
        if (action.key === 'hard-right') classes.push('ood');
        return '<div class="' + classes.join(' ') + '" style="height:' + height.toFixed(1) + 'px">'
          + '<b>' + action.count + '</b><span>' + action.label + '</span></div>';
      }).join('');

      const rows = $('#offlineActionRows');
      rows.innerHTML = actions.map(action => {
        const classes = [];
        if (action.key === 'hard-right') classes.push('ood');
        if (action.key === greedy.key) classes.push('selected-greedy');
        if (action.key === conservative.key) classes.push('selected-conservative');
        return '<tr class="' + classes.join(' ') + '">'
          + '<td>' + action.label + '</td>'
          + '<td>' + action.count + '</td>'
          + '<td>' + action.raw.toFixed(2) + '</td>'
          + '<td>' + (action.penalty === 0 ? '0.00' : '−' + action.penalty.toFixed(2)) + '</td>'
          + '<td>' + action.conservative.toFixed(2) + '</td>'
          + '<td>' + signed(action.truth, 1) + '</td></tr>';
      }).join('');

      const observation = $('#offlineObservation');
      if (greedy.key !== conservative.key) {
        observation.textContent = '原始最大化选择“' + greedy.label + '”（Q=' + greedy.raw.toFixed(2)
          + '），支撑感知选择“' + conservative.label + '”（调整后='
          + conservative.conservative.toFixed(2) + '）。教学审计中两者真实值分别为 '
          + signed(greedy.truth, 1) + ' 与 ' + signed(conservative.truth, 1) + '。';
      } else {
        observation.textContent = '两种规则现在都选择“' + greedy.label + '”。原始 Q 与支撑惩罚在当前参数下没有改变排序；'
          + (greedy.key === 'hard-right'
            ? '这说明保守强度不足以抵消该动作的虚高输出。'
            : '这说明最高原始估值本身已有较强日志支持。');
      }

      if (value.oodCount > 0) {
        observation.textContent += ' 增加“强右”样本数只在图中降低稀缺惩罚；真实训练还应让这些新 transition 重新拟合其原始 Q。';
      }
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    const reset = $('#offlineReset');
    if (reset) {
      reset.addEventListener('click', () => {
        inputs.oodQ.value = String(defaults.oodQ);
        inputs.oodCount.value = String(defaults.oodCount);
        inputs.alpha.value = String(defaults.alpha);
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
    initOfflineLab();
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
