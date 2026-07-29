const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  MANIFEST,
  BASE_ASSET_KEYS,
  ANIMATION_ASSET_KEYS,
  ASSET_KEYS,
  IronAssetStore,
} = require('../js/assets.js');

function fakeImageFactory(shouldFail) {
  return (key, definition, src, attempt) => {
    const isSheet = Boolean(definition.animation);
    const image = {
      naturalWidth: isSheet ? definition.frameWidth * definition.columns : 512,
      naturalHeight: isSheet
        ? definition.frameHeight * Math.ceil(definition.frameCount / definition.columns) : 512,
      width: isSheet ? definition.frameWidth * definition.columns : 512,
      height: isSheet
        ? definition.frameHeight * Math.ceil(definition.frameCount / definition.columns) : 512,
      requestedSrc: src,
    };
    Object.defineProperty(image, 'src', {
      set() {
        queueMicrotask(() => {
          if (shouldFail && shouldFail({ key, definition, src, attempt })) image.onerror(new Error('fixture failure'));
          else image.onload();
        });
      },
    });
    return image;
  };
}

function fakeCanvasFactory(width, height) {
  const context = {
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    clearRect() {},
    drawImage() {},
    fillRect() {},
  };
  return { width, height, getContext: () => context };
}

function throwingCanvasFactory(width, height) {
  return {
    width,
    height,
    getContext: () => ({
      clearRect() {},
      drawImage() { throw new Error('tint unavailable'); },
    }),
  };
}

test('manifest exposes 19 required v2 bases with legacy fallback and 13 optional animation sheets', () => {
  assert.equal(BASE_ASSET_KEYS.length, 19);
  assert.equal(ANIMATION_ASSET_KEYS.length, 13);
  assert.equal(ASSET_KEYS.length, 32);
  assert.equal(new Set(ASSET_KEYS.map((key) => MANIFEST[key].src)).size, 32);
  assert.equal(MANIFEST.unitFighter.fallbackSrc, 'assets/art/unit-fighter.png');
  assert.equal(MANIFEST.buildingAirfield.fallbackSrc, 'assets/art/building-airfield.png');
  BASE_ASSET_KEYS.forEach((key) => {
    assert.equal(MANIFEST[key].required, true);
    assert.match(MANIFEST[key].src, /^assets\/art\/v2\//);
    assert.match(MANIFEST[key].fallbackSrc, /^assets\/art\/(?!v2\/)/);
  });
  ANIMATION_ASSET_KEYS.forEach((key) => {
    const definition = MANIFEST[key];
    assert.equal(definition.required, false);
    assert.equal(definition.animation, true);
    assert.equal(definition.columns, 4);
    assert.ok(definition.frameCount > 1);
    assert.ok(Object.keys(definition.clips).length >= 2);
  });
});

test('all 19 packaged legacy fallback PNGs remain valid and file-safe', () => {
  for (const key of BASE_ASSET_KEYS) {
    const definition = MANIFEST[key];
    const filename = path.join(__dirname, '..', definition.fallbackSrc);
    assert.ok(fs.existsSync(filename), `${key} fallback is missing: ${definition.fallbackSrc}`);
    const png = fs.readFileSync(filename);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${key} is not a PNG`);
    const expectedSize = key === 'terrainGround' ? 1024 : 512;
    assert.equal(png.readUInt32BE(16), expectedSize, `${key} width`);
    assert.equal(png.readUInt32BE(20), expectedSize, `${key} height`);
  }
});

test('package contains exactly 19 v2 bases and 13 pivot-safe animation sheets', () => {
  const artRoot = path.join(__dirname, '..', 'assets', 'art');
  const walkPngs = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walkPngs(filename) : entry.name.endsWith('.png') ? [filename] : [];
  });
  assert.equal(walkPngs(artRoot).length, 51);

  for (const key of BASE_ASSET_KEYS) {
    const definition = MANIFEST[key];
    const filename = path.join(__dirname, '..', definition.src);
    assert.ok(fs.existsSync(filename), `${key} v2 base is missing: ${definition.src}`);
    const png = fs.readFileSync(filename);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const expectedSize = key === 'terrainGround' ? 1024 : 512;
    assert.equal(png.readUInt32BE(16), expectedSize, `${key} v2 width`);
    assert.equal(png.readUInt32BE(20), expectedSize, `${key} v2 height`);
    if (key !== 'terrainGround') assert.equal(png[25], 6, `${key} should be RGBA`);
  }

  for (const key of ANIMATION_ASSET_KEYS) {
    const definition = MANIFEST[key];
    const filename = path.join(__dirname, '..', definition.src);
    assert.ok(fs.existsSync(filename), `${key} sheet is missing: ${definition.src}`);
    const png = fs.readFileSync(filename);
    assert.equal(png.readUInt32BE(16), definition.frameWidth * definition.columns, `${key} sheet width`);
    assert.equal(png.readUInt32BE(20), definition.frameHeight
      * Math.ceil(definition.frameCount / definition.columns), `${key} sheet height`);
    assert.equal(png[25], 6, `${key} sheet should be RGBA`);
    Object.values(definition.clips).forEach((clipDefinition) => {
      assert.ok(clipDefinition.start + clipDefinition.count <= definition.frameCount,
        `${key} clip exceeds its sheet`);
    });
  }
});

test('undersized animation sheets fail validation without affecting required bases', async () => {
  const store = new IronAssetStore({
    timeoutMs: 500,
    imageFactory: (key, definition, src) => {
      const image = {
        naturalWidth: definition.animation ? definition.frameWidth * definition.columns : 512,
        naturalHeight: definition.animation
          ? definition.frameHeight * Math.ceil(definition.frameCount / definition.columns) : 512,
        requestedSrc: src,
      };
      if (key === 'animUnitTank') image.naturalHeight -= 1;
      Object.defineProperty(image, 'src', { set() { queueMicrotask(() => image.onload()); } });
      return image;
    },
    canvasFactory: fakeCanvasFactory,
  });
  await store.loadAll();
  await store.optionalPromise;
  const status = store.status();
  assert.equal(status.baseReady, true);
  assert.deepEqual(status.failedAnimations, ['animUnitTank']);
  assert.match(status.errors[0].error, /Invalid dimensions/);
});

test('asset store loads required bases, finishes optional sheets, and caches team tints', async () => {
  const store = new IronAssetStore({
    timeoutMs: 500,
    imageFactory: fakeImageFactory(),
    canvasFactory: fakeCanvasFactory,
  });
  const progress = [];
  const baseStatus = await store.loadAll((snapshot) => progress.push(snapshot.loaded.length));
  assert.equal(baseStatus.baseReady, true);
  await store.optionalPromise;
  const status = store.status();
  assert.equal(status.state, 'ready');
  assert.equal(status.loaded.length, 32);
  assert.equal(status.failed.length, 0);
  assert.ok(progress.length >= 2);
  const base = store.get('unitTankBody');
  const tinted = store.get('unitTankBody', 'player');
  assert.ok(base);
  assert.ok(tinted);
  assert.notEqual(tinted, base);
  assert.equal(store.get('unitTankBody', 'player'), tinted);
  assert.equal(store.tintCache.size, 36);
});

test('a missing v2 base loads its legacy file without degrading the frame', async () => {
  const store = new IronAssetStore({
    timeoutMs: 500,
    imageFactory: fakeImageFactory(({ key, attempt }) => key === 'unitTankBody' && attempt === 'primary'),
    canvasFactory: fakeCanvasFactory,
  });
  await store.loadAll();
  await store.optionalPromise;
  const status = store.status();
  assert.equal(status.state, 'ready');
  assert.deepEqual(status.legacyFallbacks, ['unitTankBody']);
  assert.equal(status.failedBase.length, 0);
  assert.match(store.get('unitTankBody').requestedSrc, /^assets\/art\/unit-tank-body/);
});

test('one animation failure degrades only that sheet and getFrame uses 9-arg crop coordinates', async () => {
  const store = new IronAssetStore({
    timeoutMs: 500,
    imageFactory: fakeImageFactory(({ key }) => key === 'animUnitTank'),
    canvasFactory: fakeCanvasFactory,
  });
  await store.loadAll();
  await store.optionalPromise;
  const status = store.status();
  assert.equal(status.state, 'degraded');
  assert.deepEqual(status.failedAnimations, ['animUnitTank']);
  assert.equal(status.failedBase.length, 0);
  assert.equal(store.getFrame('animUnitTank', 'enemy', 2), null);
  const frame = store.getFrame('animUnitRifle', 'player', 8);
  assert.deepEqual({ sx: frame.sx, sy: frame.sy, sw: frame.sw, sh: frame.sh, index: frame.frameIndex },
    { sx: 0, sy: 384, sw: 192, sh: 192, index: 8 });
  const fighterFrame = store.getFrame('animUnitFighter', 'player', 8);
  assert.deepEqual({ sx: fighterFrame.sx, sy: fighterFrame.sy, sw: fighterFrame.sw, sh: fighterFrame.sh },
    { sx: 0, sy: 384, sw: 192, sh: 192 });
  const airfieldFrame = store.getFrame('animBuildingAirfield', 'player', 7);
  assert.deepEqual({ sx: airfieldFrame.sx, sy: airfieldFrame.sy, sw: airfieldFrame.sw, sh: airfieldFrame.sh },
    { sx: 768, sy: 256, sw: 256, sh: 256 });
  assert.ok(store.get('unitTankBody', 'enemy'));
});

test('when v2 and legacy both fail only that entity base becomes procedural', async () => {
  const store = new IronAssetStore({
    timeoutMs: 500,
    imageFactory: fakeImageFactory(({ key }) => key === 'buildingHq'),
    canvasFactory: fakeCanvasFactory,
  });
  await store.loadAll();
  const status = store.status();
  assert.equal(status.state, 'degraded');
  assert.deepEqual(status.failedBase, ['buildingHq']);
  assert.equal(store.get('buildingHq', 'player'), null);
  assert.ok(store.get('buildingBarracks', 'player'));
});

test('a tint failure caches the raw-image fallback instead of retrying every frame', async () => {
  const store = new IronAssetStore({
    timeoutMs: 500,
    imageFactory: fakeImageFactory(),
    canvasFactory: throwingCanvasFactory,
  });
  await store.loadAll();
  await store.optionalPromise;
  const status = store.status();
  const raw = store.get('unitTankBody');
  assert.equal(status.state, 'ready');
  assert.equal(status.warnings.length, 36);
  assert.equal(store.get('unitTankBody', 'player'), raw);
  assert.equal(store.get('unitTankBody', 'player'), raw);
  assert.equal(store.tintCache.get('unitTankBody:player'), raw);
});
