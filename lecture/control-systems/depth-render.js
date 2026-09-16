(function(){
  function renderMath(node){
    if(window.renderMathInElement){
      renderMathInElement(node,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false,ignoredTags:['script','noscript','style','textarea','pre','code']});
    }
  }

  function htmlNode(html,cls){
    const wrap=document.createElement('div');
    wrap.className=cls||'';
    wrap.innerHTML=html;
    return wrap;
  }

  function install(){
    const layout=document.querySelector('[data-unit]');
    const article=document.getElementById('unitArticle');
    if(!layout||!article||article.dataset.depthInstalled==='1')return false;
    if(!article.querySelector('h1'))return false;
    const id=String(layout.dataset.unit||'01').padStart(2,'0');
    const data=window.unitDepth&&window.unitDepth[id];
    if(!data)return false;

    if(data.intro){
      const intro=htmlNode(data.intro,'cs-depth-intro-wrap');
      const map=article.querySelector('.cs-lesson-map');
      if(map) article.insertBefore(intro,map); else article.prepend(intro);
      renderMath(intro);
    }

    Object.entries(data.main||{}).forEach(([num,html])=>{
      const section=article.querySelector(`#s${id}-${num}`);
      if(!section||section.querySelector(':scope > .cs-depth-added'))return;
      const node=htmlNode(html,'cs-depth-added');
      section.appendChild(node);
      renderMath(node);
    });

    Object.entries(data.source||{}).forEach(([num,html])=>{
      const section=article.querySelector(`#source-${id}-${num}`);
      if(!section||section.querySelector(':scope > .cs-depth-added'))return;
      const node=htmlNode(html,'cs-depth-added');
      const status=section.querySelector('.cs-source-status');
      if(status)section.insertBefore(node,status);else section.appendChild(node);
      renderMath(node);
    });

    article.dataset.depthInstalled='1';
    return true;
  }

  if(!install()){
    const article=document.getElementById('unitArticle');
    if(article){
      const obs=new MutationObserver(()=>{if(install())obs.disconnect();});
      obs.observe(article,{childList:true,subtree:true});
      setTimeout(()=>{install();obs.disconnect();},3000);
    }else{
      document.addEventListener('DOMContentLoaded',install,{once:true});
    }
  }
})();