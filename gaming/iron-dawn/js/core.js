(function attachIronCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.IronCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createIronCore() {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function normalizeRect(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return {
      x,
      y,
      width: Math.max(a.x, b.x) - x,
      height: Math.max(a.y, b.y) - y,
    };
  }

  function pointInRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width
      && point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  function selectInRect(entities, rect, team) {
    return entities.filter((entity) => entity.kind === 'unit'
      && entity.team === team
      && entity.hp > 0
      && pointInRect(entity, rect));
  }

  function formationOffsets(count, spacing) {
    if (count <= 0) return [];
    const offsets = [{ x: 0, y: 0 }];
    let remaining = count - 1;
    let ring = 1;
    while (remaining > 0) {
      const slots = Math.min(remaining, ring * 8);
      for (let i = 0; i < slots; i += 1) {
        const angle = (Math.PI * 2 * i) / slots;
        offsets.push({
          x: Math.round(Math.cos(angle) * spacing * ring),
          y: Math.round(Math.sin(angle) * spacing * ring),
        });
      }
      remaining -= slots;
      ring += 1;
    }
    return offsets;
  }

  function resolveDamage(baseDamage, armor) {
    if (baseDamage <= 0) return 0;
    return Math.max(1, Math.round(baseDamage - Math.max(0, armor)));
  }

  function resourceTicks(elapsed, interval, income) {
    if (interval <= 0) return { ticks: 0, amount: 0, remainder: 0 };
    const ticks = Math.max(0, Math.floor((elapsed + 1e-9) / interval));
    return {
      ticks,
      amount: ticks * income,
      remainder: Math.round(Math.max(0, elapsed - ticks * interval) * 1e9) / 1e9,
    };
  }

  function circlesOverlap(a, b, padding) {
    const radiusA = Number.isFinite(a.collisionRadius) ? a.collisionRadius : (a.radius || 0);
    const radiusB = Number.isFinite(b.collisionRadius) ? b.collisionRadius : (b.radius || 0);
    const sum = radiusA + radiusB + (padding || 0);
    return distanceSquared(a, b) < sum * sum;
  }

  function findOpenSpawn(origin, startRadius, entityRadius, blockers, bounds) {
    const safeBounds = bounds || { width: Infinity, height: Infinity };
    for (let ring = 0; ring < 8; ring += 1) {
      const radius = startRadius + ring * Math.max(8, entityRadius * 1.5);
      const slots = 8 + ring * 4;
      for (let i = 0; i < slots; i += 1) {
        const angle = (Math.PI * 2 * i) / slots;
        const point = {
          x: origin.x + Math.cos(angle) * radius,
          y: origin.y + Math.sin(angle) * radius,
          radius: entityRadius,
          collisionRadius: entityRadius,
        };
        if (point.x < entityRadius || point.x > safeBounds.width - entityRadius
          || point.y < entityRadius || point.y > safeBounds.height - entityRadius) continue;
        if (!blockers.some((blocker) => circlesOverlap(point, blocker, 0))) {
          return { x: point.x, y: point.y };
        }
      }
    }
    return null;
  }

  function segmentIntersectsCircle(start, end, circle, padding) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const projection = lengthSquared > 0
      ? clamp(((circle.x - start.x) * dx + (circle.y - start.y) * dy) / lengthSquared, 0, 1)
      : 0;
    const closestX = start.x + dx * projection;
    const closestY = start.y + dy * projection;
    const radius = (Number.isFinite(circle.collisionRadius)
      ? circle.collisionRadius : (circle.radius || 0)) + (padding || 0);
    return Math.hypot(closestX - circle.x, closestY - circle.y) < radius;
  }

  function findGridPath(start, goal, options) {
    const opts = options || {};
    const bounds = opts.bounds || { width: 0, height: 0 };
    const cellSize = Math.max(8, Number(opts.cellSize) || 40);
    const edgePadding = Math.max(0, Number(opts.edgePadding) || 0);
    const minX = edgePadding;
    const minY = edgePadding;
    const maxX = Math.max(minX, bounds.width - edgePadding);
    const maxY = Math.max(minY, bounds.height - edgePadding);
    const columns = Math.max(1, Math.floor((maxX - minX) / cellSize) + 1);
    const rows = Math.max(1, Math.floor((maxY - minY) / cellSize) + 1);
    const isBlocked = typeof opts.isBlocked === 'function' ? opts.isBlocked : () => false;
    const keyOf = (column, row) => row * columns + column;
    const cellOf = (key) => ({ column: key % columns, row: Math.floor(key / columns) });
    const pointOf = (column, row) => ({
      x: clamp(minX + column * cellSize, minX, maxX),
      y: clamp(minY + row * cellSize, minY, maxY),
    });
    const clampCell = (point) => ({
      column: clamp(Math.round((point.x - minX) / cellSize), 0, columns - 1),
      row: clamp(Math.round((point.y - minY) / cellSize), 0, rows - 1),
    });
    const openCache = new Map();
    const cellIsOpen = (column, row) => {
      if (column < 0 || column >= columns || row < 0 || row >= rows) return false;
      const key = keyOf(column, row);
      if (!openCache.has(key)) {
        const point = pointOf(column, row);
        openCache.set(key, !isBlocked(point.x, point.y));
      }
      return openCache.get(key);
    };
    const nearestOpen = (cell) => {
      const maximumRing = Math.max(columns, rows);
      for (let ring = 0; ring <= maximumRing; ring += 1) {
        let best = null;
        let bestDistance = Infinity;
        for (let offsetY = -ring; offsetY <= ring; offsetY += 1) {
          for (let offsetX = -ring; offsetX <= ring; offsetX += 1) {
            if (ring > 0 && Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== ring) continue;
            const column = cell.column + offsetX;
            const row = cell.row + offsetY;
            if (!cellIsOpen(column, row)) continue;
            const d = offsetX * offsetX + offsetY * offsetY;
            if (d < bestDistance) {
              best = { column, row };
              bestDistance = d;
            }
          }
        }
        if (best) return best;
      }
      return null;
    };
    const startCell = nearestOpen(clampCell(start));
    const goalCell = nearestOpen(clampCell(goal));
    if (!startCell || !goalCell) return [];
    const startKey = keyOf(startCell.column, startCell.row);
    const goalKey = keyOf(goalCell.column, goalCell.row);
    if (startKey === goalKey) return [pointOf(goalCell.column, goalCell.row)];

    const heap = [];
    const heapPush = (entry) => {
      heap.push(entry);
      let index = heap.length - 1;
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (heap[parent].score <= entry.score) break;
        heap[index] = heap[parent];
        index = parent;
      }
      heap[index] = entry;
    };
    const heapPop = () => {
      if (heap.length === 0) return null;
      const root = heap[0];
      const tail = heap.pop();
      if (heap.length > 0) {
        let index = 0;
        while (true) {
          const left = index * 2 + 1;
          const right = left + 1;
          if (left >= heap.length) break;
          let child = left;
          if (right < heap.length && heap[right].score < heap[left].score) child = right;
          if (heap[child].score >= tail.score) break;
          heap[index] = heap[child];
          index = child;
        }
        heap[index] = tail;
      }
      return root;
    };
    const heuristic = (column, row) => {
      const dx = Math.abs(goalCell.column - column);
      const dy = Math.abs(goalCell.row - row);
      return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };
    const scores = new Map([[startKey, 0]]);
    const parents = new Map();
    const closed = new Set();
    heapPush({ key: startKey, score: heuristic(startCell.column, startCell.row) });
    const directions = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
    ];
    const maximumVisited = Math.max(1, Number(opts.maxVisited) || columns * rows);
    let visited = 0;
    while (heap.length > 0 && visited < maximumVisited) {
      const current = heapPop();
      if (!current || closed.has(current.key)) continue;
      if (current.key === goalKey) {
        const reversed = [];
        let cursor = goalKey;
        while (cursor !== startKey) {
          const cell = cellOf(cursor);
          reversed.push(pointOf(cell.column, cell.row));
          cursor = parents.get(cursor);
          if (cursor == null) return [];
        }
        return reversed.reverse();
      }
      closed.add(current.key);
      visited += 1;
      const cell = cellOf(current.key);
      const currentScore = scores.get(current.key) || 0;
      directions.forEach(([offsetX, offsetY, cost]) => {
        const column = cell.column + offsetX;
        const row = cell.row + offsetY;
        if (!cellIsOpen(column, row)) return;
        if (offsetX !== 0 && offsetY !== 0
          && (!cellIsOpen(cell.column + offsetX, cell.row)
            || !cellIsOpen(cell.column, cell.row + offsetY))) return;
        const key = keyOf(column, row);
        if (closed.has(key)) return;
        const candidateScore = currentScore + cost;
        if (candidateScore >= (scores.get(key) ?? Infinity)) return;
        scores.set(key, candidateScore);
        parents.set(key, current.key);
        heapPush({ key, score: candidateScore + heuristic(column, row) });
      });
    }
    return [];
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  return Object.freeze({
    clamp,
    distance,
    distanceSquared,
    normalizeRect,
    pointInRect,
    selectInRect,
    formationOffsets,
    resolveDamage,
    resourceTicks,
    circlesOverlap,
    findOpenSpawn,
    segmentIntersectsCircle,
    findGridPath,
    seededRandom,
  });
});
