import { ZOO_ACTIONS, ZOO_KEYS } from './zoo.js';
import { animalSceneResponse } from './animal-behavior.js';
// Scene backgrounds are decorative environments, not new inventory or paid unlocks.
export const SCENES = Object.freeze([
  { id: 'cozy', name: '原木小屋', caption: '一杯茶，一段慢时光', image: './assets/room/cozy-room-v1.webp', ambient: 'none', actions: ['tea', 'concert', 'parade', 'hide'] },
  { id: 'garden', name: '晴日花园', caption: '追一颗球，照顾一点绿意', image: './assets/room/scenes/garden-v1.webp', ambient: 'pollen', actions: ['fetch', 'water', 'splash', 'mud', 'shower'] },
  { id: 'rain', name: '雨声书房', caption: '窗外下雨，屋里安心', image: './assets/room/scenes/rain-v1.webp', ambient: 'rain', actions: ['shelter', 'tea', 'mud', 'hide'] },
  { id: 'night', name: '星光露台', caption: '点一盏灯，和星星说晚安', image: './assets/room/scenes/night-v1.webp', ambient: 'stars', actions: ['bedtime', 'stargaze', 'parade'] },
]);
export const sceneById = id => SCENES.find(scene => scene.id === id);
export const currentScene = state => state.room?.scene || 'cozy';
export const SCENE_ACTIONS = Object.freeze({
  ...ZOO_ACTIONS,
  tea: { name: '茶与故事', needs: '摆出茶杯或任意卡册', test: items => items.some(i => i.key === 'D-08' || i.key.startsWith('F-')), message: '热茶轻轻冒气，卡册翻开新一页；动物伙伴靠过来坐好，陪你读一段故事。' },
  concert: { name: '小小音乐会', needs: '摆出旋转音乐盒', test: items => items.some(i => i.key === 'D-10'), message: '木马开始转动；企鹅踏步、小象扇耳、猫咪伏身，各自用不同姿态回应。音效仍由右上角开关决定。' },
  fetch: { name: '抛球追逐', needs: '摆出小狗或猫咪', test: items => items.some(item => animalSceneResponse(item.key,'fetch')), message: '小狗追球后嗅闻，猫咪先伏身观察再扑跃；其他物种不被强制加入追球。再次点击可换一个落点。小球只是场景道具，不计入收藏。' },
  water: { name: '给盆栽浇水', needs: '摆出心叶盆栽', test: items => items.some(i => i.key === 'D-09'), message: '水滴落在心叶上，叶片轻轻舒展；动物伙伴走近闻闻新鲜气息。' },
  shelter: { name: '窝好听雨', needs: '摆出至少一只动物伙伴', test: items => items.some(isPetItem), message: '动物伙伴走向抱枕旁，按各自习惯歇息：有的蜷身，有的伏卧或缩颈；没有抱枕时会在窗边的地毯休息。' },
  bedtime: { name: '晚安仪式', needs: '摆出动物伙伴、台灯或晚安月亮', test: items => items.some(i => isPetItem(i) || ['D-07', 'LAST'].includes(i.key)), message: '摆出的灯具已点亮并保存，动物伙伴走到抱枕旁慢慢睡下。星光陪你，不催促你。' },
  stargaze: { name: '一起观星', needs: '摆出 A 赏伙伴、星星挂件或火箭', test: items => items.some(i => ['A', 'A-01', 'D-05', 'E-03'].includes(i.key)), message: '星轨在夜空亮起，领航员与星星藏品回应；动物伙伴坐好，和你一起望向天空。' },
});
export function isDogItem(item) { return item.key === 'D-04' || /^E-(07|08|09|10|11|12|13)$/.test(item.key); }
export function isPetItem(item) { return isDogItem(item) || /^E-(14|15|16|23)$/.test(item.key) || ZOO_KEYS.includes(item.key); }
export function sceneActionAllowed(scene, action, items) {
  return Boolean(sceneById(scene)?.actions.includes(action) && SCENE_ACTIONS[action]?.test(items));
}
