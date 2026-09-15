(function(){
  const stepExplainers={
    '01-3':`<div class="cs-step-box"><span class="cs-label">一步一步看 feedback 公式</span><ol><li>plant 先把输入和 disturbance 加起来：$y=G(u+w)$。</li><li>controller 看的是误差：$u=K(r-y)$。</li><li>把第二式代回第一式：$y=G[K(r-y)+w]$。</li><li>把含 $y$ 的项移到左边：$(1+GK)y=GKr+Gw$。</li><li>最后两边除以 $1+GK$，才得到 reference 和 disturbance 两条闭环通道。</li></ol></div>`,
    '02-2':`<div class="cs-step-box"><span class="cs-label">ODE → state space 不跳步</span><ol><li>先看最高阶导数是几阶；三阶 ODE 通常需要 3 个 states。</li><li>定义 $x_1=y,\ x_2=\dot y,\ x_3=\ddot y$。</li><li>前两行只是定义：$\dot x_1=x_2,\ \dot x_2=x_3$。</li><li>把原 ODE 解出 $y^{(3)}$，这就是 $\dot x_3$。</li><li>最后把 output 写成 $y=Cx+Du$。</li></ol></div>`,
    '02-3':`<div class="cs-step-box"><span class="cs-label">State space → transfer function</span><ol><li>从 $\dot x=Ax+Bu$ 开始做 Laplace，先假设 zero initial condition。</li><li>得到 $sX=AX+BU$。</li><li>移项：$(sI-A)X=BU$。</li><li>所以 $X=(sI-A)^{-1}BU$。</li><li>代入 $Y=CX+DU$，再除以 $U$：$G(s)=C(sI-A)^{-1}B+D$。</li></ol></div>`,
    '03-1':`<div class="cs-step-box"><span class="cs-label">为什么会出现 $e^{At}$</span><ol><li>标量系统 $\dot x=ax$ 的解是 $x(t)=e^{at}x_0$。</li><li>矩阵系统 $\dot x=Ax$ 只是把标量 $a$ 换成矩阵 $A$。</li><li>于是我们定义 matrix exponential $e^{At}=I+At+(At)^2/2!+\cdots$。</li><li>它满足 $\frac d{dt}e^{At}=Ae^{At}$，所以确实是矩阵版指数解。</li></ol></div>`,
    '04-1':`<div class="cs-step-box"><span class="cs-label">卷积为什么是这个式子</span><ol><li>把任意输入 $u(t)$ 想成很多个极小 impulse 的叠加。</li><li>在时刻 $\tau$ 出现的那一小份 impulse，到时刻 $t$ 的影响是 $g(t-\tau)$。</li><li>这一小份输入强度是 $u(\tau)d\tau$。</li><li>把所有过去时刻的贡献加起来：$y(t)=\int_0^t g(t-\tau)u(\tau)d\tau$。</li></ol></div>`,
    '05-4':`<div class="cs-step-box"><span class="cs-label">Root locus 怎么读</span><ol><li>先把 open-loop poles 画成 ×，zeros 画成 ○。</li><li>当 gain $k=0$ 时，closed-loop poles 就在 open-loop poles 上。</li><li>慢慢增加 $k$，每个 closed-loop pole 沿 locus 移动。</li><li>如果轨迹跨进 RHP，闭环就会变 unstable。</li><li>所以 root locus 本质上是在问：gain 变大时，closed-loop dynamics 会被推到哪里？</li></ol></div>`,
    '06-2':`<div class="cs-step-box"><span class="cs-label">Nyquist criterion 的逻辑链</span><ol><li>闭环 poles 是 $1+L(s)=0$ 的 roots。</li><li>也就是寻找哪些 $s$ 会让 $L(s)=-1$。</li><li>Nyquist contour 围住整个 RHP；把它经过 $L(s)$ 映射后，看曲线绕 -1 几圈。</li><li>argument principle 把“绕圈数”转换成 zeros 与 poles 数量之差。</li><li>因此知道 open-loop RHP poles 数 $P$ 和 encirclement 数 $N$，就能推出 closed-loop RHP poles 数 $Z$。</li></ol></div>`,
    '07-2':`<div class="cs-step-box"><span class="cs-label">Lead compensator 怎么设计</span><ol><li>先从当前 Bode 图读出 cross-over 和 phase margin。</li><li>算出还差多少 phase margin。</li><li>选择 lead 的 $\alpha$，让最大 phase boost 足够。</li><li>把最大 phase boost 的频率放到目标 cross-over 附近。</li><li>最后再调 gain，让 magnitude 在目标频率穿过 0 dB。</li></ol></div>`,
    '09-4':`<div class="cs-step-box"><span class="cs-label">Controllability matrix 为什么长这样</span><ol><li>$B$ 表示 input 立刻能推动哪些 state direction。</li><li>过一个 infinitesimal dynamics step，$A$ 会把这些方向旋转/拉伸，于是出现 $AB$。</li><li>再传播一次得到 $A^2B$，依此类推。</li><li>把这些可能出现的方向并排放在一起，就是 $W_c=[B,AB,\ldots,A^{n-1}B]$。</li><li>如果这些 columns 能 span 整个 $\mathbb R^n$，input 就能影响所有 state direction。</li></ol></div>`,
    '10-3':`<div class="cs-step-box"><span class="cs-label">State feedback 改变了什么</span><ol><li>原系统：$\dot x=Ax+Bu$。</li><li>选择 $u=-Kx$。</li><li>代入后：$\dot x=(A-BK)x$。</li><li>所以 controller 并不是“额外加一个 pole”；它直接把系统矩阵从 $A$ 改成 $A-BK$。</li><li>pole placement 就是在选 $K$，让 $A-BK$ 的 eigenvalues 落到想要的位置。</li></ol></div>`,
    '11-5':`<div class="cs-step-box"><span class="cs-label">Observer error dynamics</span><ol><li>真实 plant：$\dot x=Ax+Bu$。</li><li>observer：$\dot{\hat x}=A\hat x+Bu+L(y-C\hat x)$。</li><li>定义估计误差 $e=x-\hat x$。</li><li>两式相减，输入 $Bu$ 自动抵消。</li><li>因为 $y=Cx$，得到 $\dot e=(A-LC)e$。</li><li>所以选 observer gain $L$，其实就是在设计 error dynamics 的 poles。</li></ol></div>`,
    '12-4':`<div class="cs-step-box"><span class="cs-label">为什么 $z=e^{sT}$</span><ol><li>连续 mode 在一段采样时间 $T$ 后会乘上 $e^{sT}$。</li><li>离散系统每走一步，mode 会乘上离散 eigenvalue $z$。</li><li>两种描述说的是同一段真实时间，所以 $z=e^{sT}$。</li><li>若 $\Re(s)<0$，则 $|e^{sT}|<1$，因此稳定 CT pole 会落在 unit circle 内。</li></ol></div>`,
    '13-3':`<div class="cs-step-box"><span class="cs-label">Riccati equation 从哪里来</span><ol><li>先假设最优“剩余代价”长成 $V(x)=x^TPx$。</li><li>Bellman principle 说：现在这一小段代价 + 以后最优代价，也必须最小。</li><li>把 dynamics $\dot x=Ax+Bu$ 代进 $\dot V$。</li><li>对 $u$ 求最小值，得到 $u^*=-R^{-1}B^TPx$。</li><li>把这个最优 $u^*$ 再代回去，剩下的矩阵条件就是 algebraic Riccati equation。</li></ol></div>`,
    '14-3':`<div class="cs-step-box"><span class="cs-label">Discrete Kalman filter 两步循环</span><ol><li><strong>Predict：</strong>用 model 从上一时刻 posterior 预测新的 state 与 covariance。</li><li>sensor 给出新 measurement。</li><li>算 innovation：实际 measurement − 预测 measurement。</li><li>根据 uncertainty 算 Kalman gain。</li><li><strong>Correct：</strong>用 gain × innovation 修正 state，并收缩 covariance。</li><li>把新的 posterior 带进下一轮。</li></ol></div>`
  };

  function loadTeachingLayer(done){
    if(!document.querySelector('link[href*="teaching.css"]')){
      const l=document.createElement('link'); l.rel='stylesheet'; l.href='./teaching.css?v=1'; document.head.appendChild(l);
    }
    if(window.teachingEnhancements){ done(); return; }
    const s=document.createElement('script'); s.src='./teaching.js?v=1'; s.onload=done; s.onerror=done; document.head.appendChild(s);
  }

  function render(){
    const units = window.courseUnits || [];
    const layout = document.querySelector('[data-unit]');
    const article = document.getElementById('unitArticle');
    const toc = document.getElementById('unitToc');
    if (!layout || !article || !toc) return;
    const id = String(layout.dataset.unit || '01').padStart(2,'0');
    const idx = units.findIndex(u => u.id === id);
    const unit = units[idx];
    if (!unit) { article.innerHTML = '<h1>Lecture not found</h1><p>这个学习单元还没有内容。</p>'; return; }
    const teach = window.teachingEnhancements || {units:{},visuals:{},sectionBridges:{}};
    const intro = teach.units && teach.units[id];
    const lectureLabel = unit.id === '00' ? 'Prerequisite · L00' : `ETH HS2023 · L${unit.id}`;
    const sectionCards = unit.sections.map((s,i)=>{ const sid=`s${unit.id}-${i+1}`; return `<a class="cs-map-card" href="#${sid}"><span>${unit.id==='00'?'0':Number(unit.id)}.${i+1}</span><strong>${s.title}</strong></a>`; }).join('');
    const sections = unit.sections.map((s,i)=>{
      const sid=`s${unit.id}-${i+1}`, num=`${unit.id==='00'?'0':Number(unit.id)}.${i+1}`, key=`${unit.id}-${i+1}`;
      const bridge=teach.sectionBridges&&teach.sectionBridges[key]?`<p class="cs-section-bridge"><strong>先抓住一句话：</strong>${teach.sectionBridges[key]}</p>`:'';
      const visual=teach.visuals&&teach.visuals[key]?teach.visuals[key]:'';
      const steps=stepExplainers[key]||'';
      return `<section class="cs-textbook-section"><h2 id="${sid}"><span class="cs-section-number">${num}</span>${s.title}</h2>${bridge}${visual}${steps}${s.html}</section>`;
    }).join('');
    const beginnerIntro=intro?`<div class="cs-beginner-intro"><span class="cs-label">零背景导读</span><h3>这一讲先不要急着背公式</h3><p>${intro.intro}</p><div class="cs-why"><strong>学习时只记住这一件事</strong>${intro.why}</div></div>`:'';
    const prev=idx>0?units[idx-1]:null, next=idx<units.length-1?units[idx+1]:null;
    const pager=`<nav class="cs-pager" aria-label="Lecture navigation">${prev?`<a href="./unit${prev.id}.html"><small>← Previous</small><strong>${prev.id==='00'?'L00':'L'+prev.id} · ${prev.title}</strong></a>`:'<span></span>'}${next?`<a href="./unit${next.id}.html"><small>Next →</small><strong>${next.id==='00'?'L00':'L'+next.id} · ${next.title}</strong></a>`:'<span></span>'}</nav>`;
    article.innerHTML=`<p class="cs-eyebrow">${lectureLabel} · ${unit.sections.length} sections</p><h1>${unit.title}</h1><p class="cs-question">${unit.question}</p>${beginnerIntro}<div class="cs-goals"><strong>学完这一讲，你应该能：</strong><ul>${unit.goals.map(g=>`<li>${g}</li>`).join('')}</ul></div><div class="cs-lesson-map"><div class="cs-map-head"><span>Section map</span><strong>按小节学习，不要一次扫完整页</strong></div><div class="cs-map-grid">${sectionCards}</div></div>${sections}<section class="cs-textbook-section cs-exercise-section"><h2 id="practice"><span class="cs-section-number">✓</span>本讲练习</h2><div class="cs-practice">${unit.practice}</div></section><div class="cs-source-note"><strong>对应 ETH 材料</strong><span>${unit.source}</span><small>本站正文为独立重写的学习讲义；不公开或镜像 Moodle 原始 PDF / solutions。</small></div>${pager}`;
    toc.innerHTML=`<div class="cs-toc-label">On this lecture</div><a href="#top" class="cs-toc-top">${unit.id==='00'?'L00':'L'+unit.id} · ${unit.title}</a>${unit.sections.map((s,i)=>`<a href="#s${unit.id}-${i+1}">${unit.id==='00'?'0':Number(unit.id)}.${i+1} ${s.title}</a>`).join('')}<a href="#practice">✓ 本讲练习</a>`;
    article.id='unitArticle'; article.setAttribute('tabindex','-1'); layout.id='top';
    if(window.renderMathInElement){ renderMathInElement(article,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false,ignoredTags:['script','noscript','style','textarea','pre','code']}); }
    const links=[...toc.querySelectorAll('a[href^="#"]')], targets=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if('IntersectionObserver' in window&&targets.length){ const obs=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(a=>a.classList.remove('is-active'));const hit=links.find(a=>a.getAttribute('href')==='#'+entry.target.id);if(hit)hit.classList.add('is-active');}});},{rootMargin:'-20% 0px -70% 0px'});targets.forEach(t=>obs.observe(t)); }
  }
  loadTeachingLayer(render);
})();