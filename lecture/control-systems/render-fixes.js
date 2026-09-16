(function(){
  function ensureCss(){
    if(document.querySelector('link[href*="render-fixes.css"]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./render-fixes.css?v=2';
    document.head.appendChild(link);
  }

  function moveBefore(fromSelector,nodeSelector,targetSelector){
    const from=document.querySelector(fromSelector);
    const target=document.querySelector(targetSelector);
    if(!from||!target)return;
    const node=from.querySelector(nodeSelector);
    if(!node)return;
    const heading=target.querySelector('h2');
    if(heading&&heading.nextSibling) target.insertBefore(node,heading.nextSibling); else target.appendChild(node);
  }

  function fixLegacyMappings(){
    const layout=document.querySelector('[data-unit]');
    if(!layout)return;
    const id=String(layout.dataset.unit||'01').padStart(2,'0');

    // Teaching assets were added before several lectures were split into finer sections.
    // Reattach those assets semantically instead of leaving them at stale numeric indices.
    const moves={
      '02':[
        ['#s02-3','.cs-step-box','#s02-4'],
        ['#s02-4','.cs-visual','#s02-6']
      ],
      '03':[
        ['#s03-4','.cs-visual','#s03-3']
      ],
      '05':[
        ['#s05-4','.cs-step-box','#s05-2'],
        ['#s05-5','.cs-visual','#s05-3']
      ],
      '06':[
        ['#s06-5','.cs-visual','#s06-6']
      ],
      '07':[
        ['#s07-2','.cs-step-box','#s07-5']
      ],
      '09':[
        ['#s09-4','.cs-step-box','#s09-5'],
        ['#s09-6','.cs-visual','#s09-7']
      ],
      '10':[
        ['#s10-3','.cs-step-box','#s10-2']
      ],
      '12':[
        ['#s12-4','.cs-step-box','#s12-2'],
        ['#s12-4','.cs-visual','#s12-2']
      ],
      '14':[
        ['#s14-3','.cs-step-box','#s14-7'],
        ['#s14-3','.cs-visual','#s14-7']
      ]
    };
    (moves[id]||[]).forEach(args=>moveBefore(...args));

    const labels={
      '#s02-4 .cs-step-box .cs-label':'一步一步：State space → transfer function',
      '#s02-6 .cs-visual .cs-label':'Illustration · equilibrium 附近的 linearization',
      '#s03-3 .cs-visual .cs-label':'Illustration · Jordan block 的 polynomial factor',
      '#s05-2 .cs-step-box .cs-label':'一步一步：Root locus 怎么读',
      '#s07-5 .cs-step-box .cs-label':'一步一步：Lead compensator 怎么设计',
      '#s09-5 .cs-step-box .cs-label':'一步一步：Controllability matrix 为什么长这样',
      '#s09-7 .cs-visual .cs-label':'Illustration · Gramian 与 control-energy directions',
      '#s10-2 .cs-step-box .cs-label':'一步一步：State feedback 改变了什么',
      '#s12-2 .cs-step-box .cs-label':'一步一步：为什么 z=e^{sT}',
      '#s12-2 .cs-visual .cs-label':'Illustration · s-plane 到 z-plane',
      '#s14-7 .cs-step-box .cs-label':'一步一步：Discrete Kalman predict → correct',
      '#s14-7 .cs-visual .cs-label':'Illustration · Kalman predict-correct cycle'
    };
    Object.entries(labels).forEach(([selector,text])=>{
      const el=document.querySelector(selector);
      if(el)el.textContent=text;
    });
  }

  function addOverflowGuards(){
    document.querySelectorAll('.katex-display').forEach(el=>{
      el.style.overflowX='auto';
      el.style.overflowY='hidden';
    });
  }

  function run(){
    ensureCss();
    fixLegacyMappings();
    addOverflowGuards();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(run),{once:true});
  else requestAnimationFrame(run);

  const article=document.getElementById('unitArticle');
  if(article){
    const obs=new MutationObserver(()=>requestAnimationFrame(run));
    obs.observe(article,{childList:true,subtree:true});
    setTimeout(()=>{run();obs.disconnect();},3000);
  }
})();