(function attachIronAssets(root, factory) {
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.IronAssetManifest = api.MANIFEST;
    root.IronAssetStore = api.IronAssetStore;
  }
})(typeof window !== 'undefined' ? window : globalThis, function createIronAssets(root) {
  'use strict';

  const TEAM_COLORS = Object.freeze({
    player: '#25d9ff',
    enemy: '#ff654f',
  });

  function base(src, legacy, category, worldWidth, worldHeight, teamTint) {
    return Object.freeze({
      src: `assets/art/v2/${src}`,
      fallbackSrc: `assets/art/${legacy || src}`,
      category,
      required: true,
      worldWidth,
      worldHeight,
      teamTint: Boolean(teamTint),
    });
  }

  function animation(src, category, worldWidth, worldHeight, frameCount, clips, options) {
    const opts = options || {};
    return Object.freeze({
      src: `assets/art/v2/anim/${src}`,
      category,
      required: false,
      animation: true,
      frameWidth: category === 'unitAnimation' ? 192 : 256,
      frameHeight: category === 'unitAnimation' ? 192 : 256,
      columns: 4,
      frameCount,
      worldWidth,
      worldHeight,
      teamTint: Boolean(opts.teamTint),
      composition: opts.composition || 'overlay',
      clips: Object.freeze(clips),
    });
  }

  function clip(start, count, fps, options) {
    const opts = options || {};
    return Object.freeze({
      start,
      count,
      fps,
      loop: opts.loop !== false,
      clock: opts.clock || 'time',
      distancePerFrame: opts.distancePerFrame || 6,
      continuous: opts.continuous !== false,
      duration: opts.duration || null,
    });
  }

  const BASE_MANIFEST = Object.freeze({
    unitRifle: base('unit-rifle.png', null, 'unit', 30, 30, true),
    unitRocket: base('unit-rocket.png', null, 'unit', 34, 32, true),
    unitScoutBody: base('unit-scout-body.png', null, 'unit', 46, 40, true),
    unitScoutTurret: base('unit-scout-turret.png', null, 'unit', 48, 48, true),
    unitTankBody: base('unit-tank-body.png', null, 'unit', 58, 54, true),
    unitTankTurret: base('unit-tank-turret.png', null, 'unit', 66, 66, true),
    unitHarvester: base('unit-harvester.png', null, 'unit', 74, 56, true),
    unitFighter: base('unit-fighter.png', null, 'unit', 78, 60, true),
    buildingHq: base('building-hq.png', null, 'building', 170, 145, true),
    buildingPowerPlant: base('building-power-plant.png', null, 'building', 106, 96, true),
    buildingRefinery: base('building-refinery.png', null, 'building', 170, 124, true),
    buildingBarracks: base('building-barracks.png', null, 'building', 126, 100, true),
    buildingFactory: base('building-factory.png', null, 'building', 176, 128, true),
    buildingAirfield: base('building-airfield.png', null, 'building', 208, 148, true),
    buildingTurretBase: base('building-turret-base.png', null, 'building', 74, 74, true),
    buildingTurretHead: base('building-turret-head.png', null, 'building', 90, 90, true),
    terrainGround: base('terrain-ground.png', null, 'terrain', 1024, 1024, false),
    oreFull: base('ore-full.png', null, 'terrain', 126, 96, false),
    oreDepleted: base('ore-depleted.png', null, 'terrain', 116, 88, false),
  });

  const UNIT_CLIPS = Object.freeze({
    idle: clip(0, 2, 3, { clock: 'time' }),
    move: clip(2, 4, 8, { clock: 'distance', distancePerFrame: 5 }),
    fire: clip(6, 3, 12, { clock: 'event', loop: false, continuous: false, duration: 0.25 }),
  });
  const VEHICLE_CLIPS = Object.freeze({
    idle: clip(0, 2, 2.5, { clock: 'time' }),
    move: clip(2, 4, 8, { clock: 'distance', distancePerFrame: 8 }),
    fire: clip(6, 3, 12, { clock: 'event', loop: false, continuous: false, duration: 0.25 }),
  });

  const ANIMATION_MANIFEST = Object.freeze({
    animUnitRifle: animation('unit-rifle-sheet.png', 'unitAnimation', 30, 30, 9, UNIT_CLIPS,
      { teamTint: true, composition: 'replace' }),
    animUnitRocket: animation('unit-rocket-sheet.png', 'unitAnimation', 34, 32, 9, UNIT_CLIPS,
      { teamTint: true, composition: 'replace' }),
    animUnitScout: animation('unit-scout-sheet.png', 'unitAnimation', 50, 44, 9, VEHICLE_CLIPS),
    animUnitTank: animation('unit-tank-sheet.png', 'unitAnimation', 62, 58, 9, VEHICLE_CLIPS),
    animUnitHarvester: animation('unit-harvester-sheet.png', 'unitAnimation', 78, 60, 13, {
      idle: clip(0, 2, 2.5, { clock: 'time' }),
      move: clip(2, 4, 7, { clock: 'distance', distancePerFrame: 8 }),
      mining: clip(6, 4, 6, { clock: 'time' }),
      unloading: clip(10, 3, 6, { clock: 'time' }),
    }),
    animUnitFighter: animation('unit-fighter-sheet.png', 'unitAnimation', 88, 68, 9, {
      idle: clip(0, 2, 3, { clock: 'time' }),
      move: clip(2, 4, 9, { clock: 'distance', distancePerFrame: 10 }),
      fire: clip(6, 3, 12, { clock: 'event', loop: false, continuous: false, duration: 0.25 }),
    }),
    animBuildingHq: animation('building-hq-sheet.png', 'buildingAnimation', 170, 145, 6, {
      active: clip(0, 4, 4, { clock: 'time' }),
      lowPower: clip(4, 2, 2, { clock: 'time' }),
    }),
    animBuildingPowerPlant: animation('building-power-plant-sheet.png', 'buildingAnimation', 106, 96, 8, {
      active: clip(0, 6, 6, { clock: 'time' }),
      lowPower: clip(6, 2, 2, { clock: 'time' }),
    }),
    animBuildingRefinery: animation('building-refinery-sheet.png', 'buildingAnimation', 170, 124, 8, {
      idle: clip(0, 2, 2, { clock: 'time' }),
      processing: clip(2, 4, 5, { clock: 'time' }),
      lowPower: clip(6, 2, 2, { clock: 'time' }),
    }),
    animBuildingBarracks: animation('building-barracks-sheet.png', 'buildingAnimation', 126, 100, 8, {
      idle: clip(0, 2, 2, { clock: 'time' }),
      producing: clip(2, 4, 4, { clock: 'time' }),
      lowPower: clip(6, 2, 2, { clock: 'time' }),
    }),
    animBuildingFactory: animation('building-factory-sheet.png', 'buildingAnimation', 176, 128, 8, {
      idle: clip(0, 2, 2, { clock: 'time' }),
      producing: clip(2, 4, 4, { clock: 'time' }),
      lowPower: clip(6, 2, 2, { clock: 'time' }),
    }),
    animBuildingAirfield: animation('building-airfield-sheet.png', 'buildingAnimation', 208, 148, 8, {
      idle: clip(0, 2, 2, { clock: 'time' }),
      producing: clip(2, 4, 5, { clock: 'time' }),
      lowPower: clip(6, 2, 2, { clock: 'time' }),
    }),
    animBuildingTurret: animation('building-turret-sheet.png', 'buildingAnimation', 94, 94, 7, {
      idle: clip(0, 2, 2, { clock: 'time' }),
      fire: clip(2, 3, 12, { clock: 'event', loop: false, continuous: false, duration: 0.25 }),
      lowPower: clip(5, 2, 2, { clock: 'time' }),
    }),
  });

  const MANIFEST = Object.freeze({ ...BASE_MANIFEST, ...ANIMATION_MANIFEST });
  const BASE_ASSET_KEYS = Object.freeze(Object.keys(BASE_MANIFEST));
  const ANIMATION_ASSET_KEYS = Object.freeze(Object.keys(ANIMATION_MANIFEST));
  const ASSET_KEYS = Object.freeze([...BASE_ASSET_KEYS, ...ANIMATION_ASSET_KEYS]);

  function defaultCanvasFactory(width, height) {
    if (!root.document || typeof root.document.createElement !== 'function') return null;
    const canvas = root.document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  class IronAssetStore {
    constructor(options) {
      const opts = options || {};
      this.timeoutMs = Math.max(250, Number(opts.timeoutMs) || 8000);
      this.imageFactory = opts.imageFactory || (() => {
        if (typeof root.Image !== 'function') throw new Error('Image constructor is unavailable.');
        return new root.Image();
      });
      this.canvasFactory = opts.canvasFactory || defaultCanvasFactory;
      this.records = new Map(ASSET_KEYS.map((key) => [key, {
        key,
        definition: MANIFEST[key],
        state: 'idle',
        image: null,
        error: null,
        primaryError: null,
        loadedSrc: null,
        usedFallback: false,
      }]));
      this.tintCache = new Map();
      this.tintWarnings = new Map();
      this.state = 'idle';
      this.loadPromise = null;
      this.optionalPromise = null;
      this.listeners = new Set();
    }

    loadAll(onProgress) {
      if (typeof onProgress === 'function') this.listeners.add(onProgress);
      if (this.loadPromise) {
        this.emit();
        return this.loadPromise;
      }
      this.state = 'loading';
      this.emit();

      // Optional animation sheets start immediately, but the returned promise
      // only waits for required base art. This keeps file:// startup responsive
      // even when one animation is absent or takes the full timeout to fail.
      this.optionalPromise = Promise.all(ANIMATION_ASSET_KEYS.map((key) => this.loadOne(key)))
        .then(() => {
          this.precacheTeamTints(ANIMATION_ASSET_KEYS);
          if (this.state !== 'loading') this.state = this.status().failed.length ? 'degraded' : 'ready';
          this.emit();
          return this.status();
        });
      this.loadPromise = Promise.all(BASE_ASSET_KEYS.map((key) => this.loadOne(key)))
        .then(() => {
          this.precacheTeamTints(BASE_ASSET_KEYS);
          this.state = this.status().failed.length ? 'degraded' : 'ready';
          this.emit();
          return this.status();
        });
      return this.loadPromise;
    }

    loadOne(key) {
      const record = this.records.get(key);
      if (!record) return Promise.resolve(false);
      if (record.state === 'loaded') return Promise.resolve(true);
      record.state = 'pending';
      record.error = null;
      record.primaryError = null;
      record.loadedSrc = null;
      record.usedFallback = false;
      this.emit();

      return this.loadSource(record, record.definition.src, 'primary').then((result) => {
        if (result.loaded) {
          this.finishRecord(record, true, result.image, record.definition.src, false, null);
          return true;
        }
        record.primaryError = result.error;
        if (!record.definition.fallbackSrc) {
          this.finishRecord(record, false, null, null, false, result.error);
          return false;
        }
        return this.loadSource(record, record.definition.fallbackSrc, 'fallback').then((fallback) => {
          if (fallback.loaded) {
            this.finishRecord(record, true, fallback.image, record.definition.fallbackSrc, true, null);
            return true;
          }
          this.finishRecord(record, false, null, null, false,
            `${result.error}; fallback: ${fallback.error}`);
          return false;
        });
      });
    }

    loadSource(record, src, attempt) {
      return new Promise((resolve) => {
        let image;
        let settled = false;
        const finish = (loaded, error) => {
          if (settled) return;
          settled = true;
          root.clearTimeout(timer);
          resolve({
            loaded,
            image: loaded ? image : null,
            error: loaded ? null : String(error && error.message ? error.message : error || 'load failed'),
          });
        };
        const timer = root.setTimeout(() => finish(false, new Error(`Asset timeout: ${record.key} (${attempt})`)),
          this.timeoutMs);
        try {
          image = this.imageFactory(record.key, record.definition, src, attempt);
          image.onload = () => {
            const width = Number(image.naturalWidth || image.width) || 0;
            const height = Number(image.naturalHeight || image.height) || 0;
            const definition = record.definition;
            const expectedWidth = definition.animation
              ? definition.frameWidth * definition.columns : 1;
            const expectedHeight = definition.animation
              ? definition.frameHeight * Math.ceil(definition.frameCount / definition.columns) : 1;
            const valid = width >= expectedWidth && height >= expectedHeight;
            finish(valid, valid ? null : new Error(
              `Invalid dimensions: ${record.key} is ${width}x${height}, expected at least ${expectedWidth}x${expectedHeight}`,
            ));
          };
          image.onerror = () => finish(false, new Error(`Unable to load ${src}`));
          image.decoding = 'async';
          image.src = src;
        } catch (error) {
          finish(false, error);
        }
      });
    }

    finishRecord(record, loaded, image, loadedSrc, usedFallback, error) {
      record.state = loaded ? 'loaded' : 'failed';
      record.image = loaded ? image : null;
      record.loadedSrc = loaded ? loadedSrc : null;
      record.usedFallback = loaded ? usedFallback : false;
      record.error = loaded ? null : String(error || 'load failed');
      this.clearTintFor(record.key);
      this.emit();
    }

    clearTintFor(key) {
      [...this.tintCache.keys()].forEach((cacheKey) => {
        if (cacheKey.startsWith(`${key}:`)) this.tintCache.delete(cacheKey);
      });
      [...this.tintWarnings.keys()].forEach((cacheKey) => {
        if (cacheKey.startsWith(`${key}:`)) this.tintWarnings.delete(cacheKey);
      });
    }

    precacheTeamTints(keys) {
      (keys || ASSET_KEYS).forEach((key) => {
        const definition = MANIFEST[key];
        if (!definition.teamTint) return;
        Object.keys(TEAM_COLORS).forEach((team) => this.get(key, team));
      });
    }

    get(key, team) {
      const record = this.records.get(key);
      if (!record || record.state !== 'loaded' || !record.image) return null;
      if (!team || !record.definition.teamTint || !TEAM_COLORS[team]) return record.image;
      const cacheKey = `${key}:${team}`;
      if (this.tintCache.has(cacheKey)) return this.tintCache.get(cacheKey);

      const width = Number(record.image.naturalWidth || record.image.width) || 0;
      const height = Number(record.image.naturalHeight || record.image.height) || 0;
      const canvas = width > 0 && height > 0 ? this.canvasFactory(width, height) : null;
      const context = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
      if (!context) return record.image;
      try {
        context.clearRect(0, 0, width, height);
        context.drawImage(record.image, 0, 0, width, height);
        context.globalCompositeOperation = 'source-atop';
        context.globalAlpha = 0.2;
        context.fillStyle = TEAM_COLORS[team];
        context.fillRect(0, 0, width, height);
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        this.tintCache.set(cacheKey, canvas);
        return canvas;
      } catch (error) {
        const message = `Tint fallback: ${error && error.message ? error.message : error}`;
        this.tintWarnings.set(cacheKey, message);
        this.tintCache.set(cacheKey, record.image);
        return record.image;
      }
    }

    getFrame(key, team, frameIndex) {
      const definition = MANIFEST[key];
      if (!definition || !definition.animation) return null;
      const source = this.get(key, team);
      if (!source) return null;
      const count = Math.max(1, Number(definition.frameCount) || 1);
      const normalized = ((Math.floor(Number(frameIndex) || 0) % count) + count) % count;
      const column = normalized % definition.columns;
      const row = Math.floor(normalized / definition.columns);
      return {
        source,
        sx: column * definition.frameWidth,
        sy: row * definition.frameHeight,
        sw: definition.frameWidth,
        sh: definition.frameHeight,
        definition,
        frameIndex: normalized,
      };
    }

    definition(key) {
      return MANIFEST[key] || null;
    }

    status() {
      const grouped = { loaded: [], pending: [], failed: [], idle: [] };
      this.records.forEach((record, key) => grouped[record.state].push(key));
      const failedBase = grouped.failed.filter((key) => BASE_ASSET_KEYS.includes(key));
      const failedAnimations = grouped.failed.filter((key) => ANIMATION_ASSET_KEYS.includes(key));
      const pendingAnimations = grouped.pending.filter((key) => ANIMATION_ASSET_KEYS.includes(key));
      const requiredLoaded = BASE_ASSET_KEYS.filter((key) => this.records.get(key).state === 'loaded');
      const requiredSettled = BASE_ASSET_KEYS.filter((key) => {
        const state = this.records.get(key).state;
        return state === 'loaded' || state === 'failed';
      });
      const legacyFallbacks = BASE_ASSET_KEYS.filter((key) => this.records.get(key).usedFallback);
      return {
        state: this.state,
        total: ASSET_KEYS.length,
        requiredTotal: BASE_ASSET_KEYS.length,
        loaded: grouped.loaded,
        pending: grouped.pending,
        failed: grouped.failed,
        idle: grouped.idle,
        failedBase,
        failedAnimations,
        pendingAnimations,
        requiredLoaded,
        requiredSettled: requiredSettled.length,
        baseReady: requiredSettled.length === BASE_ASSET_KEYS.length && failedBase.length === 0,
        legacyFallbacks,
        errors: grouped.failed.map((key) => ({ key, error: this.records.get(key).error })),
        warnings: Array.from(this.tintWarnings, ([key, warning]) => ({ key, warning })),
      };
    }

    emit() {
      const snapshot = this.status();
      this.listeners.forEach((listener) => {
        try { listener(snapshot); } catch (_) { /* Progress listeners are isolated. */ }
      });
    }
  }

  return Object.freeze({
    MANIFEST,
    BASE_MANIFEST,
    ANIMATION_MANIFEST,
    BASE_ASSET_KEYS,
    ANIMATION_ASSET_KEYS,
    ASSET_KEYS,
    TEAM_COLORS,
    IronAssetStore,
  });
});
