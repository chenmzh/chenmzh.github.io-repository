export class TurnBattle {
 constructor(){this.round=1;this.phase='player';this.hero={name:'陆行舟',hp:160,maxHp:160,qi:60,maxQi:60,bp:1,potions:3};this.enemies=[{id:'guard',name:'守桥刀客',hp:100,maxHp:100,shield:2,maxShield:2,weak:'sword',broken:0},{id:'chief',name:'裴照',hp:230,maxHp:230,shield:3,maxShield:3,weak:'qi',broken:0}];}
 snapshot(){return JSON.parse(JSON.stringify({round:this.round,phase:this.phase,hero:this.hero,enemies:this.enemies}));}
 act(action,targetId,boost=0){
  if(this.phase!=='player')throw new Error('当前不能行动');
  if(!['sword','qi','guard','heal'].includes(action))throw new Error('未知招式');
  const h=this.hero,e=this.enemies.find(e=>e.id===targetId),cost=Math.max(0,Math.min(3,h.bp,Math.floor(boost)||0));
  if(['sword','qi'].includes(action)&&(!e||e.hp<=0))throw new Error('请选择存活的目标');
  if(action==='qi'&&h.qi<12)throw new Error('真气不足十二点，可防御调息');
  if(action==='heal'&&(!h.potions||h.hp===h.maxHp))throw new Error(h.potions?'气血充盈，无须用药':'金疮药已用尽');
  const events=[];this.phase='resolving';const emit=(data)=>events.push({...data,state:this.snapshot()});
  if(['sword','qi'].includes(action)){
   h.bp-=cost;if(action==='qi')h.qi-=12;
   for(let i=0;i<=cost;i++){
    if(e.hp<=0)break;
    const broken=e.broken>0,damage=Math.round((action==='sword'?22:30)*(broken?1.65:1));
    e.hp=Math.max(0,e.hp-damage);let breaking=false;
    if(!broken&&e.weak===action){e.shield=Math.max(0,e.shield-1);if(e.shield===0){e.broken=2;breaking=true;}}
    emit({kind:'hit',actor:'hero',target:e.id,amount:damage,breaking,text:`${action==='sword'?'流云剑':'破空式'}${cost?'·蓄势':''}：${e.name}受创 ${damage}${breaking?'，架势崩解！':e.weak===action?'，命中弱点。':'。'}`});
   }
  }else if(action==='guard'){h.qi=Math.min(h.maxQi,h.qi+16);emit({kind:'guard',actor:'hero',text:'你收剑守心。本回合所受伤害降低，恢复 16 真气。'});}
  else{h.potions--;const amount=Math.min(65,h.maxHp-h.hp);h.hp+=amount;emit({kind:'heal',actor:'hero',amount,text:`服下金疮药，恢复 ${amount} 气血。`});}
  if(this.enemies.every(e=>e.hp<=0)){this.phase='won';emit({kind:'won',text:'雨声重新落回渡口。对方垂下了刀。'});return events;}
  this.phase='enemy';
  for(const enemy of this.enemies){
   if(enemy.hp<=0)continue;
   if(enemy.broken>0){enemy.broken--;emit({kind:'break',actor:enemy.id,text:`${enemy.name}架势崩解，无法行动。`});if(enemy.broken===0)enemy.shield=enemy.maxShield;continue;}
   const charged=this.round%3===0,damage=Math.round((enemy.id==='chief'?(charged?42:24):(charged?24:14))*(action==='guard'?.25:1));
   h.hp=Math.max(0,h.hp-damage);emit({kind:'hit',actor:enemy.id,target:'hero',amount:damage,text:`${enemy.name}使出${charged?'重劈':'试探斩'}，你损失 ${damage} 气血。`});
   if(h.hp<=0){this.phase='lost';emit({kind:'lost',text:'你的剑没能挡住这一场雨。'});return events;}
  }
  this.round++;h.bp=Math.min(5,h.bp+1);h.qi=Math.min(h.maxQi,h.qi+5);this.phase='player';emit({kind:'round',text:`第 ${this.round} 回合 · 蓄势 +1${this.round%3===0?'。敌人即将重劈，留意防御或破防。':'。'}`});return events;
 }
}
