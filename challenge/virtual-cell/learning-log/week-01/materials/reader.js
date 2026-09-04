(() => {
  'use strict';

  // Allow-list every document the reader may fetch. Query parameters never
  // become arbitrary file paths, which keeps the reader same-origin and safe.
  // 仅允许读取白名单中的课程文件，URL 参数不能变成任意文件路径。
  const docs = {
    'quickstart-zh': {
      lang: 'zh', pair: 'quickstart-en', title: '快速开始与数据契约',
      summary: '从环境安装开始，理解教学包结构、toy 数据契约和本周通过标准。',
      source: '../files/README.zh-CN.md'
    },
    'teacher-zh': {
      lang: 'zh', pair: 'teacher-en', title: '第一周教师讲义',
      summary: '从 RNA 测量链、AnnData 和数据尺度，到实验单位、QC、pseudobulk 与防泄漏验证的五天详细讲授。',
      source: '../files/teacher-notes.zh-CN.md'
    },
    'practice-zh': {
      lang: 'zh', pair: 'practice-en', title: '第一周练习与参考答案',
      summary: '先独立作答，再按需展开提示、参考答案、示例代码与评分要点。',
      source: '../files/exercises/practice.zh-CN.md'
    },
    'quickstart-en': {
      lang: 'en', pair: 'quickstart-zh', title: 'Quick Start & Data Contract',
      summary: 'Begin with environment setup, then understand the package structure, toy-data contract, and passing criteria.',
      source: '../files/README.en.md'
    },
    'teacher-en': {
      lang: 'en', pair: 'teacher-zh', title: 'Week 1 Instructor Notes',
      summary: 'Five detailed lessons from the RNA measurement chain and AnnData to experimental units, QC, pseudobulk, and leakage-aware validation.',
      source: '../files/teacher-notes.en.md'
    },
    'practice-en': {
      lang: 'en', pair: 'practice-zh', title: 'Week 1 Exercises & Reference Answers',
      summary: 'Answer independently, then expand hints, reference answers, example code, and grading points as needed.',
      source: '../files/exercises/practice.en.md'
    }
  };

  const labels = {
    zh: {
      pageTitle: '第一周学习资料', back: '← 返回第一周课程', nav: '第一周资料',
      quickstart: '快速开始', teacher: '教师讲义', practice: '练习与答案',
      source: '下载原始 Markdown', package: '下载完整教学包', loading: '正在渲染讲义，请稍候……',
      error: '讲义载入失败，请返回课程页下载原始文件。', footer: '在线学习资料', kicker: 'Week 01 / Learning material'
    },
    en: {
      pageTitle: 'Week 1 Learning Materials', back: '← Back to Week 1 Course', nav: 'Week 1 materials',
      quickstart: 'Quick start', teacher: 'Instructor notes', practice: 'Exercises & answers',
      source: 'Download source Markdown', package: 'Download complete pack', loading: 'Rendering the material…',
      error: 'The material could not be loaded. Return to the course page to download the source file.', footer: 'Online learning materials', kicker: 'Week 01 / Learning material'
    }
  };

  // Preserve old exercise/answer links by redirecting both to the new combined
  // practice page. 旧链接仍可访问，但统一落到“练习与答案”同页。
  const aliases = {
    'exercises-zh': 'practice-zh', 'answers-zh': 'practice-zh',
    'exercises-en': 'practice-en', 'answers-en': 'practice-en'
  };
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('doc');
  const normalized = aliases[requested] || requested;
  const key = Object.hasOwn(docs, normalized) ? normalized : 'quickstart-zh';
  const config = docs[key];
  const text = labels[config.lang];
  const isZh = config.lang === 'zh';

  // Escape source Markdown before adding the small, explicitly supported HTML
  // subset. This prevents source text from injecting arbitrary page markup.
  // 先转义 Markdown，再添加受支持的 HTML 子集，避免原文注入任意标签。
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  // Render inline code, bold text, and external links. Code spans are replaced
  // with temporary tokens so bold/link regexes cannot alter their contents.
  // 内联代码先占位，避免后续粗体或链接规则误改代码内容。
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

  // Minimal deterministic Markdown renderer for our controlled course files.
  // Supported blocks: headings, paragraphs, ordered/unordered lists, fenced
  // code, and :::details blocks used for expandable answers. A small local
  // renderer avoids a runtime CDN dependency.
  // 本地最小渲染器支持标题、段落、列表、代码块和可折叠答案，无需外部 CDN。
  const renderMarkdown = (markdown) => {
    const lines = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
    const html = [];
    let paragraph = [];
    let list = null;
    let inCode = false;
    let codeLanguage = '';
    let codeLines = [];
    let headingIndex = 0;
    let inDetails = false;

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
      // Course-specific syntax:
      // :::details Show answer  -> <details><summary>Show answer</summary>
      // :::                       -> </details>
      // The content inside still passes through the same escaped renderer.
      const detailsStart = line.match(/^:::details\s+(.+)$/);
      if (detailsStart) {
        flushParagraph();
        closeList();
        if (inDetails) html.push('</div></details>');
        html.push(`<details class="material-answer"><summary>${inline(detailsStart[1])}</summary><div class="material-answer-body">`);
        inDetails = true;
        continue;
      }
      if (/^:::\s*$/.test(line) && inDetails) {
        flushParagraph();
        closeList();
        html.push('</div></details>');
        inDetails = false;
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
    if (inDetails) html.push('</div></details>');
    return html.join('\n');
  };

  // Configure all page chrome from the chosen document so one HTML shell serves
  // both languages while keeping titles, navigation, and download links aligned.
  // 根据当前文档同步设置语言、标题、导航和下载入口。
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
    ['quickstart', text.quickstart],
    ['teacher', text.teacher],
    ['practice', text.practice]
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
  // Fetch only the allow-listed same-origin Markdown source. The loading state
  // remains visible until rendering completes; failures become an explicit card.
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
