'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');

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

const FIXED_STEP = 1 / 60;

function createGame() {
  const i18n = globalThis.IronI18n.createI18n({ locale: 'zh-CN', storage: null });
  const game = new globalThis.IronGame(createCanvas(), createCanvas(320, 200), { i18n });
  game.start('normal');
  game.ai.update = () => {};
  return game;
}

test('120 entities over 600 frames never stall and stay under the 16.7ms p95 frame budget', () => {
  const game = createGame();
  const initialCount = game.entities.length;
  const roster = ['tank', 'tank', 'rifle', 'rocket', 'scout'];
  let cursor = 0;
  while (game.entities.length < 120) {
    const type = roster[cursor % roster.length];
    const team = cursor % 2 === 0 ? 'player' : 'enemy';
    const column = cursor % 14;
    const row = Math.floor(cursor / 14) % 7;
    const layer = 'ground';
    const def = globalThis.IronData.UNIT_TYPES[type];
    const radius = def.collisionRadius || def.radius;
    const anchorX = 300 + column * 130;
    const anchorY = 200 + row * 160;
    const point = game.findLegalSpawnPoint(layer, radius, anchorX, anchorY, null);
    game.addUnit(type, team, point.x, point.y);
    cursor += 1;
  }

  assert.equal(game.entities.length, 120);
  assert.ok(initialCount < 120);

  const frames = [];
  const durations = [];
  game.entities
    .filter((entity) => entity.kind === 'unit' && entity.type !== 'harvester')
    .forEach((unit, index) => {
      const east = unit.team === 'player';
      game.setUnitCommand(unit, {
        type: 'move',
        x: east ? 2100 : 300,
        y: 240 + (index % 9) * 120,
        targetId: null,
      });
    });

  for (let frame = 0; frame < 600; frame += 1) {
    const started = performance.now();
    game.update(FIXED_STEP);
    game.renderer.render(game);
    durations.push(performance.now() - started);
    frames.push(frame);
  }

  assert.equal(frames.length, 600);
  game.entities.forEach((entity) => {
    assert.ok(Number.isFinite(entity.x) && Number.isFinite(entity.y),
      `entity ${entity.id} (${entity.type}) escaped to a non-finite position`);
  });

  const sorted = [...durations].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95) - 1];
  const p50 = sorted[Math.floor(sorted.length * 0.5) - 1];
  assert.ok(
    p95 < 16.7,
    `update+render p95 must stay under 16.7ms (p50=${p50.toFixed(3)}ms, p95=${p95.toFixed(3)}ms)`,
  );

  const movers = game.entities.filter((entity) => entity.kind === 'unit'
    && entity.type !== 'harvester');
  const progressed = movers.filter((unit) => unit.lastMoveAt > 0).length;
  assert.ok(
    progressed >= movers.length * 0.8,
    `expected at least 80% of movers to make progress (${progressed}/${movers.length})`,
  );
});
