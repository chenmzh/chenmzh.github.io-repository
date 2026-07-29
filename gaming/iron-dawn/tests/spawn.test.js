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

const Data = globalThis.IronData;

function createGame() {
  const i18n = globalThis.IronI18n.createI18n({ locale: 'zh-CN', storage: null });
  const game = new globalThis.IronGame(createCanvas(), createCanvas(320, 200), { i18n });
  game.start('normal');
  game.ai.update = () => {};
  return game;
}

function unitsOf(game, team) {
  return game.entities.filter((entity) => entity.kind === 'unit' && entity.team === team);
}

function buildingsOf(game, team) {
  return game.entities.filter((entity) => entity.kind === 'building' && entity.team === team);
}

function assertSpawnLegal(game, unit) {
  const layer = unit.movementLayer || 'ground';
  const radius = unit.collisionRadius || unit.radius;
  assert.equal(
    game.isSpawnPointLegal(layer, radius, unit.x, unit.y, unit.id),
    true,
    `${unit.team} ${unit.type} spawn at (${unit.x.toFixed(1)}, ${unit.y.toFixed(1)}) must be legal`,
  );
}

test('opening field gives the player exactly four buildings and six units', () => {
  const game = createGame();

  assert.equal(buildingsOf(game, 'player').length, 4);
  assert.equal(unitsOf(game, 'player').length, 6);
  assert.deepEqual(
    buildingsOf(game, 'player').map((building) => building.type).sort(),
    ['barracks', 'hq', 'powerPlant', 'refinery'],
  );
  assert.deepEqual(
    unitsOf(game, 'player').map((unit) => unit.type).sort(),
    ['harvester', 'rifle', 'rifle', 'rifle', 'rocket', 'scout'],
  );
});

test('every starting spawn point is legal on both teams', () => {
  const game = createGame();

  assert.ok(game.entities.filter((entity) => entity.kind === 'unit').length >= 12);
  game.entities
    .filter((entity) => entity.kind === 'unit')
    .forEach((unit) => assertSpawnLegal(game, unit));
});

test('no infantry ever overlaps a refinery collision hull at game start', () => {
  const game = createGame();
  const refineries = game.entities.filter((entity) => entity.kind === 'building'
    && entity.type === 'refinery');
  const infantry = game.entities.filter((entity) => entity.kind === 'unit'
    && (entity.type === 'rifle' || entity.type === 'rocket'));

  assert.equal(refineries.length, 2);
  assert.ok(infantry.length >= 6);
  infantry.forEach((soldier) => {
    refineries.forEach((refinery) => {
      const clearance = Math.hypot(soldier.x - refinery.x, soldier.y - refinery.y);
      const required = (soldier.collisionRadius || soldier.radius)
        + (refinery.collisionRadius || refinery.radius);
      assert.ok(
        clearance >= required,
        `${soldier.team} ${soldier.type} is ${clearance.toFixed(1)}px from a refinery (needs ${required}px)`,
      );
    });
  });
});

test('every starting unit keeps clear of the 64px map edge safety band', () => {
  const game = createGame();
  game.entities
    .filter((entity) => entity.kind === 'unit')
    .forEach((unit) => {
      assert.ok(unit.x >= Data.MAP.edgePadding && unit.x <= Data.MAP.width - Data.MAP.edgePadding);
      assert.ok(unit.y >= Data.MAP.edgePadding && unit.y <= Data.MAP.height - Data.MAP.edgePadding);
    });
});

test('starting units accept and complete an immediate move order', () => {
  const game = createGame();
  const movers = unitsOf(game, 'player').filter((unit) => unit.type !== 'harvester');

  assert.ok(movers.length >= 5);
  const origins = new Map(movers.map((unit) => [unit.id, { x: unit.x, y: unit.y }]));
  movers.forEach((unit, index) => {
    game.setUnitCommand(unit, {
      type: 'move',
      x: 760 + index * 40,
      y: 560,
      targetId: null,
    });
  });
  game.step(1500);

  movers.forEach((unit) => {
    const origin = origins.get(unit.id);
    const moved = Math.hypot(unit.x - origin.x, unit.y - origin.y);
    assert.ok(moved > 20, `${unit.type} must start moving immediately (moved ${moved.toFixed(1)}px)`);
  });

  game.step(9000);
  movers.forEach((unit) => {
    assert.equal(unit.command, null, `${unit.type} should have completed its move order`);
  });
});

test('produced units deploy only onto fully legal spawn points', () => {
  const game = createGame();
  const barracks = game.findBuilding('player', 'barracks');
  const knownIds = new Set(game.entities.map((entity) => entity.id));

  game.selectedIds = new Set([barracks.id]);
  assert.equal(game.queueUnit('rifle', 'player'), true);
  assert.equal(game.queueUnit('rifle', 'player'), true);
  game.step(12000);

  const deployed = game.entities.filter((entity) => entity.kind === 'unit' && !knownIds.has(entity.id));
  assert.equal(deployed.length, 2);
  deployed.forEach((unit) => assertSpawnLegal(game, unit));
});

test('restart re-validates every spawn point', () => {
  const game = createGame();
  game.step(2500);

  game.restart();
  game.ai.update = () => {};

  assert.equal(buildingsOf(game, 'player').length, 4);
  assert.equal(unitsOf(game, 'player').length, 6);
  game.entities
    .filter((entity) => entity.kind === 'unit')
    .forEach((unit) => assertSpawnLegal(game, unit));
});

test('a unit restored inside an obstacle is pushed out and can move again', () => {
  const game = createGame();
  const refinery = game.findBuilding('player', 'refinery');

  // Simulate a legacy save whose infantry was stored inside the refinery hull.
  const stranded = game.addUnit('rifle', 'player', refinery.x, refinery.y);
  assert.ok(stranded);
  assert.equal(game.isGroundPositionOpen(stranded, stranded.x, stranded.y), false);

  game.step(600);

  assert.equal(
    game.isGroundPositionOpen(stranded, stranded.x, stranded.y),
    true,
    'unit trapped inside a building must be projected to a legal position',
  );
  const clearance = Math.hypot(stranded.x - refinery.x, stranded.y - refinery.y);
  assert.ok(clearance >= (stranded.collisionRadius || stranded.radius)
    + (refinery.collisionRadius || refinery.radius));

  game.setUnitCommand(stranded, { type: 'move', x: 760, y: 560, targetId: null });
  const fromX = stranded.x;
  const fromY = stranded.y;
  game.step(1500);
  const moved = Math.hypot(stranded.x - fromX, stranded.y - fromY);
  assert.ok(moved > 30, `freed unit must keep moving (moved ${moved.toFixed(1)}px)`);
});

test('a unit restored inside an active mineral field is pushed out as well', () => {
  const game = createGame();
  const mine = game.minerals.find((entry) => entry.amount > 0);

  const stranded = game.addUnit('tank', 'player', mine.x, mine.y);
  assert.equal(game.isGroundPositionOpen(stranded, stranded.x, stranded.y), false);

  game.step(600);

  assert.equal(game.isGroundPositionOpen(stranded, stranded.x, stranded.y), true);
  const clearance = Math.hypot(stranded.x - mine.x, stranded.y - mine.y);
  assert.ok(clearance >= (stranded.collisionRadius || stranded.radius)
    + (mine.collisionRadius || mine.radius));
});
