(function(){
  const units = window.courseUnits || [];
  const layout = document.querySelector('[data-unit]');
  const article = document.getElementById('unitArticle');
  const toc = document.getElementById('unitToc');
  if (!layout || !article || !toc) return;

  const id = String(layout.dataset.unit || '01').padStart(2,'0');
  const idx = units.findIndex(u => u.id === id);
  const unit = units[idx];
  if (!unit) {
    article.innerHTML = '<h1>Lecture not found</h1><p>这个学习单元还没有内容。</p>';
    return;
  }

  const lectureLabel = unit.id === '00' ? 'Prerequisite · L00' : `ETH HS2023 · L${unit.id}`;
  const sectionCards = unit.sections.map((s,i)=>{
    const sid = `s${unit.id}-${i+1}`;
    return `<a class="cs-map-card" href="#${sid}"><span>${unit.id === '00' ? '0' : Number(unit.id)}.${i+1}</span><strong>${s.title}</strong></a>`;
  }).join('');

  const sections = unit.sections.map((s,i)=>{
    const sid = `s${unit.id}-${i+1}`;
    const num = `${unit.id === '00' ? '0' : Number(unit.id)}.${i+1}`;
    return `<section class="cs-textbook-section"><h2 id="${sid}"><span class="cs-section-number">${num}</span>${s.title}</h2>${s.html}</section>`;
  }).join('');

  const prev = idx > 0 ? units[idx-1] : null;
  const next = idx < units.length-1 ? units[idx+1] : null;
  const pager = `<nav class="cs-pager" aria-label="Lecture navigation">
    ${prev ? `<a href="./unit${prev.id}.html"><small>← Previous</small><strong>${prev.id === '00' ? 'L00' : 'L'+prev.id} · ${prev.title}</strong></a>` : '<span></span>'}
    ${next ? `<a href="./unit${next.id}.html"><small>Next →</small><strong>${next.id === '00' ? 'L00' : 'L'+next.id} · ${next.title}</strong></a>` : '<span></span>'}
  </nav>`;

  article.innerHTML = `
    <p class="cs-eyebrow">${lectureLabel} · ${unit.sections.length} sections</p>
    <h1>${unit.title}</h1>
    <p class="cs-question">${unit.question}</p>
    <div class="cs-goals"><strong>学完这一讲，你应该能：</strong><ul>${unit.goals.map(g=>`<li>${g}</li>`).join('')}</ul></div>
    <div class="cs-lesson-map"><div class="cs-map-head"><span>Section map</span><strong>按小节学习，不要一次扫完整页</strong></div><div class="cs-map-grid">${sectionCards}</div></div>
    ${sections}
    <section class="cs-textbook-section cs-exercise-section"><h2 id="practice"><span class="cs-section-number">✓</span>本讲练习</h2><div class="cs-practice">${unit.practice}</div></section>
    <div class="cs-source-note"><strong>对应 ETH 材料</strong><span>${unit.source}</span><small>本站正文为独立重写的学习讲义；不公开或镜像 Moodle 原始 PDF / solutions。</small></div>
    ${pager}`;

  toc.innerHTML = `<div class="cs-toc-label">On this lecture</div>
    <a href="#top" class="cs-toc-top">${unit.id === '00' ? 'L00' : 'L'+unit.id} · ${unit.title}</a>
    ${unit.sections.map((s,i)=>`<a href="#s${unit.id}-${i+1}">${unit.id === '00' ? '0' : Number(unit.id)}.${i+1} ${s.title}</a>`).join('')}
    <a href="#practice">✓ 本讲练习</a>`;

  article.id = 'unitArticle';
  article.setAttribute('tabindex','-1');
  layout.id = 'top';

  if (window.renderMathInElement) {
    renderMathInElement(article, {
      delimiters: [
        {left:'$$', right:'$$', display:true},
        {left:'$', right:'$', display:false}
      ],
      throwOnError:false,
      ignoredTags:['script','noscript','style','textarea','pre','code']
    });
  }

  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const targets = links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && targets.length) {
    const obs = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          links.forEach(a=>a.classList.remove('is-active'));
          const hit = links.find(a=>a.getAttribute('href') === '#'+entry.target.id);
          if(hit) hit.classList.add('is-active');
        }
      });
    },{rootMargin:'-20% 0px -70% 0px'});
    targets.forEach(t=>obs.observe(t));
  }
})();