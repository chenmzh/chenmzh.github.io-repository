const test = require('node:test');
const assert = require('node:assert/strict');

const Animation = require('../js/animation.js');
const { MANIFEST } = require('../js/assets.js');

test('all six unit and seven building types map to an animation sheet', () => {
  const pairs = [
    ['unit', 'rifle'], ['unit', 'rocket'], ['unit', 'scout'], ['unit', 'tank'], ['unit', 'harvester'],
    ['unit', 'fighter'],
    ['building', 'hq'], ['building', 'powerPlant'], ['building', 'refinery'],
    ['building', 'barracks'], ['building', 'factory'], ['building', 'airfield'], ['building', 'turret'],
  ];
  pairs.forEach(([kind, type]) => {
    const key = Animation.animationKeyForEntity({ kind, type });
    assert.ok(key, `${kind}:${type}`);
    assert.equal(MANIFEST[key].animation, true);
  });
});

test('unit clips prioritize fire, then harvester work, movement, and idle', () => {
  const game = { time: 12, power: {} };
  assert.equal(Animation.resolveClip({ kind: 'unit', type: 'rifle', lastFireAt: 11.8, lastMoveAt: 12 }, game), 'fire');
  assert.equal(Animation.resolveClip({ kind: 'unit', type: 'harvester', harvestState: 'mining' }, game), 'mining');
  assert.equal(Animation.resolveClip({ kind: 'unit', type: 'harvester', harvestState: 'unloading' }, game), 'unloading');
  assert.equal(Animation.resolveClip({ kind: 'unit', type: 'tank', lastMoveAt: 11.92 }, game), 'move');
  assert.equal(Animation.resolveClip({ kind: 'unit', type: 'tank', lastMoveAt: 10 }, game), 'idle');
});

test('building clips reflect production, processing, turret fire, and low power', () => {
  const game = { time: 8, power: { player: { supply: 20, use: 10 } } };
  assert.equal(Animation.resolveClip({ kind: 'building', type: 'hq', team: 'player' }, game), 'active');
  assert.equal(Animation.resolveClip({ kind: 'building', type: 'barracks', team: 'player', queue: [{}] }, game), 'producing');
  assert.equal(Animation.resolveClip({ kind: 'building', type: 'airfield', team: 'player', queue: [{}] }, game), 'producing');
  assert.equal(Animation.resolveClip({ kind: 'building', type: 'refinery', team: 'player', activityUntil: 8.3 }, game), 'processing');
  assert.equal(Animation.resolveClip({ kind: 'building', type: 'turret', team: 'player', lastFireAt: 7.8 }, game), 'fire');
  game.power.player = { supply: 10, use: 30 };
  assert.equal(Animation.resolveClip({ kind: 'building', type: 'factory', team: 'player', queue: [{}] }, game), 'lowPower');
});

test('distance animation advances without sliding and event clips clamp on their final frame', () => {
  const definition = MANIFEST.animUnitTank;
  assert.equal(Animation.resolveFrame(definition, 'move', { distance: 0 }).index, 2);
  assert.equal(Animation.resolveFrame(definition, 'move', { distance: 7.9 }).index, 2);
  assert.equal(Animation.resolveFrame(definition, 'move', { distance: 8 }).index, 3);
  assert.equal(Animation.resolveFrame(definition, 'move', { distance: 32 }).index, 2);
  const fired = Animation.resolveFrame(definition, 'fire', { eventAge: 4 });
  assert.equal(fired.index, 8);
  assert.equal(fired.complete, true);
});

test('reduced motion halves continuous time loops and fixed game time freezes frames', () => {
  const definition = MANIFEST.animBuildingPowerPlant;
  const regular = Animation.resolveFrame(definition, 'active', { time: 1, phase: 0, reducedMotion: false });
  const reduced = Animation.resolveFrame(definition, 'active', { time: 1, phase: 0, reducedMotion: true });
  assert.equal(regular.index, 0);
  assert.equal(reduced.index, 3);
  const first = Animation.resolveFrame(definition, 'active', { time: 4.25, phase: 0.2 });
  const paused = Animation.resolveFrame(definition, 'active', { time: 4.25, phase: 0.2 });
  assert.deepEqual(paused, first);
});

test('animation resolution is pure and does not mutate the entity or game', () => {
  const entity = Object.freeze({
    id: 7, kind: 'unit', type: 'rifle', animationDistance: 19, lastMoveAt: 2, lastFireAt: -Infinity,
  });
  const game = Object.freeze({ time: 2.05, power: Object.freeze({}) });
  const before = JSON.stringify({ ...entity });
  const clip = Animation.resolveClip(entity, game);
  const clocks = Animation.clocksFor(entity, game, { reducedMotion: false });
  Animation.resolveFrame(MANIFEST.animUnitRifle, clip, clocks);
  assert.equal(JSON.stringify({ ...entity }), before);
  assert.equal(game.time, 2.05);
});
