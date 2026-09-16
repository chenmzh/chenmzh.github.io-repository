(function(){
  function moveBefore(sectionSelector, nodeSelector, targetSelector){
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

    // The teaching layer was authored before L02 gained the current 7-section order.
    // Keep the explanatory assets, but attach them to the concepts they actually explain.
    moveBefore('#s02-3','.cs-step-box','#s02-4');
    moveBefore('#s02-4','.cs-visual','#s02-6');

    // Make labels explicit after moving content so readers are not confused by historical numbering.
    const ssTf=document.querySelector('#s02-4 .cs-step-box .cs-label');
    if(ssTf) ssTf.textContent='一步一步：State space → transfer function';

    const linFig=document.querySelector('#s02-6 .cs-visual .cs-label');
    if(linFig) linFig.textContent='Illustration · equilibrium 附近的 linearization';
  }

  function addOverflowGuards(){
    document.querySelectorAll('.katex-display').forEach(el=>{
      el.style.overflowX='auto';
      el.style.overflowY='hidden';
      el.style.paddingBottom='0.2rem';
    });
  }

  function run(){
    fixUnit02();
    addOverflowGuards();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(run),{once:true});
  else requestAnimationFrame(run);

  // source-render may append KaTeX after the main lecture render; guard again once it lands.
  const article=document.getElementById('unitArticle');
  if(article){
    const obs=new MutationObserver(()=>requestAnimationFrame(run));
    obs.observe(article,{childList:true,subtree:true});
    setTimeout(()=>obs.disconnect(),2500);
  }
})();