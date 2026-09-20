// Species semantics, anatomy-specific frames and intentions. No inventory or persistence.
// Zoo frames 12–19 address the supplemental atlas; 0–11 remain the old atlas.
const act=(id,label,frames,still,message,interval=350)=>Object.freeze({id,label,frames:Object.freeze(frames),still,message,interval});
function profile(species,name,{greet,play,explore,rest,move,speed=1,gait=1,wander=.4,follows=false,actions,extra=[]}) {
  const idle=act('idle','',species==='dog'||species==='cat'?[0,0,0,1]:species==='pig'?[19,19,18,19]:[12,12,12,12],species==='pig'?19:species==='dog'||species==='cat'?0:12,'',750);
  return Object.freeze({species,name,greet,play,explore,rest,move,speed,gait,wander,follows,
    buttons:Object.freeze(actions),actions:Object.freeze(Object.fromEntries([idle,...actions,...extra].map(a=>[a.id,a])))});
}
export const ANIMAL_PROFILES=Object.freeze({
  dog:profile('dog','小狗',{greet:'paw',play:'bow',explore:'sniff',rest:'sleep',move:'run',wander:.62,follows:true,actions:[
    act('paw','握爪问好',[0,2,2,1],2,'小狗坐好，抬起前爪和你握手。'),
    act('bow','邀你玩耍',[0,3,3,0],3,'小狗前腿伏低、尾巴翘起，发出玩耍邀请。'),
    act('sniff','低头嗅闻',[8,9],8,'小狗用鼻子仔细追寻地面的气味。'),
    act('sleep','蜷身休息',[10,11],10,'小狗蜷起身体，安静休息。',900),
  ],extra:[act('run','',[4,5,6,7],0,'',100)]}),
  cat:profile('cat','猫咪',{greet:'cat-blink',play:'cat-pounce',explore:'cat-inspect',rest:'cat-curl',move:'cat-prowl',speed:.9,gait:1.05,wander:.36,follows:true,actions:[
    act('cat-blink','慢眨眼',[0,1,1,0],1,'猫咪慢慢眯起眼睛，用放松的眼神回应你。',550),
    act('cat-stretch','伸个懒腰',[0,3,3,0],3,'猫咪伸长前腿、舒展背部，尾巴自然扬起。',500),
    act('cat-pounce','伏身扑跃',[3,3,5,6,4,7,3,0],3,'猫咪先压低身体观察，再收腿、伸腿轻巧扑出。',230),
    act('cat-curl','团成猫饼',[10,11],10,'猫咪把尾巴贴在身边，蜷成一团休息。',1050),
  ],extra:[act('cat-inspect','',[8,9,0],8,'猫咪低头查看近处。',450),act('cat-prowl','',[4,5,6,7],0,'',115),act('cat-stalk','',[3,3,8,9],3,'',450)]}),
  hippo:profile('hippo','小河马',{greet:'hippo-yawn',play:'hippo-dip',explore:'hippo-dip',rest:'hippo-rest',move:'hippo-walk',speed:.65,gait:1.3,wander:.2,actions:[
    act('hippo-yawn','张嘴哈欠',[12,13,14,14,13,15,12],14,'小河马稳稳站好，宽宽的下颌张开，打一个大哈欠。',450),
    act('hippo-dip','探水抬头',[12,18,18,19,12],18,'小河马低下宽吻，再慢慢抬起头；浅池联动时会配合水圈。',550),
    act('hippo-rest','伏地歇息',[16,17,17,16],17,'小河马把厚实的身体伏下来，四肢收好歇息。',1000),
  ],extra:[act('hippo-walk','',[4,5,7,5],12,'',170)]}),
  pig:profile('pig','小猪',{greet:'pig-snuffle',play:'pig-roll',explore:'pig-snuffle',rest:'pig-doze',move:'pig-trot',speed:.95,gait:.9,wander:.5,actions:[
    act('pig-snuffle','猪鼻拱拱',[12,13,14,13,15],14,'小猪左右拱动圆鼻盘，用小蹄稳住身体，认真探地。',320),
    act('pig-roll','侧身打滚',[19,16,17,16,18,19],17,'小猪侧躺露出圆肚皮，弯起小蹄子滚一滚，再站稳。',450),
    act('pig-doze','蜷肚打盹',[10,11],10,'小猪把蹄子收在肚子旁，闭眼打盹。',850),
  ],extra:[act('pig-trot','',[4,5,6,7],19,'',125)]}),
  capybara:profile('capybara','水豚',{greet:'capy-blink',play:'capy-loaf',explore:'capy-drink',rest:'capy-loaf',move:'capy-walk',speed:.48,gait:1.6,wander:.12,actions:[
    act('capy-blink','淡定眯眼',[12,13,13,12],13,'水豚安静站着，慢慢闭眼再睁开，一副淡定的样子。',800),
    act('capy-loaf','伏卧发呆',[14,18,19,18,15,14],18,'水豚收起短腿，肚皮贴地伏卧，偶尔转头看你。',1000),
    act('capy-drink','低头探水',[12,16,16,17,12],16,'水豚缓缓低头、抬起宽吻；靠近浅池时安静探水。',700),
  ],extra:[act('capy-walk','',[4,5,7,5],12,'',220)]}),
  elephant:profile('elephant','小象',{greet:'elephant-trunk',play:'elephant-ears',explore:'elephant-reach',rest:'elephant-rest',move:'elephant-walk',speed:.6,gait:1.35,wander:.25,actions:[
    act('elephant-trunk','卷鼻问好',[12,13,14,15,13,12],15,'小象四脚站稳，把鼻子卷起、伸出，再高高举起问好。',430),
    act('elephant-ears','扇扇大耳',[16,17,18,17,16,19],18,'小象的大耳朵展开、收拢，鼻尖跟着轻轻弯起。',350),
    act('elephant-rest','垂鼻歇息',[12,19,1,19,12],19,'小象稳稳站着，垂下鼻子、放松耳朵歇一会。',1000),
  ],extra:[act('elephant-reach','',[12,14,13,12],14,'小象伸鼻探索。',550),act('elephant-walk','',[4,5,7,5],12,'',190)]}),
  penguin:profile('penguin','企鹅',{greet:'penguin-flap',play:'penguin-step',explore:'penguin-look',rest:'penguin-tuck',move:'penguin-waddle',speed:.68,gait:1.2,wander:.3,actions:[
    act('penguin-flap','挥鳍问好',[12,13,14,15,14,12],14,'企鹅双脚站稳，交替张开鳍状翅膀，向你挥挥翅膀。',350),
    act('penguin-step','左右踏步',[16,17,16,17,14,12],16,'企鹅左右换脚，身体保持直立，鳍状翅膀帮助平衡。',300),
    act('penguin-tuck','缩颈打盹',[18,19],19,'企鹅把头轻轻缩向肩侧，收拢鳍状翅膀，站着打盹。',1100),
  ],extra:[act('penguin-look','',[12,8,9,12],8,'企鹅低头用眼睛和喙查看。',600),act('penguin-waddle','',[16,17],12,'',220)]}),
  redPanda:profile('redPanda','小熊猫',{greet:'panda-rise',play:'panda-tail',explore:'panda-peek',rest:'panda-curl',move:'panda-scamper',speed:1.15,gait:.85,wander:.55,follows:true,actions:[
    act('panda-rise','双爪探头',[12,16,17,17,16,12],17,'小熊猫用后腿站起，两只前爪一起举到脸旁，尾巴帮助平衡。',430),
    act('panda-tail','环尾摆摆',[12,13,14,15,14,13,12],15,'小熊猫把蓬松环纹尾巴绕到两侧，再轻轻翘起。',400),
    act('panda-peek','低伏躲猫猫',[12,18,18,16,17,18,12],18,'小熊猫把身体压低藏一下，再直起身、双爪探头。',450),
    act('panda-curl','抱尾小睡',[19],19,'小熊猫用长尾巴围住身体，把鼻尖藏进尾毛里休息。',1200),
  ],extra:[act('panda-scamper','',[4,5,6,7],12,'',100)]}),
});
const speciesKeys={'E-17':'hippo','E-18':'pig','E-19':'capybara','E-20':'elephant','E-21':'penguin','E-22':'redPanda'};
export function animalProfile(key) {
  const species=speciesKeys[key] || (/^E-(14|15|16|23)$/.test(key)?'cat':key==='D-04'||/^E-(07|08|09|10|11|12|13)$/.test(key)?'dog':null);
  return ANIMAL_PROFILES[species] || null;
}
export function animalAction(key,id) { return animalProfile(key)?.actions[id]; }
export function animalIntent(key,intent) { const p=animalProfile(key);return p?.[intent]; }
export function animalSceneResponse(key,sceneAction) {
  const p=animalProfile(key);if(!p)return null;
  if(sceneAction==='fetch')return p.species==='dog'?p.explore:p.species==='cat'?'cat-pounce':null;
  if(['shelter','bedtime'].includes(sceneAction))return p.rest;
  if(sceneAction==='water')return p.explore;
  if(['tea','stargaze'].includes(sceneAction))return p.species==='dog'?p.greet:p.species==='cat'?'cat-blink':p.species==='capybara'?p.rest:p.greet;
  if(sceneAction==='concert')return p.species==='penguin'?'penguin-step':p.play;
  return null;
}
