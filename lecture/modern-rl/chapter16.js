(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const GROUPS = {
    mixed: [
      { text: '合并后得到 \\boxed{7/8}', truth: true },
      { text: '小数形式 \\boxed{0.875}', truth: true },
      { text: '计算结果 \\boxed{9/8}', truth: false },
      { text: '先猜 7/8；复核后最终答案 \\boxed{9/8}', truth: false }
    ],
    'all-correct': [
      { text: '最简分数 \\boxed{7/8}', truth: true },
      { text: '小数形式 \\boxed{0.875}', truth: true },
      { text: '等价分数 \\boxed{14/16}', truth: true },
      { text: '补零写法 \\boxed{0.8750}', truth: true }
    ],
    'all-wrong': [
      { text: '计算结果 \\boxed{5/8}', truth: false },
      { text: '计算结果 \\boxed{9/8}', truth: false },
      { text: '小数结果 \\boxed{1.0}', truth: false },
      { text: '先猜 7/8；复核后最终答案 \\boxed{9/8}', truth: false }
    ]
  };

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter16-a.html?v=1', './chapter16-b.html?v=1', './chapter16-c.html?v=1'];
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

  function extractFinalAnswer(text) {
    const matches = Array.from(text.matchAll(/\\boxed\{([^}]*)\}/g));
    return matches.length ? matches[matches.length - 1][1].trim() : null;
  }

  function extractFirstNumber(text) {
    const match = text.match(/[+-]?\d+\s*\/\s*[+-]?\d+|[+-]?\d+(?:\.\d+)?/);
    return match ? match[0].replace(/\s+/g, '') : null;
  }

  function numericValue(answer) {
    if (answer === null) return null;
    const normalized = answer.replace(/\s+/g, '');
    if (/^[+-]?\d+\/[+-]?\d+$/.test(normalized)) {
      const parts = normalized.split('/').map(Number);
      if (parts[1] === 0) return null;
      return parts[0] / parts[1];
    }
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }

  function gradeResponse(item, mode) {
    let extracted;
    let accepted;
    if (mode === 'first-number') {
      extracted = extractFirstNumber(item.text);
      const value = numericValue(extracted);
      accepted = value !== null && Math.abs(value - 0.875) < 1e-9;
    } else {
      extracted = extractFinalAnswer(item.text);
      if (mode === 'exact') {
        accepted = extracted !== null && extracted.replace(/\s+/g, '') === '7/8';
      } else {
        const value = numericValue(extracted);
        accepted = value !== null && Math.abs(value - 0.875) < 1e-9;
      }
    }
    return { extracted: extracted ?? '未提取', reward: accepted ? 1 : 0 };
  }

  function formatAdvantage(value) {
    if (Math.abs(value) < 0.0005) return '0.000';
    return value > 0 ? '+' + value.toFixed(3) : '−' + Math.abs(value).toFixed(3);
  }

  function makeCell(text, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function initVerifierLab() {
    const presetInput = $('#groupPreset');
    const modeInput = $('#verifierMode');
    const rows = $('#verifierRows');
    if (!presetInput || !modeInput || !rows) return;

    function render() {
      const group = GROUPS[presetInput.value];
      if (!group) throw new Error('Unknown group preset: ' + presetInput.value);
      const graded = group.map(item => ({ ...item, ...gradeResponse(item, modeInput.value) }));
      const rewards = graded.map(item => item.reward);
      const mean = rewards.reduce((sum, reward) => sum + reward, 0) / rewards.length;
      const variance = rewards.reduce((sum, reward) => sum + (reward - mean) ** 2, 0) / rewards.length;
      const std = Math.sqrt(variance);
      const advantages = std < 1e-8
        ? rewards.map(() => 0)
        : rewards.map(reward => (reward - mean) / std);
      const maxMagnitude = Math.max(1, ...advantages.map(Math.abs));

      let falsePositives = 0;
      let falseNegatives = 0;
      rows.replaceChildren();
      graded.forEach((item, index) => {
        if (item.reward === 1 && !item.truth) falsePositives += 1;
        if (item.reward === 0 && item.truth) falseNegatives += 1;

        const row = document.createElement('tr');
        row.append(makeCell('y' + (index + 1)));
        const responseCell = makeCell('');
        const code = document.createElement('code');
        code.textContent = item.text;
        responseCell.append(code);
        row.append(responseCell);
        row.append(makeCell(item.truth ? '正确' : '错误', item.truth ? 'truth-pass' : 'truth-fail'));
        const extractedCell = makeCell('');
        const extractedCode = document.createElement('code');
        extractedCode.textContent = item.extracted;
        extractedCell.append(extractedCode);
        row.append(extractedCell);
        row.append(makeCell(String(item.reward)));
        row.append(makeCell(formatAdvantage(advantages[index])));

        const barCell = makeCell('');
        const bar = document.createElement('span');
        const value = advantages[index];
        bar.className = 'mrl-adv-bar ' + (value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero');
        bar.style.setProperty('--bar-size', (Math.abs(value) / maxMagnitude * 100).toFixed(1) + '%');
        bar.setAttribute('aria-label', '优势 ' + formatAdvantage(value));
        barCell.append(bar);
        row.append(barCell);
        rows.append(row);
      });

      const labelErrors = falsePositives + falseNegatives;
      const activeAdvantages = advantages.filter(value => Math.abs(value) >= 1e-8).length;
      $('#groupMeanValue').textContent = mean.toFixed(3);
      $('#groupStdValue').textContent = std.toFixed(3);
      $('#labelErrorValue').textContent = String(labelErrors);
      $('#activeAdvValue').textContent = activeAdvantages + ' / ' + advantages.length;

      const observation = $('#verifierObservation');
      if (!observation) return;
      const rewardText = '[' + rewards.join(', ') + ']';
      const advantageText = '[' + advantages.map(formatAdvantage).join(', ') + ']';
      let message = '当前 verifier 得到 reward ' + rewardText + '，组均值 '
        + mean.toFixed(3) + '、标准差 ' + std.toFixed(3) + '，优势为 ' + advantageText + '。';
      if (labelErrors > 0) {
        message += ' 相对人工真值出现 ' + falsePositives + ' 个假阳性、'
          + falseNegatives + ' 个假阴性；这些误判已经进入组统计量。';
      } else {
        message += ' 当前没有相对人工真值的 label error。';
      }
      if (std < 1e-8) {
        const semantic = group.every(item => item.truth) ? '四条都正确' : group.every(item => !item.truth) ? '四条都错误' : 'verifier 把四条压成同分';
        message += ' 因为 ' + semantic + ' 且 reward 全同，组内没有相对方向，整组优势置 0。';
      } else if (falsePositives > 0) {
        message += ' 错误回答被赋正优势时，策略会忠实地提高它的概率。';
      } else if (falseNegatives > 0) {
        message += ' 正确等价表示被赋负优势时，策略会被错误地推离它。';
      }
      observation.textContent = message;
    }

    presetInput.addEventListener('change', render);
    modeInput.addEventListener('change', render);
    const reset = $('#verifierReset');
    if (reset) {
      reset.addEventListener('click', () => {
        presetInput.value = 'mixed';
        modeInput.value = 'equivalent';
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
    initVerifierLab();
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
