import {SpriteAtlas} from './sprites.js';
import {ChapterNPCs,NPC_FRAMES} from './chapter-npcs.js';

export const MAP_POINTS = Object.freeze([
 {id:'tea',name:'茶摊 · 消息',x:330,y:490,type:'npc',icon:'谈'},
 {id:'herbalist',name:'药师 · 委托',x:685,y:465,type:'npc',icon:'谈'},
 {id:'ferryman',name:'沈青竹 · 主线',x:1000,y:710,type:'npc',icon:'谈'},
 {id:'bridge',name:'石桥 · 裴照',x:1350,y:510,type:'battle',icon:'剑'},
 {id:'shrine',name:'旧碑 · 线索',x:1120,y:510,type:'study',icon:'悟'},
 {id:'herbs',name:'青露草 · 采集',x:650,y:605,approach:{x:650,y:535},type:'collect',icon:'采'},
 {id:'chest',name:'旧木箱 · 搜寻',x:420,y:575,approach:{x:460,y:560},type:'chest',icon:'物'},
 {id:'rest',name:'驿亭 · 歇脚',x:230,y:620,type:'rest',icon:'憩'},
]);
const WORLD_W=1600,WORLD_H=1000,CELL=20,RADIUS=10;
// These connected paths deliberately keep every story location reachable.
const WALKS=[{x:275,y:480,w:1205,h:160},{x:475,y:445,w:510,h:100},{x:170,y:590,w:330,h:60},{x:820,y:610,w:260,h:115},{x:840,y:685,w:400,h:75}];
const BLOCKS=[{x:282,y:525,w:155,h:69},{x:510,y:562,w:290,h:91},{x:1085,y:682,w:115,h:44}];
export function isWalkable(x,y){
 if(typeof x==='object'){y=x.y;x=x.x;}
 return Number.isFinite(x)&&Number.isFinite(y)&&WALKS.some(r=>x>=r.x+RADIUS&&x<=r.x+r.w-RADIUS&&y>=r.y+RADIUS&&y<=r.y+r.h-RADIUS)&&!BLOCKS.some(r=>x>r.x-RADIUS&&x<r.x+r.w+RADIUS&&y>r.y-RADIUS&&y<r.y+r.h+RADIUS);
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const key=p=>`${p.x},${p.y}`;
const center=p=>({x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2});
function nearestNode(point){
 let best=null,score=Infinity;
 for(let gy=22;gy<44;gy++)for(let gx=7;gx<74;gx++){
  const p={x:gx,y:gy},c=center(p),d=distance(c,point);
  if(d<score&&isWalkable(c)){best=p;score=d;}
 }
 return best;
}
function clearLine(a,b){
 const count=Math.max(1,Math.ceil(distance(a,b)/5));
 for(let i=0;i<=count;i++){const q=i/count;if(!isWalkable(a.x+(b.x-a.x)*q,a.y+(b.y-a.y)*q))return false;}
 return true;
}
/** A* on a 20 px grid, with collision-safe line-of-sight path simplification. */
export function findPath(start,end){
 if(!start||!end||![start.x,start.y,end.x,end.y].every(Number.isFinite))return [];
 const a=nearestNode(start),b=nearestNode(end);if(!a||!b)return [];
 const first=key(a),last=key(b),open=[a],previous=new Map(),scores=new Map([[first,0]]),closed=new Set();
 while(open.length){
  let best=0;for(let i=1;i<open.length;i++)if((scores.get(key(open[i]))+distance(open[i],b))<(scores.get(key(open[best]))+distance(open[best],b)))best=i;
  const node=open.splice(best,1)[0],id=key(node);if(closed.has(id))continue;
  if(id===last){
   const result=[center(node)];let cursor=id;
   while(previous.has(cursor)){const p=previous.get(cursor);result.push(center(p));cursor=key(p);}result.reverse();
   const goal=isWalkable(end)?{...end}:center(b);if(clearLine(result.at(-1),goal))result.push(goal);
   const smooth=[];let from=isWalkable(start)?start:result[0],i=0;
   while(i<result.length){let next=i;while(next+1<result.length&&clearLine(from,result[next+1]))next++;smooth.push(result[next]);from=result[next];i=next+1;}
   return smooth;
  }
  closed.add(id);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const next={x:node.x+dx,y:node.y+dy},nid=key(next);
   if(closed.has(nid)||!isWalkable(center(next))||!clearLine(center(node),center(next)))continue;
   const cost=scores.get(id)+Math.hypot(dx,dy);
   if(cost<(scores.get(nid)??Infinity)){scores.set(nid,cost);previous.set(nid,node);open.push(next);}
  }
 }
 return [];
}
function imageReady(img){return new Promise((resolve,reject)=>{
 if(img.complete&&img.naturalWidth){resolve();return;}
 const timer=setTimeout(()=>finish(new Error('探索素材加载超时，请刷新重试')),25000);
 const success=()=>finish(),failure=()=>finish(new Error('探索素材未能加载'));
 function finish(error){clearTimeout(timer);img.removeEventListener('load',success);img.removeEventListener('error',failure);error?reject(error):resolve();}
 img.addEventListener('load',success);img.addEventListener('error',failure);
});}

export class ChapterMap {
 constructor(canvas,{onInteract=()=>{},onNear=()=>{},getFlags=()=>({}),onMove=()=>{}}={}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');canvas.width=WORLD_W;canvas.height=WORLD_H;
  this.handlers={onInteract,onNear,getFlags,onMove};this.hero={x:470,y:520,facing:0,moving:false};
  this.keys=new Set();this.stick={x:0,y:0};this.path=[];this.paused=true;this.near=null;this.pending=null;this.started=false;this.destroyed=false;
  this.time=0;this.last=0;this.savedAt=0;this.savedPosition={x:470,y:520};this.listeners=[];
  this.reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.atlas=new SpriteAtlas();this.npcs=new ChapterNPCs();this.background=new Image();this.background.src='./assets/qingxi-explore.png';
  this.portraits=new Image();this.portraits.src='./assets/chapter-portraits.png';
  this.bind(window,'keydown',e=>this.keyDown(e));
  this.bind(window,'keyup',e=>this.keys.delete(e.key.toLowerCase()));
  this.bind(window,'blur',()=>{this.keys.clear();this.setStick(0,0);});
  this.bind(canvas,'pointerdown',e=>{if(!this.paused&&e.isPrimary!==false)this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};});
  this.bind(canvas,'pointercancel',()=>this.pointer=null);
  this.bind(canvas,'pointerup',e=>this.pointerUp(e));
  this.tick=this.tick.bind(this);
 }
 bind(target,type,callback){target.addEventListener(type,callback);this.listeners.push(()=>target.removeEventListener(type,callback));}
 async load(){await Promise.all([this.background,this.atlas.hero,this.atlas.cast,this.portraits,this.npcs.image].map(imageReady));this.npcs.prepare();this.draw();}
 start(position={x:470,y:520}){
  if(this.destroyed)return;
  const safe=isWalkable(position)?position:{x:470,y:520};Object.assign(this.hero,safe,{moving:false});this.savedPosition={...safe};
  this.path=[];this.pending=null;this.paused=false;this.last=0;this.updateNear();
  if(!this.started){this.started=true;this.raf=requestAnimationFrame(this.tick);}
 }
 get position(){return {x:this.hero.x,y:this.hero.y};}
 setPaused(paused){this.paused=!!paused;if(this.paused){this.keys.clear();this.setStick(0,0);this.hero.moving=false;this.path=[];this.pending=null;this.pointer=null;this.draw();}}
 setStick(x,y){const length=Math.hypot(x,y);this.stick={x:length>1?x/length:x,y:length>1?y/length:y};if(length>.12){this.path=[];this.pending=null;}}
 keyDown(e){
  if(this.paused||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)||e.target?.isContentEditable)return;
  const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){if(k.startsWith('arrow'))e.preventDefault();this.keys.add(k);this.path=[];this.pending=null;}
  if(k==='e'&&!e.repeat){e.preventDefault();this.interactNearest();}
 }
 pointerUp(e){
  const down=this.pointer;this.pointer=null;
  if(this.paused||!down||down.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>12)return;
  const rect=this.canvas.getBoundingClientRect(),pos={x:(e.clientX-rect.left)/rect.width*WORLD_W,y:(e.clientY-rect.top)/rect.height*WORLD_H};
  const point=MAP_POINTS.find(p=>Math.abs(p.x-pos.x)<65&&pos.y>p.y-165&&pos.y<p.y+40);
  if(point){this.goTo(point.id);return;}
  this.pending=null;
  this.path=findPath(this.hero,pos);
  if(!this.path.length)this.pending=null;
 }
 goTo(id){
  if(this.paused)return false;
  const point=MAP_POINTS.find(p=>p.id===id);if(!point)return false;
  if(distance(point,this.hero)<95)return this.interactNearest(id);
  this.keys.clear();this.setStick(0,0);this.pending=id;this.path=findPath(this.hero,point.approach??point);
  if(!this.path.length){this.pending=null;return false;}return true;
 }
 interactNearest(id){
  if(this.paused)return false;
  const point=id?MAP_POINTS.find(p=>p.id===id):this.nearest();
  if(!point||distance(point,this.hero)>110)return false;
  this.path=[];this.pending=null;this.hero.moving=false;this.handlers.onInteract(point.id);return true;
 }
 nearest(){let point=null,score=110;for(const p of MAP_POINTS){const d=distance(p,this.hero);if(d<score){point=p;score=d;}}return point;}
 updateNear(){const next=this.nearest();if(next?.id!==this.near?.id){this.near=next;this.handlers.onNear(next);}}
 tick(now){
  if(this.destroyed)return;const elapsed=this.last?Math.max(0,Math.min((now-this.last)/1000,.5)):0;this.last=now;
  if(!this.paused){
   this.time+=Math.min(elapsed,.04);
   // Catch up movement at low frame rates without tunnelling across collision edges.
   let remaining=elapsed;while(remaining>1e-8&&!this.paused){const step=Math.min(remaining,1/60);this.move(step);remaining-=step;}
   this.updateNear();
   if(now-this.savedAt>=500&&distance(this.hero,this.savedPosition)>.2){this.savedAt=now;this.savedPosition=this.position;this.handlers.onMove(this.position);}
  }
  // A paused exploration scene stays as a static canvas under dialogs or battle.
  // Reward flags can still change while paused, so repaint only when markers change.
  if(!this.paused||this.drawnCollectFlags!==this.collectionSignature())this.draw();
  this.raf=requestAnimationFrame(this.tick);
 }
 move(dt){
  let dx=this.stick.x+(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0);
  let dy=this.stick.y+(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0);
  let length=Math.hypot(dx,dy),step=225*dt;
  if(length<.12&&this.path.length){
   // Reach each corner before turning; skipping it early can enter a blocked edge.
   while(this.path.length&&distance(this.hero,this.path[0])<.001){const point=this.path.shift();this.hero.x=point.x;this.hero.y=point.y;}
   if(this.path.length){dx=this.path[0].x-this.hero.x;dy=this.path[0].y-this.hero.y;length=Math.hypot(dx,dy);step=Math.min(step,length);}
  }
  this.hero.moving=length>(this.path.length?.001:.12);
  if(this.hero.moving){dx=dx/length*step;dy=dy/length*step;this.hero.facing=Math.atan2(dy,dx);
   if(isWalkable(this.hero.x+dx,this.hero.y+dy)){this.hero.x+=dx;this.hero.y+=dy;}
   else{if(isWalkable(this.hero.x+dx,this.hero.y))this.hero.x+=dx;if(isWalkable(this.hero.x,this.hero.y+dy))this.hero.y+=dy;}
  }
  if(this.pending){const p=MAP_POINTS.find(p=>p.id===this.pending);if(p&&distance(p,this.hero)<95)this.interactNearest(p.id);}
 }
 collectionSignature(){const flags=this.handlers.getFlags?.()??{};return `${!!(flags.herbsCollected||flags.herbs===true)}:${!!(flags.chestOpened||flags.chest===true)}`;}
 taken(point,flags){return point.id==='herbs'&&(flags.herbsCollected||flags.herbs===true)||point.id==='chest'&&(flags.chestOpened||flags.chest===true);}
 draw(){
  const c=this.ctx;if(!c)return;c.clearRect(0,0,WORLD_W,WORLD_H);
  if(this.background.complete&&this.background.naturalWidth)c.drawImage(this.background,0,0,WORLD_W,WORLD_H);
  else{c.fillStyle='#143137';c.fillRect(0,0,WORLD_W,WORLD_H);}
  const flags=this.handlers.getFlags()??{},t=this.reduced?0:this.time;
  this.drawnCollectFlags=this.collectionSignature();
  // Warm practical lighting belongs to lamps in the painted scene, not the HUD.
  for(const lamp of [{x:480,y:240},{x:805,y:300},{x:1230,y:655}]){const g=c.createRadialGradient(lamp.x,lamp.y,0,lamp.x,lamp.y,90);g.addColorStop(0,'#ffd89818');g.addColorStop(1,'#ffd89800');c.fillStyle=g;c.fillRect(lamp.x-90,lamp.y-90,180,180);}
  if(this.path.length&&!this.paused){const dest=this.path.at(-1);c.save();c.strokeStyle='#cbece9aa';c.lineWidth=3;c.beginPath();c.ellipse(dest.x,dest.y,20+Math.sin(t*4)*3,8,0,0,Math.PI*2);c.stroke();c.restore();}
  const actors=MAP_POINTS.filter(p=>['npc','battle'].includes(p.type)).map(p=>({...p,kind:NPC_FRAMES[p.id]?'villager':p.id==='bridge'?'boss':'npc'}));
  actors.push({...this.hero,id:'hero',kind:'hero'});actors.sort((a,b)=>a.y-b.y);
  for(const actor of actors){
   if(actor.kind==='villager')this.npcs.draw(c,actor,t,{near:this.near?.id===actor.id,faceLeft:this.hero.x<actor.x-30});
   else this.atlas.draw(c,actor.kind,{...actor,y:actor.y-18,facing:actor.id==='hero'?this.hero.facing:Math.PI},t,{previewScale:actor.id==='hero'?1.24:1.17});
  }
  for(const point of MAP_POINTS){
   const used=this.taken(point,flags),near=this.near?.id===point.id,actor=['npc','battle'].includes(point.type),height=actor?140:50;
   c.save();c.translate(point.x,point.y-height);c.font='600 22px "Noto Serif SC", serif';c.textAlign='center';c.textBaseline='middle';
   const name=used?`${point.name.split(' · ')[0]} · 已取`:point.name,w=c.measureText(name).width+30;
   c.fillStyle=near?'#173738f5':'#10282be5';c.strokeStyle=near?'#f6d090':'#b6bd9870';c.lineWidth=near?2:1;
   c.beginPath();c.roundRect(-w/2,-18,w,37,7);c.fill();c.stroke();c.fillStyle=used?'#9caeaa':near?'#fff0c9':'#f2e5c6';c.fillText(name,0,1);
   if(!actor&&!used){c.fillStyle=near?'#e7c58b':'#c4ded5';c.font='600 25px serif';c.fillText(point.icon,0,36);}
   if(near){c.fillStyle='#efd29b';c.beginPath();c.moveTo(-6,24);c.lineTo(6,24);c.lineTo(0,31);c.fill();}
   c.restore();
  }
  if(!this.reduced){c.save();c.strokeStyle='#c2dfeb25';c.lineWidth=1.4;for(let i=0;i<45;i++){const x=(i*137+t*24)%WORLD_W,y=(i*91+t*280)%WORLD_H;c.beginPath();c.moveTo(x,y);c.lineTo(x-5,y+16);c.stroke();}c.restore();}
  const shade=c.createLinearGradient(0,0,0,WORLD_H);shade.addColorStop(0,'#05191b18');shade.addColorStop(.65,'#05191b00');shade.addColorStop(1,'#05191b55');c.fillStyle=shade;c.fillRect(0,0,WORLD_W,WORLD_H);
 }
 destroy(){this.destroyed=true;cancelAnimationFrame(this.raf);this.listeners.forEach(remove=>remove());this.listeners=[];this.keys.clear();this.path=[];this.pending=null;}
}
