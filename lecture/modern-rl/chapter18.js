(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter18-a.html?v=1', './chapter18-b.html?v=1', './chapter18-c.html?v=1'];
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

  function initPathLab() {
    const budgetInput = $('#pathBudget');
    if (!budgetInput) return;

    const outcomeEvents = [
      { text: '甲·1 生成互质假设' },
      { text: '甲·2 生成错误等式' },
      { text: '甲·3 沿错误前提继续' },
      { text: '甲·4 完成；Outcome = 1', type: 'complete' },
      { text: '乙·1 生成互质假设' },
      { text: '乙·2 推出 p 为偶数' },
      { text: '乙·3 推出 q 为偶数' },
      { text: '乙·4 完成；Outcome = 1', type: 'complete' },
      { text: '丙·1 写出小数近似' },
      { text: '丙·2 声称不会循环' },
      { text: '丙·3 未补充分数性质' },
      { text: '丙·4 完成；Outcome = 1', type: 'complete' }
    ];
    const processEvents = [
      { text: '甲·1 步骤分 .97，继续' },
      { text: '甲·2 步骤分 .08，剪枝', type: 'prune' },
      { text: '乙·1 步骤分 .96，继续' },
      { text: '乙·2 步骤分 .94，继续' },
      { text: '乙·3 步骤分 .93，继续' },
      { text: '乙·4 步骤分 .97，完成', type: 'complete' }
    ];
    const pathNames = ['甲', '乙', '丙'];

    function setText(selector, value) {
      const element = $(selector);
      if (element) element.textContent = value;
    }

    function renderTrace(selector, events, count) {
      const list = $(selector);
      if (!list) return;
      list.replaceChildren(...events.slice(0, count).map((event, index) => {
        const item = document.createElement('li');
        if (event.type) item.classList.add('is-' + event.type);
        const number = document.createElement('b');
        number.textContent = String(index + 1).padStart(2, '0');
        const text = document.createElement('span');
        text.textContent = event.text;
        item.append(number, text);
        return item;
      }));
    }

    function render() {
      const budget = Number(budgetInput.value);
      const outcomeCompleteCount = Math.floor(budget / 4);
      const outcomeCompleted = pathNames.slice(0, outcomeCompleteCount);
      const processUsed = Math.min(budget, processEvents.length);
      const processComplete = budget >= processEvents.length;

      setText('#pathBudgetValue', budget);
      setText('#outcomeSelection', outcomeCompleteCount > 0 ? '路径甲' : '尚无完整路径');
      setText('#outcomeCompleted', outcomeCompleted.length ? outcomeCompleted.join('、') : '尚无');
      setText('#outcomeUsed', budget + ' / ' + budget);
      setText('#outcomeReason', outcomeCompleteCount > 1
        ? '所有终局都为 1；按最早完成打破平局'
        : outcomeCompleteCount === 1
          ? '只看见甲的终局 1，无法发现中间错误'
          : '尚未写完一条路径，暂时没有分数');

      setText('#processSelection', processComplete ? '路径乙' : '尚无完整路径');
      setText('#processCompleted', processComplete ? '乙' : '尚无');
      setText('#processUsed', processUsed + ' / ' + budget);
      setText('#processReason', processComplete
        ? '完成高分路径，剩余预算 ' + (budget - processUsed)
        : budget >= 2
          ? '甲已剪枝，正在把预算转给乙'
          : '正在检查甲的前缀');

      renderTrace('#outcomeTrace', outcomeEvents, budget);
      renderTrace('#processTrace', processEvents, processUsed);

      if (budget < 4) {
        setText('#pathObservation', '预算只有 ' + budget
          + '：结果评价尚未完成一条路径；过程评价已在第 2 步看到甲的 .08 并停止继续写错后缀。');
      } else if (budget < 6) {
        setText('#pathObservation', '结果评价完成甲并得到终局 1，因此会接受一条含首错的论证；过程评价已剪掉甲，正在复用剩余预算展开乙。');
      } else if (budget < 8) {
        setText('#pathObservation', '过程评价用 6 个步骤单位完成乙；结果评价在相同预算下只完整看过甲，仍不知道那条证明中间失效。');
      } else if (budget < 12) {
        setText('#pathObservation', '结果评价现在看到了甲、乙两个终局 1，却没有过程信号打破平局；过程评价已在预算 6 完成乙，当前还剩 '
          + (budget - 6) + ' 个步骤单位。');
      } else {
        setText('#pathObservation', '三条完整路径的 Outcome 都是 1，花满 12 单位仍无法按过程质量排序；过程评价在第 6 单位已完成并选择最低步骤分 .93 的乙。');
      }
    }

    budgetInput.addEventListener('input', render);
    const reset = $('#pathReset');
    if (reset) {
      reset.addEventListener('click', () => {
        budgetInput.value = '8';
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
    initPathLab();
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
