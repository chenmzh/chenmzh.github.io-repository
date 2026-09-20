import { zooPlan } from './zoo.js';
// Lightweight code-native rain, steam, water, starlight and a simple play ball.
// Decorative effects have no inventory, save, sound, or reward side effects.
export function createSceneEffects(canvas) {
  const ctx = canvas.getContext('2d'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let scene = 'cozy', items = [], enabled = true, event = null, handle = 0, previous = 0, clock = 0;
  canvas.width = 1200; canvas.height = 800;
  function dot(x,y,r,color) { ctx.fillStyle=color;ctx.beginPath();ctx.arc(x*12,y*8,r,0,Math.PI*2);ctx.fill(); }
  function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x*12,y*8,rx,ry,0,0,Math.PI*2);ctx.fill();}
  function zooEffect(event,t){
    const plan=zooPlan(event.action,event.items);if(!plan)return;
    const {anchor,actors}=plan,phase=reduced.matches?0:t;
    if(event.action==='splash'){
      ellipse(anchor.x,anchor.y+3,115,30,'#8bc7d080');
      for(let i=0;i<4;i++){ctx.strokeStyle='#e3f8f2ba';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse((anchor.x-7+i*4)*12,(anchor.y+2)*8,12+(phase*20+i*12)%60,5+(phase*5+i*3)%14,0,0,Math.PI*2);ctx.stroke();}
    }
    if(event.action==='mud')ellipse(anchor.x-8,anchor.y+2,70,19,'#aa805958');
    for(const item of actors){
      const el=document.querySelector(`[data-room-item="${item.id}"]`);if(!el)continue;
      const x=parseFloat(el.style.left),y=parseFloat(el.style.top),ready=el.dataset.zooReady==='true';
      if(event.action==='mud'){
        for(let j=0;j<5;j++){const ox=x-3-j*2,oy=y+(j%2)*1.5;ellipse(ox,oy,4,2.5,'#946b4878');}
        if(ready)for(let j=0;j<6;j++){const f=(phase*.9+j/6)%1;dot(x+(j%3-1)*3,y-1-Math.sin(f*Math.PI)*7,2,'#ac7a50aa');}
      }
      if(event.action==='shower'&&ready){
        const from={x:x+item.size*.3,y:y-item.size*.95},to={x:anchor.x,y:anchor.y-anchor.size*.8};
        ctx.strokeStyle='#99ddee95';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(from.x*12,from.y*8);ctx.quadraticCurveTo((from.x+to.x)*6,Math.min(from.y,to.y)*8-80,to.x*12,to.y*8);ctx.stroke();
        for(let j=0;j<12;j++){const f=(phase*.8+j/12)%1;dot(from.x+(to.x-from.x)*f,from.y+(to.y-from.y)*f-Math.sin(f*Math.PI)*10,2.3,'#dcf7ff');}
      }
      if(event.action==='parade'&&ready){ctx.fillStyle='#bc9563';ctx.font='24px serif';for(let j=0;j<3;j++)ctx.fillText('♪',(x-5+j*5)*12,(y-item.size*1.3-(phase*4+j*3)%12)*8);}
      if(event.action==='hide'&&ready){ctx.fillStyle='#f3d799';ctx.font='22px serif';ctx.fillText('✧',x*12,(y-item.size*1.3)*8);}
    }
  }
  function draw() {
    ctx.clearRect(0,0,1200,800);
    const t = reduced.matches ? 0 : clock;
    if (scene === 'night') for (const item of items.filter(i=>i.active && ['D-07','LAST'].includes(i.key))) {
      const x=item.x*12,y=(item.y-item.size*.65)*8,g=ctx.createRadialGradient(x,y,0,x,y,170);
      g.addColorStop(0,'#ffe8a355');g.addColorStop(1,'#ffe8a300');ctx.fillStyle=g;ctx.fillRect(x-170,y-170,340,340);
    }
    if (enabled && scene === 'rain') {
      ctx.save();ctx.beginPath();ctx.moveTo(0,48);ctx.lineTo(430,94);ctx.lineTo(430,366);ctx.lineTo(0,387);ctx.closePath();ctx.clip();
      ctx.strokeStyle='#d7edfa99';ctx.lineWidth=1.5;
      for(let i=0;i<46;i++){const x=(i*79)%460,y=(i*43+t*180)%420;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y+17);ctx.stroke();}ctx.restore();
    }
    if (enabled && scene === 'garden') for(let i=0;i<12;i++) dot(9+(i*17+t*1.3)%83,14+(i*13)%35+Math.sin(t+i),1.6,'#fff5bfa0');
    if (enabled && scene === 'night') for(let i=0;i<32;i++) dot(14+(i*19)%72,3+(i*7)%33,1+(.5+.5*Math.sin(t*1.5+i)), '#ddefffaa');
    if (!event) return;
    const progress=Math.min(1,(clock-event.at)/event.duration), elapsed=reduced.matches?1:progress;
    zooEffect(event,t);
    if(event.action==='fetch') {
      const x=event.target.x,y=event.target.y;
      const flight=Math.min(1,elapsed*3), bx=18+(x-18)*flight,by=84+(y-84)*flight-Math.sin(flight*Math.PI)*26;
      ctx.save();ctx.globalAlpha=.2;dot(bx,y,13,'#372d22');ctx.restore();
      dot(bx,by,12,'#e89465');ctx.strokeStyle='#fff7dd';ctx.lineWidth=3;ctx.beginPath();ctx.arc(bx*12,by*8,8,0,Math.PI);ctx.stroke();
    }
    if(event.action==='tea') for(const item of event.items.filter(i=>i.key==='D-08')) {
      for(let i=0;i<3;i++) { const phase=(elapsed*3+i/3)%1;ctx.strokeStyle=`rgba(255,251,228,${.8*(1-phase)})`;ctx.lineWidth=3;ctx.beginPath();const x=item.x*12+(i-1)*9,y=(item.y-item.size*.8)*8-phase*45;ctx.moveTo(x,y);ctx.bezierCurveTo(x-9,y-10,x+9,y-20,x,y-32);ctx.stroke(); }
    }
    if(event.action==='water') for(const item of event.items.filter(i=>i.key==='D-09')) for(let i=0;i<14;i++) {
      const phase=(elapsed*4+i/14)%1;dot(item.x+(i%5-2)*1.1,item.y-item.size*1.25-12+phase*14,2.4,'#a3deefd9');
    }
    if(event.action==='stargaze') {
      ctx.strokeStyle='#b8dbff99';ctx.lineWidth=2;ctx.beginPath();
      for(let i=0;i<6;i++) {const x=25+i*9,y=17+Math.sin(i*1.4)*7;if(i===0)ctx.moveTo(x*12,y*8);else ctx.lineTo(x*12,y*8);}ctx.stroke();
      for(let i=0;i<6;i++) dot(25+i*9,17+Math.sin(i*1.4)*7,3,'#f7e3a9');
      if(!reduced.matches) { const x=20+elapsed*65;ctx.strokeStyle='#fff4c5';ctx.beginPath();ctx.moveTo(x*12,85+elapsed*60);ctx.lineTo((x-8)*12,70+elapsed*60);ctx.stroke(); }
    }
  }
  function tick(now) {
    handle=0;
    if(document.hidden || !canvas.parentElement.offsetParent){previous=0;return;}
    clock+=previous?Math.min((now-previous)/1000,.05):0;previous=now;
    if(event && clock-event.at>=event.duration){event=null;delete canvas.dataset.event;}
    draw();
    if(event || (enabled && scene!=='cozy' && !reduced.matches)) handle=requestAnimationFrame(tick);
  }
  function wake(){if(!handle&&!document.hidden)handle=requestAnimationFrame(tick);}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(handle);handle=0;previous=0;}else wake();});
  reduced.addEventListener('change',wake);
  return {
    mount(id, placed){if(scene!==id){event=null;delete canvas.dataset.event;}scene=id;items=placed;canvas.dataset.scene=id;wake();},
    play(action, placed, target={x:67,y:88}) {event={action,items:placed.map(i=>({...i})),target,at:clock,duration:zooPlan(action,placed)?12:action==='fetch'?6:4.5};canvas.dataset.event=action;wake();},
    toggle(){enabled=!enabled;wake();return enabled;},
    clear(){event=null;delete canvas.dataset.event;wake();},
  };
}
