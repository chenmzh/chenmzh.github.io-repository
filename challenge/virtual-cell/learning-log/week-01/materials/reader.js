(() => {
  'use strict';

  const docs = {
    'quickstart-zh': {
      lang: 'zh', pair: 'quickstart-en', title: '快速开始与数据契约',
      summary: '从环境安装开始，理解教学包结构、toy 数据契约和本周通过标准。',
      source: '../files/README.zh-CN.md'
    },
    'teacher-zh': {
      lang: 'zh', pair: 'teacher-en', title: '第一周教师讲义',
      summary: '五天教学主线、课堂提问、实践产出、Exit ticket 与常见概念纠正。',
      source: '../files/teacher-notes.zh-CN.md'
    },
    'exercises-zh': {
      lang: 'zh', pair: 'exercises-en', title: '第一周练习',
      summary: '十道概念题、八项编程任务以及需要提交的课程产物。',
      source: '../files/exercises/exercises.zh-CN.md'
    },
    'answers-zh': {
      lang: 'zh', pair: 'answers-en', title: '第一周参考答案',
      summary: '概念题答案、编程验收要求和 toy 数据中的预期响应方向。',
      source: '../files/exercises/answers.zh-CN.md'
    },
    'quickstart-en': {
      lang: 'en', pair: 'quickstart-zh', title: 'Quick Start & Data Contract',
      summary: 'Begin with environment setup, then understand the package structure, toy-data contract, and passing criteria.',
      source: '../files/README.en.md'
    },
    'teacher-en': {
      lang: 'en', pair: 'teacher-zh', title: 'Week 1 Instructor Notes',
      summary: 'A five-day teaching thread with instructor questions, practical outputs, exit tickets, and conceptual corrections.',
      source: '../files/teacher-notes.en.md'
    },
    'exercises-en': {
      lang: 'en', pair: 'exercises-zh', title: 'Week 1 Exercises',
      summary: 'Ten concept questions, eight coding tasks, and the required course deliverables.',
      source: '../files/exercises/exercises.en.md'
    },
    'answers-en': {
      lang: 'en', pair: 'answers-zh', title: 'Week 1 Reference Answers',
      summary: 'Concept answers, coding acceptance criteria, and expected response directions in the toy data.',
      source: '../files/exercises/answers.en.md'
    }
  };

  const labels = {
    zh: {
      pageTitle: '第一周学习资料', back: '← 返回第一周课程', nav: '第一周资料',
      quickstart: '快速开始', teacher: '教师讲义', exercises: '练习', answers: '参考答案',
      source: '下载原始 Markdown', package: '下载完整教学包', loading: '正在渲染讲义，请稍候……',
      error: '讲义载入失败，请返回课程页下载原始文件。', footer: '在线学习资料', kicker: 'Week 01 / Learning material'
    },
    en: {
      pageTitle: 'Week 1 Learning Materials', back: '← Back to Week 1 Course', nav: 'Week 1 materials',
      quickstart: 'Quick start', teacher: 'Instructor notes', exercises: 'Exercises', answers: 'Reference answers',
      source: 'Download source Markdown', package: 'Download complete pack', loading: 'Rendering the material…',
      error: 'The material could not be loaded. Return to the course page to download the source file.', footer: 'Online learning materials', kicker: 'Week 01 / Learning material'
    }
  };

  const params = new URLSearchParams(window.location.search);
  const requested = params.get('doc');
  const key = Object.hasOwn(docs, requested) ? requested : 'quickstart-zh';
  const config = docs[key];
  const text = labels[config.lang];
  const isZh = config.lang === 'zh';

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const inline = (value) => {
    const code = [];
    let output = escapeHtml(value).replace(/`([^`]+)`/g, (_, body) => {
      const token = `@@INLINECODE${code.length}@@`;
      code.push(`<code>${body}</code>`);
      return token;
    });
    output = output.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    output = output.replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    output = output.replace(/&lt;(https?:\/\/[^&\s]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    code.forEach((snippet, index) => { output = output.replace(`@@INLINECODE${index}@@`, snippet); });
    return output;
  };

  const renderMarkdown = (markdown) => {
    const lines = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
    const html = [];
    let paragraph = [];
    let list = null;
    let inCode = false;
    let codeLanguage = '';
    let codeLines = [];
    let headingIndex = 0;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      html.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    };
    const closeList = () => {
      if (!list) return;
      html.push(`</${list}>`);
      list = null;
    };
    const openList = (type) => {
      if (list === type) return;
      closeList();
      html.push(`<${type}>`);
      list = type;
    };

    for (const line of lines) {
      const fence = line.match(/^```\s*([\w+-]*)\s*$/);
      if (inCode) {
        if (fence) {
          const languageClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : '';
          html.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
          inCode = false;
          codeLanguage = '';
          codeLines = [];
        } else {
          codeLines.push(line);
        }
        continue;
      }
      if (fence) {
        flushParagraph();
        closeList();
        inCode = true;
        codeLanguage = fence[1] || '';
        continue;
      }
      if (!line.trim()) {
        flushParagraph();
        closeList();
        continue;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        headingIndex += 1;
        const level = heading[1].length;
        if (level === 1 && headingIndex === 1) continue;
        html.push(`<h${level} id="section-${headingIndex}">${inline(heading[2])}</h${level}>`);
        continue;
      }

      const unordered = line.match(/^\s*[-*]\s+(.+)$/);
      if (unordered) {
        flushParagraph();
        openList('ul');
        html.push(`<li>${inline(unordered[1])}</li>`);
        continue;
      }
      const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (ordered) {
        flushParagraph();
        openList('ol');
        html.push(`<li>${inline(ordered[1])}</li>`);
        continue;
      }

      closeList();
      paragraph.push(line.trim());
    }

    flushParagraph();
    closeList();
    if (inCode) html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    return html.join('\n');
  };

  document.documentElement.lang = isZh ? 'zh-CN' : 'en';
  document.title = `${config.title} · Virtual Cell Challenge`;
  document.querySelector('[data-title]').textContent = config.title;
  document.querySelector('[data-summary]').textContent = config.summary;
  document.querySelector('[data-kicker]').textContent = text.kicker;
  document.querySelector('[data-nav-label]').textContent = text.nav;
  document.querySelector('[data-footer]').textContent = text.footer;
  document.querySelector('[data-back]').textContent = text.back;
  document.querySelector('[data-back]').href = isZh ? '../' : '../en/';
  document.querySelector('[data-source]').textContent = text.source;
  document.querySelector('[data-source]').href = config.source;
  document.querySelector('[data-package]').textContent = text.package;

  const navItems = [
    ['quickstart', text.quickstart], ['teacher', text.teacher],
    ['exercises', text.exercises], ['answers', text.answers]
  ];
  document.querySelector('[data-material-nav]').innerHTML = navItems.map(([name, label]) => {
    const navKey = `${name}-${config.lang}`;
    const current = navKey === key ? ' aria-current="page"' : '';
    return `<a href="?doc=${navKey}"${current}>${escapeHtml(label)}</a>`;
  }).join('');

  document.querySelectorAll('[data-language]').forEach(link => {
    const targetLang = link.dataset.language;
    link.setAttribute('aria-current', targetLang === config.lang ? 'page' : 'false');
    link.href = targetLang === config.lang ? `?doc=${key}` : `?doc=${config.pair}`;
  });

  const body = document.querySelector('#material-body');
  document.querySelector('[data-loading]').textContent = text.loading;
  fetch(config.source)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(markdown => {
      body.innerHTML = renderMarkdown(markdown);
      body.focus({ preventScroll: true });
    })
    .catch(error => {
      console.error('Material load failed:', error);
      body.innerHTML = `<div class="challenge-callout"><p><strong>${escapeHtml(text.error)}</strong></p></div>`;
    });
})();
