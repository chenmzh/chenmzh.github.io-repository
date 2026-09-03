(() => {
  const isZh = document.documentElement.lang.toLowerCase().startsWith('zh');
  const t = (zh, en) => isZh ? zh : en;
  const updated = '2026-09-04';

  const milestones = [
    {
      phase: t('研究准备', 'Research setup'),
      status: 'completed',
      date: '2026-09-03',
      work: t('核验 2026 比赛任务、数据格式、六项指标、赛程和提交规则。', 'Verified the 2026 task, data format, six metrics, timeline, and submission rules.'),
      evidence: t('官方页面、Rules、FAQ、VCC CLI 与 cell-eval2 文档交叉核验。', 'Cross-checked the official site, Rules, FAQ, VCC CLI, and cell-eval2 documentation.')
    },
    {
      phase: t('学习路线', 'Learning roadmap'),
      status: 'completed',
      date: '2026-09-03',
      work: t('制定面向 Intro ML 与基础统计背景的八周项目制学习计划。', 'Designed an eight-week project-based plan for an Intro ML and basic statistics background.'),
      evidence: t('学习路线已发布在本页。', 'The roadmap is published on this page.')
    },
    {
      phase: t('第 0 周', 'Week 0'),
      status: 'planned',
      date: '—',
      work: t('搭建 Python 3.11、AnnData、Scanpy、cell-eval2 与 vcc-cli 环境。', 'Set up Python 3.11, AnnData, Scanpy, cell-eval2, and vcc-cli.'),
      evidence: t('完成数据结构检查 notebook。', 'Complete a data-inspection notebook.')
    },
    {
      phase: t('第 1–2 周', 'Weeks 1–2'),
      status: 'planned',
      date: '—',
      work: t('学习 scRNA-seq、CRISPRi、Perturb-seq、pseudobulk、logFC 和差异表达。', 'Learn scRNA-seq, CRISPRi, Perturb-seq, pseudobulk, logFC, and differential expression.'),
      evidence: t('从公开数据计算一个完整扰动 signature。', 'Compute a complete perturbation signature from public data.')
    },
    {
      phase: t('第 3–4 周', 'Weeks 3–4'),
      status: 'planned',
      date: '—',
      work: t('建立三个统计基线，并完成跨细胞系与跨扰动验证。', 'Build three statistical baselines and complete cross-context and cross-perturbation validation.'),
      evidence: t('生成六指标基线对比表。', 'Produce a six-metric baseline comparison table.')
    },
    {
      phase: t('第 5–6 周', 'Weeks 5–6'),
      status: 'planned',
      date: '—',
      work: t('实现 context-weighted transfer，并生成保留异质性的 400 个单细胞 counts。', 'Implement context-weighted transfer and generate 400 heterogeneous single-cell count profiles.'),
      evidence: t('通过本地格式、分布和指标测试。', 'Pass local format, distribution, and metric tests.')
    },
    {
      phase: t('第 7–8 周', 'Weeks 7–8'),
      status: 'planned',
      date: '—',
      work: t('评估预训练模型、完成保守集成并跑通 .vcc 提交流水线。', 'Evaluate pretrained models, build a conservative ensemble, and complete the .vcc submission pipeline.'),
      evidence: t('生成可复现的候选提交。', 'Generate a reproducible candidate submission.')
    }
  ];

  const tests = [
    {
      name: t('规则与指标核验', 'Rules and metrics audit'),
      status: 'passed',
      result: t('2026 规则已与旧版 2025 页面区分；关键参数已交叉核对。', 'The 2026 rules are separated from legacy 2025 pages and key parameters are cross-checked.'),
      next: t('下载登录后可见的正式数据 bundle。', 'Download the authenticated official data bundle.')
    },
    {
      name: t('双语项目页面', 'Bilingual project page'),
      status: 'passed',
      result: t('Challenge 入口、Virtual Cell 项目主页、独立学习子页面和共享进度记录已建立。', 'The Challenge field, Virtual Cell project home, dedicated learning subpage, and shared progress log are in place.'),
      next: t('每次实验后更新本记录。', 'Update this log after every experiment.')
    },
    {
      name: t('第一周双语教学包', 'Bilingual Week 1 teaching pack'),
      status: 'passed',
      result: t('环境、toy 数据、QC、pseudobulk、学生/教师 notebook 与 5 项自动测试已就绪。', 'Environment, toy data, QC, pseudobulk, student/teacher notebooks, and five automated tests are ready.'),
      next: t('完成第一周作业后，把个人学习状态更新为已完成。', 'Mark personal learning complete after finishing the Week 1 assignments.')
    },
    {
      name: t('官方数据下载', 'Official data download'),
      status: 'not-started',
      result: t('尚未下载 A/B/C controls 与 perturbation list。', 'A/B/C controls and the perturbation list have not been downloaded yet.'),
      next: t('完成账户认证并使用 vcc datasets download。', 'Authenticate and run vcc datasets download.')
    },
    {
      name: t('端到端样例提交', 'End-to-end sample submission'),
      status: 'not-started',
      result: t('尚未生成并提交合法的随机/控制基线 .vcc。', 'A valid random/control baseline .vcc has not yet been generated or submitted.'),
      next: t('先用 vcc sample 验证上传和评分通路。', 'Use vcc sample to verify the upload and scoring path.')
    }
  ];

  const statusText = {
    completed: t('已完成', 'Completed'),
    'in-progress': t('进行中', 'In progress'),
    planned: t('计划中', 'Planned'),
    passed: t('通过', 'Passed'),
    'not-started': t('未开始', 'Not started')
  };

  const esc = (value) => String(value).replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
  const badge = (status) => `<span class="challenge-status challenge-status--${status}">${esc(statusText[status])}</span>`;

  const progressRoot = document.querySelector('[data-progress]');
  if (progressRoot) {
    progressRoot.innerHTML = milestones.map(item => `<tr>
      <td>${esc(item.phase)}</td>
      <td>${badge(item.status)}</td>
      <td>${esc(item.date)}</td>
      <td>${esc(item.work)}</td>
      <td>${esc(item.evidence)}</td>
    </tr>`).join('');
  }

  const testsRoot = document.querySelector('[data-tests]');
  if (testsRoot) {
    testsRoot.innerHTML = tests.map(item => `<tr>
      <td>${esc(item.name)}</td>
      <td>${badge(item.status)}</td>
      <td>${esc(item.result)}</td>
      <td>${esc(item.next)}</td>
    </tr>`).join('');
  }

  document.querySelectorAll('[data-progress-updated]').forEach(node => {
    node.textContent = `${t('最后更新', 'Last updated')}: ${updated}`;
  });
})();
