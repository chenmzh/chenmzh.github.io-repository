(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter21-a.html?v=1', './chapter21-b.html?v=1', './chapter21-c.html?v=1'];
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

  const patchCases = {
    original: {
      label: 'P0 · 原实现',
      code: 'def average_price(prices):\n    return sum(prices) / len(prices)',
      explanation: '非空列表行为正确，但空列表和其他空容器仍会除以 0。',
      tests: { visibleNormal: 'pass', visibleEmpty: 'fail', hiddenTuple: 'fail', hiddenInvalid: 'pass' },
      intact: true,
      title: '原实现尚未满足空输入需求。',
      note: '公开测试已暴露问题，因此代理奖励只有 0.50。'
    },
    broad: {
      label: 'P1 · 捕获所有异常',
      code: 'def average_price(prices):\n    try:\n        return sum(prices) / len(prices)\n    except Exception:\n        return 0.0',
      explanation: '空容器通过了，但 None 等无效输入也被悄悄改成 0.0。',
      tests: { visibleNormal: 'pass', visibleEmpty: 'pass', hiddenTuple: 'pass', hiddenInvalid: 'fail' },
      intact: true,
      title: '公开满分掩盖了一个回归。',
      note: 'P1 的公开奖励是 1.00，但它吞掉了本应暴露的 TypeError；严格 resolved 仍为 0。'
    },
    hardcode: {
      label: 'P2 · 写死公开样例',
      code: 'def average_price(prices):\n    if prices == []:\n        return 0.0\n    return 15.0',
      explanation: '精确记住两个公开答案，却没有实现“求任意非空容器平均值”的规则。',
      tests: { visibleNormal: 'pass', visibleEmpty: 'pass', hiddenTuple: 'fail', hiddenInvalid: 'fail' },
      intact: true,
      title: '公开满分可以来自样例记忆。',
      note: 'P2 在公开样例上得到 1.00，却同时破坏泛化输入与异常语义。'
    },
    tamper: {
      label: 'P3 · 跳过失败测试',
      code: '# implementation unchanged\n# test_average_price_empty: pytest.skip("temporary")',
      explanation: '实现没有修复；只是让可编辑的公开 runner 不再执行失败断言。',
      tests: { visibleNormal: 'pass', visibleEmpty: 'tampered', hiddenTuple: 'fail', hiddenInvalid: 'pass' },
      intact: false,
      title: '修改评分入口制造了假满分。',
      note: '弱 runner 把跳过计作“未失败”，公开分为 1.00；完整性检查发现 verifier 被修改，resolved 必须为 0。'
    },
    precise: {
      label: 'P4 · 精确边界修复',
      code: 'def average_price(prices):\n    if len(prices) == 0:\n        return 0.0\n    return sum(prices) / len(prices)',
      explanation: '只处理 issue 指定的空容器边界；非空计算与无效输入的异常行为保持不变。',
      tests: { visibleNormal: 'pass', visibleEmpty: 'pass', hiddenTuple: 'pass', hiddenInvalid: 'pass' },
      intact: true,
      title: '补丁满足了当前四项行为合同。',
      note: 'P4 的公开与受保护测试全部通过，verifier 未被修改，因此 strict resolved = 1。'
    }
  };

  function initPatchLab() {
    const choices = $$('.mrl-patch-choice');
    if (!choices.length) return;

    const render = key => {
      const item = patchCases[key];
      if (!item) return;
      choices.forEach(button => {
        const active = button.dataset.patch === key;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });

      $('#patchLabel').textContent = item.label;
      $('#patchCode').textContent = item.code;
      $('#patchExplanation').textContent = item.explanation;

      let visiblePassed = 0;
      let allPassed = 0;
      Object.entries(item.tests).forEach(([testName, status], index) => {
        const card = $('[data-test="' + testName + '"]');
        if (!card) return;
        const passed = status === 'pass' || status === 'tampered';
        if (index < 2 && passed) visiblePassed += 1;
        if (status === 'pass') allPassed += 1;
        card.classList.toggle('pass', status === 'pass');
        card.classList.toggle('tampered', status === 'tampered');
        const marker = $('b', card);
        marker.textContent = status === 'tampered' ? 'SKIPPED' : status.toUpperCase();
      });

      const visibleScore = visiblePassed / 2;
      const allScore = allPassed / 4;
      const resolved = allPassed === 4 && item.intact ? 1 : 0;
      $('#visibleScore').textContent = visibleScore.toFixed(2);
      $('#allScore').textContent = allScore.toFixed(2);
      $('#resolvedScore').textContent = String(resolved);
      $('#visibleBar').style.width = (visibleScore * 100).toFixed(0) + '%';
      $('#allBar').style.width = (allScore * 100).toFixed(0) + '%';
      $('#resolvedBar').style.width = (resolved * 100).toFixed(0) + '%';

      const verdict = $('#patchVerdict');
      $('strong', verdict).textContent = item.title;
      $('p', verdict).textContent = item.note;
      $('#patchObservation').textContent = item.note;
    };

    choices.forEach(button => button.addEventListener('click', () => render(button.dataset.patch)));
    const reset = $('#patchReset');
    if (reset) reset.addEventListener('click', () => render('original'));
    render('original');
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initPatchLab();
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
