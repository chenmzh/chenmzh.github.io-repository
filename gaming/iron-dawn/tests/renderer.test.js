const test = require('node:test');
const assert = require('node:assert/strict');

global.IronData = require('../js/data.js');
global.IronAnimation = require('../js/animation.js');
const IronI18n = require('../js/i18n.js');
const { MANIFEST } = require('../js/assets.js');
require('../js/renderer.js');

function createContext() {
  const calls = [];
  const state = {
    calls,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineDashOffset: 0,
    createPattern: () => null,
    createRadialGradient: () => ({ addColorStop() {} }),
    measureText: (value) => ({ width: String(value).length * 6 }),
    getImageData: (_x, _y, width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
  };
  return new Proxy(state, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => { calls.push([property, ...args]); };
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

function createCanvas(width, height, rectProvider) {
  const context = createContext();
  return {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    getContext: () => context,
    getBoundingClientRect: () => rectProvider(),
    context,
  };
}

function building(type, id, x, y) {
  const definition = global.IronData.BUILDING_TYPES[type];
  return {
    id, kind: 'building', type, team: 'player', x, y,
    radius: definition.radius, width: definition.width, height: definition.height,
    hp: definition.hp, maxHp: definition.hp, complete: true,
    constructionElapsed: definition.buildTime, queue: [], rotation: 0, flash: 0,
  };
}

function unit(type, id, x, y) {
  const definition = global.IronData.UNIT_TYPES[type];
  return {
    id, kind: 'unit', type, team: 'player', x, y,
    radius: definition.radius, hp: definition.hp, maxHp: definition.hp,
    rotation: 0, turretRotation: 0, flash: 0, cargo: 0,
    movementLayer: definition.movementLayer || 'ground',
  };
}

function initialPlayerEntities() {
  return [
    building('hq', 1, 320, 760),
    building('powerPlant', 2, 490, 565),
    building('refinery', 3, 510, 790),
    building('barracks', 4, 480, 1020),
    unit('harvester', 5, 605, 800),
    unit('rifle', 6, 520, 690),
    unit('rifle', 7, 545, 720),
    unit('rifle', 8, 520, 750),
    unit('rocket', 9, 555, 655),
    unit('scout', 10, 585, 700),
  ];
}

test('Retina resize reads the fixed viewport and never feeds backing pixels into CSS size', () => {
  global.devicePixelRatio = 2;
  const viewportRect = { width: 1000, height: 600 };
  const viewport = { getBoundingClientRect: () => ({ ...viewportRect }) };
  const canvas = createCanvas(1600, 900, () => ({ width: canvas.width, height: canvas.height }));
  const minimap = createCanvas(448, 296, () => ({ width: 220, height: 134 }));
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport });

  for (let index = 0; index < 8; index += 1) renderer.resize();
  assert.equal(renderer.getViewport().width, 1000);
  assert.equal(renderer.getViewport().height, 600);
  assert.equal(renderer.getViewport().dpr, 2);
  assert.equal(canvas.width, 2000);
  assert.equal(canvas.height, 1200);

  viewportRect.width = 5000;
  viewportRect.height = 5000;
  renderer.resize();
  assert.ok(canvas.width <= 8192);
  assert.ok(canvas.height <= 8192);
  assert.ok(canvas.width * canvas.height <= 32 * 1024 * 1024);
});

test('the real renderer sees and draws all four opening buildings and six opening units', () => {
  global.devicePixelRatio = 2;
  const viewport = { getBoundingClientRect: () => ({ width: 1000, height: 650 }) };
  const canvas = createCanvas(1600, 900, () => ({ width: 1000, height: 650 }));
  const minimap = createCanvas(448, 296, () => ({ width: 220, height: 134 }));
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport });
  renderer.render({
    camera: { x: 0, y: 435 }, time: 0, screenShake: 0,
    entities: initialPlayerEntities(), minerals: [], projectiles: [], effects: [],
    selectedIds: new Set(), placementType: null, commandMode: null,
    mouse: { inside: false, screenX: 0, screenY: 0 }, drag: null,
  });
  const diagnostics = renderer.getDiagnostics();
  assert.equal(diagnostics.draw.buildings, 4);
  assert.equal(diagnostics.draw.units, 6);
  assert.equal(diagnostics.draw.proceduralFallbacks, 10);
  assert.equal(diagnostics.draw.minimapEntities, 10);
  assert.deepEqual([...diagnostics.draw.visibleIds].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('loaded layered sprites draw vehicle body and turret at independent rotations', () => {
  global.devicePixelRatio = 1;
  const viewport = { getBoundingClientRect: () => ({ width: 800, height: 500 }) };
  const canvas = createCanvas(800, 500, () => ({ width: 800, height: 500 }));
  const minimap = createCanvas(220, 134, () => ({ width: 220, height: 134 }));
  const source = { width: 512, height: 512, naturalWidth: 512, naturalHeight: 512 };
  const assets = { get: () => source, definition: (key) => MANIFEST[key] };
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport, assets });
  const tank = unit('tank', 22, 0, 0);
  tank.rotation = 0.25;
  tank.turretRotation = 1.1;
  assert.equal(renderer.drawUnitSprite(canvas.context, tank, renderer.teamStyle('player')), true);
  const rotations = canvas.context.calls.filter((call) => call[0] === 'rotate').map((call) => call[1]);
  assert.ok(rotations.includes(0.25));
  assert.ok(rotations.includes(1.1));
  assert.equal(canvas.context.calls.filter((call) => call[0] === 'drawImage').length, 2);
});

test('a valid zero-degree turret aim does not fall back to the vehicle body angle', () => {
  global.devicePixelRatio = 1;
  const viewport = { getBoundingClientRect: () => ({ width: 800, height: 500 }) };
  const canvas = createCanvas(800, 500, () => ({ width: 800, height: 500 }));
  const minimap = createCanvas(220, 134, () => ({ width: 220, height: 134 }));
  const source = { width: 512, height: 512, naturalWidth: 512, naturalHeight: 512 };
  const assets = { get: () => source, definition: (key) => MANIFEST[key] };
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport, assets });
  const tank = unit('tank', 23, 0, 0);
  tank.rotation = 0.75;
  tank.turretRotation = 0;
  assert.equal(renderer.drawUnitSprite(canvas.context, tank, renderer.teamStyle('player')), true);
  const rotations = canvas.context.calls.filter((call) => call[0] === 'rotate').map((call) => call[1]);
  assert.deepEqual(rotations, [0.75]);
  assert.equal(canvas.context.calls.filter((call) => call[0] === 'drawImage').length, 2);
});

test('fighter renders above ground units with a separated ground shadow and static sprite fallback', () => {
  global.devicePixelRatio = 1;
  const viewport = { getBoundingClientRect: () => ({ width: 800, height: 500 }) };
  const canvas = createCanvas(800, 500, () => ({ width: 800, height: 500 }));
  const minimap = createCanvas(220, 134, () => ({ width: 220, height: 134 }));
  const source = { width: 512, height: 512, naturalWidth: 512, naturalHeight: 512 };
  const assets = { get: (key) => key === 'unitFighter' ? source : null, definition: (key) => MANIFEST[key] };
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport, assets });
  const fighter = unit('fighter', 72, 180, 120);
  const tank = unit('tank', 71, 180, 260);
  renderer.render({
    camera: { x: 0, y: 0 }, time: 2, screenShake: 0,
    entities: [fighter, tank], minerals: [], projectiles: [], effects: [], selectedIds: new Set(),
    placementType: null, commandMode: null, mouse: { inside: false }, drag: null,
  });
  const diagnostics = renderer.getDiagnostics();
  assert.deepEqual(diagnostics.draw.visibleIds, [tank.id, fighter.id]);
  assert.ok(canvas.context.calls.some((call) => call[0] === 'translate'
    && call[1] === 0 && call[2] < -17 && call[2] > -23));
  assert.ok(canvas.context.calls.some((call) => call[0] === 'drawImage' && call[1] === source));
});

test('airfield and fighter remain visible with procedural rendering when both image layers fail', () => {
  const viewport = { getBoundingClientRect: () => ({ width: 800, height: 500 }) };
  const canvas = createCanvas(800, 500, () => ({ width: 800, height: 500 }));
  const minimap = createCanvas(220, 134, () => ({ width: 220, height: 134 }));
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport });
  const fighter = unit('fighter', 81, 150, 160);
  const airfield = building('airfield', 82, 330, 250);
  renderer.drawUnit(canvas.context, fighter, { time: 1, selectedIds: new Set() }, 1);
  renderer.drawBuilding(canvas.context, airfield, { time: 1, selectedIds: new Set() }, 1);
  assert.equal(renderer.getDiagnostics().draw.proceduralFallbacks, 2);
  assert.ok(canvas.context.calls.some((call) => call[0] === 'moveTo' && call[1] === 38 && call[2] === 0));
  assert.ok(canvas.context.calls.some((call) => call[0] === 'setLineDash'
    && Array.isArray(call[1]) && call[1][0] === 13));
});

test('a decoded-image failure while mirroring terrain falls back without aborting the frame', () => {
  const previousDocument = global.document;
  const tileContext = {
    drawImage() { throw new Error('decode failed'); },
    save() {},
    restore() {},
    translate() {},
    scale() {},
  };
  global.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => tileContext }),
  };
  try {
    const viewport = { getBoundingClientRect: () => ({ width: 1000, height: 600 }) };
    const canvas = createCanvas(1600, 900, () => ({ width: 1000, height: 600 }));
    const minimap = createCanvas(448, 296, () => ({ width: 220, height: 134 }));
    const ground = { naturalWidth: 1024, naturalHeight: 1024 };
    const renderer = new global.IronRenderer(canvas, minimap, {
      viewportElement: viewport,
      assets: { get: (key) => key === 'terrainGround' ? ground : null },
    });
    assert.doesNotThrow(() => renderer.ensureGroundPattern(canvas.context));
    assert.match(renderer.lastError, /Ground tile: decode failed/);
  } finally {
    global.document = previousDocument;
  }
});

test('resource income canvas text follows the active language', () => {
  const viewport = { getBoundingClientRect: () => ({ width: 800, height: 500 }) };
  const canvas = createCanvas(800, 500, () => ({ width: 800, height: 500 }));
  const minimap = createCanvas(220, 134, () => ({ width: 220, height: 134 }));
  const i18n = IronI18n.createI18n({ locale: 'en', storage: null });
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport, i18n });

  renderer.drawIncome(canvas.context, { x: 100, y: 100, amount: 240 }, 0.25);
  assert.ok(canvas.context.calls.some((call) => call[0] === 'fillText' && call[1] === '+240 CRYSTALS'));

  i18n.setLocale('zh-CN', { persist: false });
  renderer.drawIncome(canvas.context, { x: 100, y: 100, amount: 240 }, 0.25);
  assert.ok(canvas.context.calls.some((call) => call[0] === 'fillText' && call[1] === '+240 晶矿'));

  renderer.drawSignalEffect(canvas.context, { x: 100, y: 100, team: 'enemy' }, 0.25, 1);
  assert.ok(canvas.context.calls.some((call) => call[0] === 'fillText' && call[1] === '敌军信号'));

  const game = {
    placementType: 'powerPlant',
    mouse: { inside: true, worldX: 120, worldY: 140 },
    selectedIds: new Set(),
    getPlacementValidity: () => ({ valid: false, reasonKey: 'game.build.overlap' }),
  };
  renderer.drawPlacementGhost(canvas.context, game, 0);
  assert.ok(canvas.context.calls.some((call) => call[0] === 'fillText' && call[1] === '与现有设施重叠'));
});

test('animation frames use one 9-argument drawImage crop and report clip diagnostics', () => {
  global.devicePixelRatio = 1;
  const viewport = { getBoundingClientRect: () => ({ width: 800, height: 500 }) };
  const canvas = createCanvas(800, 500, () => ({ width: 800, height: 500 }));
  const minimap = createCanvas(220, 134, () => ({ width: 220, height: 134 }));
  const staticSource = { width: 512, height: 512, naturalWidth: 512, naturalHeight: 512 };
  const sheet = { width: 768, height: 576, naturalWidth: 768, naturalHeight: 576 };
  const assets = {
    get: () => staticSource,
    definition: (key) => MANIFEST[key],
    getFrame: (key, team, frameIndex) => ({
      source: sheet,
      sx: (frameIndex % 4) * 192,
      sy: Math.floor(frameIndex / 4) * 192,
      sw: 192,
      sh: 192,
      definition: MANIFEST[key],
      frameIndex,
    }),
  };
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport, assets });
  const rifle = unit('rifle', 31, 100, 100);
  rifle.lastMoveAt = 0.95;
  rifle.lastFireAt = -Infinity;
  rifle.animationDistance = 10;
  renderer.drawUnit(canvas.context, rifle, { time: 1, selectedIds: new Set() }, 1);

  const imageCalls = canvas.context.calls.filter((call) => call[0] === 'drawImage');
  assert.equal(imageCalls.length, 1);
  assert.equal(imageCalls[0].length, 10);
  assert.equal(imageCalls[0][1], sheet);
  assert.deepEqual(imageCalls[0].slice(2, 6), [0, 192, 192, 192]);
  const diagnostics = renderer.getDiagnostics();
  assert.equal(diagnostics.draw.sprites, 1);
  assert.equal(diagnostics.draw.spriteDrawCalls, 1);
  assert.equal(diagnostics.draw.animationFrames, 1);
  assert.equal(diagnostics.draw.animationFallbacks, 0);
  assert.equal(diagnostics.draw.activeClips.move, 1);
});

test('one unavailable animation falls back to the v2 static sprite without a procedural entity', () => {
  const viewport = { getBoundingClientRect: () => ({ width: 800, height: 500 }) };
  const canvas = createCanvas(800, 500, () => ({ width: 800, height: 500 }));
  const minimap = createCanvas(220, 134, () => ({ width: 220, height: 134 }));
  const staticSource = { width: 512, height: 512, naturalWidth: 512, naturalHeight: 512 };
  const assets = {
    get: () => staticSource,
    definition: (key) => MANIFEST[key],
    getFrame: () => null,
  };
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport, assets });
  const rifle = unit('rifle', 32, 100, 100);
  rifle.lastMoveAt = 0.95;
  rifle.animationDistance = 12;
  renderer.drawUnit(canvas.context, rifle, { time: 1, selectedIds: new Set() }, 1);
  const diagnostics = renderer.getDiagnostics();
  assert.equal(diagnostics.draw.sprites, 1);
  assert.equal(diagnostics.draw.proceduralFallbacks, 0);
  assert.equal(diagnostics.draw.animationFrames, 0);
  assert.equal(diagnostics.draw.animationFallbacks, 1);
  assert.equal(diagnostics.draw.spriteDrawCalls, 1);
});

test('selected producers show rally paths and the primary unit shows numbered queued orders', () => {
  const viewport = { getBoundingClientRect: () => ({ width: 800, height: 500 }) };
  const canvas = createCanvas(800, 500, () => ({ width: 800, height: 500 }));
  const minimap = createCanvas(220, 134, () => ({ width: 220, height: 134 }));
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport });
  const barracks = building('barracks', 40, 100, 100);
  barracks.rallyPoint = { x: 260, y: 180 };
  const rifle = unit('rifle', 41, 150, 140);
  rifle.command = { type: 'move', x: 220, y: 210 };
  rifle.commandQueue = [
    { type: 'attackMove', x: 300, y: 260 },
    { type: 'patrol', aX: 300, aY: 260, bX: 380, bY: 310, next: 'b' },
  ];
  const game = {
    time: 2,
    entities: [barracks, rifle],
    selectedIds: new Set([barracks.id, rifle.id]),
    getEntity: () => null,
  };
  renderer.drawCommandLinks(canvas.context, game, { x: 0, y: 0 }, renderer.getViewport(), 2);
  const labels = canvas.context.calls.filter((call) => call[0] === 'fillText').map((call) => call[1]);
  assert.deepEqual(labels, ['1', '2', '3']);
  assert.ok(canvas.context.calls.some((call) => call[0] === 'strokeRect'));
  assert.ok(canvas.context.calls.some((call) => call[0] === 'lineTo' && call[1] === 260 && call[2] === 180));
  assert.ok(canvas.context.calls.some((call) => call[0] === 'lineTo' && call[1] === 380 && call[2] === 310));
});

test('damaged entities gain sparks and critical smoke without mutating game state', () => {
  const viewport = { getBoundingClientRect: () => ({ width: 800, height: 500 }) };
  const canvas = createCanvas(800, 500, () => ({ width: 800, height: 500 }));
  const minimap = createCanvas(220, 134, () => ({ width: 220, height: 134 }));
  const renderer = new global.IronRenderer(canvas, minimap, { viewportElement: viewport });
  const tank = unit('tank', 51, 120, 130);
  tank.hp = tank.maxHp * 0.2;
  const before = { ...tank };
  renderer.drawDamageState(canvas.context, tank, global.IronData.UNIT_TYPES.tank, 1.25);
  assert.ok(canvas.context.calls.some((call) => call[0] === 'arc'));
  assert.deepEqual(tank, before);
});
