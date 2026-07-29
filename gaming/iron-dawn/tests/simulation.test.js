'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function createCanvas(width = 1280, height = 720) {
  return {
    width,
    height,
    addEventListener() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width, height };
    },
  };
}

globalThis.window = globalThis;
globalThis.document = { activeElement: null };
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => 1;

class RendererStub {
  constructor(canvas, minimap) {
    this.canvas = canvas;
    this.minimap = minimap;
    this.viewport = { width: canvas.width, height: canvas.height };
  }

  getViewport() {
    return this.viewport;
  }

  reset() {}

  resize() {}

  render() {}
}

globalThis.IronRenderer = RendererStub;

require('../js/i18n.js');
require('../js/core.js');
require('../js/data.js');
require('../js/ai.js');
require('../js/game.js');

function createGame(i18n) {
  const language = i18n || globalThis.IronI18n.createI18n({ locale: 'zh-CN', storage: null });
  const game = new globalThis.IronGame(createCanvas(), createCanvas(320, 200), { i18n: language });
  game.start('normal');
  game.ai.update = () => {};
  return game;
}

function findValidPlacement(game, type, team = 'player') {
  const hq = game.findBuilding(team, 'hq');
  for (let radius = 170; radius <= 370; radius += 20) {
    for (let index = 0; index < 32; index += 1) {
      const angle = (Math.PI * 2 * index) / 32;
      const candidate = {
        x: hq.x + Math.cos(angle) * radius,
        y: hq.y + Math.sin(angle) * radius,
      };
      if (game.getPlacementValidity(type, candidate.x, candidate.y, team).valid) return candidate;
    }
  }
  throw new Error(`No valid ${type} placement found for ${team}`);
}

test('initial world has one live completed HQ per team and starts in the expected state', () => {
  const game = new globalThis.IronGame(createCanvas(), createCanvas(320, 200));
  const initialHqs = game.entities.filter((entity) => entity.kind === 'building' && entity.type === 'hq');

  assert.equal(game.state, 'menu');
  assert.equal(initialHqs.length, 2);
  assert.deepEqual(new Set(initialHqs.map((hq) => hq.team)), new Set(['player', 'enemy']));
  initialHqs.forEach((hq) => {
    assert.equal(hq.complete, true);
    assert.equal(hq.hp, hq.maxHp);
    assert.equal(hq.destroyed, false);
  });

  game.start('normal');
  assert.equal(game.state, 'running');
  assert.equal(game.result, null);
  assert.equal(game.findBuilding('player', 'hq').hp, globalThis.IronData.BUILDING_TYPES.hq.hp);
  assert.equal(game.findBuilding('enemy', 'hq').hp, globalThis.IronData.BUILDING_TYPES.hq.hp);
});

test('valid building placement charges once and an overlapping retry charges nothing', () => {
  const game = createGame();
  const type = 'powerPlant';
  const definition = globalThis.IronData.BUILDING_TYPES[type];
  const position = findValidPlacement(game, type);
  const resourcesBefore = game.resources.player;

  assert.equal(game.getPlacementValidity(type, position.x, position.y, 'player').valid, true);
  const placed = game.placeBuilding(type, position.x, position.y, 'player', false);

  assert.ok(placed);
  assert.equal(placed.complete, false);
  assert.equal(game.resources.player, resourcesBefore - definition.cost);

  const resourcesAfterPlacement = game.resources.player;
  const overlap = game.getPlacementValidity(type, position.x, position.y, 'player');
  const rejected = game.placeBuilding(type, position.x, position.y, 'player', false);

  assert.equal(overlap.valid, false);
  assert.equal(overlap.reason, '与现有设施重叠');
  assert.equal(rejected, null);
  assert.equal(game.resources.player, resourcesAfterPlacement);
});

test('queued rifle infantry deploys after about five simulated seconds', () => {
  const game = createGame();
  const barracks = game.findBuilding('player', 'barracks');
  const initialRifles = game.countType('player', 'unit', 'rifle', false);

  game.selectedIds = new Set([barracks.id]);
  assert.equal(game.queueUnit('rifle', 'player'), true);
  assert.equal(barracks.queue.length, 1);

  game.step(3500);
  assert.equal(game.countType('player', 'unit', 'rifle', false), initialRifles);

  game.step(1500);
  assert.equal(game.countType('player', 'unit', 'rifle', false), initialRifles + 1);
  assert.equal(barracks.queue.length, 0);
});

test('starting player harvester completes at least one delivery within 30 seconds', () => {
  const game = createGame();
  const harvester = game.entities.find((entity) => entity.kind === 'unit'
    && entity.team === 'player' && entity.type === 'harvester');

  assert.ok(harvester);
  assert.equal(game.stats.player.harvested, 0);

  game.step(30000);

  assert.ok(game.stats.player.harvested > 0);
  assert.ok(game.stats.player.harvested >= globalThis.IronData.UNIT_TYPES.harvester.cargo);
});

test('every ore field uses the increased 9000-credit base capacity', () => {
  const game = createGame();
  const expectedScales = [1, 0.85, 1, 0.85, 0.75, 1.3, 0.9];

  assert.equal(globalThis.IronData.BALANCE.oreNodeCapacity, 9000);
  assert.deepEqual(game.minerals.map((mine) => mine.maxAmount),
    expectedScales.map((scale) => Math.round(9000 * scale)));
  assert.ok(game.minerals.every((mine) => mine.amount === mine.maxAmount));
  assert.equal(game.minerals.reduce((sum, mine) => sum + mine.amount, 0), 59850);
});

test('a completed airfield produces a fighter and sends it to its rally point', () => {
  const game = createGame();
  assert.equal(game.hasPrerequisite('player', 'airfield'), false);
  game.addBuilding('factory', 'player', 820, 430, true);
  assert.equal(game.hasPrerequisite('player', 'airfield'), true);
  const airfield = game.addBuilding('airfield', 'player', 1050, 430, true);
  game.resources.player = 10000;
  game.selectedIds = new Set([airfield.id]);
  assert.equal(game.isProductionBuilding(airfield), true);
  assert.equal(game.setRallyPoint([airfield], { x: 1500, y: 430 }), true);
  assert.equal(game.queueUnit('fighter', 'player'), true);

  game.step(18100);

  const fighter = game.entities.find((entity) => entity.kind === 'unit'
    && entity.team === 'player' && entity.type === 'fighter');
  assert.ok(fighter);
  assert.equal(fighter.movementLayer, 'air');
  assert.equal(fighter.command.type, 'move');
  assert.equal(fighter.command.x, 1500);
  assert.equal(fighter.command.y, 430);
  assert.equal(airfield.queue.length, 0);
});

test('a nearby player tank attack lowers enemy tank health', () => {
  const game = createGame();
  const attacker = game.addUnit('tank', 'player', 1050, 1060);
  const target = game.addUnit('tank', 'enemy', 1180, 1060);
  const hpBefore = target.hp;

  attacker.command = { type: 'attack', targetId: target.id };
  game.step(1000);

  assert.ok(target.hp < hpBefore, `expected enemy HP below ${hpBefore}, received ${target.hp}`);
});

test('destroying the enemy HQ wins once and restart restores the initial world', () => {
  const game = createGame();
  const baseline = game.snapshot();
  const enemyHq = game.findBuilding('enemy', 'hq');
  const attacker = game.entities.find((entity) => entity.kind === 'unit' && entity.team === 'player');
  const originalFinish = game.finish.bind(game);
  let finishCalls = 0;
  game.finish = (...args) => {
    finishCalls += 1;
    return originalFinish(...args);
  };

  game.applyDamage(enemyHq, enemyHq.hp, attacker.id);
  game.step(20);

  assert.equal(game.state, 'won');
  assert.equal(game.result.result, 'won');
  assert.equal(finishCalls, 1);

  game.checkVictory();
  game.checkVictory();
  game.step(1000);
  assert.equal(finishCalls, 1);

  game.restart();

  assert.equal(game.state, 'running');
  assert.equal(game.result, null);
  assert.equal(game.time, 0);
  assert.deepEqual(game.resources, baseline.resources);
  assert.equal(game.entities.length, baseline.entityCount);
  assert.equal(game.selectedIds.size, 0);
  assert.equal(game.projectiles.length, 0);
  assert.equal(game.findBuilding('player', 'hq').hp, globalThis.IronData.BUILDING_TYPES.hq.hp);
  assert.equal(game.findBuilding('enemy', 'hq').hp, globalThis.IronData.BUILDING_TYPES.hq.hp);
  assert.equal(finishCalls, 1);
});

test('structured event logs retranslate without mutating the running match', () => {
  const i18n = globalThis.IronI18n.createI18n({ locale: 'zh-CN', storage: null });
  const game = createGame(i18n);
  const snapshotBefore = game.snapshot();
  const entry = game.logs.find((item) => item.key === 'game.start.objective');

  assert.ok(entry);
  const chinese = i18n.t(entry.key, entry.params);
  i18n.setLocale('en', { persist: false });
  const english = i18n.t(entry.key, entry.params);

  assert.equal(chinese, '战区链路建立。摧毁赤砂军团的指挥核心。');
  assert.equal(english, 'Sector link established. Destroy the Red Sand command core.');
  assert.deepEqual(game.snapshot(), snapshotBefore);
  assert.equal(game.logs.find((item) => item.id === entry.id).key, 'game.start.objective');
});
