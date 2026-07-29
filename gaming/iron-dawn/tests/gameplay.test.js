'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function createCanvas(width = 1280, height = 720) {
  const listeners = new Map();
  return {
    width,
    height,
    parentElement: null,
    addEventListener(type, listener) { listeners.set(type, listener); },
    getBoundingClientRect() { return { left: 0, top: 0, width, height }; },
    listeners,
  };
}

globalThis.window = globalThis;
globalThis.document = { activeElement: null, addEventListener() {}, hidden: false };
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => 1;

class RendererStub {
  constructor(canvas, minimap) {
    this.canvas = canvas;
    this.minimap = minimap;
    this.viewport = { width: canvas.width, height: canvas.height, dpr: 1 };
  }

  getViewport() { return this.viewport; }

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

function createGame(width = 1280, height = 720) {
  const game = new globalThis.IronGame(createCanvas(width, height), createCanvas(320, 200), {
    i18n: globalThis.IronI18n.createI18n({ locale: 'zh-CN', storage: null }),
  });
  game.start('normal');
  game.ai.update = () => {};
  return game;
}

function key(code, options) {
  let prevented = false;
  return {
    code,
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    timeStamp: 0,
    target: null,
    preventDefault() { prevented = true; },
    get prevented() { return prevented; },
    ...(options || {}),
  };
}

test('classic RTS hotkeys replace the old camera and pause conflicts', () => {
  const game = createGame(800, 600);
  const rifle = game.entities.find((entity) => entity.kind === 'unit'
    && entity.team === 'player' && entity.type === 'rifle');
  const barracks = game.findBuilding('player', 'barracks');
  game.selectedIds = new Set([rifle.id]);

  game.handleKeyDown(key('KeyA'));
  assert.equal(game.commandMode, 'attackMove');
  assert.equal(game.keys.has('KeyA'), false);

  game.handleKeyDown(key('KeyP'));
  assert.equal(game.commandMode, 'patrol');
  assert.equal(game.state, 'running');

  game.handleKeyDown(key('KeyH'));
  assert.equal(rifle.command.type, 'hold');
  assert.equal(game.commandMode, null);

  game.selectedIds = new Set([barracks.id]);
  game.handleKeyDown(key('KeyR'));
  assert.equal(game.commandMode, 'rally');
  game.handleKeyDown(key('Escape'));
  assert.equal(game.commandMode, null);
  assert.equal(game.state, 'running');
  game.handleKeyDown(key('Escape'));
  assert.equal(game.state, 'paused');

  game.togglePause(false);
  game.camera.x = 900;
  game.camera.y = 900;
  game.handleKeyDown(key('KeyB'));
  const hq = game.findBuilding('player', 'hq');
  assert.equal(game.camera.x, Math.max(0, hq.x - 400));
  assert.equal(game.camera.y, Math.max(0, hq.y - 300));

  game.commandMode = null;
  game.handleKeyDown(key('KeyF'));
  assert.equal(game.commandMode, null);
});

test('public diagnostics include renderer performance even when timing is unavailable', () => {
  const game = createGame();
  const diagnostics = game.diagnostics();
  assert.deepEqual(diagnostics.performance, { renderMsP95: 0 });
  assert.equal(diagnostics.minerals.capacity, 59850);
  assert.equal(diagnostics.navigation.revision > 0, true);
});

test('hotkeys ignore editable targets and modified non-number commands', () => {
  const game = createGame();
  const rifle = game.entities.find((entity) => entity.kind === 'unit' && entity.team === 'player');
  game.selectedIds = new Set([rifle.id]);

  game.handleKeyDown(key('KeyA', { target: { tagName: 'TEXTAREA' } }));
  assert.equal(game.commandMode, null);
  game.handleKeyDown(key('KeyA', { metaKey: true }));
  assert.equal(game.commandMode, null);
  game.handleKeyDown(key('KeyA', { ctrlKey: true }));
  assert.equal(game.commandMode, null);
});

test('control groups support 1-9, dead-id cleanup, clearing, and double-tap camera focus', () => {
  const game = createGame(800, 600);
  const first = game.addUnit('tank', 'player', 1400, 1100);
  const second = game.addUnit('tank', 'player', 1460, 1100);
  game.selectedIds = new Set([first.id, second.id]);

  game.handleKeyDown(key('Digit9', { ctrlKey: true, timeStamp: 10 }));
  assert.deepEqual(game.controlGroups.get('9'), [first.id, second.id]);

  game.selectedIds.clear();
  game.handleKeyDown(key('Numpad9', { timeStamp: 100 }));
  assert.deepEqual([...game.selectedIds], [first.id, second.id]);
  assert.notEqual(game.camera.x, 1030);

  game.handleKeyDown(key('Digit9', { timeStamp: 300 }));
  assert.equal(game.camera.x, 1030);
  assert.equal(game.camera.y, 800);

  first.hp = 0;
  game.selectedIds.clear();
  assert.equal(game.recallControlGroup('9'), true);
  assert.deepEqual([...game.selectedIds], [second.id]);
  assert.deepEqual(game.controlGroups.get('9'), [second.id]);

  second.hp = 0;
  const survivor = game.entities.find((entity) => entity.kind === 'unit'
    && entity.team === 'player' && entity.hp > 0);
  game.selectedIds = new Set([survivor.id]);
  assert.equal(game.recallControlGroup('9'), false);
  assert.deepEqual([...game.selectedIds], [survivor.id]);
  assert.equal(game.controlGroups.has('9'), false);

  game.selectedIds.clear();
  assert.equal(game.assignControlGroup('8'), true);
  assert.equal(game.controlGroups.has('8'), false);
});

test('control groups never store mixed unit and building selections', () => {
  const game = createGame();
  const rifle = game.entities.find((entity) => entity.kind === 'unit'
    && entity.team === 'player' && entity.type === 'rifle');
  const barracks = game.findBuilding('player', 'barracks');
  game.selectedIds = new Set([barracks.id, rifle.id]);

  game.assignControlGroup('1');

  assert.deepEqual(game.controlGroups.get('1'), [barracks.id]);
});

test('double-click selection finds same-type friendlies only inside the viewport', () => {
  const game = createGame(500, 400);
  game.camera.x = 0;
  game.camera.y = 0;
  const visibleA = game.addUnit('tank', 'player', 100, 100);
  const visibleB = game.addUnit('tank', 'player', 240, 180);
  const offscreen = game.addUnit('tank', 'player', 700, 100);
  game.addUnit('tank', 'enemy', 180, 120);

  assert.equal(game.selectSameTypeAt({ x: visibleA.x, y: visibleA.y }), true);
  assert.deepEqual(new Set(game.selectedIds), new Set([visibleA.id, visibleB.id]));
  assert.equal(game.selectedIds.has(offscreen.id), false);
});

test('shift commands append a bounded queue and invalid targets advance it', () => {
  const game = createGame();
  const tank = game.addUnit('tank', 'player', 1000, 1200);
  const enemy = game.addUnit('tank', 'enemy', 1080, 1200);
  game.selectedIds = new Set([tank.id]);

  assert.equal(game.issueAttack(enemy), true);
  assert.equal(game.issueMove(1300, 1200, false, { append: true }), true);
  assert.equal(tank.command.type, 'attack');
  assert.equal(tank.commandQueue.length, 1);

  enemy.hp = 0;
  game.updateUnit(tank, globalThis.IronData.BALANCE.fixedStep);
  assert.equal(tank.command.type, 'move');
  assert.equal(tank.commandQueue.length, 0);

  const nextEnemy = game.addUnit('tank', 'enemy', 1120, 1200);
  const finalEnemy = game.addUnit('tank', 'enemy', 1160, 1200);
  game.issueAttack(nextEnemy);
  game.issueAttack(finalEnemy, { append: true });
  nextEnemy.hp = 0;
  game.updateUnit(tank, globalThis.IronData.BALANCE.fixedStep);
  assert.equal(tank.command.type, 'attack');
  assert.equal(tank.command.targetId, finalEnemy.id);

  for (let index = 0; index < globalThis.IronData.BALANCE.commandQueueLimit; index += 1) {
    game.issueMove(1300 + index, 1200, false, { append: true });
  }
  assert.equal(tank.commandQueue.length, globalThis.IronData.BALANCE.commandQueueLimit);
  assert.equal(game.issueMove(1700, 1200, false, { append: true }), false);

  game.stopSelected();
  assert.equal(tank.command, null);
  assert.equal(tank.commandQueue.length, 0);
});

test('harvesters resume automatic harvesting after their final queued waypoint', () => {
  const game = createGame();
  const harvester = game.entities.find((entity) => entity.kind === 'unit'
    && entity.team === 'player' && entity.type === 'harvester');

  game.setUnitCommand(harvester, { type: 'move', x: harvester.x + 30, y: harvester.y });
  game.setUnitCommand(harvester, { type: 'move', x: harvester.x + 60, y: harvester.y }, { append: true });
  assert.equal(harvester.harvestState, 'manual');
  game.advanceUnitCommand(harvester);
  assert.equal(harvester.harvestState, 'manual');
  game.advanceUnitCommand(harvester);
  assert.equal(harvester.command, null);
  assert.equal(harvester.harvestState, 'seeking');
});

test('producer rally points clamp to the map, deploy units, clear with S, and preserve army selection', () => {
  const game = createGame();
  const barracks = game.findBuilding('player', 'barracks');
  const rifle = game.entities.find((entity) => entity.kind === 'unit'
    && entity.team === 'player' && entity.type === 'rifle');
  assert.equal(game.setRallyPoint([barracks], { x: -100, y: 900 }), true);
  assert.equal(barracks.rallyPoint.x, globalThis.IronData.MAP.edgePadding);
  barracks.rallyPoint = { x: 900, y: 900 };

  game.selectedIds = new Set([rifle.id]);
  const before = new Set(game.entities.filter((entity) => entity.kind === 'unit').map((entity) => entity.id));
  assert.equal(game.queueUnit('rifle', 'player'), true);
  assert.deepEqual([...game.selectedIds], [rifle.id]);
  game.step(5100);
  const deployed = game.entities.find((entity) => entity.kind === 'unit' && !before.has(entity.id));
  assert.ok(deployed);
  assert.equal(deployed.command.type, 'move');
  assert.equal(deployed.command.x, 900);
  assert.equal(deployed.command.y, 900);

  game.selectedIds = new Set([barracks.id]);
  game.stopSelected();
  assert.equal(barracks.rallyPoint, null);
});

test('patrol remains persistent and hold position fires without chasing', () => {
  const game = createGame();
  const patrolUnit = game.addUnit('rifle', 'player', 1100, 1300);
  game.selectedIds = new Set([patrolUnit.id]);
  assert.equal(game.issuePatrol(1200, 1300), true);
  assert.equal(patrolUnit.command.type, 'patrol');
  game.step(1800);
  assert.equal(patrolUnit.command.type, 'patrol');
  assert.equal(patrolUnit.command.next, 'a');

  const holder = game.addUnit('tank', 'player', 1200, 1100);
  const enemy = game.addUnit('tank', 'enemy', 1280, 1100);
  game.selectedIds = new Set([holder.id]);
  const start = { x: holder.x, y: holder.y };
  assert.equal(game.holdSelected(), true);
  game.step(300);
  assert.equal(holder.x, start.x);
  assert.equal(holder.y, start.y);
  assert.equal(holder.command.type, 'hold');
  assert.ok(game.projectiles.some((projectile) => projectile.ownerId === holder.id));

  enemy.x = holder.x + holder.range + enemy.radius + 40;
  game.updateUnit(holder, globalThis.IronData.BALANCE.fixedStep);
  assert.equal(holder.command.targetId, null);
  assert.equal(holder.x, start.x);
});

test('idle guard attacks abandon targets beyond the leash and return to origin', () => {
  const game = createGame();
  const guard = game.addUnit('rifle', 'player', 1100, 1350);
  const enemy = game.addUnit('rifle', 'enemy', 1160, 1350);

  game.updateUnit(guard, globalThis.IronData.BALANCE.fixedStep);
  assert.equal(guard.command.type, 'guardAttack');
  const origin = { x: guard.command.originX, y: guard.command.originY };

  enemy.x = origin.x + 500;
  guard.x = origin.x + 170;
  game.updateUnit(guard, globalThis.IronData.BALANCE.fixedStep);
  assert.equal(guard.command.type, 'guardReturn');
  assert.equal(guard.command.x, origin.x);
  assert.equal(guard.command.y, origin.y);
});

test('air units ignore ground blockers and collide only with other air units', () => {
  const game = createGame();
  const fighter = game.addUnit('fighter', 'player', 1000, 1200);
  const groundUnit = game.addUnit('tank', 'player', 1100, 1200);
  game.addBuilding('powerPlant', 'player', 1150, 1200, true);

  assert.equal(game.getMovementLayer(fighter), 'air');
  assert.equal(game.getMovementLayer(groundUnit), 'ground');
  game.moveToward(fighter, 1400, 1200, 1, 5);
  assert.ok(fighter.x > 1200, `expected fighter to cross ground blockers, reached ${fighter.x}`);
  assert.equal(fighter.y, 1200);

  fighter.x = 1000;
  fighter.y = 1300;
  groundUnit.x = 1005;
  groundUnit.y = 1300;
  const secondFighter = game.addUnit('fighter', 'player', 1010, 1300);
  const groundBefore = { x: groundUnit.x, y: groundUnit.y };
  const airDistanceBefore = Math.hypot(fighter.x - secondFighter.x, fighter.y - secondFighter.y);
  game.resolveUnitCollisions();
  const airDistanceAfter = Math.hypot(fighter.x - secondFighter.x, fighter.y - secondFighter.y);

  assert.deepEqual({ x: groundUnit.x, y: groundUnit.y }, groundBefore);
  assert.ok(airDistanceAfter > airDistanceBefore);
});

test('air-ground targeting rules are shared by explicit orders and automatic acquisition', () => {
  const game = createGame();
  const enemyFighter = game.addUnit('fighter', 'enemy', 1250, 1300);
  const tank = game.addUnit('tank', 'player', 1200, 1300);
  const rocket = game.addUnit('rocket', 'player', 1200, 1340);
  const scout = game.addUnit('scout', 'player', 1200, 1380);

  assert.equal(game.canAttackTarget(tank, enemyFighter), false);
  assert.equal(game.canAttackTarget(rocket, enemyFighter), true);
  assert.equal(game.canAttackTarget(scout, enemyFighter), true);
  assert.equal(game.findNearestEnemy(tank, 100), null);
  assert.equal(game.findNearestEnemy(rocket, 100), enemyFighter);

  game.selectedIds = new Set([tank.id]);
  assert.equal(game.issueAttack(enemyFighter), false);
  assert.equal(tank.command, null);
  game.selectedIds = new Set([rocket.id]);
  assert.equal(game.issueAttack(enemyFighter), true);
  assert.equal(rocket.command.targetId, enemyFighter.id);
});

test('fighter fire exposes altitude metadata for airborne projectile rendering', () => {
  const game = createGame();
  const fighter = game.addUnit('fighter', 'player', 1100, 1300);
  const groundTarget = game.addUnit('tank', 'enemy', 1200, 1300);

  game.fire(fighter, groundTarget, globalThis.IronData.UNIT_TYPES.fighter);

  const projectile = game.projectiles.at(-1);
  const muzzle = game.effects.at(-1);
  assert.equal(fighter.altitude, 24);
  assert.equal(projectile.altitude, 24);
  assert.equal(projectile.targetAltitude, 0);
  assert.equal(projectile.airborne, true);
  assert.equal(muzzle.type, 'muzzle');
  assert.equal(muzzle.altitude, 24);
  assert.equal(muzzle.airborne, true);
});

test('ground units route around a symmetric building wall without touching its collision hulls', () => {
  const game = createGame();
  game.entities = game.entities.filter((entity) => entity.kind === 'building' && entity.type === 'hq');
  game.minerals = [];
  const tank = game.addUnit('tank', 'player', 500, 750);
  const upper = game.addBuilding('factory', 'enemy', 800, 680, true);
  const lower = game.addBuilding('factory', 'enemy', 800, 820, true);
  game.setUnitCommand(tank, { type: 'move', x: 1150, y: 750 });

  let minimumClearance = Infinity;
  for (let frame = 0; frame < 1200 && tank.command; frame += 1) {
    game.update(globalThis.IronData.BALANCE.fixedStep);
    [upper, lower].forEach((building) => {
      minimumClearance = Math.min(minimumClearance,
        Math.hypot(tank.x - building.x, tank.y - building.y)
          - tank.collisionRadius - building.collisionRadius);
    });
  }

  assert.equal(tank.command, null);
  assert.ok(Math.hypot(tank.x - 1150, tank.y - 750) <= 7);
  assert.ok(minimumClearance >= -0.5, `collision hull penetration: ${minimumClearance}`);
});

test('head-on friendly traffic yields instead of remaining mutually blocked', () => {
  const game = createGame();
  game.entities = game.entities.filter((entity) => entity.kind === 'building' && entity.type === 'hq');
  game.minerals = [];
  const eastbound = game.addUnit('tank', 'player', 800, 1250);
  const westbound = game.addUnit('tank', 'player', 1200, 1250);
  game.setUnitCommand(eastbound, { type: 'move', x: 1250, y: 1250 });
  game.setUnitCommand(westbound, { type: 'move', x: 750, y: 1250 });

  game.step(15000);

  assert.equal(eastbound.command, null);
  assert.equal(westbound.command, null);
  assert.ok(eastbound.x > westbound.x);
});

test('blocked ground destinations snap to the nearest reachable point', () => {
  const game = createGame();
  game.entities = game.entities.filter((entity) => entity.kind === 'building' && entity.type === 'hq');
  game.minerals = [];
  const tank = game.addUnit('tank', 'player', 700, 1200);
  const factory = game.addBuilding('factory', 'player', 1000, 1200, true);

  game.setUnitCommand(tank, { type: 'move', x: factory.x, y: factory.y });

  assert.notDeepEqual({ x: tank.command.x, y: tank.command.y }, { x: factory.x, y: factory.y });
  assert.ok(Math.hypot(tank.command.x - factory.x, tank.command.y - factory.y)
    >= tank.collisionRadius + factory.collisionRadius);
  game.step(8000);
  assert.equal(tank.command, null);
});

test('logical unit and building collision hulls are smaller than their rendered silhouettes', () => {
  const game = createGame();
  Object.keys(globalThis.IronData.UNIT_TYPES).forEach((type, index) => {
    const unit = game.addUnit(type, 'player', 1200 + index, 1200);
    assert.ok(unit.collisionRadius < unit.radius, `${unit.type} collision hull should be smaller`);
  });
  Object.keys(globalThis.IronData.BUILDING_TYPES).forEach((type, index) => {
    const building = game.addBuilding(type, 'player', 1300 + index, 1300, true);
    assert.ok(building.collisionRadius < building.radius, `${type} collision hull should be smaller`);
  });
});

test('a nine-tank formation reaches distinct destinations without permanent crowd deadlock', () => {
  const game = createGame();
  game.entities = game.entities.filter((entity) => entity.kind === 'building' && entity.type === 'hq');
  game.minerals = [];
  const tanks = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      tanks.push(game.addUnit('tank', 'player', 650 + column * 44, 1100 + row * 44));
    }
  }
  game.selectedIds = new Set(tanks.map((tank) => tank.id));

  assert.equal(game.issueMove(1500, 1050, false), true);
  game.step(20000);

  assert.ok(tanks.every((tank) => tank.command === null));
  for (let first = 0; first < tanks.length; first += 1) {
    for (let second = first + 1; second < tanks.length; second += 1) {
      assert.ok(Math.hypot(tanks[first].x - tanks[second].x, tanks[first].y - tanks[second].y)
        >= tanks[first].collisionRadius + tanks[second].collisionRadius - 1);
    }
  }
});

test('exactly overlapping units receive a deterministic non-zero separation vector', () => {
  const game = createGame();
  game.entities = game.entities.filter((entity) => entity.kind === 'building' && entity.type === 'hq');
  game.minerals = [];
  const first = game.addUnit('tank', 'player', 1100, 1250);
  const second = game.addUnit('tank', 'player', 1100, 1250);

  for (let pass = 0; pass < 8; pass += 1) game.resolveUnitCollisions();

  const separation = Math.hypot(first.x - second.x, first.y - second.y);
  assert.ok(Number.isFinite(separation));
  assert.ok(separation >= first.collisionRadius + second.collisionRadius - 1);
});

test('live crystal fields are static navigation blockers for ground units', () => {
  const game = createGame();
  game.entities = game.entities.filter((entity) => entity.kind === 'building' && entity.type === 'hq');
  game.minerals = [{
    id: 'ore-test', x: 900, y: 1150, radius: 58, collisionRadius: 42, amount: 9000, maxAmount: 9000,
  }];
  const tank = game.addUnit('tank', 'player', 650, 1150);
  game.setUnitCommand(tank, { type: 'move', x: 1150, y: 1150 });

  let minimumClearance = Infinity;
  for (let frame = 0; frame < 900 && tank.command; frame += 1) {
    game.update(globalThis.IronData.BALANCE.fixedStep);
    minimumClearance = Math.min(minimumClearance,
      Math.hypot(tank.x - 900, tank.y - 1150) - tank.collisionRadius - 42);
  }

  assert.equal(tank.command, null);
  assert.ok(minimumClearance >= -0.5);
});
