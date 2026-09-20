import { ownedItems } from './ownership.js';
export { ownedItems } from './ownership.js';
import { SCENES, sceneById, currentScene } from './scenes.js';
export const ROOM_LIMIT = 60;
export function roomItems(state) { return state.room?.items || []; }
export function fitPosition(x, y, size) {
  return { x: Math.max(size / 2, Math.min(100 - size / 2, x)), y: Math.max(size * 1.5, Math.min(100, y)) };
}
export function validRoom(state) {
  if (state.room === undefined) return true;
  if (!state.room || (state.room.scene !== undefined && !sceneById(state.room.scene))) return false;
  const layouts = state.room.layouts;
  if (layouts !== undefined && (!layouts || typeof layouts !== 'object' || Array.isArray(layouts) || Object.keys(layouts).some(key => !sceneById(key) || key === currentScene(state)))) return false;
  return [state.room.items, ...Object.values(layouts || {})].every(items => validItems(state, items));
}
function validItems(state, items) {
  if (!Array.isArray(items) || items.length > ROOM_LIMIT) return false;
  const ids = new Set(), counts = ownedItems(state);
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !/^[0-9a-f-]{36}$/.test(item.id) || ids.has(item.id)) return false;
    ids.add(item.id);
    if (!Object.hasOwn(counts, item.key) || --counts[item.key] < 0) return false;
    if (![item.x, item.y, item.size].every(Number.isFinite) || item.size < 8 || item.size > 28) return false;
    const fit = fitPosition(item.x, item.y, item.size);
    if (fit.x !== item.x || fit.y !== item.y || typeof item.active !== 'boolean') return false;
  }
  return true;
}
function update(state, items) {
  const next = { ...state, room: { ...state.room, items } };
  if (!validRoom(next)) throw new Error('小屋布局无效，本次操作未保存。');
  return next;
}
export function placeItem(state, key) {
  const items = roomItems(state), available = ownedItems(state)[key] || 0;
  if (available <= items.filter(item => item.key === key).length) throw new Error('这款藏品已全部摆出，收回一件后可重新摆放。');
  if (items.length >= ROOM_LIMIT) throw new Error(`小屋最多同时摆放 ${ROOM_LIMIT} 件，请先收回一些藏品。`);
  const index = items.length;
  const size = ['A', 'B', 'C'].includes(key.split('-')[0]) ? 22 : key === 'D-06' ? 18 : 14;
  return update(state, [...items, { id: crypto.randomUUID(), key, size, x: 30 + index % 6 * 9, y: 76 + Math.floor(index / 6) % 3 * 7, active: false }]);
}
export function changeItem(state, id, patch) {
  const items = roomItems(state), existing = items.find(item => item.id === id);
  if (!existing) throw new Error('这件藏品已被收回，请重新选择。');
  if (Object.keys(patch).some(key => !['x', 'y', 'size', 'active'].includes(key))) throw new Error('无效布局操作');
  const changed = { ...existing, ...patch };
  Object.assign(changed, fitPosition(changed.x, changed.y, changed.size));
  return update(state, items.map(item => item.id === id ? changed : item));
}
export function removeItem(state, id) {
  return update(state, roomItems(state).filter(item => item.id !== id));
}
// Each scene is a saved arrangement of the same collection, not extra owned copies.
// First visits start empty; subsequent visits restore that scene's saved arrangement.
export function switchScene(state, scene) {
  if (!sceneById(scene)) throw new Error('未知场景，本次切换未保存。');
  if (scene === currentScene(state)) return state;
  const layouts = { ...state.room?.layouts, [currentScene(state)]: roomItems(state) };
  const items = layouts[scene] || [];
  delete layouts[scene];
  const next = { ...state, room: { ...state.room, scene, items, layouts } };
  if (!validRoom(next)) throw new Error('场景布局无效，本次切换未保存。');
  return next;
}
export function savedSceneCount(state) {
  return SCENES.filter(scene => scene.id === currentScene(state) || Object.hasOwn(state.room?.layouts || {}, scene.id)).length;
}
