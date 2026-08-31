(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadChapter() {
    const host = $('#chapterContent');
    if (!host) return false;
    const files = ['./chapter19-a.html?v=1', './chapter19-b.html?v=1', './chapter19-c.html?v=1'];
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

  function initPipelineLab() {
    const inputs = {
      rolloutRate: $('#rolloutRate'),
      trainRate: $('#trainRate'),
      rewardTime: $('#rewardTime'),
      syncTime: $('#syncTime'),
      queueDepth: $('#queueDepth'),
      currentProb: $('#currentProb')
    };
    if (!Object.values(inputs).every(Boolean)) return;

    const workloadTokens = 512 * 2048;
    const behaviorProbability = 0.20;
    const defaults = {
      rolloutRate: 24000,
      trainRate: 80000,
      rewardTime: 4,
      syncTime: 3,
      queueDepth: 2,
      currentProb: 0.10
    };

    const presets = {
      train: { ...defaults, trainRate: 160000 },
      rollout: { ...defaults, rolloutRate: 48000 },
      queue: { ...defaults, queueDepth: 8 }
    };

    function setText(selector, value) {
      const element = $(selector);
      if (element) element.textContent = value;
    }

    function readValues() {
      return Object.fromEntries(
        Object.entries(inputs).map(entry => [entry[0], Number(entry[1].value)])
      );
    }

    function setValues(values) {
      Object.entries(values).forEach(entry => {
        inputs[entry[0]].value = String(entry[1]);
      });
    }

    function seconds(value) {
      return value.toFixed(1) + ' s';
    }

    function tokenRate(value) {
      return (value / 1000).toFixed(1) + 'k tok/s';
    }

    function percent(value) {
      return (value * 100).toFixed(1) + '%';
    }

    function render() {
      const value = readValues();
      const rolloutTime = workloadTokens / value.rolloutRate;
      const trainTime = workloadTokens / value.trainRate;
      const rolloutStage = rolloutTime + value.syncTime;
      const stages = [
        { label: 'Rollout', time: rolloutStage },
        { label: 'Reward', time: value.rewardTime },
        { label: 'Training', time: trainTime }
      ];
      const bottleneck = stages.reduce((largest, stage) => stage.time > largest.time ? stage : largest);
      const serialStep = rolloutTime + value.rewardTime + trainTime + value.syncTime;
      const asyncCadence = bottleneck.time;
      const overlapSpeedup = serialStep / asyncCadence;
      const systemThroughput = workloadTokens / asyncCadence;
      const rolloutUtilization = Math.min(1, rolloutTime / asyncCadence);
      const trainUtilization = Math.min(1, trainTime / asyncCadence);
      const syncLag = value.syncTime === 0 ? 0 : Math.ceil(value.syncTime / trainTime);
      const policyLag = value.queueDepth + syncLag;
      const importanceRatio = value.currentProb / behaviorProbability;

      setText('#rolloutRateValue', tokenRate(value.rolloutRate));
      setText('#trainRateValue', tokenRate(value.trainRate));
      setText('#rewardTimeValue', seconds(value.rewardTime));
      setText('#syncTimeValue', seconds(value.syncTime));
      setText('#queueDepthValue', value.queueDepth + (value.queueDepth === 1 ? ' batch' : ' batches'));
      setText('#currentProbValue', value.currentProb.toFixed(2));

      setText('#rolloutStageValue', seconds(rolloutStage));
      setText('#rewardStageValue', seconds(value.rewardTime));
      setText('#trainStageValue', seconds(trainTime));
      setText('#serialStepValue', seconds(serialStep));
      setText('#asyncCadenceValue', seconds(asyncCadence));
      setText('#bottleneckValue', bottleneck.label);
      setText('#speedupValue', '重叠上界 ' + overlapSpeedup.toFixed(2) + '×');
      setText('#systemThroughputValue', tokenRate(systemThroughput));
      setText('#utilizationValue', 'R ' + percent(rolloutUtilization) + ' · T ' + percent(trainUtilization));
      setText('#stalenessValue', 'Δv ≈ ' + policyLag);
      setText('#ratioValue', 'ρ = ' + importanceRatio.toFixed(2) + '（旧概率 0.20）');

      const maximumStage = Math.max(1, ...stages.map(stage => stage.time));
      const barValues = [
        ['#rolloutStageBar', rolloutStage],
        ['#rewardStageBar', value.rewardTime],
        ['#trainStageBar', trainTime]
      ];
      barValues.forEach(entry => {
        const bar = $(entry[0]);
        if (bar) bar.style.width = (entry[1] / maximumStage * 100).toFixed(1) + '%';
      });

      const doubledTrainingCadence = Math.max(rolloutStage, value.rewardTime, trainTime / 2);
      const doubledRolloutCadence = Math.max(rolloutTime / 2 + value.syncTime, value.rewardTime, trainTime);
      const trainingGain = (1 - doubledTrainingCadence / asyncCadence) * 100;
      const rolloutGain = (1 - doubledRolloutCadence / asyncCadence) * 100;
      const freshness = importanceRatio < 0.67 || importanceRatio > 1.5
        ? '动作概率比已明显偏离 1，应结合版本阈值决定降权、丢弃或重采。'
        : '动作概率比仍靠近 1，但仍需检查整条轨迹的比率分布。';

      setText('#pipelineObservation',
        '当前瓶颈是 ' + bottleneck.label + '（' + seconds(asyncCadence) + '）。'
        + '只把 training 吞吐再翻倍，理想批次间隔改善 ' + Math.max(0, trainingGain).toFixed(1) + '%；'
        + '只把 rollout 吞吐翻倍，改善 ' + Math.max(0, rolloutGain).toFixed(1) + '%。'
        + '课堂近似的版本差为 Δv≈' + policyLag + '；' + freshness
      );
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', render));
    $$('[data-pipeline-preset]').forEach(button => {
      button.addEventListener('click', () => {
        setValues(presets[button.dataset.pipelinePreset]);
        render();
      });
    });
    const reset = $('#pipelineReset');
    if (reset) {
      reset.addEventListener('click', () => {
        setValues(defaults);
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
    initPipelineLab();
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
