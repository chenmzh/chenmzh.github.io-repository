(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter23-a.html?v=1', './chapter23-b.html?v=1', './chapter23-c.html?v=1'];
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

  function initSafetyLab() {
    const actionInput = $('#guiAction');
    const scopeInput = $('#authorizationScope');
    const confirmationInput = $('#confirmationState');
    const resetButton = $('#safetyReset');
    const decisionBox = $('.mrl-gate-result .decision');
    if (![actionInput, scopeInput, confirmationInput, resetButton, decisionBox].every(Boolean)) return;

    const actions = {
      view: {
        label: '查看系统版本', capability: 'read', risk: 'LOW', recovery: '可逆', injection: false
      },
      draft: {
        label: '保存邮件草稿', capability: 'draft', risk: 'MEDIUM', recovery: '可恢复', injection: false
      },
      send: {
        label: '发送指定邮件', capability: 'send', risk: 'HIGH', recovery: '外部副作用', injection: false
      },
      delete: {
        label: '永久删除文件', capability: 'delete', risk: 'CRITICAL', recovery: '不可逆', injection: false
      },
      transfer: {
        label: '确认转账', capability: 'transfer', risk: 'CRITICAL', recovery: '不可逆', injection: false
      },
      injection: {
        label: '按 PDF 指示转发邮件', capability: 'send', risk: 'CRITICAL', recovery: '跨应用外传', injection: true
      }
    };

    const scopeLabels = {
      read: '只读查看',
      draft: '只编辑草稿',
      send: '发送这一封邮件',
      delete: '删除这个文件',
      transfer: '转账这笔金额'
    };

    const setText = (selector, value) => {
      const element = $(selector);
      if (element) element.textContent = value;
    };

    function render() {
      const action = actions[actionInput.value];
      const scope = scopeInput.value;
      const confirmation = confirmationInput.value;
      const inScope = action.capability === scope;
      let decision = 'EXECUTE';
      let decisionClass = 'execute';
      let reason = '低风险或可恢复，并且动作在授权范围内';

      if (action.injection) {
        decision = 'ABORT';
        decisionClass = 'abort';
        reason = '外部 PDF 内容不能扩大用户授权或触发跨应用发信';
      } else if (!inScope) {
        decision = 'ABORT';
        decisionClass = 'abort';
        reason = '动作需要 ' + action.capability + ' 能力，当前授权不包含它';
      } else if (action.risk === 'HIGH' || action.risk === 'CRITICAL') {
        if (confirmation === 'approved') {
          reason = '高风险动作在范围内，且用户已批准这个具体对象与参数';
        } else if (confirmation === 'denied') {
          decision = 'ABORT';
          decisionClass = 'abort';
          reason = '用户明确拒绝，动作不得进入执行器';
        } else {
          decision = 'PAUSE';
          decisionClass = 'pause';
          reason = '高风险动作必须暂停，等待绑定具体动作的确认';
        }
      }

      setText('#riskTier', action.risk);
      setText('#reversibility', action.recovery);
      setText('#scopeResult', inScope && !action.injection ? 'YES' : 'NO');
      setText('#scopeDetail', scopeLabels[scope]);
      setText('#gateDecision', decision);
      setText('#gateReason', reason);
      decisionBox.classList.remove('execute', 'pause', 'abort');
      decisionBox.classList.add(decisionClass);

      if (action.injection) {
        setText('#safetyObservation', '动作格式虽然合法，但来源是 PDF 中的不可信指令；门禁直接返回 ABORT。');
        setText('#safetyInterpretation', '来源内容可以被总结，不能把自身要求升级成用户授权；确认流程也不能替注入内容洗白。');
      } else if (!inScope) {
        setText('#safetyObservation', action.label + '不在“' + scopeLabels[scope] + '”授权内，因此确认状态不会改变 ABORT。');
        setText('#safetyInterpretation', '先检查能力与对象，再讨论风险。用户对另一个动作的授权不能泛化成整个应用的控制权。');
      } else if (decision === 'PAUSE') {
        setText('#safetyObservation', action.label + '在范围内，但风险为 ' + action.risk + '；尚未确认，所以门禁暂停。');
        setText('#safetyInterpretation', '暂停是环境中的真实状态：执行器尚未产生副作用，策略必须等待用户批准、拒绝或超时。');
      } else if (decision === 'ABORT') {
        setText('#safetyObservation', action.label + '原本在授权内，但用户明确拒绝，门禁返回 ABORT。');
        setText('#safetyInterpretation', '负反馈不负责撤销动作；中止发生在执行前，才能保证拒绝没有外部副作用。');
      } else if (action.risk === 'HIGH' || action.risk === 'CRITICAL') {
        setText('#safetyObservation', action.label + '在授权内，并已获得绑定具体动作的批准，因此门禁允许 EXECUTE。');
        setText('#safetyInterpretation', '批准不是永久白名单；收件人、文件或金额变化后必须重新检查范围并再次确认。');
      } else {
        setText('#safetyObservation', action.label + '属于 ' + action.risk + ' 风险且在授权内，门禁允许直接 EXECUTE。');
        setText('#safetyInterpretation', '低风险路径减少不必要打断；执行后仍需读取下一状态，确认动作确实按预期生效。');
      }
    }

    [actionInput, scopeInput, confirmationInput].forEach(input => input.addEventListener('change', render));
    resetButton.addEventListener('click', () => {
      actionInput.value = 'view';
      scopeInput.value = 'read';
      confirmationInput.value = 'pending';
      render();
    });
    render();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initSafetyLab();
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
