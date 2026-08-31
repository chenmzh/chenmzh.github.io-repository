(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter22-a.html?v=1', './chapter22-b.html?v=1', './chapter22-c.html?v=1'];
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
    const setActive = id => links.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + id);
    });
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

  function initEvidenceLab() {
    const routeInputs = $$('input[name="researchRoute"]');
    const budgetInput = $('#researchBudget');
    const resetButton = $('#evidenceReset');
    const trace = $('#researchTrace');
    if (!routeInputs.length || !budgetInput || !resetButton || !trace) return;

    const routes = {
      memory: {
        label: '直接猜', steps: 0, requiredSupported: 0, citations: 0, citationsSupported: 0,
        trace: [
          ['answer', '凭参数记忆提交答案']
        ]
      },
      single: {
        label: '单源速答', steps: 4, requiredSupported: 2, citations: 2, citationsSupported: 1,
        trace: [
          ['search', '搜索姓名与学校'],
          ['open', '打开一个同名主页'],
          ['read', '抽取教育相关句子'],
          ['answer', '附两条引用提交']
        ]
      },
      chain: {
        label: '证据闭环', steps: 9, requiredSupported: 4, citations: 4, citationsSupported: 4,
        trace: [
          ['search', '先按论文标题定位作者'],
          ['open', '论文页确认姓名与单位'],
          ['search', '姓名 + 单位 + education'],
          ['read', '学校主页核对教育经历'],
          ['cite', '绑定四个原子事实'],
          ['answer', '提交带证据短答案']
        ]
      }
    };

    const setText = (selector, value) => {
      const element = $(selector);
      if (element) element.textContent = value;
    };

    function selectedRoute() {
      const selected = routeInputs.find(input => input.checked);
      return routes[selected ? selected.value : 'memory'];
    }

    function renderTrace(items) {
      trace.replaceChildren();
      items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'trace-step';
        const step = document.createElement('span');
        step.className = 'trace-index';
        step.textContent = 'STEP ' + String(index + 1).padStart(2, '0');
        const action = document.createElement('code');
        action.textContent = item[0] + '(...)';
        const note = document.createElement('small');
        note.textContent = item[1];
        card.append(step, action, note);
        trace.append(card);
      });
    }

    function render() {
      const route = selectedRoute();
      const budget = Number(budgetInput.value);
      const answer = 1;
      const coverage = route.requiredSupported / 4;
      const attribution = route.citations === 0 ? 0 : route.citationsSupported / route.citations;
      const withinBudget = route.steps <= budget ? 1 : 0;
      const total = 0.4 * answer + 0.25 * coverage + 0.25 * attribution + 0.1 * withinBudget;

      setText('#researchBudgetValue', String(budget));
      setText('#answerScore', answer.toFixed(2));
      setText('#coverageScore', coverage.toFixed(2));
      setText('#attributionScore', attribution.toFixed(2));
      setText('#budgetScore', withinBudget.toFixed(2));
      setText('#stepReadout', route.steps + ' / ' + budget + ' steps');
      setText('#researchTotal', total.toFixed(2));
      renderTrace(route.trace);

      if (route.citations === 0) {
        setText('#evidenceObservation', route.label + '的答案分为 1.00，但覆盖与归因都为 0；低成本没有提供可检查的证据。');
        setText('#evidenceInterpretation', '只看答案会把“知道”与“猜中”混为一谈。无引用时不能用空集合把归因率抬成 1。');
      } else if (attribution < 1) {
        setText('#evidenceObservation', route.label + '覆盖了 ' + route.requiredSupported + '/4 个事实，但只有 '
          + route.citationsSupported + '/' + route.citations + ' 条引用真正支持相邻论断。');
        setText('#evidenceInterpretation', '搜索到相关页面不等于完成来源归因；同名实体、时间错位和二手转述必须在 claim—evidence 边上检查。');
      } else if (!withinBudget) {
        setText('#evidenceObservation', route.label + '的证据分项全部满分，但 ' + route.steps + ' 步超过当前 ' + budget + ' 步预算。');
        setText('#evidenceInterpretation', '这是效率失败，不是可信度失败。下一步应优化查询与停止策略，而不是删除必要证据。');
      } else {
        setText('#evidenceObservation', route.label + '在 ' + route.steps + ' 步内支持 4/4 个事实，4/4 条引用也都归因正确。');
        setText('#evidenceInterpretation', '只有证据链和预算同时满足时，轨迹才兼顾可信度与部署成本；仍需在真实网页上测工具故障。');
      }
    }

    routeInputs.forEach(input => input.addEventListener('change', render));
    budgetInput.addEventListener('input', render);
    resetButton.addEventListener('click', () => {
      routeInputs.forEach(input => { input.checked = input.value === 'memory'; });
      budgetInput.value = '10';
      render();
    });
    render();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initEvidenceLab();
    if (window.location.hash) {
      window.requestAnimationFrame(() => {
        const target = document.querySelector(window.location.hash);
        if (target) target.scrollIntoView();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
