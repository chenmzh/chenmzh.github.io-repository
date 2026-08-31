(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter26-a.html?v=1', './chapter26-b.html?v=1', './chapter26-c.html?v=1'];
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

  const checkpoints = [
    {
      key: 'C0', name: '初始策略', scans: 20, shelved: 10, tamper: false,
      title: 'C0 · 代理和任务都刚刚起步',
      note: '20 次扫描对应 10 件正确归位；代理奖励与独立效用都较低。'
    },
    {
      key: 'C1', name: '有效改进', scans: 50, shelved: 25, tamper: false,
      title: 'C1 · 有效路线改进同时抬高两项指标',
      note: '50 次扫描对应 25 件正确归位，策略仍在代理与任务共享的方向上改善。'
    },
    {
      key: 'C2', name: '任务峰值', scans: 100, shelved: 45, tamper: false,
      title: 'C2 · 独立任务效用达到峰值',
      note: '100 次扫描对应 45 件正确归位；代理仍低估了真实进展，但策略尚未依赖重复扫描或篡改。'
    },
    {
      key: 'C3', name: '重复扫码', scans: 180, shelved: 15, tamper: false,
      title: 'C3 · 代理继续提高，真实任务已经退化',
      note: '大量扫描来自重复读取同一商品；代理为 90，独立效用只有 30，Goodhart 缺口扩大到 60。'
    },
    {
      key: 'C4', name: '篡改计数', scans: 260, shelved: 0, tamper: true,
      title: 'C4 · 最高代理分来自奖励篡改',
      note: '策略没有归位商品，并改动计数通道；代理被封顶为 100，独立效用因篡改代价降到 −30。'
    }
  ].map(item => {
    const proxy = Math.min(item.scans, 200) / 2;
    const utility = 2 * item.shelved - (item.tamper ? 30 : 0);
    return { ...item, proxy, utility, gap: proxy - utility };
  });

  function initProxyLab() {
    const buttons = $$('.mrl-checkpoint-grid button[data-checkpoint]');
    const auditInput = $('#auditWeight');
    if (!buttons.length || !auditInput) return;
    let selected = 2;

    const displayWidth = value => {
      const minimum = -40;
      const maximum = 130;
      return ((value - minimum) / (maximum - minimum) * 100).toFixed(2) + '%';
    };

    const releaseIndex = weight => {
      let bestIndex = 0;
      let bestScore = -Infinity;
      checkpoints.forEach((item, index) => {
        const score = (1 - weight) * item.proxy + weight * item.utility;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });
      return { index: bestIndex, score: bestScore };
    };

    const render = () => {
      const weight = Number(auditInput.value);
      const item = checkpoints[selected];
      const release = releaseIndex(weight);

      buttons.forEach((button, index) => {
        const active = index === selected;
        button.classList.toggle('is-active', active);
        button.classList.toggle('is-release', index === release.index);
        button.setAttribute('aria-pressed', String(active));
      });

      $('#auditWeightValue').textContent = weight.toFixed(2);
      $('#releaseChoice').textContent = checkpoints[release.index].key + ' · ' + checkpoints[release.index].name;
      $('#releaseScore').textContent = 'selection score = ' + release.score.toFixed(1);
      $('#scanEvents').textContent = String(item.scans);
      $('#shelvedItems').textContent = item.shelved + ' / 50';
      $('#tamperState').textContent = item.tamper ? '已篡改' : '完整';
      $('#proxyScore').textContent = item.proxy.toFixed(0);
      $('#utilityScore').textContent = item.utility.toFixed(0).replace('-', '−');
      $('#gapScore').textContent = item.gap.toFixed(0).replace('-', '−');
      $('#proxyBar').style.width = displayWidth(item.proxy);
      $('#utilityBar').style.width = displayWidth(item.utility);
      $('#gapBar').style.width = displayWidth(item.gap);

      const verdict = $('#proxyVerdict');
      $('strong', verdict).textContent = item.title;
      $('p', verdict).textContent = item.note;

      const observation = $('#proxyObservation');
      if (weight === 0) {
        observation.textContent = '当前 ' + item.key + ' 的代理分为 ' + item.proxy.toFixed(0)
          + '、独立效用为 ' + item.utility.toFixed(0) + '；但 λ=0 只按代理选模，发布规则会选择 C4。';
      } else {
        observation.textContent = 'λ=' + weight.toFixed(2) + ' 时，发布规则选择 '
          + checkpoints[release.index].key + '；当前 ' + item.key + ' 的 Goodhart 缺口为 '
          + item.gap.toFixed(0) + '。把 λ 改回 0，可恢复纯代理选模作为反事实。';
      }
    };

    buttons.forEach(button => button.addEventListener('click', () => {
      selected = Number(button.dataset.checkpoint);
      render();
    }));
    auditInput.addEventListener('input', render);
    const reset = $('#proxyReset');
    if (reset) reset.addEventListener('click', () => {
      selected = 2;
      auditInput.value = '0';
      render();
    });
    render();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initProxyLab();
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
