(() => {
  'use strict';

  if (typeof document === 'undefined') return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter24-a.html?v=1', './chapter24-b.html?v=1', './chapter24-c.html?v=1'];

    try {
      const responses = await Promise.all(files.map(url => fetch(url, { cache: 'no-cache' })));
      const bad = responses.find(response => !response.ok);
      if (bad) throw new Error(`HTTP ${bad.status}`);
      const parts = await Promise.all(responses.map(response => response.text()));
      host.innerHTML = parts.join('\n');
      return true;
    } catch (error) {
      host.innerHTML = `
        <section class="mrl-chapter-hero">
          <div class="mrl-eyebrow">Chapter load error</div>
          <h1>章节内容没有加载成功</h1>
          <p class="lead">请刷新页面。如果问题持续存在，可以从课程目录重新进入。</p>
          <p class="mrl-small">${String(error)}</p>
        </section>`;
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
      links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
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
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const percent = Math.min(100, Math.max(0, window.scrollY / max * 100));
      progress.style.width = `${percent.toFixed(1)}%`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  function initGroundingLab() {
    const lab = $('#groundingLab');
    const schemeSelect = $('#rewardScheme');
    const resetButton = $('#resetGrounding');
    const candidateButtons = $$('#candidateButtons button');
    const shapes = $$('.mrl-shape-board [data-shape-id]');
    const candidateLabel = $('#candidateLabel');
    const candidateOutput = $('#candidateOutput');
    const observation = $('#labObservation');
    const interpretation = $('#labInterpretation');
    const totalReward = $('#totalReward');
    const weightReadout = $('#weightReadout');
    const scoreNodes = {
      format: $('#formatScore'),
      answer: $('#answerScore'),
      ground: $('#groundScore')
    };
    const barNodes = {
      format: $('#formatBar'),
      answer: $('#answerBar'),
      ground: $('#groundBar')
    };

    const required = [
      lab, schemeSelect, resetButton, candidateLabel, candidateOutput,
      observation, interpretation, totalReward, weightReadout,
      ...Object.values(scoreNodes), ...Object.values(barNodes)
    ];
    if (!required.every(Boolean) || candidateButtons.length !== 4 || shapes.length !== 6) return;

    const candidates = {
      A: {
        output: '<evidence>[c1, c2, c3]</evidence>\n<reason>逐个标记蓝色圆形</reason>\n<answer>3</answer>',
        scores: { format: 1, answer: 1, ground: 1 },
        evidence: ['c1', 'c2', 'c3'],
        description: '答案与三处视觉证据都正确'
      },
      B: {
        output: '<evidence>[c1, c2]</evidence>\n<reason>看到了三个蓝色圆形</reason>\n<answer>3</answer>',
        scores: { format: 1, answer: 1, ground: 2 / 3 },
        evidence: ['c1', 'c2'],
        description: '答案正确，但漏掉了 c3 的证据'
      },
      C: {
        output: '<evidence>[c1, c2, c3]</evidence>\n<reason>三处证据已标记</reason>\n<answer>2</answer>',
        scores: { format: 1, answer: 0, ground: 1 },
        evidence: ['c1', 'c2', 'c3'],
        description: '证据定位正确，最终计数却写错'
      },
      D: {
        output: '3',
        scores: { format: 0, answer: 1, ground: 0 },
        evidence: [],
        description: '猜中答案，但没有可核验的视觉证据'
      }
    };

    const schemes = {
      answer: {
        label: '仅答案',
        weights: { format: 0, answer: 1, ground: 0 }
      },
      'format-answer': {
        label: '格式 + 答案',
        weights: { format: 0.2, answer: 0.8, ground: 0 }
      },
      multimodal: {
        label: '三项多模态',
        weights: { format: 0.15, answer: 0.45, ground: 0.4 }
      }
    };

    let candidateId = 'D';

    function formatWeight(value) {
      return Number(value.toFixed(2)).toString();
    }

    function describe(candidate, scheme, total) {
      if (schemeSelect.value === 'answer') {
        if (candidateId === 'A' || candidateId === 'D') {
          observation.textContent = `响应 ${candidateId} 的答案为 3，所以“仅答案”给出 ${total.toFixed(3)}。A 与 D 在这个方案下完全同分。`;
          interpretation.textContent = 'Outcome verifier 只看最终数值：A 的完整证据没有得到额外信用，D 的无证据猜测也没有受到惩罚。';
        } else if (candidateId === 'B') {
          observation.textContent = `响应 B 漏掉一处证据，但答案仍为 3；“仅答案”给出 ${total.toFixed(3)}。`;
          interpretation.textContent = '只核对答案时，证据覆盖从 1 降到 2/3 不会改变训练信号。';
        } else {
          observation.textContent = '响应 C 找全三处证据，但最终答案写成 2；“仅答案”给出 0.000。';
          interpretation.textContent = '答案 verifier 发现了 outcome 错误，却无法记录“视觉定位其实正确”这一部分能力。';
        }
        return;
      }

      if (schemeSelect.value === 'format-answer') {
        observation.textContent = `响应 ${candidateId}：${candidate.description}。加入格式分后的总奖励为 ${total.toFixed(3)}，视觉证据仍没有权重。`;
        interpretation.textContent = candidateId === 'D'
          ? '格式项能惩罚不可解析的裸答案，但仍无法区分“格式正确却证据错误”的响应。'
          : '可解析性已经进入信号，但 evidence 是否来自正确像素仍未被测量。';
        return;
      }

      observation.textContent = `响应 ${candidateId}：${candidate.description}。三项多模态奖励为 ${total.toFixed(3)}。`;
      if (candidateId === 'A') {
        interpretation.textContent = '答案、格式和三处证据同时成立，因此三项分都为 1；这是当前 verifier 定义下最完整的成功。';
      } else if (candidateId === 'B') {
        interpretation.textContent = '漏掉 c3 让 grounding 从 1 降到 2/3；答案相同，但证据不完整终于会降低总奖励。';
      } else if (candidateId === 'C') {
        interpretation.textContent = 'grounding 为 1、answer 为 0 把“看对但算错”显式分开，便于定位后续推理缺口。';
      } else {
        interpretation.textContent = 'D 只保留答案项的 0.45；无格式、无证据不再能与完整响应 A 同分。';
      }
    }

    function render() {
      const candidate = candidates[candidateId];
      const scheme = schemes[schemeSelect.value];
      if (!candidate || !scheme) return;

      candidateButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.candidate === candidateId));
      });
      candidateLabel.textContent = `Response ${candidateId}`;
      candidateOutput.textContent = candidate.output;

      shapes.forEach(shape => {
        shape.classList.toggle('is-evidence', candidate.evidence.includes(shape.dataset.shapeId));
      });

      for (const key of ['format', 'answer', 'ground']) {
        const value = candidate.scores[key];
        scoreNodes[key].textContent = value.toFixed(2);
        barNodes[key].style.width = `${(value * 100).toFixed(1)}%`;
      }

      const weights = scheme.weights;
      const total = ['format', 'answer', 'ground']
        .reduce((sum, key) => sum + weights[key] * candidate.scores[key], 0);
      totalReward.textContent = total.toFixed(3);
      weightReadout.textContent = [
        `${formatWeight(weights.format)} × format`,
        `${formatWeight(weights.answer)} × answer`,
        `${formatWeight(weights.ground)} × grounding`
      ].join(' + ');
      describe(candidate, scheme, total);
    }

    candidateButtons.forEach(button => {
      button.addEventListener('click', () => {
        candidateId = button.dataset.candidate;
        render();
      });
    });
    schemeSelect.addEventListener('change', render);
    resetButton.addEventListener('click', () => {
      candidateId = 'D';
      schemeSelect.value = 'answer';
      render();
    });
    render();
  }

  async function boot() {
    const loaded = await loadChapter();
    if (!loaded) return;
    initMath();
    initToc();
    initGroundingLab();
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
