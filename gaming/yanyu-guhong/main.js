import { Game } from './game.js';
const $=id=>document.getElementById(id);
let started=false,paused=false,helpPaused=false,muted=false,toastTimer;
function update(s){
 for(const [key,max] of [['hp','maxHp'],['qi','maxQi']]){$(`${key}Label`).textContent=`${s[key]} / ${s[max]}`;$(`${key}Bar`).style.width=`${Math.max(0,s[key]/s[max]*100)}%`;}
 $('mobileHud').textContent=`气血 ${s.hp} · 真气 ${s.qi} · 药 ×${s.potions} | 灵草 ${s.herbs}/3 · 山匪 ${s.kills}/3`;$('objective').textContent=s.objective;$('herbs').textContent=`${s.herbs} / 3`;$('kills').textContent=`${s.kills} / 3`;$('potions').textContent=`× ${s.potions}`;
 const done={stepTalk:s.stage!=='intro',stepHerbs:s.herbs>=3,stepKills:s.kills>=3,stepBoss:['return','won'].includes(s.stage),stepReturn:s.stage==='won'};
 for(const [id,value] of Object.entries(done))$(id).classList.toggle('done',value);
 $('worldStatus').textContent=started?s.objective:'青溪渡 · 静候来客';
 for(const [id,key,label]of[['cdAttack','attack','普攻'],['cdDash','dash','身法'],['cdSkill','skill','绝技']])$(id).textContent=s.cooldowns[key]>.05?`${s.cooldowns[key].toFixed(1)}s`:label;
}
function dialog(data){$('dialogPanel').classList.toggle('hidden',!data);if(!data)return;$('speaker').textContent=data.speaker;$('dialogText').textContent=data.text;$('choices').replaceChildren();data.choices.forEach((text,i)=>{const b=document.createElement('button');b.textContent=text+' →';b.onclick=()=>{game.chooseDialog(i);$('game').focus();};$('choices').append(b);});$('choices').firstElementChild?.focus();}
const game=new Game($('game'),{onUpdate:update,onDialog:dialog,onToast:text=>{$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2700);},onPause:value=>{if(!started)return;paused=value;$('pausePanel').classList.toggle('hidden',!paused);$('pauseBtn').innerHTML=paused?'继续 <kbd>ESC</kbd>':'暂停 <kbd>ESC</kbd>';},onEnd:s=>{const won=s.stage==='won';$('endTitle').textContent=won?'此间，侠名初成':'胜败寻常事';$('endText').textContent=won?`青溪渡重归安宁，你收下青溪剑，继续前行。本次历练 ${Math.floor(s.elapsed/60)} 分 ${Math.floor(s.elapsed%60)} 秒。序章已完成。`:'你倒在风雨中。重新启程，留意红圈预警，善用闪避、剑气与金疮药。';$('endPanel').classList.remove('hidden');}});
window.game=game;
$('startBtn').onclick=()=>{started=true;$('startPanel').classList.add('hidden');game.start();$('game').focus();};
function setPause(v){if(!started||game.getState().dialog||['won','lost'].includes(game.getState().stage))return;paused=v;game.pause(v);$('pausePanel').classList.toggle('hidden',!v);$('pauseBtn').innerHTML=v?'继续 <kbd>ESC</kbd>':'暂停 <kbd>ESC</kbd>';if(!v)$('game').focus();}
$('pauseBtn').onclick=()=>setPause(!paused);$('resumeBtn').onclick=()=>setPause(false);
function restart(){started=true;paused=false;for(const id of ['startPanel','pausePanel','endPanel','dialogPanel'])$(id).classList.add('hidden');$('pauseBtn').innerHTML='暂停 <kbd>ESC</kbd>';game.restart();$('game').focus();}
$('restartBtn').onclick=restart;$('againBtn').onclick=restart;
$('helpBtn').onclick=()=>{helpPaused=game.paused;if(started)game.pause(true);$('helpPanel').classList.remove('hidden');$('closeHelp').focus();};
$('closeHelp').onclick=()=>{$('helpPanel').classList.add('hidden');if(started)game.pause(helpPaused);$('game').focus();};
$('soundBtn').onclick=()=>{muted=!muted;game.setMuted?.(muted);$('soundBtn').textContent=`音效 · ${muted?'关':'开'}`;$('soundBtn').setAttribute('aria-pressed',String(muted));};
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{game[b.dataset.action]();$('game').focus();});
document.querySelectorAll('[data-move]').forEach(b=>{const end=()=>game.keys.delete(b.dataset.move);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);game.keys.add(b.dataset.move);});b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);b.addEventListener('lostpointercapture',end);});
window.addEventListener('keydown',e=>{if(e.key==='?')$('helpBtn').click();if(e.key==='Escape'){if(!$('helpPanel').classList.contains('hidden'))$('closeHelp').click();else setPause(!paused);}});
