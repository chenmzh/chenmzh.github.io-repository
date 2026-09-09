export class TurnBattle {
 constructor(){
  this.round=1;this.phase='player';
  this.hero={name:'陆行舟',hp:160,maxHp:160,qi:60,maxQi:60,bp:1,potions:3,ultimate:20,maxUltimate:100};
  this.enemies=[
   {id:'guard',name:'守桥刀客',hp:100,maxHp:100,shield:2,maxShield:2,weak:'sword',broken:0},
   {id:'chief',name:'裴照',hp:230,maxHp:230,shield:3,maxShield:3,weak:'qi',broken:0}
  ];
 }
 snapshot(){
  const enemies=this.enemies.map(enemy=>({...enemy,intent:enemy.hp<=0?'已退场':enemy.broken>0?'架势崩解 · 无法行动':this.round%3===0?'重劈 · 防御可反制':'试探斩'}));
  return JSON.parse(JSON.stringify({round:this.round,phase:this.phase,hero:this.hero,enemies}));
 }
 act(action,targetId,boost=0){
  if(this.phase!=='player')throw new Error('当前不能行动');
  if(!['sword','qi','guard','heal','ultimate'].includes(action))throw new Error('未知招式');
  const h=this.hero,e=this.enemies.find(e=>e.id===targetId),cost=Math.max(0,Math.min(3,h.bp,Math.floor(boost)||0));
  if(['sword','qi'].includes(action)&&(!e||e.hp<=0))throw new Error('请选择存活的目标');
  if(action==='qi'&&h.qi<12)throw new Error('真气不足十二点，可防御调息');
  if(action==='heal'&&(!h.potions||h.hp===h.maxHp))throw new Error(h.potions?'气血充盈，无须用药':'金疮药已用尽');
  if(action==='ultimate'&&h.ultimate<h.maxUltimate)throw new Error('剑意未满：命中弱点、破防或防御重击可积攒剑意');
  const events=[];this.phase='resolving';
  const emit=data=>events.push({...data,state:this.snapshot()});
  const gain=amount=>{h.ultimate=Math.min(h.maxUltimate,h.ultimate+amount);};
  const breakShield=(enemy,amount)=>{
   if(enemy.broken>0)return false;
   enemy.shield=Math.max(0,enemy.shield-amount);
   if(enemy.shield===0){enemy.broken=2;return true;}
   return false;
  };
  if(['sword','qi'].includes(action)){
   h.bp-=cost;if(action==='qi')h.qi-=12;
   for(let i=0;i<=cost;i++){
    if(e.hp<=0)break;
    const damage=Math.round((action==='sword'?22:30)*(e.broken>0?1.65:1));
    e.hp=Math.max(0,e.hp-damage);
    const weakness=e.weak===action,breaking=weakness&&breakShield(e,1);
    if(weakness)gain(12);if(breaking)gain(20);
    emit({kind:'hit',action,actor:'hero',target:e.id,amount:damage,breaking,text:`${action==='sword'?'流云剑':'破空式'}${cost?'·蓄势':''}：${e.name}受创 ${damage}${breaking?'，架势崩解！':weakness?'，命中弱点。':'。'}`});
   }
  }else if(action==='ultimate'){
   h.ultimate=0;
   const targets=this.enemies.filter(enemy=>enemy.hp>0).map(enemy=>{
    const amount=Math.round(90*(enemy.broken>0?1.8:1));
    enemy.hp=Math.max(0,enemy.hp-amount);
    return {id:enemy.id,amount,breaking:breakShield(enemy,2)};
   });
   emit({kind:'ultimate',actor:'hero',targets,text:`奥义 · 一剑断江！${targets.map(t=>`${this.enemies.find(enemy=>enemy.id===t.id).name}受创 ${t.amount}${t.breaking?'，架势崩解':''}`).join('；')}。`});
  }else if(action==='guard'){
   h.qi=Math.min(h.maxQi,h.qi+16);
   emit({kind:'guard',actor:'hero',text:'你收剑守心：本回合伤害降低，恢复 16 真气。若挡下重劈，将反制削盾并积攒剑意。'});
  }else{
   h.potions--;const amount=Math.min(65,h.maxHp-h.hp);h.hp+=amount;
   emit({kind:'heal',actor:'hero',amount,text:`服下金疮药，恢复 ${amount} 气血。`});
  }
  if(this.enemies.every(enemy=>enemy.hp<=0)){
   this.phase='won';emit({kind:'won',text:'雨声重新落回渡口。对方垂下了刀。'});return events;
  }
  this.phase='enemy';
  for(const enemy of this.enemies){
   if(enemy.hp<=0)continue;
   if(enemy.broken>0){
    enemy.broken--;emit({kind:'break',actor:enemy.id,text:`${enemy.name}架势崩解，无法行动。`});
    if(enemy.broken===0)enemy.shield=enemy.maxShield;
    continue;
   }
   const charged=this.round%3===0,damage=Math.round((enemy.id==='chief'?(charged?42:24):(charged?24:14))*(action==='guard'?.25:1));
   h.hp=Math.max(0,h.hp-damage);gain(8);
   emit({kind:'hit',actor:enemy.id,target:'hero',amount:damage,text:`${enemy.name}使出${charged?'重劈':'试探斩'}，你损失 ${damage} 气血。`});
   if(h.hp<=0){this.phase='lost';emit({kind:'lost',text:'你的剑没能挡住这一场雨。'});return events;}
   if(action==='guard'&&charged){
    const breaking=breakShield(enemy,1);gain(20);if(breaking)gain(20);
    emit({kind:'counter',actor:'hero',target:enemy.id,amount:0,breaking,text:`看破重劈！借力反制${enemy.name}，削去 1 层架势，剑意 +20${breaking?'，架势崩解！':'。'}`});
   }
  }
  this.round++;h.bp=Math.min(5,h.bp+1);h.qi=Math.min(h.maxQi,h.qi+5);this.phase='player';
  emit({kind:'round',text:`第 ${this.round} 回合 · 蓄势 +1${this.round%3===0?'。敌人即将重劈，防御可反制削盾。':'。'}`});return events;
 }
}
