(function attachIronAnimation(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.IronAnimation = api;
})(typeof window !== 'undefined' ? window : globalThis, function createIronAnimation() {
  'use strict';

  const ANIMATION_KEY_BY_ENTITY = Object.freeze({
    'unit:rifle': 'animUnitRifle',
    'unit:rocket': 'animUnitRocket',
    'unit:scout': 'animUnitScout',
    'unit:tank': 'animUnitTank',
    'unit:harvester': 'animUnitHarvester',
    'unit:fighter': 'animUnitFighter',
    'building:hq': 'animBuildingHq',
    'building:powerPlant': 'animBuildingPowerPlant',
    'building:refinery': 'animBuildingRefinery',
    'building:barracks': 'animBuildingBarracks',
    'building:factory': 'animBuildingFactory',
    'building:airfield': 'animBuildingAirfield',
    'building:turret': 'animBuildingTurret',
  });

  function finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function animationKeyForEntity(entity) {
    if (!entity) return null;
    return ANIMATION_KEY_BY_ENTITY[`${entity.kind}:${entity.type}`] || null;
  }

  function lowPower(entity, game) {
    if (!entity || !game || !game.power) return false;
    const power = game.power[entity.team];
    return Boolean(power && finite(power.use, 0) > finite(power.supply, 0));
  }

  function recently(entity, field, time, duration) {
    const stamp = finite(entity && entity[field], -Infinity);
    return stamp > -Infinity && time >= stamp && time - stamp <= duration;
  }

  function resolveClip(entity, game) {
    if (!entity) return 'idle';
    const time = finite(game && game.time, 0);
    if (entity.kind === 'building') {
      if (lowPower(entity, game)) return 'lowPower';
      if (entity.type === 'turret') return recently(entity, 'lastFireAt', time, 0.3) ? 'fire' : 'idle';
      if (entity.type === 'hq' || entity.type === 'powerPlant') return 'active';
      if (entity.type === 'refinery') {
        return finite(entity.activityUntil, -Infinity) >= time ? 'processing' : 'idle';
      }
      if (entity.type === 'barracks' || entity.type === 'factory' || entity.type === 'airfield') {
        return entity.queue && entity.queue.length ? 'producing' : 'idle';
      }
      return 'idle';
    }

    if (recently(entity, 'lastFireAt', time, 0.35)) return 'fire';
    if (entity.type === 'harvester') {
      if (entity.harvestState === 'mining') return 'mining';
      if (entity.harvestState === 'unloading') return 'unloading';
    }
    if (entity.moving === true || recently(entity, 'lastMoveAt', time, 0.14)) return 'move';
    return 'idle';
  }

  function clocksFor(entity, game, options) {
    const opts = options || {};
    const time = finite(game && game.time, 0);
    const lastFireAt = finite(entity && entity.lastFireAt, -Infinity);
    return {
      time,
      distance: Math.max(0, finite(entity && entity.animationDistance, 0)),
      eventAge: lastFireAt > -Infinity ? Math.max(0, time - lastFireAt) : 0,
      phase: ((Math.abs(finite(entity && entity.id, 0)) * 0.173) % 1),
      reducedMotion: Boolean(opts.reducedMotion),
    };
  }

  function resolveFrame(definition, clipName, clocks) {
    if (!definition || !definition.clips) return null;
    let name = clipName;
    let selected = definition.clips[name];
    if (!selected) {
      name = definition.clips.idle ? 'idle'
        : definition.clips.active ? 'active' : Object.keys(definition.clips)[0];
      selected = definition.clips[name];
    }
    if (!selected) return null;

    const values = clocks || {};
    const count = Math.max(1, Math.floor(finite(selected.count, 1)));
    const fps = Math.max(0, finite(selected.fps, 0));
    let cursor = 0;
    if (selected.clock === 'distance') {
      cursor = Math.floor(Math.max(0, finite(values.distance, 0))
        / Math.max(0.01, finite(selected.distancePerFrame, 6)));
    } else if (selected.clock === 'event') {
      cursor = Math.floor(Math.max(0, finite(values.eventAge, 0)) * fps);
    } else {
      let clock = Math.max(0, finite(values.time, 0)) + Math.max(0, finite(values.phase, 0));
      if (values.reducedMotion && selected.continuous !== false) clock *= 0.5;
      cursor = Math.floor(clock * fps);
    }

    const loop = selected.loop !== false;
    const localIndex = loop ? ((cursor % count) + count) % count : Math.min(count - 1, Math.max(0, cursor));
    return Object.freeze({
      clip: name,
      index: Math.max(0, Math.floor(finite(selected.start, 0))) + localIndex,
      localIndex,
      complete: !loop && cursor >= count,
    });
  }

  return Object.freeze({
    ANIMATION_KEY_BY_ENTITY,
    animationKeyForEntity,
    resolveClip,
    resolveFrame,
    clocksFor,
  });
});
