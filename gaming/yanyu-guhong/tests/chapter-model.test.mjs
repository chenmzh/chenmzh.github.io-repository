import test from 'node:test';
import assert from 'node:assert/strict';
import { ChapterState } from '../chapter-model.js';

const unlockBridge = chapter => { chapter.interact('tea'); chapter.interact('shrine'); };
const gatherMedicine = chapter => { chapter.interact('herbalist'); chapter.interact('herbs'); chapter.interact('herbalist'); };

test('exploration gates the bridge behind both clues and advances its objective', () => {
  const c = new ChapterState();
  assert.match(c.getObjective(), /茶摊/);
  assert.deepEqual(c.interact('bridge'), { dialogue: 'bridge_locked' });
  assert.throws(() => c.battleConfig(), /条件/);
  c.interact('tea'); assert.match(c.getObjective(), /旧碑/);
  assert.equal(c.interact('bridge').startBattle, undefined);
  c.interact('shrine'); assert.equal(c.interact('bridge').startBattle, true);
  assert.match(c.getObjective(), /石桥/);
});

test('talking, gathering and chest rewards are one-time and herbs require the quest', () => {
  const c = new ChapterState();
  assert.equal(c.interact('ferryman').dialogue, 'ferryman_first');
  assert.equal(c.interact('ferryman').dialogue, 'ferryman_repeat');
  assert.equal(c.interact('herbs').dialogue, 'herbs_locked');
  assert.equal(c.snapshot().flags.herbs, false);
  assert.equal(c.interact('herbalist').dialogue, 'herbalist_first');
  assert.equal(c.interact('herbalist').dialogue, 'herbalist_repeat');
  assert.equal(c.interact('herbs').dialogue, 'herbs_found');
  assert.equal(c.interact('herbalist').dialogue, 'herbalist_return');
  unlockBridge(c); c.interact('chest');
  const before = c.snapshot();
  for (let i = 0; i < 5; i++) for (const id of ['tea', 'shrine', 'chest', 'herbs', 'herbalist']) c.interact(id);
  assert.deepEqual(c.snapshot(), before);
  assert.equal(before.hero.potions, 5); assert.equal(before.hero.xp, 70);
  assert.equal(new Set(before.journal).size, before.journal.length);
});

test('level thresholds provide persistent points and each training choice is learned once', () => {
  const c = new ChapterState();
  assert.throws(() => c.learn('sword'), /不足/);
  unlockBridge(c); c.interact('chest');
  assert.equal(c.snapshot().hero.xp, 45); assert.equal(c.snapshot().hero.level, 1);
  gatherMedicine(c);
  assert.equal(c.snapshot().hero.level, 2); assert.equal(c.snapshot().hero.hp, 180);
  assert.equal(c.snapshot().hero.qi, 66); c.learn('sword');
  assert.equal(c.snapshot().hero.attackBonus, 5); assert.throws(() => c.learn('sword'), /已经/);
  const config = c.battleConfig(); assert.equal(config.attackBonus, 5);
  assert.throws(() => c.learn('vitality'), /交锋/);
  c.finishBattle(true, { ...config, hp: 25, qi: 4, potions: 2 });
  assert.equal(c.snapshot().hero.level, 3); assert.equal(c.snapshot().hero.hp, 45);
  assert.equal(c.snapshot().hero.qi, 10); c.learn('vitality');
  assert.equal(c.snapshot().hero.maxHp, 225); assert.equal(c.snapshot().hero.hp, 70);
  assert.equal(c.snapshot().hero.skillPoints, 0);
});

test('battle result preserves consumed resources and cannot duplicate rewards or fabricate potions', () => {
  const c = new ChapterState(); unlockBridge(c);
  const first = c.battleConfig();
  assert.equal(c.finishBattle(false, { ...first, hp: 0, qi: 0, potions: 1 }).dialogue, 'battle_lost');
  assert.equal(c.snapshot().hero.hp, 1); assert.equal(c.snapshot().hero.potions, 1);
  assert.equal(c.finishBattle(true, { ...first, potions: 99 }), null);
  c.interact('rest'); assert.equal(c.snapshot().hero.potions, 1);
  const retry = c.battleConfig(); c.battleConfig();
  const result = c.finishBattle(true, { ...retry, potions: 99 });
  assert.equal(result.choice, true); assert.equal(c.snapshot().hero.potions, 1);
  const after = c.snapshot(); assert.equal(after.hero.xp, 95);
  assert.equal(c.finishBattle(true, retry), null); assert.deepEqual(c.snapshot(), after);
  assert.throws(() => c.battleConfig(), /条件/);
});

test('invalid battle results are atomic and can be retried with a valid result', () => {
  const c = new ChapterState(); unlockBridge(c); const h = c.battleConfig(); const before = c.snapshot();
  assert.throws(() => c.finishBattle(true, { hp: NaN, qi: 0, potions: 0 }), /无效/);
  assert.deepEqual(c.snapshot(), before);
  assert.equal(c.finishBattle(false, h).dialogue, 'battle_lost');
});

test('both chapter endings require victory and the chosen consequence is irreversible', () => {
  for (const ending of ['witness', 'shelter']) {
    const c = new ChapterState(); assert.throws(() => c.chooseEnding(ending), /交锋/);
    unlockBridge(c); const h = c.battleConfig(); c.finishBattle(true, h);
    assert.equal(c.interact('bridge').choice, true);
    assert.equal(c.chooseEnding(ending), `ending_${ending}`);
    assert.equal(c.chooseEnding(ending === 'witness' ? 'shelter' : 'witness'), `ending_${ending}`);
    assert.equal(c.interact('bridge').dialogue, 'bridge_complete');
    assert.match(c.getObjective(), /已完成/);
    const restored = new ChapterState(c.snapshot()); assert.equal(restored.restored, true);
    assert.equal(restored.snapshot().flags.ending, ending);
  }
});

test('save restore retains growth, first conversations and coordinates without sharing references', () => {
  const c = new ChapterState(); c.markIntro(); c.interact('ferryman'); unlockBridge(c); gatherMedicine(c); c.learn('sword'); c.moveTo(700, 280);
  const saved = c.snapshot(), restored = new ChapterState(JSON.stringify(saved));
  assert.deepEqual(restored.snapshot(), saved); assert.equal(restored.restored, true);
  assert.equal(restored.interact('ferryman').dialogue, 'ferryman_repeat');
  saved.hero.hp = 1; saved.flags.tea = false;
  assert.equal(c.snapshot().hero.hp, 180); assert.equal(restored.snapshot().flags.tea, true);
  restored.moveTo(-50, 3000); assert.deepEqual(restored.snapshot().position, { x: 0, y: 1000 });
  restored.moveTo(NaN, Infinity); assert.deepEqual(restored.snapshot().position, { x: 0, y: 1000 });
});

test('corrupted, incompatible and impossible saves recover to a clean playable state', () => {
  const clean = new ChapterState().snapshot();
  const badSaves = ['{', {}, { ...clean, version: 2 }, { ...clean, hero: { ...clean.hero, xp: 1000 } },
    { ...clean, flags: { ...clean.flags, ending: 'witness' } },
    { ...clean, flags: { ...clean.flags, medicine: true } },
    { ...clean, learned: { sword: true, vitality: true } },
    { ...clean, hero: { ...clean.hero, potions: 99 } },
    { ...clean, position: { x: Infinity, y: 10 } }];
  for (const saved of badSaves) {
    const c = new ChapterState(saved); assert.equal(c.invalidSave, true); assert.deepEqual(c.snapshot(), clean);
    assert.equal(c.interact('tea').dialogue, 'tea_first');
  }
});
