'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../js/core.js');

test('clamp constrains values to the inclusive range', () => {
  assert.equal(core.clamp(-4, 0, 10), 0);
  assert.equal(core.clamp(6, 0, 10), 6);
  assert.equal(core.clamp(18, 0, 10), 10);
});

test('distance uses euclidean world coordinates', () => {
  assert.equal(core.distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test('normalizeRect accepts a drag in any direction', () => {
  assert.deepEqual(core.normalizeRect({ x: 80, y: 50 }, { x: 20, y: 10 }), {
    x: 20,
    y: 10,
    width: 60,
    height: 40,
  });
});

test('pointInRect includes every rectangle boundary', () => {
  const rect = { x: 10, y: 20, width: 30, height: 40 };

  assert.equal(core.pointInRect({ x: 10, y: 20 }, rect), true);
  assert.equal(core.pointInRect({ x: 40, y: 60 }, rect), true);
  assert.equal(core.pointInRect({ x: 10, y: 45 }, rect), true);
  assert.equal(core.pointInRect({ x: 25, y: 60 }, rect), true);
  assert.equal(core.pointInRect({ x: 9.999, y: 40 }, rect), false);
  assert.equal(core.pointInRect({ x: 40.001, y: 40 }, rect), false);
  assert.equal(core.pointInRect({ x: 25, y: 19.999 }, rect), false);
  assert.equal(core.pointInRect({ x: 25, y: 60.001 }, rect), false);
});

test('selectInRect keeps living friendly units only', () => {
  const entities = [
    { id: 1, kind: 'unit', team: 'player', x: 15, y: 15, hp: 30 },
    { id: 2, kind: 'building', team: 'player', x: 20, y: 20, hp: 300 },
    { id: 3, kind: 'unit', team: 'enemy', x: 20, y: 20, hp: 30 },
    { id: 4, kind: 'unit', team: 'player', x: 80, y: 80, hp: 30 },
    { id: 5, kind: 'unit', team: 'player', x: 25, y: 25, hp: 0 },
  ];
  assert.deepEqual(
    core.selectInRect(entities, { x: 10, y: 10, width: 30, height: 30 }, 'player').map((e) => e.id),
    [1],
  );
});

test('formationOffsets are centered, unique and deterministic', () => {
  const offsets = core.formationOffsets(5, 40);
  assert.equal(offsets.length, 5);
  assert.deepEqual(offsets[0], { x: 0, y: 0 });
  assert.equal(new Set(offsets.map((p) => `${p.x}:${p.y}`)).size, 5);
  const meanX = offsets.reduce((sum, p) => sum + p.x, 0) / offsets.length;
  const meanY = offsets.reduce((sum, p) => sum + p.y, 0) / offsets.length;
  assert.ok(Math.abs(meanX) <= 20);
  assert.ok(Math.abs(meanY) <= 20);
  assert.deepEqual(offsets, core.formationOffsets(5, 40));
});

test('formationOffsets remain unique for a 25-unit formation', () => {
  const offsets = core.formationOffsets(25, 40);
  const positions = new Set(offsets.map((point) => `${point.x}:${point.y}`));

  assert.equal(offsets.length, 25);
  assert.equal(positions.size, 25);
});

test('resolveDamage respects armor while always allowing chip damage', () => {
  assert.equal(core.resolveDamage(20, 6), 14);
  assert.equal(core.resolveDamage(3, 99), 1);
  assert.equal(core.resolveDamage(0, 0), 0);
});

test('resourceTicks preserves remainder for fixed-step income', () => {
  assert.deepEqual(core.resourceTicks(5.2, 2, 35), {
    ticks: 2,
    amount: 70,
    remainder: 1.2,
  });
});

test('circlesOverlap excludes tangent circles and includes circles just inside the boundary', () => {
  const first = { x: 0, y: 0, radius: 5 };

  assert.equal(core.circlesOverlap(first, { x: 11, y: 0, radius: 7 }, 0), true);
  assert.equal(core.circlesOverlap(first, { x: 12, y: 0, radius: 7 }, 0), false);
  assert.equal(core.circlesOverlap(first, { x: 13, y: 0, radius: 7 }, 0), false);
  assert.equal(core.circlesOverlap(first, { x: 13, y: 0, radius: 7 }, 1), false);
  assert.equal(core.circlesOverlap(first, { x: 12, y: 0, radius: 7 }, 1), true);
});

test('circlesOverlap prefers logical collision hulls while preserving legacy radius objects', () => {
  const visualLarge = { x: 0, y: 0, radius: 20, collisionRadius: 8 };
  const other = { x: 18, y: 0, radius: 20, collisionRadius: 8 };
  assert.equal(core.circlesOverlap(visualLarge, other, 0), false);
  assert.equal(core.circlesOverlap({ x: 0, y: 0, radius: 10 }, { x: 18, y: 0, radius: 10 }, 0), true);
});

test('findOpenSpawn picks the first unblocked radial candidate', () => {
  const blockers = [{ x: 100, y: 100, radius: 18 }];
  const spawn = core.findOpenSpawn(
    { x: 100, y: 100 },
    30,
    10,
    blockers,
    { width: 300, height: 300 },
  );
  assert.ok(spawn);
  assert.ok(core.distance(spawn, blockers[0]) >= 28);
  assert.ok(spawn.x >= 10 && spawn.x <= 290);
  assert.ok(spawn.y >= 10 && spawn.y <= 290);
});

test('findGridPath deterministically routes around a symmetric static wall', () => {
  const blockers = [
    { x: 300, y: 230, radius: 82 },
    { x: 300, y: 370, radius: 82 },
  ];
  const path = core.findGridPath(
    { x: 80, y: 300 },
    { x: 560, y: 300 },
    {
      bounds: { width: 640, height: 600 },
      cellSize: 40,
      edgePadding: 40,
      isBlocked: (x, y) => blockers.some((blocker) => (
        Math.hypot(x - blocker.x, y - blocker.y) < blocker.radius
      )),
    },
  );

  assert.ok(path.length > 2);
  assert.ok(path.some((point) => Math.abs(point.y - 300) >= 100));
  assert.deepEqual(path, core.findGridPath(
    { x: 80, y: 300 },
    { x: 560, y: 300 },
    {
      bounds: { width: 640, height: 600 },
      cellSize: 40,
      edgePadding: 40,
      isBlocked: (x, y) => blockers.some((blocker) => (
        Math.hypot(x - blocker.x, y - blocker.y) < blocker.radius
      )),
    },
  ));
});

test('seededRandom repeats the same sequence for the same seed', () => {
  const first = core.seededRandom(0xC0FFEE);
  const second = core.seededRandom(0xC0FFEE);
  const firstSequence = Array.from({ length: 12 }, () => first());
  const secondSequence = Array.from({ length: 12 }, () => second());

  assert.deepEqual(firstSequence, secondSequence);
  assert.ok(firstSequence.every((value) => value >= 0 && value < 1));
});
