'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function createCanvas(width = 1280, height = 720) {
  return {
    width,
    height,
    addEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width, height }; },
  };
}

globalThis.window = globalThis;
globalThis.document = { activeElement: null };
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => 1;
globalThis.IronRenderer = class RendererStub {
  constructor(canvas) { this.viewport = { width: canvas.width, height: canvas.height }; }
  getViewport() { return this.viewport; }
  reset() {}
  resize() {}
  render() {}
};

require('../js/i18n.js');
require('../js/core.js');
require('../js/data.js');
require('../js/ai.js');
require('../js/game.js');

function createGame() {
  const game = new globalThis.IronGame(createCanvas(), createCanvas(320, 200));
  game.start('normal');
  return game;
}

function advance(game, seconds) {
  let remaining = seconds;
  while (remaining > 0 && game.state === 'running') {
    const chunk = Math.min(60, remaining);
    game.step(chunk * 1000);
    remaining -= chunk;
  }
}

test('enemy harvesting continues after the early game instead of deadlocking on its base', () => {
  const game = createGame();
  game.ai.waveTimer = 1e9;
  game.ai.waveWarningSent = true;

  advance(game, 120);
  const earlyHarvest = game.stats.enemy.harvested;
  advance(game, 120);

  assert.equal(game.state, 'running');
  assert.ok(earlyHarvest > 0, `expected early enemy income, received ${earlyHarvest}`);
  assert.ok(game.stats.enemy.harvested > earlyHarvest,
    `expected continued enemy income after 120s, remained ${game.stats.enemy.harvested}`);
});

test('an AI wave uses attack-move and engages a player unit in its path', () => {
  const game = createGame();
  const intercept = game.addUnit('tank', 'player', 1620, 735);
  const hpBefore = intercept.hp;

  game.ai.launchWave();
  const attackers = game.entities.filter((entity) => entity.kind === 'unit'
    && entity.team === 'enemy' && entity.type !== 'harvester'
    && entity.command && entity.command.type === 'attackMove');
  assert.ok(attackers.length >= 3);

  advance(game, 8);
  assert.ok(intercept.hp < hpBefore,
    `expected the blocking unit to take damage, remained ${intercept.hp}/${hpBefore}`);
});

test('reaching the operation time limit without destroying the enemy HQ is a loss', () => {
  const game = createGame();
  game.ai.update = () => {};
  game.time = globalThis.IronData.BALANCE.maximumMatchSeconds - 0.05;

  game.step(100);

  assert.equal(game.findBuilding('player', 'hq').hp, globalThis.IronData.BUILDING_TYPES.hq.hp);
  assert.equal(game.findBuilding('enemy', 'hq').hp, globalThis.IronData.BUILDING_TYPES.hq.hp);
  assert.equal(game.state, 'lost');
});

test('an unattended normal match never awards a free victory', () => {
  const game = createGame();

  advance(game, globalThis.IronData.BALANCE.maximumMatchSeconds + 1);

  assert.notEqual(game.state, 'won');
  assert.equal(game.state, 'lost');
  assert.ok(game.stats.enemy.kills > 0 || !game.findBuilding('player', 'hq'));
});

test('AI constructs an airfield after its factory and power margin are ready', () => {
  const game = createGame();
  game.time = 100;
  game.resources.enemy = 10000;
  game.updatePowerAndPopulation();

  game.ai.manageBase();

  const airfield = game.entities.find((entity) => entity.kind === 'building'
    && entity.team === 'enemy' && entity.type === 'airfield');
  assert.ok(airfield);
  assert.equal(airfield.complete, false);
});

test('AI production plan queues fighters when an airfield is online', () => {
  const game = createGame();
  const airfield = game.addBuilding('airfield', 'enemy', 1540, 330, true);
  game.addUnit('harvester', 'enemy', 1700, 850);
  game.time = 150;
  game.resources.enemy = 10000;
  game.ai.productionCursor = 2;

  game.ai.manageProduction();

  assert.equal(airfield.queue.length, 1);
  assert.equal(airfield.queue[0].type, 'fighter');
});
