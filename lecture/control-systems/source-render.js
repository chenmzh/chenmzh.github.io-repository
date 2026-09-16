(function(){
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function ensureCss(){
    if(document.querySelector('link[href*="source-complete.css"]')) return;
    const l=document.createElement('link');
    l.rel='stylesheet'; l.href='./source-complete.css?v=1'; document.head.appendChild(l);
  }
  function renderMath(node){
    if(window.renderMathInElement){
      renderMathInElement(node,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false,ignoredTags:['script','noscript','style','textarea','pre','code']});
    }
  }
  function build(unitId,unit){
    const wrap=document.createElement('section');
    wrap.className='cs-source-complete';
    wrap.id='source-coverage';
    const map=unit.sections.map((s,i)=>`<a href="#source-${unitId}-${i+1}"><small>${esc(s.ppt)}</small><strong>${esc(s.title)}</strong></a>`).join('');
    const rows=unit.sections.map((s,i)=>`<tr><td>${esc(s.ppt)}</td><td>${esc(s.title)}</td><td>${s.sources.map(x=>`<span class="source-kind">${esc(x)}</span>`).join(' ')}</td><td class="covered">✓ 已教材化</td><td><a href="#source-${unitId}-${i+1}">展开学习</a></td></tr>`).join('');
    const sections=unit.sections.map((s,i)=>`<section class="cs-source-section" id="source-${unitId}-${i+1}"><div class="cs-source-meta"><span class="cs-source-chip">${esc(s.ppt)}</span>${s.sources.map(x=>`<span class="cs-source-chip">${esc(x)}</span>`).join('')}</div><h2>${esc(s.title)}</h2>${s.html}<div class="cs-source-status"><span>✓ PPT 子章节已覆盖</span><span>✓ 独立重写</span><span>✓ 可与主讲义交叉学习</span></div></section>`).join('');
    wrap.innerHTML=`<div class="cs-source-banner"><span class="cs-label">PPT / Notes Coverage</span><h2>按 ETH 原始材料逐项补齐</h2><p>${unit.note}</p><p>这一部分不是新的“总结”，而是覆盖审计后的补充教材：每个条目直接对应 ETH HS2023 slides / annotated slides / board notes / exercise summary 中的一个正式子章节或关键知识块。</p></div><div class="cs-coverage-wrap"><table class="cs-coverage"><thead><tr><th>ETH source item</th><th>教材化标题</th><th>参考来源</th><th>状态</th><th>跳转</th></tr></thead><tbody>${rows}</tbody></table></div><div class="cs-source-map">${map}</div>${sections}`;
    return wrap;
  }
  function install(){
    ensureCss();
    const article=document.getElementById('unitArticle');
    const layout=document.querySelector('[data-unit]');
    if(!article||!layout||article.querySelector('#source-coverage')) return false;
    if(!article.querySelector('h1')) return false;
    const id=String(layout.dataset.unit||'01').padStart(2,'0');
    const data=window.sourceComplete&&window.sourceComplete.units&&window.sourceComplete.units[id];
    if(!data) return false;
    const node=build(id,data);
    const before=article.querySelector('#lab')||article.querySelector('.cs-exercise-section')||article.querySelector('.cs-source-note');
    if(before) article.insertBefore(node,before); else article.appendChild(node);
    const toc=document.getElementById('unitToc');
    if(toc&&!toc.querySelector('a[href="#source-coverage"]')){
      const a=document.createElement('a'); a.href='#source-coverage'; a.textContent='▤ PPT/Notes Coverage';
      const lab=toc.querySelector('a[href="#lab"]'), practice=toc.querySelector('a[href="#practice"]');
      toc.insertBefore(a,lab||practice||null);
    }
    renderMath(node);
    return true;
  }
  if(!install()){
    const target=document.getElementById('unitArticle');
    if(target){
      const obs=new MutationObserver(()=>{if(install()) obs.disconnect();});
      obs.observe(target,{childList:true,subtree:false});
      setTimeout(()=>{install();obs.disconnect();},3000);
    } else {
      window.addEventListener('DOMContentLoaded',install,{once:true});
    }
  }
})();