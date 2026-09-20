// Cartoon zoo enrichment, not animal-care advice. All choreography is ephemeral.
import { animalProfile } from './animal-behavior.js';
export const ZOO_KEYS = Object.freeze(['E-17','E-18','E-19','E-20','E-21','E-22']);
export const ZOO_PROFILES = Object.freeze(Object.fromEntries(ZOO_KEYS.map(key => {
  const p=animalProfile(key);return [key,Object.freeze({speed:p.speed,gait:p.gait,greeting:p.actions[p.greet].message})];
})));
const definitions = {
  splash: { name:'浅池踩水', scenes:['garden'], animals:['E-17','E-19'], prop:'D-08', needs:'摆出小河马或水豚＋云朵茶杯', responses:{'E-17':'hippo-dip','E-19':'capy-drink'}, message:'茶杯旁铺开一汪临时浅池，小河马低吻抬头，水豚缓缓探水，分别使用自己的姿态。水面是临时场景效果，不增加物品。' },
  mud: { name:'泥点小脚印', scenes:['garden','rain'], animals:['E-18'], prop:'D-06', needs:'摆出小猪＋雏菊围裙', responses:{'E-18':'pig-snuffle'}, message:'小猪走到围裙旁，低头拱拱软泥，再抬起小蹄子；泥点和脚印会自动消散，不会弄脏存档。' },
  shower: { name:'象鼻小喷泉', scenes:['garden'], animals:['E-20'], prop:'D-09', needs:'摆出小象＋心叶盆栽', responses:{'E-20':'elephant-trunk'}, message:'小象走近盆栽，卷起鼻子喷出弧形水花，心叶轻轻摇晃。这里是玩具小象的童话喷水，不是真实饲养示范。' },
  parade: { name:'企鹅节拍', scenes:['cozy','night'], animals:['E-21'], prop:'D-10', needs:'摆出企鹅＋旋转音乐盒', responses:{'E-21':'penguin-step'}, message:'音乐盒木马转动，企鹅踏着节拍左右换脚、挥动小翅膀。音符是视觉效果，声音仍由音效开关决定。' },
  hide: { name:'抱枕捉迷藏', scenes:['cozy','rain'], animals:['E-22'], prop:'D-11', needs:'摆出小熊猫＋蜂蜜抱枕', responses:{'E-22':'panda-peek'}, hiddenFrame:18, message:'小熊猫跑到抱枕旁，趴低躲一下，再举起前爪探头。大尾巴藏不住，好像在说「找到我啦！」' },
};
export const ZOO_ACTIONS = Object.freeze(Object.fromEntries(Object.entries(definitions).map(([id,a])=>[id,Object.freeze({...a,test:items=>items.some(i=>a.animals.includes(i.key))&&items.some(i=>i.key===a.prop)})])));
export function zooPlan(action,items) {
  const a=ZOO_ACTIONS[action];if(!a||!a.test(items))return null;
  const prop=items.find(i=>i.key===a.prop);
  const anchor={...prop,x:Math.max(18,Math.min(82,prop.x)),y:Math.max(76,Math.min(94,prop.y))};
  return { action,anchor,definition:a,actors:items.filter(i=>a.animals.includes(i.key)),duration:12000 };
}
