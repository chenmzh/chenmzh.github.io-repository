(function attachIronRenderer(root) {
  'use strict';

  const Data = root.IronData;
  const Animation = root.IronAnimation || null;
  const TAU = Math.PI * 2;
  const MAX_CANVAS_DIMENSION = 8192;
  const MAX_CANVAS_PIXELS = 32 * 1024 * 1024;
  const PALETTE = {
    void: '#0d171c',
    ground: '#71858b',
    groundDeep: '#556b72',
    groundLift: '#94a7aa',
    grid: '#d3e1df',
    road: '#53666c',
    roadEdge: '#33484f',
    roadMark: '#bdccca',
    metal: '#7f9298',
    metalLight: '#b9c6ca',
    metalDark: '#253941',
    paper: '#f5fbfc',
    muted: '#aec1c5',
    ore: '#a78bfa',
    oreBright: '#efe8ff',
    oreDark: '#6046b5',
    warning: '#ffd166',
    danger: '#ff654f',
    health: '#72e39b',
  };
  const TEAM_PRESENTATION = Object.freeze({
    player: Object.freeze({ color: '#25d9ff', accent: '#d8f9ff', dark: '#174c57' }),
    enemy: Object.freeze({ color: '#ff654f', accent: '#ffe0d3', dark: '#6b2922' }),
  });

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function mix(a, b, amount) {
    return a + (b - a) * amount;
  }

  function rgba(hex, alpha) {
    const normalized = String(hex || '#ffffff').replace('#', '');
    const value = normalized.length === 3
      ? normalized.split('').map((part) => part + part).join('')
      : normalized.slice(0, 6).padEnd(6, 'f');
    const number = Number.parseInt(value, 16);
    const red = (number >> 16) & 255;
    const green = (number >> 8) & 255;
    const blue = number & 255;
    return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
  }

  function roundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(Math.abs(width) / 2, Math.abs(height) / 2, Math.max(0, radius));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function polygonPath(ctx, points) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index][0], points[index][1]);
    }
    ctx.closePath();
  }

  function beveledRectPath(ctx, x, y, width, height, bevel) {
    const cut = Math.min(bevel, width / 3, height / 3);
    polygonPath(ctx, [
      [x + cut, y], [x + width - cut, y], [x + width, y + cut],
      [x + width, y + height - cut], [x + width - cut, y + height],
      [x + cut, y + height], [x, y + height - cut], [x, y + cut],
    ]);
  }

  function smoothRoute(ctx, points) {
    if (!points || points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length - 1; index += 1) {
      const point = points[index];
      const next = points[index + 1];
      ctx.quadraticCurveTo(point[0], point[1], (point[0] + next[0]) / 2, (point[1] + next[1]) / 2);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last[0], last[1]);
  }

  function localRandom(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  class IronRenderer {
    constructor(canvas, minimap, options) {
      const opts = options || {};
      if (!canvas || typeof canvas.getContext !== 'function') {
        throw new TypeError('IronRenderer requires a battlefield canvas.');
      }
      if (!minimap || typeof minimap.getContext !== 'function') {
        throw new TypeError('IronRenderer requires a minimap canvas.');
      }

      this.canvas = canvas;
      this.minimap = minimap;
      this.viewportElement = opts.viewportElement || canvas.parentElement || canvas;
      this.assets = opts.assets || null;
      this.animation = opts.animation || Animation;
      this.i18n = opts.i18n || root.IronI18n || null;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.minimapCtx = minimap.getContext('2d', { alpha: false });
      if (!this.ctx || !this.minimapCtx) throw new Error('Canvas 2D rendering is unavailable.');

      this.defaultWidth = Math.max(1, canvas.width || 1280);
      this.defaultHeight = Math.max(1, canvas.height || 720);
      this.defaultMinimapWidth = Math.max(1, minimap.width || 320);
      this.defaultMinimapHeight = Math.max(1, minimap.height || 200);
      this.viewport = { width: this.defaultWidth, height: this.defaultHeight, dpr: 1 };
      this.minimapViewport = {
        width: this.defaultMinimapWidth,
        height: this.defaultMinimapHeight,
        dpr: 1,
      };
      this.drawStats = this.emptyDrawStats();
      this.lastError = null;
      this.failedDrawKeys = new Set();
      this.renderSamples = [];
      this.reducedMotion = Boolean(root.matchMedia
        && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.groundPattern = null;
      this.groundPatternSource = null;
      this.terrain = { patches: [], contours: [], scars: [], oreFacets: [] };
      this.roads = [
        [[-100, 756], [260, 746], [610, 770], [980, 758], [1370, 770], [1760, 748], [2140, 764], [2500, 754]],
        [[1206, -100], [1188, 250], [1220, 540], [1202, 820], [1228, 1110], [1208, 1600]],
        [[275, 760], [410, 650], [515, 570], [690, 520]],
        [[2115, 760], [1990, 650], [1890, 570], [1720, 520]],
        [[930, 1245], [1080, 1115], [1210, 1040], [1370, 1115], [1510, 1240]],
      ];
      this.reset(() => 0.4815162342);
      this.resize();
    }

    t(key, params) {
      return this.i18n && typeof this.i18n.t === 'function' ? this.i18n.t(key, params) : key;
    }

    reset(rng) {
      const source = typeof rng === 'function' ? rng : () => 0.4815162342;
      const seed = ((source() * 0xffffffff) >>> 0) ^ 0x7c0de071;
      const random = localRandom(seed);
      const patches = [];
      const contours = [];
      const scars = [];
      const oreFacets = [];

      for (let index = 0; index < 34; index += 1) {
        patches.push({
          x: random() * Data.MAP.width,
          y: random() * Data.MAP.height,
          rx: 70 + random() * 250,
          ry: 28 + random() * 130,
          rotation: random() * Math.PI,
          lift: random() > 0.58,
          alpha: 0.025 + random() * 0.055,
        });
      }
      for (let index = 0; index < 16; index += 1) {
        contours.push({
          x: 90 + random() * (Data.MAP.width - 180),
          y: 80 + random() * (Data.MAP.height - 160),
          rx: 45 + random() * 145,
          ry: 24 + random() * 70,
          rotation: random() * Math.PI,
          rings: 2 + Math.floor(random() * 4),
        });
      }
      for (let index = 0; index < 78; index += 1) {
        const length = 8 + random() * 42;
        const angle = random() * TAU;
        scars.push({
          x: random() * Data.MAP.width,
          y: random() * Data.MAP.height,
          dx: Math.cos(angle) * length,
          dy: Math.sin(angle) * length,
          alpha: 0.08 + random() * 0.14,
        });
      }
      for (let node = 0; node < 16; node += 1) {
        const facets = [];
        for (let index = 0; index < 20; index += 1) {
          const angle = random() * TAU;
          const distance = Math.sqrt(random()) * 42;
          facets.push({
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance * 0.7,
            width: 7 + random() * 11,
            height: 12 + random() * 27,
            rotation: angle + (random() - 0.5) * 0.7,
            phase: random() * TAU,
          });
        }
        facets.sort((a, b) => a.y - b.y);
        oreFacets.push(facets);
      }
      this.terrain = { patches, contours, scars, oreFacets };
    }

    resize() {
      const battlefieldSize = this.measure(this.viewportElement, this.defaultWidth, this.defaultHeight);
      const minimapSize = this.measure(this.minimap, this.defaultMinimapWidth, this.defaultMinimapHeight);
      const ratio = this.safePixelRatio(battlefieldSize.width, battlefieldSize.height);
      const minimapRatio = this.safePixelRatio(minimapSize.width, minimapSize.height);

      this.viewport = {
        width: battlefieldSize.width,
        height: battlefieldSize.height,
        dpr: ratio,
        pixelWidth: Math.max(1, Math.floor(battlefieldSize.width * ratio)),
        pixelHeight: Math.max(1, Math.floor(battlefieldSize.height * ratio)),
      };
      this.minimapViewport = {
        width: minimapSize.width,
        height: minimapSize.height,
        dpr: minimapRatio,
        pixelWidth: Math.max(1, Math.floor(minimapSize.width * minimapRatio)),
        pixelHeight: Math.max(1, Math.floor(minimapSize.height * minimapRatio)),
      };
      this.configureCanvas(this.canvas, this.ctx, battlefieldSize.width, battlefieldSize.height, ratio);
      this.configureCanvas(this.minimap, this.minimapCtx, minimapSize.width, minimapSize.height, minimapRatio);
    }

    safePixelRatio(width, height) {
      const requested = clamp(Number(root.devicePixelRatio) || 1, 1, 2);
      const dimensionLimit = Math.min(MAX_CANVAS_DIMENSION / Math.max(1, width),
        MAX_CANVAS_DIMENSION / Math.max(1, height));
      const areaLimit = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height));
      return Math.max(Number.EPSILON, Math.min(requested, dimensionLimit, areaLimit, 2));
    }

    measure(canvas, fallbackWidth, fallbackHeight) {
      const rect = typeof canvas.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : null;
      const width = rect && rect.width > 0.5
        ? rect.width : Number(canvas.clientWidth) || fallbackWidth;
      const height = rect && rect.height > 0.5
        ? rect.height : Number(canvas.clientHeight) || fallbackHeight;
      return {
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
      };
    }

    configureCanvas(canvas, ctx, width, height, ratio) {
      // Floor the backing dimensions so rounding can never push the bitmap over
      // Safari's hard dimension or total-pixel limits.
      const pixelWidth = Math.max(1, Math.floor(width * ratio));
      const pixelHeight = Math.max(1, Math.floor(height * ratio));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.imageSmoothingEnabled = true;
    }

    getViewport() {
      return { ...this.viewport };
    }

    emptyDrawStats() {
      return {
        terrainFrames: 0,
        buildings: 0,
        units: 0,
        sprites: 0,
        spriteDrawCalls: 0,
        animationFrames: 0,
        animationFallbacks: 0,
        activeClips: {},
        proceduralFallbacks: 0,
        minimapEntities: 0,
        visibleIds: [],
      };
    }

    getDiagnostics() {
      return {
        viewport: { ...this.viewport },
        draw: {
          ...this.drawStats,
          activeClips: { ...this.drawStats.activeClips },
          visibleIds: [...this.drawStats.visibleIds],
        },
        performance: { renderMsP95: this.renderPercentile(0.95) },
        lastError: this.lastError,
      };
    }

    clockNow() {
      return root.performance && typeof root.performance.now === 'function'
        ? root.performance.now() : Date.now();
    }

    renderPercentile(percentile) {
      if (!this.renderSamples.length) return 0;
      const sorted = this.renderSamples.slice().sort((a, b) => a - b);
      const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentile) - 1));
      return Math.round(sorted[index] * 1000) / 1000;
    }

    render(game) {
      if (!game) return;
      const frameStarted = this.clockNow();
      this.drawStats = this.emptyDrawStats();
      this.lastError = null;
      const ctx = this.ctx;
      const view = this.viewport;
      const camera = game.camera || { x: 0, y: 0 };
      const time = Number(game.time) || 0;
      const shake = clamp(Number(game.screenShake) || 0, 0, 1);
      const shakeX = Math.sin(time * 79.1) * shake * 5.5;
      const shakeY = Math.cos(time * 91.7) * shake * 4;

      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash([]);
      ctx.clearRect(0, 0, view.width, view.height);
      ctx.fillStyle = PALETTE.void;
      ctx.fillRect(0, 0, view.width, view.height);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, view.width, view.height);
      ctx.clip();
      ctx.translate(-camera.x + shakeX, -camera.y + shakeY);

      this.drawTerrain(ctx, camera, view);
      this.drawStats.terrainFrames += 1;
      if (game.placementType) this.drawBuildCoverage(ctx, game);
      this.drawMinerals(ctx, game, camera, view, time);
      this.drawCommandLinks(ctx, game, camera, view, time);

      const entities = (game.entities || [])
        .filter((entity) => entity && entity.hp > 0 && this.visible(entity.x, entity.y, entity.radius + 110, camera, view))
        .slice()
        .sort((a, b) => {
          const aAir = a.movementLayer === 'air' ? 1 : 0;
          const bAir = b.movementLayer === 'air' ? 1 : 0;
          return aAir - bAir || (a.y + a.radius * 0.35) - (b.y + b.radius * 0.35);
        });
      this.drawStats.visibleIds = entities.map((entity) => entity.id);
      entities.forEach((entity) => {
        if (entity.kind === 'building') {
          this.drawStats.buildings += 1;
          this.drawBuilding(ctx, entity, game, time);
        } else {
          this.drawStats.units += 1;
          this.drawUnit(ctx, entity, game, time);
        }
      });

      this.drawProjectiles(ctx, game, camera, view, time);
      this.drawEffects(ctx, game, camera, view, time);
      if (game.placementType) this.drawPlacementGhost(ctx, game, time);
      if (game.drag) this.drawDragBox(ctx, game.drag);
      this.drawMapBoundary(ctx, camera, view);
      ctx.restore();

      this.drawScreenTreatment(ctx, game, camera, view, time);
      this.drawMinimap(game);
      this.renderSamples.push(Math.max(0, this.clockNow() - frameStarted));
      if (this.renderSamples.length > 120) this.renderSamples.shift();
    }

    visible(x, y, radius, camera, view) {
      return x + radius >= camera.x && x - radius <= camera.x + view.width
        && y + radius >= camera.y && y - radius <= camera.y + view.height;
    }

    teamStyle(team) {
      const definition = TEAM_PRESENTATION[team] || TEAM_PRESENTATION.player;
      return {
        color: definition.color,
        accent: definition.accent,
        dark: definition.dark,
      };
    }

    getAsset(key, team) {
      if (!this.assets || typeof this.assets.get !== 'function') return null;
      if (this.failedDrawKeys.has(key)) return null;
      try {
        return this.assets.get(key, team) || null;
      } catch (error) {
        this.lastError = `Asset ${key}: ${error && error.message ? error.message : error}`;
        this.failedDrawKeys.add(key);
        return null;
      }
    }

    assetDefinition(key) {
      return this.assets && typeof this.assets.definition === 'function'
        ? this.assets.definition(key) : null;
    }

    drawAsset(ctx, key, team, width, height, rotation, alpha) {
      if (this.failedDrawKeys.has(key)) return false;
      const source = this.getAsset(key, team);
      if (!source) return false;
      let saved = false;
      try {
        ctx.save();
        saved = true;
        if (rotation) ctx.rotate(rotation);
        ctx.globalAlpha *= alpha == null ? 1 : alpha;
        ctx.drawImage(source, -width / 2, -height / 2, width, height);
        this.drawStats.spriteDrawCalls += 1;
        return true;
      } catch (error) {
        this.lastError = `Draw ${key}: ${error && error.message ? error.message : error}`;
        this.failedDrawKeys.add(key);
        return false;
      } finally {
        if (saved) ctx.restore();
      }
    }

    drawFrameAsset(ctx, key, team, frameIndex, width, height, rotation, alpha) {
      if (this.failedDrawKeys.has(key) || !this.assets || typeof this.assets.getFrame !== 'function') return false;
      let frame;
      try {
        frame = this.assets.getFrame(key, team, frameIndex);
      } catch (error) {
        this.lastError = `Frame ${key}: ${error && error.message ? error.message : error}`;
        this.failedDrawKeys.add(key);
        return false;
      }
      if (!frame || !frame.source) return false;
      let saved = false;
      try {
        ctx.save();
        saved = true;
        if (rotation) ctx.rotate(rotation);
        ctx.globalAlpha *= alpha == null ? 1 : alpha;
        ctx.drawImage(frame.source, frame.sx, frame.sy, frame.sw, frame.sh,
          -width / 2, -height / 2, width, height);
        this.drawStats.spriteDrawCalls += 1;
        this.drawStats.animationFrames += 1;
        return true;
      } catch (error) {
        this.lastError = `Draw frame ${key}: ${error && error.message ? error.message : error}`;
        this.failedDrawKeys.add(key);
        return false;
      } finally {
        if (saved) ctx.restore();
      }
    }

    resolveEntityAnimation(entity, game) {
      if (!this.animation || typeof this.animation.animationKeyForEntity !== 'function'
        || typeof this.animation.resolveClip !== 'function'
        || typeof this.animation.resolveFrame !== 'function') return null;
      const key = this.animation.animationKeyForEntity(entity);
      const definition = key ? this.assetDefinition(key) : null;
      if (!key || !definition || !definition.animation) return null;
      const clip = this.animation.resolveClip(entity, game || {});
      const clocks = typeof this.animation.clocksFor === 'function'
        ? this.animation.clocksFor(entity, game || {}, { reducedMotion: this.reducedMotion })
        : { time: Number(game && game.time) || 0 };
      const frame = this.animation.resolveFrame(definition, clip, clocks);
      if (!frame) return null;
      this.drawStats.activeClips[frame.clip] = (this.drawStats.activeClips[frame.clip] || 0) + 1;
      return { key, definition, frame };
    }

    drawResolvedAnimation(ctx, animation, entity, rotation) {
      if (!animation) return false;
      return this.drawFrameAsset(ctx, animation.key, entity.team, animation.frame.index,
        animation.definition.worldWidth, animation.definition.worldHeight, rotation || 0, 1);
    }

    recordAnimationFallback(animation) {
      if (animation) this.drawStats.animationFallbacks += 1;
    }

    ensureGroundPattern(ctx) {
      const source = this.getAsset('terrainGround');
      if (!source || typeof ctx.createPattern !== 'function') return null;
      if (this.groundPattern && this.groundPatternSource === source) return this.groundPattern;
      const width = Number(source.naturalWidth || source.width) || 0;
      const height = Number(source.naturalHeight || source.height) || 0;
      if (width < 1 || height < 1) return null;
      let patternSource = source;
      if (root.document && typeof root.document.createElement === 'function') {
        const tile = root.document.createElement('canvas');
        tile.width = width * 2;
        tile.height = height * 2;
        const tileContext = tile.getContext('2d');
        if (tileContext) {
          try {
            tileContext.drawImage(source, 0, 0, width, height);
            const mirror = (translateX, translateY, scaleX, scaleY) => {
              tileContext.save();
              try {
                tileContext.translate(translateX, translateY);
                tileContext.scale(scaleX, scaleY);
                tileContext.drawImage(source, 0, 0, width, height);
              } finally {
                tileContext.restore();
              }
            };
            mirror(width * 2, 0, -1, 1);
            mirror(0, height * 2, 1, -1);
            mirror(width * 2, height * 2, -1, -1);
            patternSource = tile;
          } catch (error) {
            this.lastError = `Ground tile: ${error && error.message ? error.message : error}`;
            patternSource = source;
          }
        }
      }
      try {
        this.groundPattern = ctx.createPattern(patternSource, 'repeat');
        this.groundPatternSource = source;
        return this.groundPattern;
      } catch (error) {
        this.lastError = `Ground pattern: ${error && error.message ? error.message : error}`;
        return null;
      }
    }

    drawTerrain(ctx, camera, view) {
      const map = Data.MAP;
      ctx.fillStyle = PALETTE.ground;
      ctx.fillRect(0, 0, map.width, map.height);
      const groundPattern = this.ensureGroundPattern(ctx);
      if (groundPattern) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = groundPattern;
        ctx.fillRect(0, 0, map.width, map.height);
        ctx.restore();
      }

      this.terrain.patches.forEach((patch) => {
        if (!this.visible(patch.x, patch.y, Math.max(patch.rx, patch.ry), camera, view)) return;
        ctx.save();
        ctx.translate(patch.x, patch.y);
        ctx.rotate(patch.rotation);
        ctx.fillStyle = patch.lift
          ? rgba(PALETTE.groundLift, patch.alpha * 1.4)
          : rgba(PALETTE.groundDeep, patch.alpha * 2.1);
        ctx.beginPath();
        ctx.ellipse(0, 0, patch.rx, patch.ry, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      });

      this.drawRoads(ctx);
      this.drawGroundGrid(ctx, camera, view);

      ctx.lineWidth = 1;
      this.terrain.contours.forEach((feature) => {
        if (!this.visible(feature.x, feature.y, feature.rx + 20, camera, view)) return;
        ctx.save();
        ctx.translate(feature.x, feature.y);
        ctx.rotate(feature.rotation);
        for (let ring = 0; ring < feature.rings; ring += 1) {
          const factor = 1 - ring * 0.16;
          ctx.strokeStyle = rgba(ring % 2 ? '#91a097' : '#0b1110', ring % 2 ? 0.075 : 0.16);
          ctx.setLineDash(ring === 0 ? [12, 8] : []);
          ctx.beginPath();
          ctx.ellipse(0, 0, feature.rx * factor, feature.ry * factor, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      });
      ctx.setLineDash([]);

      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      this.terrain.scars.forEach((scar) => {
        if (!this.visible(scar.x, scar.y, 50, camera, view)) return;
        ctx.strokeStyle = rgba(PALETTE.roadEdge, scar.alpha);
        ctx.beginPath();
        ctx.moveTo(scar.x, scar.y);
        ctx.lineTo(scar.x + scar.dx, scar.y + scar.dy);
        ctx.stroke();
        ctx.strokeStyle = rgba(PALETTE.grid, scar.alpha * 0.28);
        ctx.beginPath();
        ctx.moveTo(scar.x + 1, scar.y + 2);
        ctx.lineTo(scar.x + scar.dx + 1, scar.y + scar.dy + 2);
        ctx.stroke();
      });
    }

    drawRoads(ctx) {
      ctx.save();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      this.roads.forEach((road, index) => {
        smoothRoute(ctx, road);
        ctx.strokeStyle = rgba(PALETTE.roadEdge, 0.78);
        ctx.lineWidth = index < 2 ? 74 : 48;
        ctx.stroke();

        smoothRoute(ctx, road);
        ctx.strokeStyle = index < 2 ? PALETTE.road : rgba(PALETTE.road, 0.92);
        ctx.lineWidth = index < 2 ? 60 : 36;
        ctx.stroke();

        smoothRoute(ctx, road);
        ctx.strokeStyle = rgba(PALETTE.roadMark, index < 2 ? 0.22 : 0.14);
        ctx.lineWidth = 1.5;
        ctx.setLineDash(index < 2 ? [25, 22] : [12, 17]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
      ctx.restore();
    }

    drawGroundGrid(ctx, camera, view) {
      const grid = Data.MAP.gridSize || 40;
      const left = clamp(Math.floor(camera.x / grid) * grid - grid, 0, Data.MAP.width);
      const right = clamp(camera.x + view.width + grid, 0, Data.MAP.width);
      const top = clamp(Math.floor(camera.y / grid) * grid - grid, 0, Data.MAP.height);
      const bottom = clamp(camera.y + view.height + grid, 0, Data.MAP.height);

      ctx.save();
      ctx.lineWidth = 1;
      for (let x = left; x <= right; x += grid) {
        const major = x % (grid * 5) === 0;
        ctx.strokeStyle = rgba(PALETTE.grid, major ? 0.13 : 0.045);
        ctx.beginPath();
        ctx.moveTo(x + 0.5, top);
        ctx.lineTo(x + 0.5, bottom);
        ctx.stroke();
      }
      for (let y = top; y <= bottom; y += grid) {
        const major = y % (grid * 5) === 0;
        ctx.strokeStyle = rgba(PALETTE.grid, major ? 0.13 : 0.045);
        ctx.beginPath();
        ctx.moveTo(left, y + 0.5);
        ctx.lineTo(right, y + 0.5);
        ctx.stroke();
      }

      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = rgba(PALETTE.muted, 0.33);
      ctx.textBaseline = 'top';
      for (let x = Math.ceil(left / 400) * 400; x < right; x += 400) {
        for (let y = Math.ceil(top / 400) * 400; y < bottom; y += 400) {
          ctx.fillText(`${String(x).padStart(4, '0')}·${String(y).padStart(4, '0')}`, x + 6, y + 6);
        }
      }
      ctx.restore();
    }

    drawMinerals(ctx, game, camera, view, time) {
      (game.minerals || []).forEach((mine, nodeIndex) => {
        if (!this.visible(mine.x, mine.y, mine.radius + 30, camera, view)) return;
        const ratio = clamp(mine.amount / Math.max(1, mine.maxAmount), 0, 1);
        const facets = this.terrain.oreFacets[nodeIndex % this.terrain.oreFacets.length] || [];
        const visibleFacets = ratio <= 0 ? 0 : Math.max(2, Math.ceil(facets.length * ratio));

        ctx.save();
        ctx.translate(mine.x, mine.y);
        ctx.fillStyle = rgba('#0d171c', 0.22);
        ctx.beginPath();
        ctx.ellipse(4, 8, mine.radius * 1.05, mine.radius * 0.63, -0.08, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = rgba(PALETTE.ore, 0.16 + ratio * 0.18);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        ctx.ellipse(0, 1, mine.radius + 9, mine.radius * 0.7 + 6, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);

        const oreKey = ratio <= 0 ? 'oreDepleted' : 'oreFull';
        const oreDefinition = this.assetDefinition(oreKey);
        const oreSource = this.getAsset(oreKey);
        let oreSpriteDrawn = false;
        if (oreSource && oreDefinition) {
          const scale = ratio <= 0 ? 0.9 : 0.7 + ratio * 0.3;
          ctx.save();
          ctx.rotate(((nodeIndex % 7) - 3) * 0.035);
          ctx.globalAlpha = ratio <= 0 ? 0.72 : 0.62 + ratio * 0.34;
          try {
            ctx.drawImage(oreSource,
              -oreDefinition.worldWidth * scale / 2,
              -oreDefinition.worldHeight * scale / 2,
              oreDefinition.worldWidth * scale,
              oreDefinition.worldHeight * scale);
            oreSpriteDrawn = true;
          } catch (error) {
            this.lastError = `Draw ${oreKey}: ${error && error.message ? error.message : error}`;
          }
          ctx.restore();
        }
        if (oreSpriteDrawn) this.drawStats.sprites += 1;

        if (ratio <= 0 && !oreSpriteDrawn) {
          ctx.strokeStyle = rgba(PALETTE.muted, 0.28);
          ctx.beginPath();
          ctx.moveTo(-20, -3);
          ctx.lineTo(-5, 7);
          ctx.lineTo(10, -5);
          ctx.lineTo(23, 4);
          ctx.stroke();
        }

        facets.slice(0, oreSpriteDrawn ? Math.min(4, visibleFacets) : visibleFacets).forEach((facet, facetIndex) => {
          const shimmer = 0.78 + Math.sin(time * 2.4 + facet.phase) * 0.12;
          ctx.save();
          ctx.translate(facet.x, facet.y);
          ctx.rotate(facet.rotation);
          polygonPath(ctx, [
            [-facet.width * 0.5, facet.height * 0.36],
            [-facet.width * 0.26, -facet.height * 0.28],
            [0, -facet.height * 0.64],
            [facet.width * 0.44, -facet.height * 0.08],
            [facet.width * 0.5, facet.height * 0.36],
          ]);
          ctx.fillStyle = facetIndex % 3 === 0 ? PALETTE.oreBright : PALETTE.ore;
          ctx.globalAlpha = shimmer;
          ctx.fill();
          ctx.strokeStyle = rgba(PALETTE.oreBright, 0.68);
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, -facet.height * 0.54);
          ctx.lineTo(-facet.width * 0.1, facet.height * 0.24);
          ctx.strokeStyle = rgba('#ffffff', 0.3);
          ctx.stroke();
          ctx.restore();
        });
        ctx.globalAlpha = 1;
        ctx.restore();
      });
    }

    drawBuildCoverage(ctx, game) {
      const style = this.teamStyle('player');
      const anchors = (game.entities || []).filter((entity) => entity.kind === 'building'
        && entity.team === 'player' && entity.complete && entity.hp > 0);
      ctx.save();
      anchors.forEach((anchor) => {
        ctx.fillStyle = rgba(style.color, 0.012);
        ctx.strokeStyle = rgba(style.color, 0.19);
        ctx.lineWidth = 1.25;
        ctx.setLineDash([10, 9]);
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, Data.BALANCE.buildRadius, 0, TAU);
        ctx.fill();
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
    }

    commandPoint(game, command) {
      if (!command) return null;
      if (command.targetId && typeof game.getEntity === 'function') {
        const target = game.getEntity(command.targetId);
        if (target) return { x: target.x, y: target.y };
      }
      if (command.type === 'patrol') {
        const useA = command.next === 'a';
        const x = useA ? command.aX : command.bX;
        const y = useA ? command.aY : command.bY;
        if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
      }
      return Number.isFinite(command.x) && Number.isFinite(command.y)
        ? { x: command.x, y: command.y } : null;
    }

    drawOrderRoute(ctx, game, entity, commands, time, numbered) {
      const points = [{ x: entity.x, y: entity.y }];
      const validCommands = [];
      commands.forEach((command) => {
        const point = this.commandPoint(game, command);
        if (!point) return;
        points.push(point);
        validCommands.push({ command, point });
      });
      if (points.length < 2) return;
      const attacking = validCommands.some(({ command }) => command.type === 'attack'
        || command.type === 'attackMove' || command.type === 'guardAttack');
      const color = attacking ? PALETTE.danger : this.teamStyle(entity.team).color;
      ctx.setLineDash([5, 8]);
      ctx.lineDashOffset = -(time * 18) % 13;
      ctx.lineWidth = 3;
      ctx.strokeStyle = rgba(PALETTE.metalDark, 0.52);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = rgba(color, 0.72);
      ctx.stroke();
      if (numbered) {
        ctx.setLineDash([]);
        validCommands.forEach(({ point }, index) => {
          ctx.fillStyle = rgba(PALETTE.metalDark, 0.88);
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = rgba(color, 0.92);
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.fillStyle = PALETTE.paper;
          ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(index + 1), point.x, point.y + 0.5);
        });
      }
    }

    drawRallyPoint(ctx, building, time) {
      const rally = building.rallyPoint;
      if (!rally || !Number.isFinite(rally.x) || !Number.isFinite(rally.y)) return;
      const style = this.teamStyle(building.team);
      ctx.setLineDash([9, 8]);
      ctx.lineDashOffset = -(time * 16) % 17;
      ctx.strokeStyle = rgba(PALETTE.metalDark, 0.52);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(building.x, building.y);
      ctx.lineTo(rally.x, rally.y);
      ctx.stroke();
      ctx.strokeStyle = rgba(style.color, 0.86);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(rally.x, rally.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = rgba(PALETTE.metalDark, 0.76);
      ctx.fillRect(-9, -9, 18, 18);
      ctx.strokeStyle = style.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.restore();
    }

    drawCommandLinks(ctx, game, camera, view, time) {
      const selected = game.selectedIds || new Set();
      const selectedEntities = (game.entities || []).filter((entity) => selected.has(entity.id));
      const primaryUnit = selectedEntities.find((entity) => entity.kind === 'unit');
      ctx.save();
      selectedEntities.forEach((entity) => {
        if (entity.kind === 'building') {
          if ((entity.type === 'barracks' || entity.type === 'factory' || entity.type === 'airfield')
            && entity.rallyPoint) {
            this.drawRallyPoint(ctx, entity, time);
          }
          return;
        }
        if (!entity.command) return;
        const queue = entity === primaryUnit && Array.isArray(entity.commandQueue)
          ? entity.commandQueue : [];
        this.drawOrderRoute(ctx, game, entity, [entity.command, ...queue], time, entity === primaryUnit);
      });
      ctx.setLineDash([]);
      ctx.restore();
    }

    drawBuilding(ctx, entity, game, time, options) {
      const opts = options || {};
      const definition = Data.BUILDING_TYPES[entity.type];
      if (!definition) return;
      const team = this.teamStyle(entity.team);
      const color = opts.color || team.color;
      const accent = opts.accent || team.accent;
      const bodyStyle = { color, accent, dark: opts.dark || team.dark };
      const progress = entity.complete === false
        ? clamp(entity.constructionElapsed / Math.max(0.01, definition.buildTime), 0, 1) : 1;
      const animation = entity.complete !== false && !opts.ghost
        ? this.resolveEntityAnimation(entity, game) : null;
      let usedSprite = false;
      const drawVisual = () => {
        const spriteDrawn = this.drawBuildingSprite(ctx, entity, definition, bodyStyle, time, animation);
        usedSprite = usedSprite || spriteDrawn;
        if (!spriteDrawn) this.drawBuildingShape(ctx, entity, definition, bodyStyle, time);
      };

      ctx.save();
      ctx.translate(entity.x, entity.y);
      if (!opts.ghost) {
        ctx.fillStyle = rgba('#000000', 0.22);
        ctx.beginPath();
        ctx.ellipse(6, definition.height * 0.25 + 15, definition.width * 0.52, definition.height * 0.35, 0, 0, TAU);
        ctx.fill();
      }

      if (opts.ghost) {
        ctx.globalAlpha = 0.43;
        drawVisual();
      } else if (entity.complete === false) {
        ctx.globalAlpha = 0.2;
        drawVisual();
        ctx.save();
        ctx.beginPath();
        ctx.rect(-definition.width / 2 - 4, definition.height / 2 - definition.height * progress,
          definition.width + 8, definition.height * progress + 4);
        ctx.clip();
        ctx.globalAlpha = 0.82;
        drawVisual();
        ctx.restore();
        this.drawScaffolding(ctx, definition, color, progress);
      } else {
        drawVisual();
      }

      if (!opts.ghost && entity.flash > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = clamp(entity.flash * 8, 0, 0.82);
        ctx.fillStyle = '#ffffff';
        beveledRectPath(ctx, -definition.width / 2, -definition.height / 2,
          definition.width, definition.height, Math.min(14, definition.radius * 0.25));
        ctx.fill();
      }
      ctx.restore();

      if (!opts.ghost) {
        if (usedSprite) this.drawStats.sprites += 1;
        else this.drawStats.proceduralFallbacks += 1;
        this.drawDamageState(ctx, entity, definition, time);
        this.drawEntityStatus(ctx, entity, definition, game);
        if (game.selectedIds && game.selectedIds.has(entity.id)) this.drawSelectionBrackets(ctx, entity, definition);
      }
    }

    drawBuildingSprite(ctx, entity, definition, style, time, animation) {
      const keyByType = {
        hq: 'buildingHq',
        powerPlant: 'buildingPowerPlant',
        refinery: 'buildingRefinery',
        barracks: 'buildingBarracks',
        factory: 'buildingFactory',
        airfield: 'buildingAirfield',
      };
      let drawn = false;
      if (entity.type === 'turret') {
        if (!this.getAsset('buildingTurretBase', entity.team)
          || !this.getAsset('buildingTurretHead', entity.team)) return false;
        const base = this.assetDefinition('buildingTurretBase');
        const head = this.assetDefinition('buildingTurretHead');
        if (!base || !head) return false;
        drawn = this.drawAsset(ctx, 'buildingTurretBase', entity.team,
          base.worldWidth, base.worldHeight, 0, 1);
        const age = Math.max(0, time - (Number.isFinite(entity.lastFireAt) ? entity.lastFireAt : -Infinity));
        const recoil = age <= 0.24 ? Math.sin(clamp(age / 0.24, 0, 1) * Math.PI) * 4 : 0;
        ctx.save();
        ctx.rotate(entity.rotation || 0);
        ctx.translate(-recoil, 0);
        drawn = this.drawAsset(ctx, 'buildingTurretHead', entity.team,
          head.worldWidth, head.worldHeight, 0, 1) && drawn;
        ctx.restore();
      } else {
        const key = keyByType[entity.type];
        const asset = key ? this.assetDefinition(key) : null;
        if (!key || !asset || !this.getAsset(key, entity.team)) return false;
        drawn = this.drawAsset(ctx, key, entity.team, asset.worldWidth, asset.worldHeight, 0, 1);
      }
      if (!drawn) return false;

      if (animation && animation.definition.composition === 'overlay') {
        const rotation = entity.type === 'turret' ? entity.rotation || 0 : 0;
        if (!this.drawResolvedAnimation(ctx, animation, entity, rotation)) {
          this.recordAnimationFallback(animation);
        }
      }

      ctx.save();
      ctx.strokeStyle = rgba(style.color, 0.56);
      ctx.lineWidth = 1.4;
      ctx.setLineDash([7, 6]);
      roundedRectPath(ctx, -definition.width * 0.43, -definition.height * 0.39,
        definition.width * 0.86, definition.height * 0.78, Math.min(12, definition.radius * 0.2));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(style.accent, 0.72 + Math.sin(time * 3 + entity.id) * 0.12);
      ctx.beginPath();
      ctx.arc(0, -definition.height * 0.38, entity.type === 'hq' ? 3.4 : 2.2, 0, TAU);
      ctx.fill();
      if (entity.type === 'powerPlant' || entity.type === 'hq' || entity.type === 'refinery') {
        ctx.strokeStyle = rgba(style.color, 0.38);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(definition.width, definition.height) * 0.18
          + Math.sin(time * 2.2 + entity.id) * 1.4, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      return true;
    }

    drawBuildingShape(ctx, entity, definition, style, time) {
      const width = definition.width;
      const height = definition.height;
      ctx.lineJoin = 'miter';
      ctx.lineWidth = 2;
      ctx.strokeStyle = style.color;
      ctx.fillStyle = PALETTE.metal;

      if (entity.type === 'hq') {
        beveledRectPath(ctx, -width / 2, -height / 2, width, height, 18);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = rgba(style.accent, 0.35);
        ctx.lineWidth = 1;
        beveledRectPath(ctx, -width / 2 + 9, -height / 2 + 9, width - 18, height - 18, 11);
        ctx.stroke();
        ctx.fillStyle = PALETTE.metalDark;
        ctx.fillRect(-61, -13, 30, 43);
        ctx.fillRect(31, -13, 30, 43);
        ctx.strokeStyle = rgba(style.color, 0.5);
        ctx.strokeRect(-61, -13, 30, 43);
        ctx.strokeRect(31, -13, 30, 43);
        ctx.fillStyle = style.dark;
        ctx.beginPath();
        ctx.arc(0, -1, 30, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.save();
        ctx.rotate(time * 0.12 * (entity.team === 'enemy' ? -1 : 1));
        ctx.strokeStyle = rgba(style.accent, 0.7);
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(0, -1, 21, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        polygonPath(ctx, [[0, -12], [12, 0], [0, 12], [-12, 0]]);
        ctx.fillStyle = style.color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.fillStyle = PALETTE.metalLight;
        ctx.fillRect(-4, -50, 8, 20);
        ctx.fillStyle = rgba(style.accent, 0.85);
        ctx.beginPath();
        ctx.arc(0, -52, 3 + Math.sin(time * 3) * 0.5, 0, TAU);
        ctx.fill();
      } else if (entity.type === 'powerPlant') {
        beveledRectPath(ctx, -width / 2, -height / 2, width, height, 11);
        ctx.fill();
        ctx.stroke();
        [-22, 22].forEach((x, index) => {
          ctx.fillStyle = PALETTE.metalDark;
          ctx.beginPath();
          ctx.arc(x, -4, 19, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = rgba(style.color, 0.78);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.strokeStyle = rgba(style.accent, 0.58);
          ctx.lineWidth = 1;
          for (let ring = 8; ring <= 15; ring += 7) {
            ctx.beginPath();
            ctx.arc(x, -4, ring, time * 0.8 + index, time * 0.8 + index + Math.PI * 1.45);
            ctx.stroke();
          }
          ctx.fillStyle = rgba(style.color, 0.45 + Math.sin(time * 2.6 + index) * 0.1);
          ctx.beginPath();
          ctx.arc(x, -4, 6, 0, TAU);
          ctx.fill();
        });
        ctx.fillStyle = PALETTE.metalLight;
        ctx.fillRect(-34, 24, 68, 9);
        ctx.fillStyle = rgba(PALETTE.warning, 0.6);
        for (let x = -29; x < 29; x += 10) ctx.fillRect(x, 25, 5, 7);
      } else if (entity.type === 'refinery') {
        beveledRectPath(ctx, -width / 2, -height / 2, width, height, 13);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = PALETTE.metalDark;
        roundedRectPath(ctx, -62, -37, 52, 72, 8);
        ctx.fill();
        ctx.strokeStyle = rgba(style.color, 0.6);
        ctx.stroke();
        [-49, -25].forEach((x) => {
          ctx.fillStyle = PALETTE.metalLight;
          ctx.beginPath();
          ctx.ellipse(x, -5, 9, 25, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = rgba(style.accent, 0.35);
          ctx.stroke();
        });
        ctx.fillStyle = style.dark;
        polygonPath(ctx, [[6, -35], [59, -35], [68, 12], [49, 34], [8, 34], [-2, 9]]);
        ctx.fill();
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 1.7;
        ctx.stroke();
        ctx.fillStyle = rgba(PALETTE.ore, 0.74);
        polygonPath(ctx, [[21, 20], [34, -11], [47, 20]]);
        ctx.fill();
        ctx.fillStyle = PALETTE.metalLight;
        ctx.fillRect(-11, -8, 22, 9);
        ctx.fillRect(-7, -8, 7, -26);
      } else if (entity.type === 'barracks') {
        beveledRectPath(ctx, -width / 2, -height / 2, width, height, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = style.dark;
        beveledRectPath(ctx, -39, -29, 78, 56, 8);
        ctx.fill();
        ctx.strokeStyle = rgba(style.color, 0.7);
        ctx.stroke();
        ctx.strokeStyle = rgba(PALETTE.metalLight, 0.75);
        ctx.lineWidth = 3;
        for (let x = -27; x <= 27; x += 18) {
          ctx.beginPath();
          ctx.moveTo(x, -25);
          ctx.lineTo(x + 7, 23);
          ctx.stroke();
        }
        ctx.fillStyle = PALETTE.metalDark;
        ctx.fillRect(-16, 15, 32, 27);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-16, 15, 32, 27);
        ctx.fillStyle = rgba(style.accent, 0.7);
        ctx.fillRect(-8, -9, 16, 4);
      } else if (entity.type === 'factory') {
        beveledRectPath(ctx, -width / 2, -height / 2, width, height, 15);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = style.dark;
        beveledRectPath(ctx, -58, -43, 116, 75, 9);
        ctx.fill();
        ctx.strokeStyle = rgba(style.color, 0.65);
        ctx.stroke();
        ctx.strokeStyle = rgba(PALETTE.metalLight, 0.78);
        ctx.lineWidth = 4;
        [-37, -13, 11, 35].forEach((x) => {
          ctx.beginPath();
          ctx.moveTo(x, -39);
          ctx.lineTo(x + 10, 26);
          ctx.stroke();
        });
        ctx.fillStyle = '#0a0f0e';
        ctx.fillRect(-43, 20, 86, 37);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-43, 20, 86, 37);
        ctx.strokeStyle = rgba(style.accent, 0.45);
        ctx.lineWidth = 1;
        for (let y = 29; y < 55; y += 8) {
          ctx.beginPath();
          ctx.moveTo(-38, y);
          ctx.lineTo(38, y);
          ctx.stroke();
        }
        ctx.fillStyle = rgba(PALETTE.warning, 0.65);
        for (let x = -70; x < 68; x += 18) ctx.fillRect(x, 43, 9, 6);
      } else if (entity.type === 'airfield') {
        beveledRectPath(ctx, -width / 2, -height / 2, width, height, 16);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = style.dark;
        beveledRectPath(ctx, -width * 0.38, -height * 0.28, width * 0.76, height * 0.56, 10);
        ctx.fill();
        ctx.strokeStyle = rgba(style.color, 0.72);
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.strokeStyle = rgba(PALETTE.metalLight, 0.72);
        ctx.setLineDash([13, 10]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-width * 0.32, 0);
        ctx.lineTo(width * 0.42, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let index = -3; index <= 3; index += 1) {
          const x = index * width * 0.105;
          ctx.fillStyle = rgba(style.accent, 0.55 + Math.sin(time * 4 + index) * 0.18);
          ctx.beginPath();
          ctx.arc(x, -height * 0.31, 2.2, 0, TAU);
          ctx.arc(x, height * 0.31, 2.2, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = PALETTE.metalLight;
        beveledRectPath(ctx, -width * 0.47, -height * 0.39, width * 0.19, height * 0.78, 7);
        ctx.fill();
        ctx.strokeStyle = rgba(style.color, 0.55);
        ctx.stroke();
      } else if (entity.type === 'turret') {
        ctx.fillStyle = PALETTE.metal;
        ctx.beginPath();
        ctx.arc(0, 0, 31, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = rgba(style.accent, 0.38);
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.save();
        ctx.rotate(entity.rotation || 0);
        ctx.fillStyle = style.dark;
        roundedRectPath(ctx, -17, -13, 34, 26, 8);
        ctx.fill();
        ctx.strokeStyle = style.color;
        ctx.stroke();
        ctx.fillStyle = PALETTE.metalLight;
        ctx.fillRect(7, -7, 35, 5);
        ctx.fillRect(7, 3, 35, 5);
        ctx.fillStyle = rgba(style.accent, 0.8);
        ctx.fillRect(36, -7, 7, 5);
        ctx.fillRect(36, 3, 7, 5);
        ctx.restore();
      }

      ctx.globalAlpha = Math.min(1, ctx.globalAlpha);
      ctx.fillStyle = rgba(style.color, 0.7);
      ctx.fillRect(-definition.width * 0.32, definition.height / 2 - 5, definition.width * 0.64, 3);
    }

    drawScaffolding(ctx, definition, color, progress) {
      const left = -definition.width / 2 - 7;
      const right = definition.width / 2 + 7;
      const top = -definition.height / 2 - 6;
      const bottom = definition.height / 2 + 4;
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = rgba(color, 0.74);
      ctx.lineWidth = 1.25;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(left, top, right - left, bottom - top);
      ctx.setLineDash([]);
      for (let x = left; x <= right; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, bottom);
        ctx.lineTo(x + 11, top);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(PALETTE.warning, 0.75);
      ctx.fillRect(left, bottom + 4, (right - left) * progress, 3);
      ctx.restore();
    }

    drawUnit(ctx, entity, game, time) {
      const style = this.teamStyle(entity.team);
      const animation = this.resolveEntityAnimation(entity, game);
      const airborne = entity.movementLayer === 'air' || entity.type === 'fighter';
      const altitudeOffset = airborne ? -20 + Math.sin(time * 2.8 + entity.id * 0.71) * 2 : 0;
      ctx.save();
      ctx.translate(entity.x, entity.y);
      ctx.fillStyle = rgba('#000000', airborne ? 0.18 : 0.24);
      ctx.beginPath();
      ctx.ellipse(airborne ? 12 : 4, airborne ? 18 : 5,
        entity.radius * (airborne ? 1.28 : 1.1), entity.radius * (airborne ? 0.58 : 0.7), 0, 0, TAU);
      ctx.fill();
      if (airborne) ctx.translate(0, altitudeOffset);

      const usedSprite = this.drawUnitSprite(ctx, entity, style, game, time, animation);
      if (!usedSprite) {
        if (entity.type === 'rifle' || entity.type === 'rocket') {
          this.drawInfantry(ctx, entity, style);
        } else if (entity.type === 'scout') {
          this.drawScout(ctx, entity, style);
        } else if (entity.type === 'tank') {
          this.drawTank(ctx, entity, style);
        } else if (entity.type === 'harvester') {
          this.drawHarvester(ctx, entity, style, time);
        } else if (entity.type === 'fighter') {
          this.drawFighter(ctx, entity, style, time);
        }
      }

      if (entity.flash > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = clamp(entity.flash * 8, 0, 0.9);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, entity.radius + 2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      if (usedSprite) this.drawStats.sprites += 1;
      else this.drawStats.proceduralFallbacks += 1;

      this.drawDamageState(ctx, entity, Data.UNIT_TYPES[entity.type], time);
      this.drawEntityStatus(ctx, entity, Data.UNIT_TYPES[entity.type], game);
      if (game.selectedIds && game.selectedIds.has(entity.id)) {
        this.drawSelectionBrackets(ctx, entity, Data.UNIT_TYPES[entity.type]);
      }
    }

    drawUnitSprite(ctx, entity, style, game, time, resolvedAnimation) {
      const singleLayer = {
        rifle: 'unitRifle',
        rocket: 'unitRocket',
        harvester: 'unitHarvester',
        fighter: 'unitFighter',
      };
      let drawn = false;
      const key = singleLayer[entity.type];
      const animation = resolvedAnimation || (game ? this.resolveEntityAnimation(entity, game) : null);
      if (key) {
        const definition = this.assetDefinition(key);
        if (animation && animation.definition.composition === 'replace') {
          drawn = this.drawResolvedAnimation(ctx, animation, entity, entity.rotation || 0);
          if (!drawn) this.recordAnimationFallback(animation);
        }
        if (!drawn) {
          if (!definition || !this.getAsset(key, entity.team)) return false;
          drawn = this.drawAsset(ctx, key, entity.team, definition.worldWidth,
            definition.worldHeight, entity.rotation || 0, 1);
        }
      } else if (entity.type === 'scout' || entity.type === 'tank') {
        const prefix = entity.type === 'scout' ? 'unitScout' : 'unitTank';
        const bodyKey = `${prefix}Body`;
        const turretKey = `${prefix}Turret`;
        const body = this.assetDefinition(bodyKey);
        const turret = this.assetDefinition(turretKey);
        if (!body || !turret || !this.getAsset(bodyKey, entity.team)
          || !this.getAsset(turretKey, entity.team)) return false;
        drawn = this.drawAsset(ctx, bodyKey, entity.team, body.worldWidth,
          body.worldHeight, entity.rotation || 0, 1);
        const turretRotation = Number.isFinite(entity.turretRotation)
          ? entity.turretRotation : (entity.rotation || 0);
        const now = Number.isFinite(time) ? time : Number(game && game.time) || 0;
        const age = Number.isFinite(entity.lastFireAt) ? Math.max(0, now - entity.lastFireAt) : Infinity;
        const recoil = age <= 0.25 ? Math.sin(clamp(age / 0.25, 0, 1) * Math.PI)
          * (entity.type === 'tank' ? 5 : 3) : 0;
        ctx.save();
        if (turretRotation) ctx.rotate(turretRotation);
        ctx.translate(-recoil, 0);
        drawn = this.drawAsset(ctx, turretKey, entity.team, turret.worldWidth,
          turret.worldHeight, 0, 1) && drawn;
        ctx.restore();
      }
      if (!drawn) return false;
      if (animation && animation.definition.composition === 'overlay') {
        if (!this.drawResolvedAnimation(ctx, animation, entity, entity.rotation || 0)) {
          this.recordAnimationFallback(animation);
        }
      }
      ctx.save();
      ctx.strokeStyle = rgba(style.color, 0.42);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.ellipse(0, 0, entity.radius * 1.05, entity.radius * 0.78, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      return true;
    }

    drawInfantry(ctx, entity, style) {
      ctx.save();
      ctx.rotate(entity.rotation || 0);
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(PALETTE.metalDark, 0.95);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-5, -1);
      ctx.lineTo(-8, 7);
      ctx.moveTo(4, 0);
      ctx.lineTo(7, 8);
      ctx.stroke();
      ctx.fillStyle = style.dark;
      beveledRectPath(ctx, -7, -9, 14, 17, 3);
      ctx.fill();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 1.7;
      ctx.stroke();
      ctx.fillStyle = PALETTE.metalLight;
      ctx.beginPath();
      ctx.arc(0, -10, 5.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = style.color;
      ctx.stroke();

      if (entity.type === 'rifle') {
        ctx.strokeStyle = rgba(style.accent, 0.9);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(2, -4);
        ctx.lineTo(17, -2);
        ctx.stroke();
        ctx.fillStyle = PALETTE.metalLight;
        ctx.fillRect(8, -4, 8, 3);
      } else {
        ctx.fillStyle = PALETTE.metalLight;
        roundedRectPath(ctx, -2, -12, 21, 7, 2);
        ctx.fill();
        ctx.strokeStyle = style.color;
        ctx.stroke();
        ctx.fillStyle = rgba(PALETTE.warning, 0.75);
        ctx.fillRect(14, -11, 5, 5);
        ctx.fillStyle = PALETTE.metalDark;
        ctx.fillRect(-10, -8, 5, 13);
      }
      ctx.restore();
    }

    drawScout(ctx, entity, style) {
      ctx.save();
      ctx.rotate(entity.rotation || 0);
      ctx.fillStyle = '#0b1110';
      ctx.fillRect(-13, -18, 8, 9);
      ctx.fillRect(6, -18, 8, 9);
      ctx.fillRect(-13, 9, 8, 9);
      ctx.fillRect(6, 9, 8, 9);
      polygonPath(ctx, [[-17, 0], [-8, -15], [14, -11], [19, 0], [14, 11], [-8, 15]]);
      ctx.fillStyle = style.dark;
      ctx.fill();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = rgba(style.accent, 0.38);
      ctx.beginPath();
      ctx.moveTo(-9, -10);
      ctx.lineTo(11, -7);
      ctx.moveTo(-9, 10);
      ctx.lineTo(11, 7);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.rotate(Number.isFinite(entity.turretRotation) ? entity.turretRotation : (entity.rotation || 0));
      ctx.fillStyle = PALETTE.metalLight;
      ctx.beginPath();
      ctx.arc(2, 0, 6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = style.color;
      ctx.stroke();
      ctx.fillRect(4, -2, 17, 4);
      ctx.restore();
    }

    drawTank(ctx, entity, style) {
      ctx.save();
      ctx.rotate(entity.rotation || 0);
      ctx.fillStyle = '#0a0f0e';
      roundedRectPath(ctx, -23, -23, 46, 11, 4);
      ctx.fill();
      roundedRectPath(ctx, -23, 12, 46, 11, 4);
      ctx.fill();
      ctx.strokeStyle = rgba(PALETTE.metalLight, 0.45);
      ctx.lineWidth = 1;
      for (let x = -17; x <= 17; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, -21);
        ctx.lineTo(x, -14);
        ctx.moveTo(x, 14);
        ctx.lineTo(x, 21);
        ctx.stroke();
      }
      polygonPath(ctx, [[-20, 0], [-12, -16], [14, -14], [22, -6], [22, 6], [14, 14], [-12, 16]]);
      ctx.fillStyle = style.dark;
      ctx.fill();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.rotate(Number.isFinite(entity.turretRotation) ? entity.turretRotation : (entity.rotation || 0));
      ctx.fillStyle = PALETTE.metal;
      beveledRectPath(ctx, -10, -10, 22, 20, 5);
      ctx.fill();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = PALETTE.metalLight;
      ctx.fillRect(8, -3.5, 31, 7);
      ctx.fillStyle = rgba(style.accent, 0.82);
      ctx.fillRect(34, -3, 6, 6);
      ctx.restore();
    }

    drawHarvester(ctx, entity, style, time) {
      ctx.save();
      ctx.rotate(entity.rotation || 0);
      ctx.fillStyle = '#0a0f0e';
      [-17, 0, 17].forEach((x) => {
        ctx.beginPath();
        ctx.arc(x, -19, 5.5, 0, TAU);
        ctx.arc(x, 19, 5.5, 0, TAU);
        ctx.fill();
      });
      beveledRectPath(ctx, -25, -17, 49, 34, 8);
      ctx.fillStyle = style.dark;
      ctx.fill();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = PALETTE.metal;
      beveledRectPath(ctx, -9, -13, 27, 26, 4);
      ctx.fill();
      ctx.strokeStyle = rgba(style.accent, 0.45);
      ctx.stroke();
      polygonPath(ctx, [[22, -18], [35, -13], [35, 13], [22, 18], [17, 10], [17, -10]]);
      ctx.fillStyle = PALETTE.metalLight;
      ctx.fill();
      ctx.strokeStyle = style.color;
      ctx.stroke();
      const capacity = Data.UNIT_TYPES.harvester.cargo || 1;
      const cargo = clamp((entity.cargo || 0) / capacity, 0, 1);
      if (cargo > 0) {
        ctx.fillStyle = rgba(PALETTE.ore, 0.65 + Math.sin(time * 3) * 0.08);
        const shardCount = Math.max(1, Math.ceil(cargo * 5));
        for (let index = 0; index < shardCount; index += 1) {
          polygonPath(ctx, [[-4 + index * 4, 8], [-2 + index * 4, -7 - (index % 2) * 4], [1 + index * 4, 8]]);
          ctx.fill();
        }
      }
      ctx.fillStyle = rgba(PALETTE.warning, 0.75);
      ctx.fillRect(-23, -3, 8, 6);
      ctx.restore();
    }

    drawFighter(ctx, entity, style, time) {
      ctx.save();
      ctx.rotate(entity.rotation || 0);
      polygonPath(ctx, [[38, 0], [9, -10], [-12, -25], [-6, -8], [-29, -14],
        [-22, 0], [-29, 14], [-6, 8], [-12, 25], [9, 10]]);
      ctx.fillStyle = style.dark;
      ctx.fill();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      polygonPath(ctx, [[30, 0], [2, -6], [-10, 0], [2, 6]]);
      ctx.fillStyle = PALETTE.metalLight;
      ctx.fill();
      ctx.strokeStyle = rgba(style.accent, 0.72);
      ctx.stroke();
      ctx.fillStyle = rgba(style.accent, 0.72 + Math.sin(time * 7 + entity.id) * 0.2);
      ctx.fillRect(-29, -8, 8, 4);
      ctx.fillRect(-29, 4, 8, 4);
      ctx.restore();
    }

    drawDamageState(ctx, entity, definition, time) {
      if (!definition || !entity.maxHp) return;
      const hpRatio = clamp(entity.hp / entity.maxHp, 0, 1);
      if (hpRatio >= 0.6) return;
      const isBuilding = entity.kind === 'building';
      const phase = (Number(time) || 0) * 7 + (Number(entity.id) || 0) * 1.73;
      const anchorX = isBuilding ? definition.width * 0.19 : entity.radius * 0.3;
      const airOffset = entity.movementLayer === 'air' || entity.type === 'fighter'
        ? -20 + Math.sin((Number(time) || 0) * 2.8 + entity.id * 0.71) * 2 : 0;
      const anchorY = (isBuilding ? -definition.height * 0.15 : -entity.radius * 0.25) + airOffset;
      ctx.save();
      ctx.translate(entity.x + anchorX, entity.y + anchorY);
      if (Math.sin(phase) > -0.25) {
        ctx.strokeStyle = rgba(PALETTE.warning, 0.72);
        ctx.lineWidth = 1.2;
        for (let index = 0; index < 3; index += 1) {
          const angle = phase * 0.31 + index * 2.1;
          const inner = 2 + index;
          const outer = 6 + (index % 2) * 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
          ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
          ctx.stroke();
        }
      }
      if (hpRatio < 0.3) {
        for (let index = 0; index < 3; index += 1) {
          const drift = (phase * 3 + index * 11) % 24;
          ctx.fillStyle = rgba(PALETTE.metalDark, 0.22 + index * 0.06);
          ctx.beginPath();
          ctx.arc(Math.sin(phase * 0.2 + index) * 5, -drift,
            4 + index * 1.5 + drift * 0.08, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    drawEntityStatus(ctx, entity, definition, game) {
      if (!definition) return;
      const isBuilding = entity.kind === 'building';
      const width = isBuilding ? clamp(definition.width * 0.55, 42, 82) : clamp(entity.radius * 2.15, 22, 52);
      const airOffset = entity.movementLayer === 'air' || entity.type === 'fighter'
        ? -20 + Math.sin((Number(game && game.time) || 0) * 2.8 + entity.id * 0.71) * 2 : 0;
      const top = entity.y + airOffset - (isBuilding ? definition.height / 2 : entity.radius) - 14;
      const hpRatio = clamp(entity.hp / Math.max(1, entity.maxHp), 0, 1);
      const barHeight = isBuilding ? 5 : 4;
      const x = entity.x - width / 2;

      ctx.save();
      ctx.fillStyle = rgba('#050908', 0.82);
      ctx.fillRect(x - 1, top - 1, width + 2, barHeight + 2);
      ctx.fillStyle = hpRatio > 0.58 ? PALETTE.health : hpRatio > 0.27 ? PALETTE.warning : PALETTE.danger;
      ctx.fillRect(x, top, Math.max(0, width * hpRatio), barHeight);
      ctx.fillStyle = rgba('#ffffff', 0.18);
      ctx.fillRect(x, top, width * hpRatio, 1);

      if (isBuilding && entity.complete === false) {
        const buildProgress = clamp(entity.constructionElapsed / Math.max(0.01, definition.buildTime), 0, 1);
        ctx.fillStyle = rgba('#050908', 0.82);
        ctx.fillRect(x - 1, top + 7, width + 2, 5);
        ctx.fillStyle = PALETTE.warning;
        ctx.fillRect(x, top + 8, width * buildProgress, 3);
      } else if (isBuilding && entity.queue && entity.queue.length) {
        const item = entity.queue[0];
        const production = clamp(item.elapsed / Math.max(0.01, item.total), 0, 1);
        ctx.fillStyle = rgba('#050908', 0.82);
        ctx.fillRect(x - 1, top + 7, width + 2, 5);
        ctx.fillStyle = this.teamStyle(entity.team).color;
        ctx.fillRect(x, top + 8, width * production, 3);
        ctx.fillStyle = rgba(PALETTE.paper, 0.72);
        ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const unitKey = `entity.unit.${item.type}.short`;
        const translatedUnit = this.t(unitKey);
        const unit = translatedUnit === unitKey ? String(item.type).slice(0, 3).toUpperCase() : translatedUnit;
        ctx.fillText(this.t('canvas.productionProgress', {
          unit,
          percent: Math.floor(production * 100),
        }), entity.x, top - 2);
      }
      ctx.restore();
    }

    drawSelectionBrackets(ctx, entity, definition) {
      const isBuilding = entity.kind === 'building';
      const halfWidth = (isBuilding ? definition.width / 2 : entity.radius) + 7;
      const halfHeight = (isBuilding ? definition.height / 2 : entity.radius) + 7;
      const length = clamp(Math.min(halfWidth, halfHeight) * 0.48, 8, 17);
      const style = this.teamStyle(entity.team);

      ctx.save();
      ctx.translate(entity.x, entity.y);
      ctx.beginPath();
      ctx.moveTo(-halfWidth + length, -halfHeight);
      ctx.lineTo(-halfWidth, -halfHeight);
      ctx.lineTo(-halfWidth, -halfHeight + length);
      ctx.moveTo(halfWidth - length, -halfHeight);
      ctx.lineTo(halfWidth, -halfHeight);
      ctx.lineTo(halfWidth, -halfHeight + length);
      ctx.moveTo(-halfWidth, halfHeight - length);
      ctx.lineTo(-halfWidth, halfHeight);
      ctx.lineTo(-halfWidth + length, halfHeight);
      ctx.moveTo(halfWidth, halfHeight - length);
      ctx.lineTo(halfWidth, halfHeight);
      ctx.lineTo(halfWidth - length, halfHeight);
      ctx.strokeStyle = rgba(PALETTE.metalDark, 0.82);
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = style.accent;
      ctx.lineWidth = 2;
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.restore();
    }

    drawProjectiles(ctx, game, camera, view, time) {
      (game.projectiles || []).forEach((projectile) => {
        if (!this.visible(projectile.x, projectile.y, 35, camera, view)) return;
        const dx = projectile.targetX - projectile.x;
        const dy = projectile.targetY - projectile.y;
        const length = Math.hypot(dx, dy) || 1;
        const nx = dx / length;
        const ny = dy / length;
        const style = this.teamStyle(projectile.team);
        const airOffset = Number.isFinite(projectile.altitude) ? -projectile.altitude
          : projectile.airborne ? -16 : 0;
        const projectileY = projectile.y + airOffset;
        const rocket = projectile.weaponClass === 'rocket';
        const heavy = projectile.weaponClass === 'cannon' || projectile.weaponClass === 'turret';

        ctx.save();
        ctx.lineCap = 'round';
        const trail = rocket ? 21 : heavy ? 14 : 9;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = rgba(PALETTE.metalDark, 0.72);
        ctx.lineWidth = rocket ? 5 : heavy ? 4.4 : 3.5;
        ctx.beginPath();
        ctx.moveTo(projectile.x - nx * trail, projectileY - ny * trail);
        ctx.lineTo(projectile.x, projectileY);
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgba(rocket ? PALETTE.warning : style.accent, 0.78);
        ctx.lineWidth = rocket ? 3 : heavy ? 2.4 : 1.5;
        ctx.stroke();
        ctx.fillStyle = rocket ? '#fff1b2' : '#ffffff';
        ctx.shadowColor = rocket ? PALETTE.warning : style.color;
        ctx.shadowBlur = rocket ? 12 : 7;
        ctx.beginPath();
        ctx.arc(projectile.x, projectileY, projectile.radius + (heavy ? 0.8 : 0), 0, TAU);
        ctx.fill();
        ctx.restore();

        if (rocket) {
          ctx.save();
          ctx.fillStyle = rgba(PALETTE.muted, 0.16);
          for (let index = 1; index <= 3; index += 1) {
            ctx.beginPath();
            ctx.arc(projectile.x - nx * (8 + index * 6), projectileY - ny * (8 + index * 6),
              3 + index * 1.2 + Math.sin(time * 8 + index), 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        }
      });
    }

    drawEffects(ctx, game, camera, view, time) {
      (game.effects || []).forEach((effect) => {
        const radius = (effect.radius || 24) + 130;
        if (!this.visible(effect.x, effect.y, radius, camera, view)) return;
        const progress = clamp(effect.age / Math.max(0.01, effect.duration), 0, 1);
        if (effect.type === 'muzzle') this.drawMuzzle(ctx, effect, progress);
        else if (effect.type === 'impact') this.drawImpact(ctx, effect, progress);
        else if (effect.type === 'explosion') this.drawExplosion(ctx, effect, progress);
        else if (effect.type === 'income') this.drawIncome(ctx, effect, progress);
        else if (effect.type === 'command') this.drawCommandEffect(ctx, effect, progress, time);
        else if (effect.type === 'signal') this.drawSignalEffect(ctx, effect, progress, time);
      });
    }

    drawMuzzle(ctx, effect, progress) {
      const style = this.teamStyle(effect.team);
      ctx.save();
      ctx.translate(effect.x, effect.y - (Number(effect.altitude) || 0));
      ctx.rotate(effect.angle || 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - progress;
      const length = 16 + progress * 20;
      polygonPath(ctx, [[2, -5], [length, 0], [2, 5], [7, 0]]);
      ctx.fillStyle = '#fff2b0';
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.strokeStyle = rgba(style.accent, 0.75);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(length + 8, 0);
      ctx.stroke();
      ctx.restore();
    }

    drawImpact(ctx, effect, progress) {
      const style = this.teamStyle(effect.team);
      const scale = effect.heavy ? 1.7 : 0.8;
      ctx.save();
      ctx.translate(effect.x, effect.y - (Number(effect.altitude) || 0));
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = progress < 0.45 ? '#fff0b3' : style.color;
      ctx.lineWidth = mix(3, 0.8, progress);
      ctx.beginPath();
      ctx.arc(0, 0, (5 + progress * 27) * scale, 0, TAU);
      ctx.stroke();
      const sparks = effect.heavy ? 13 : 6;
      ctx.strokeStyle = rgba(PALETTE.warning, 0.85);
      for (let index = 0; index < sparks; index += 1) {
        const angle = (index / sparks) * TAU + index * 0.71;
        const inner = 4 + progress * 6;
        const outer = inner + (9 + (index % 4) * 3) * scale * (1 - progress * 0.35);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawExplosion(ctx, effect, progress) {
      const base = Math.max(18, effect.radius || 20);
      const expansion = base * (0.55 + progress * 1.45);
      ctx.save();
      ctx.translate(effect.x, effect.y - (Number(effect.altitude) || 0));
      ctx.globalCompositeOperation = progress < 0.52 ? 'lighter' : 'source-over';
      const fireAlpha = clamp(1 - progress * 1.5, 0, 1);
      for (let index = 0; index < 9; index += 1) {
        const angle = index * 2.399963 + (effect.x + effect.y) * 0.001;
        const distance = expansion * (0.16 + (index % 4) * 0.11);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance * 0.7;
        const lobe = base * (0.22 + (index % 3) * 0.09) * (1 + progress * 0.8);
        ctx.fillStyle = progress < 0.45
          ? rgba(index % 2 ? '#ffb14d' : '#f05c31', fireAlpha * 0.8)
          : rgba(index % 2 ? '#34403b' : '#151c1a', (1 - progress) * 0.55);
        ctx.beginPath();
        ctx.arc(x, y, lobe, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = rgba(PALETTE.warning, (1 - progress) * 0.72);
      ctx.lineWidth = mix(4, 1, progress);
      ctx.beginPath();
      ctx.arc(0, 0, expansion, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = rgba('#9ba89f', (1 - progress) * 0.25);
      for (let index = 0; index < 10; index += 1) {
        const angle = index * 1.73;
        const start = base * 0.45;
        const end = base * (0.8 + progress * (1.6 + index % 3));
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * start, Math.sin(angle) * start);
        ctx.lineTo(Math.cos(angle) * end, Math.sin(angle) * end);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawIncome(ctx, effect, progress) {
      const y = effect.y - 18 - progress * 38;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.font = '700 15px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PALETTE.oreBright;
      ctx.shadowColor = PALETTE.void;
      ctx.shadowBlur = 5;
      ctx.fillText(this.t('canvas.oreGain', { amount: Math.round(effect.amount || 0) }), effect.x, y);
      ctx.strokeStyle = rgba(PALETTE.ore, 0.65);
      ctx.beginPath();
      ctx.moveTo(effect.x - 18, y + 12);
      ctx.lineTo(effect.x + 18, y + 12);
      ctx.stroke();
      ctx.restore();
    }

    drawCommandEffect(ctx, effect, progress, time) {
      const attacking = effect.command === 'attack';
      const style = this.teamStyle(effect.team);
      const color = attacking ? PALETTE.danger : style.color;
      const fade = 1 - progress;
      ctx.save();
      ctx.strokeStyle = rgba(color, fade * 0.48);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 7]);
      ctx.lineDashOffset = -(time * 22) % 11;
      (effect.sources || []).forEach((source) => {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(effect.x, effect.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.translate(effect.x, effect.y);
      ctx.strokeStyle = rgba(color, fade * 0.95);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12 + progress * 28, 0, TAU);
      ctx.stroke();
      ctx.rotate(progress * 1.2);
      if (attacking) {
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(10, 10);
        ctx.moveTo(10, -10);
        ctx.lineTo(-10, 10);
        ctx.stroke();
        for (let index = 0; index < 4; index += 1) {
          ctx.rotate(Math.PI / 2);
          polygonPath(ctx, [[0, -18], [-4, -12], [4, -12]]);
          ctx.fillStyle = rgba(color, fade * 0.9);
          ctx.fill();
        }
      } else {
        polygonPath(ctx, [[-8, -9], [12, 0], [-8, 9], [-3, 0]]);
        ctx.fillStyle = rgba(color, fade * 0.7);
        ctx.fill();
      }
      ctx.restore();
    }

    drawSignalEffect(ctx, effect, progress, time) {
      const style = this.teamStyle(effect.team || 'enemy');
      ctx.save();
      ctx.translate(effect.x, effect.y);
      for (let index = 0; index < 3; index += 1) {
        const phase = (progress * 2.2 + index / 3) % 1;
        const alpha = (1 - phase) * (1 - progress) * 0.8;
        ctx.strokeStyle = rgba(style.color, alpha);
        ctx.lineWidth = 2.5 - phase * 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 22 + phase * 112, 0, TAU);
        ctx.stroke();
      }
      ctx.rotate(Math.sin(time * 4) * 0.04);
      ctx.strokeStyle = rgba(style.accent, (1 - progress) * 0.95);
      ctx.fillStyle = rgba(style.color, (1 - progress) * 0.2);
      ctx.lineWidth = 2;
      polygonPath(ctx, [[0, -48], [14, -24], [-14, -24]]);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(0, 20);
      ctx.stroke();
      ctx.fillStyle = rgba(style.accent, (1 - progress) * 0.92);
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.t('canvas.hostileSignal'), 0, -56);
      ctx.restore();
    }

    drawPlacementGhost(ctx, game, time) {
      if (!game.mouse || !game.mouse.inside) return;
      const definition = Data.BUILDING_TYPES[game.placementType];
      if (!definition) return;
      const x = game.mouse.worldX;
      const y = game.mouse.worldY;
      const validity = typeof game.getPlacementValidity === 'function'
        ? game.getPlacementValidity(game.placementType, x, y, 'player') : { valid: true, reason: '' };
      const color = validity.valid ? this.teamStyle('player').color : PALETTE.danger;
      const accent = validity.valid ? this.teamStyle('player').accent : '#ffd0c7';

      ctx.save();
      ctx.strokeStyle = rgba(color, 0.82);
      ctx.fillStyle = rgba(color, 0.075);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(x, y, definition.radius + Data.BALANCE.buildPadding, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x - definition.radius - 12, y);
      ctx.lineTo(x + definition.radius + 12, y);
      ctx.moveTo(x, y - definition.radius - 12);
      ctx.lineTo(x, y + definition.radius + 12);
      ctx.stroke();
      ctx.restore();

      const ghost = {
        kind: 'building', type: game.placementType, team: 'player', x, y,
        width: definition.width, height: definition.height, radius: definition.radius,
        complete: true, hp: definition.hp, maxHp: definition.hp, rotation: 0,
      };
      this.drawBuilding(ctx, ghost, game, time, { ghost: true, color, accent, dark: rgba(color, 0.36) });

      ctx.save();
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = validity.valid
        ? this.t('canvas.deploymentValid')
        : validity.reasonKey ? this.t(validity.reasonKey) : this.t('canvas.deploymentBlocked');
      const labelWidth = Math.max(104, ctx.measureText(label).width + 16);
      const labelY = y + definition.height / 2 + 16;
      ctx.fillStyle = rgba(PALETTE.void, 0.86);
      ctx.fillRect(x - labelWidth / 2, labelY, labelWidth, 20);
      ctx.fillStyle = color;
      ctx.fillRect(x - labelWidth / 2, labelY, 3, 20);
      ctx.fillText(label, x, labelY + 5);
      ctx.restore();
    }

    drawDragBox(ctx, drag) {
      const left = Math.min(drag.startWorldX, drag.currentWorldX);
      const right = Math.max(drag.startWorldX, drag.currentWorldX);
      const top = Math.min(drag.startWorldY, drag.currentWorldY);
      const bottom = Math.max(drag.startWorldY, drag.currentWorldY);
      if (right - left < 2 && bottom - top < 2) return;
      const color = this.teamStyle('player').color;
      ctx.save();
      ctx.fillStyle = rgba(color, 0.075);
      ctx.fillRect(left, top, right - left, bottom - top);
      ctx.strokeStyle = rgba(color, 0.9);
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(left + 0.5, top + 0.5, right - left, bottom - top);
      ctx.setLineDash([]);
      const corner = Math.min(14, Math.max(6, Math.min(right - left, bottom - top) * 0.18));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left, top + corner); ctx.lineTo(left, top); ctx.lineTo(left + corner, top);
      ctx.moveTo(right - corner, top); ctx.lineTo(right, top); ctx.lineTo(right, top + corner);
      ctx.moveTo(left, bottom - corner); ctx.lineTo(left, bottom); ctx.lineTo(left + corner, bottom);
      ctx.moveTo(right - corner, bottom); ctx.lineTo(right, bottom); ctx.lineTo(right, bottom - corner);
      ctx.stroke();
      ctx.restore();
    }

    drawMapBoundary(ctx, camera, view) {
      const map = Data.MAP;
      ctx.save();
      ctx.strokeStyle = rgba('#000000', 0.9);
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, map.width, map.height);
      ctx.strokeStyle = rgba(PALETTE.muted, 0.7);
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, map.width - 8, map.height - 8);
      ctx.strokeStyle = rgba(PALETTE.warning, 0.34);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([14, 9]);
      ctx.strokeRect(map.edgePadding, map.edgePadding,
        map.width - map.edgePadding * 2, map.height - map.edgePadding * 2);
      ctx.setLineDash([]);

      const corners = [
        [map.edgePadding, map.edgePadding, 1, 1],
        [map.width - map.edgePadding, map.edgePadding, -1, 1],
        [map.edgePadding, map.height - map.edgePadding, 1, -1],
        [map.width - map.edgePadding, map.height - map.edgePadding, -1, -1],
      ];
      ctx.strokeStyle = rgba(PALETTE.warning, 0.78);
      ctx.lineWidth = 3;
      corners.forEach(([x, y, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y + sy * 34);
        ctx.lineTo(x, y);
        ctx.lineTo(x + sx * 34, y);
        ctx.stroke();
      });
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = rgba(PALETTE.warning, 0.65);
      ctx.textBaseline = 'top';
      ctx.fillText(this.t('canvas.surveyLimit'), map.edgePadding + 10, map.edgePadding + 10);
      ctx.restore();
    }

    drawScreenTreatment(ctx, game, camera, view, time) {
      ctx.save();
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      const vignette = ctx.createRadialGradient(
        view.width * 0.5, view.height * 0.48, Math.min(view.width, view.height) * 0.18,
        view.width * 0.5, view.height * 0.48, Math.max(view.width, view.height) * 0.72,
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 8, 12, 0.10)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, view.width, view.height);

      ctx.fillStyle = 'rgba(210, 235, 238, 0.009)';
      for (let y = 1; y < view.height; y += 8) ctx.fillRect(0, y, view.width, 1);

      const crossX = clamp((game.mouse && game.mouse.screenX) || view.width / 2, 0, view.width);
      const crossY = clamp((game.mouse && game.mouse.screenY) || view.height / 2, 0, view.height);
      if (game.mouse && game.mouse.inside && (game.commandMode || game.placementType)) {
        const color = game.placementType ? this.teamStyle('player').color
          : game.commandMode === 'attackMove' ? PALETTE.danger : this.teamStyle('player').color;
        ctx.strokeStyle = rgba(color, 0.62 + Math.sin(time * 5) * 0.12);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(crossX, crossY, 12, 0, TAU);
        ctx.moveTo(crossX - 20, crossY); ctx.lineTo(crossX - 6, crossY);
        ctx.moveTo(crossX + 6, crossY); ctx.lineTo(crossX + 20, crossY);
        ctx.moveTo(crossX, crossY - 20); ctx.lineTo(crossX, crossY - 6);
        ctx.moveTo(crossX, crossY + 6); ctx.lineTo(crossX, crossY + 20);
        ctx.stroke();
      }

      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = rgba(PALETTE.muted, 0.42);
      const coordinate = this.t('canvas.coordinate', {
        x: String(Math.round(camera.x)).padStart(4, '0'),
        y: String(Math.round(camera.y)).padStart(4, '0'),
      });
      ctx.fillText(coordinate, 12, view.height - 12);
      ctx.restore();
    }

    drawMinimap(game) {
      const ctx = this.minimapCtx;
      const view = this.minimapViewport;
      const map = Data.MAP;
      const padding = 5;
      const scale = Math.min((view.width - padding * 2) / map.width, (view.height - padding * 2) / map.height);
      const drawWidth = map.width * scale;
      const drawHeight = map.height * scale;
      const offsetX = (view.width - drawWidth) / 2;
      const offsetY = (view.height - drawHeight) / 2;

      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, view.width, view.height);
      ctx.fillStyle = PALETTE.void;
      ctx.fillRect(0, 0, view.width, view.height);

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.fillStyle = PALETTE.groundDeep;
      ctx.fillRect(0, 0, map.width, map.height);

      ctx.strokeStyle = rgba(PALETTE.grid, 0.12);
      ctx.lineWidth = 1 / scale;
      for (let x = 400; x < map.width; x += 400) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, map.height); ctx.stroke();
      }
      for (let y = 300; y < map.height; y += 300) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(map.width, y); ctx.stroke();
      }

      ctx.lineCap = 'round';
      this.roads.forEach((road, index) => {
        smoothRoute(ctx, road);
        ctx.strokeStyle = rgba(PALETTE.roadMark, index < 2 ? 0.38 : 0.22);
        ctx.lineWidth = index < 2 ? 46 : 24;
        ctx.stroke();
      });

      (game.minerals || []).forEach((mine) => {
        if (mine.amount <= 0) return;
        const ratio = clamp(mine.amount / Math.max(1, mine.maxAmount), 0, 1);
        const radius = 13 + ratio * 13;
        ctx.fillStyle = rgba(PALETTE.ore, 0.72 + ratio * 0.2);
        polygonPath(ctx, [[mine.x, mine.y - radius], [mine.x + radius * 0.72, mine.y],
          [mine.x, mine.y + radius], [mine.x - radius * 0.72, mine.y]]);
        ctx.fill();
      });

      const minimapEntities = (game.entities || []).filter((entity) => entity.hp > 0);
      this.drawStats.minimapEntities = minimapEntities.length;
      minimapEntities.forEach((entity) => {
        const style = this.teamStyle(entity.team);
        ctx.fillStyle = style.color;
        ctx.strokeStyle = rgba(PALETTE.metalDark, 0.96);
        ctx.lineWidth = 2 / scale;
        if (entity.movementLayer === 'air' || entity.type === 'fighter') {
          const radius = 19;
          ctx.save();
          ctx.translate(entity.x, entity.y);
          if (entity.team === 'enemy') ctx.rotate(Math.PI / 4);
          polygonPath(ctx, [[radius, 0], [-radius * 0.72, -radius * 0.7],
            [-radius * 0.38, 0], [-radius * 0.72, radius * 0.7]]);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else if (entity.team === 'enemy') {
          const definition = entity.kind === 'building' ? Data.BUILDING_TYPES[entity.type] : null;
          const radius = entity.kind === 'building'
            ? Math.max(24, Math.max(definition.width, definition.height) * 0.36)
            : entity.type === 'tank' || entity.type === 'harvester' ? 20 : 13;
          polygonPath(ctx, [[entity.x, entity.y - radius], [entity.x + radius, entity.y],
            [entity.x, entity.y + radius], [entity.x - radius, entity.y]]);
          ctx.fill();
          ctx.stroke();
        } else if (entity.kind === 'building') {
          const definition = Data.BUILDING_TYPES[entity.type];
          const width = Math.max(26, definition.width * 0.58);
          const height = Math.max(22, definition.height * 0.58);
          ctx.fillRect(entity.x - width / 2, entity.y - height / 2, width, height);
          ctx.strokeRect(entity.x - width / 2, entity.y - height / 2, width, height);
        } else {
          const radius = entity.type === 'tank' || entity.type === 'harvester' ? 18 : 11;
          ctx.beginPath();
          ctx.arc(entity.x, entity.y, radius, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
      });

      const camera = game.camera || { x: 0, y: 0 };
      ctx.fillStyle = rgba('#ffffff', 0.025);
      ctx.fillRect(camera.x, camera.y, this.viewport.width, this.viewport.height);
      ctx.strokeStyle = rgba('#e8fff5', 0.92);
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(camera.x, camera.y,
        Math.min(this.viewport.width, map.width), Math.min(this.viewport.height, map.height));

      ctx.strokeStyle = rgba(PALETTE.muted, 0.65);
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(0, 0, map.width, map.height);
      ctx.restore();

      ctx.strokeStyle = rgba(PALETTE.muted, 0.4);
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX + 0.5, offsetY + 0.5, drawWidth - 1, drawHeight - 1);
      ctx.fillStyle = rgba(PALETTE.paper, 0.46);
      ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Ø / 7C', offsetX + 6, offsetY + 5);
    }
  }

  root.IronRenderer = IronRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
