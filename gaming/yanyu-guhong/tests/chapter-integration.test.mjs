import test from 'node:test';
import assert from 'node:assert/strict';
import { ChapterState } from '../chapter-model.js';
import { TurnBattle } from '../turn-model.js';

function exploreAll(chapter) {
  chapter.markIntro();
  for (const id of ['ferryman', 'tea', 'herbalist', 'herbs', 'herbalist', 'shrine', 'chest']) chapter.interact(id);
}

function winStrategically(battle) {
  const actions = [];
  for (let turn = 0; turn < 20 && battle.phase === 'player'; turn++) {
    const enemy = battle.enemies.find(e => e.id === 'chief' && e.hp > 0) || battle.enemies.find(e => e.hp > 0);
    const action = battle.hero.ultimate >= 100 ? 'ultimate' : battle.hero.hp < 65 && battle.hero.potions ? 'heal' : battle.round % 3 === 0 ? 'guard' : enemy.weak === 'qi' && battle.hero.qi < 12 ? 'guard' : enemy.weak;
    actions.push(action);
    battle.act(action, enemy.id, Math.min(3, battle.hero.bp));
  }
  assert.equal(battle.phase, 'won', 'a growth-equipped hero can finish the encounter through legal actions');
  return actions;
}

test('first chapter completes exploration, growth, a real battle and persistent ending', () => {
  const chapter = new ChapterState(); exploreAll(chapter);
  assert.equal(chapter.snapshot().hero.xp, 70);
  assert.equal(chapter.snapshot().hero.level, 2);
  chapter.learn('sword');
  assert.equal(chapter.interact('bridge').startBattle, true);
  const config = chapter.battleConfig(), battle = new TurnBattle(config);
  for (const key of ['hp', 'maxHp', 'qi', 'maxQi', 'potions', 'attackBonus']) assert.equal(battle.hero[key], config[key], `${key} crosses the encounter boundary`);
  const actions = winStrategically(battle); assert.ok(actions.includes('ultimate'));
  const resultHero = battle.snapshot().hero;
  assert.equal(chapter.finishBattle(true, resultHero).choice, true);
  const after = chapter.snapshot();
  assert.equal(after.hero.xp, 130); assert.equal(after.hero.level, 3);
  assert.equal(after.hero.hp, resultHero.hp + 20); assert.equal(after.hero.qi, resultHero.qi + 6);
  assert.equal(after.hero.potions, resultHero.potions);
  chapter.learn('vitality'); assert.equal(chapter.snapshot().hero.maxHp, 225);
  assert.equal(chapter.chooseEnding('witness'), 'ending_witness');
  const saved = chapter.snapshot(), restored = new ChapterState(JSON.stringify(saved));
  assert.equal(restored.restored, true); assert.deepEqual(restored.snapshot(), saved);
  assert.equal(restored.interact('bridge').dialogue, 'bridge_complete');
  assert.equal(restored.chooseEnding('shelter'), 'ending_witness');
});

test('real defeat consumes medicine, survives save/load, then rest permits a successful retry', () => {
  let chapter = new ChapterState(); chapter.interact('tea'); chapter.interact('shrine');
  const battle = new TurnBattle(chapter.battleConfig());
  battle.act('sword', 'chief'); battle.act('heal');
  while (battle.phase === 'player') battle.act('sword', 'chief');
  assert.equal(battle.phase, 'lost'); assert.equal(battle.hero.potions, 2);
  assert.equal(chapter.finishBattle(false, battle.snapshot().hero).dialogue, 'battle_lost');
  const lostSave = chapter.snapshot();
  assert.equal(lostSave.hero.hp, 1); assert.equal(lostSave.hero.potions, 2);
  assert.equal(lostSave.hero.xp, 35); assert.equal(lostSave.flags.battleWon, false);
  chapter = new ChapterState(JSON.stringify(lostSave)); assert.equal(chapter.restored, true);
  assert.deepEqual(chapter.snapshot(), lostSave);
  chapter.interact('rest'); assert.equal(chapter.snapshot().hero.hp, 160); assert.equal(chapter.snapshot().hero.qi, 60);
  assert.equal(chapter.snapshot().hero.potions, 2, 'rest does not reimburse battle consumables');
  const retry = new TurnBattle(chapter.battleConfig()); winStrategically(retry);
  chapter.finishBattle(true, retry.snapshot().hero);
  assert.equal(chapter.snapshot().hero.xp, 95);
  assert.equal(chapter.chooseEnding('shelter'), 'ending_shelter');
  assert.equal(new ChapterState(chapter.snapshot()).snapshot().flags.ending, 'shelter');
});

test('learned sword bonus affects every boosted sword hit but does not change qi damage', () => {
  const chapter = new ChapterState(); exploreAll(chapter); chapter.learn('sword');
  const config = chapter.battleConfig();
  const trained = new TurnBattle(config), baseline = new TurnBattle({ ...config, attackBonus: 0 });
  const hits = b => b.act('sword', 'guard', 1).filter(e => e.kind === 'hit' && e.actor === 'hero');
  const baseHits = hits(baseline), trainedHits = hits(trained);
  assert.equal(trainedHits.length, 2);
  trainedHits.forEach((hit, i) => assert.equal(hit.amount - baseHits[i].amount, 5));
  const trainedQi = new TurnBattle(config).act('qi', 'chief')[0];
  const baselineQi = new TurnBattle({ ...config, attackBonus: 0 }).act('qi', 'chief')[0];
  assert.equal(trainedQi.amount, baselineQi.amount);
});

test('reloading an encounter returns to its saved start and result replay cannot grant resources', () => {
  const chapter = new ChapterState(); exploreAll(chapter); chapter.learn('sword');
  const config = chapter.battleConfig(), savedBefore = chapter.snapshot();
  const battle = new TurnBattle(config); battle.act('sword', 'chief'); battle.act('heal');
  const reloaded = new ChapterState(JSON.stringify(savedBefore));
  assert.deepEqual(reloaded.snapshot(), savedBefore);
  assert.equal(reloaded.interact('bridge').startBattle, true);
  const restarted = new TurnBattle(reloaded.battleConfig());
  assert.equal(restarted.hero.hp, config.hp); assert.equal(restarted.hero.potions, config.potions);
  winStrategically(restarted); const result = restarted.snapshot().hero;
  reloaded.finishBattle(true, result); const settled = reloaded.snapshot();
  assert.equal(reloaded.finishBattle(true, { ...result, potions: 99 }), null);
  assert.deepEqual(reloaded.snapshot(), settled);
  const loadedAfter = new ChapterState(JSON.stringify(settled));
  assert.equal(loadedAfter.finishBattle(true, result), null);
  assert.deepEqual(loadedAfter.snapshot(), settled);
});
