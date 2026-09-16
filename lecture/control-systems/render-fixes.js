(function(){
  function ensureCss(){
    if(document.querySelector('link[href*="render-fixes.css"]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./render-fixes.css?v=1';
    document.head.appendChild(link);
  }

  function moveBefore(sectionSelector,nodeSelector,targetSelector){
    const from=document.querySelector(sectionSelector);
    const target=document.querySelector(targetSelector);
    if(!from||!target)return;
    const node=from.querySelector(nodeSelector);
    if(!node)return;
    const heading=target.querySelector('h2');
    if(heading&&heading.nextSibling) target.insertBefore(node,heading.nextSibling); else target.appendChild(node);
  }

  function fixUnit02(){
    const layout=document.querySelector('[data-unit]');
    if(!layout||String(layout.dataset.unit).padStart(2,'0')!=='02')return;

    // L02 gained/reordered sections after the first teaching layer was authored.
    // Move the already-rendered teaching assets to the concepts they actually explain.
    moveBefore('#s02-3','.cs-step-box','#s02-4');
    moveBefore('#s02-4','.cs-visual','#s02-6');

    const ssTf=document.querySelector('#s02-4 .cs-step-box .cs-label');
    if(ssTf) ssTf.textContent='一步一步：State space → transfer function';

    const linFig=document.querySelector('#s02-6 .cs-visual .cs-label');
    if(linFig) linFig.textContent='Illustration · equilibrium 附近的 linearization';
  }

  function addOverflowGuards(){
    document.querySelectorAll('.katex-display').forEach(el=>{
      el.style.overflowX='auto';
      el.style.overflowY='hidden';
    });
  }

  function run(){
    ensureCss();
    fixUnit02();
    addOverflowGuards();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(run),{once:true});
  else requestAnimationFrame(run);

  // source-render appends an extra KaTeX-rendered coverage layer after the main lecture.
  const article=document.getElementById('unitArticle');
  if(article){
    const obs=new MutationObserver(()=>requestAnimationFrame(run));
    obs.observe(article,{childList:true,subtree:true});
    setTimeout(()=>{run();obs.disconnect();},3000);
  }
})();