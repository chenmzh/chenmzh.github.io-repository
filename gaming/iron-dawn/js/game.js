(function attachIronGame(root) {
  'use strict';

  const Core = root.IronCore;
  const Data = root.IronData;
  const FIXED_STEP = Data.BALANCE.fixedStep;

  class IronGame {
    constructor(canvas, minimap, options) {
      const opts = options || {};
      this.canvas = canvas;
      this.minimap = minimap;
      this.viewportElement = opts.viewportElement || canvas.parentElement || canvas;
      this.assets = opts.assets || null;
      this.i18n = opts.i18n || root.IronI18n || null;
      this.renderer = new root.IronRenderer(canvas, minimap, {
        viewportElement: this.viewportElement,
        assets: this.assets,
        i18n: this.i18n,
      });
      this.ai = new root.IronAI(this);
      this.ui = null;
      this.state = 'menu';
      this.difficultyKey = Data.BALANCE.defaultDifficulty;
      this.lastFrame = performance.now();
      this.accumulator = 0;
      this.keys = new Set();
      this.controlGroups = new Map();
      this.lastControlGroupRecall = { slot: null, at: -Infinity };
      this.commandMode = null;
      this.placementType = null;
      this.mouse = {
        screenX: 0, screenY: 0, worldX: 0, worldY: 0, inside: false, edgePanArmed: false,
      };
      this.drag = null;
      this.activePointerId = null;
      this.lastTouchTap = { at: -Infinity, x: 0, y: 0 };
      this.audioEnabled = true;
      this.audioContext = null;
      this.loop = this.loop.bind(this);
      this.resetWorld(this.difficultyKey);
      this.bindInput();
      this.resize();
      requestAnimationFrame(this.loop);
    }

    attachUI(ui) {
      this.ui = ui;
      this.ui.update(this, true);
    }

    t(key, params) {
      return this.i18n && typeof this.i18n.t === 'function' ? this.i18n.t(key, params) : key;
    }

    entityTranslation(kind, type, short) {
      return { $t: `entity.${kind}.${type}.${short ? 'short' : 'name'}` };
    }

    resetWorld(difficultyKey) {
      this.difficultyKey = Data.DIFFICULTY[difficultyKey] ? difficultyKey : Data.BALANCE.defaultDifficulty;
      this.difficulty = Data.DIFFICULTY[this.difficultyKey];
      this.nextId = 1;
      this.navigationRevision = 0;
      this.time = 0;
      this.entities = [];
      this.projectiles = [];
      this.effects = [];
      this.minerals = [];
      this.selectedIds = new Set();
      this.controlGroups.clear();
      this.lastControlGroupRecall = { slot: null, at: -Infinity };
      this.commandMode = null;
      this.placementType = null;
      this.resources = {
        player: Data.STARTING_RESOURCES,
        enemy: Math.round(Data.STARTING_RESOURCES * 1.15),
      };
      this.power = {
        player: { supply: 0, use: 0 },
        enemy: { supply: 0, use: 0 },
      };
      this.population = {
        player: { used: 0, cap: Data.BALANCE.populationCap },
        enemy: { used: 0, cap: Data.BALANCE.populationCap },
      };
      this.stats = {
        player: { kills: 0, losses: 0, harvested: 0, buildings: 0, units: 0 },
        enemy: { kills: 0, losses: 0, harvested: 0, buildings: 0, units: 0 },
      };
      this.logs = [];
      this.incomeAccumulator = 0;
      this.powerAccumulator = 0;
      this.rng = Core.seededRandom(19890416);
      this.camera = { x: 0, y: 360, speed: 620 };
      this.screenShake = 0;
      this.wave = 0;
      this.result = null;
      this.createMapResources();
      this.createStartingForces();
      this.updatePowerAndPopulation();
      this.ai.reset(this.difficultyKey);
      this.renderer.reset(this.rng);
      this.centerCameraOn(420, 760);
    }

    start(difficultyKey) {
      this.resetWorld(difficultyKey);
      this.state = 'running';
      this.mouse.edgePanArmed = false;
      this.lastFrame = performance.now();
      this.accumulator = 0;
      this.logKey('game.start.objective', null, 'objective');
      this.logKey('game.start.harvesterAuto', null, 'info');
      this.playTone('start');
      if (this.ui) this.ui.onStateChange(this);
      this.scheduleBaseRecenter();
    }

    restart() {
      this.start(this.difficultyKey);
    }

    createMapResources() {
      const nodes = [
        [680, 650, 1], [720, 880, 0.85],
        [1720, 650, 1], [1680, 880, 0.85],
        [1190, 330, 0.75], [1210, 760, 1.3], [1180, 1190, 0.9],
      ];
      nodes.forEach(([x, y, scale], index) => {
        const radius = 48 + Math.round(scale * 10);
        this.minerals.push({
          id: `ore-${index + 1}`,
          x,
          y,
          radius,
          collisionRadius: Math.round(radius * Data.BALANCE.mineralCollisionScale),
          amount: Math.round(Data.BALANCE.oreNodeCapacity * scale),
          maxAmount: Math.round(Data.BALANCE.oreNodeCapacity * scale),
        });
      });
    }

    createStartingForces() {
      const playerBase = [
        ['hq', 320, 760],
        ['powerPlant', 490, 565],
        ['refinery', 510, 790],
        ['barracks', 480, 1020],
      ];
      const enemyBase = [
        ['hq', 2080, 760],
        ['powerPlant', 1910, 565],
        ['refinery', 1890, 790],
        ['barracks', 1920, 1020],
        ['factory', 1900, 365],
        ['turret', 1770, 690],
      ];
      playerBase.forEach(([type, x, y]) => this.addBuilding(type, 'player', x, y, true));
      enemyBase.forEach(([type, x, y]) => this.addBuilding(type, 'enemy', x, y, true));

      const deployStartingUnit = (type, team, x, y) => {
        const def = Data.UNIT_TYPES[type];
        const layer = def.movementLayer || 'ground';
        const collisionRadius = def.collisionRadius || def.radius;
        const point = this.findLegalSpawnPoint(layer, collisionRadius, x, y, null);
        return this.addUnit(type, team, point.x, point.y);
      };

      deployStartingUnit('harvester', 'player', 605, 800);
      deployStartingUnit('harvester', 'enemy', 1795, 800);
      const playerUnits = [
        ['rifle', 520, 690], ['rifle', 545, 720], ['rifle', 520, 750],
        ['rocket', 555, 655], ['scout', 585, 700],
      ];
      const enemyUnits = [
        ['rifle', 1840, 680], ['rifle', 1815, 720], ['rifle', 1845, 760],
        ['rocket', 1815, 650], ['scout', 1790, 735],
      ];
      playerUnits.forEach(([type, x, y]) => deployStartingUnit(type, 'player', x, y));
      enemyUnits.forEach(([type, x, y]) => deployStartingUnit(type, 'enemy', x, y));
    }

    addBuilding(type, team, x, y, complete) {
      const def = Data.BUILDING_TYPES[type];
      if (!def) return null;
      const isComplete = complete !== false;
      const building = {
        id: this.nextId++,
        kind: 'building',
        type,
        team,
        x,
        y,
        radius: def.radius,
        collisionRadius: def.collisionRadius || def.radius,
        width: def.width,
        height: def.height,
        hp: isComplete ? def.hp : Math.round(def.hp * 0.25),
        maxHp: def.hp,
        armor: def.armor,
        armorClass: def.armorClass,
        complete: isComplete,
        constructionElapsed: isComplete ? def.buildTime : 0,
        queue: [],
        rallyPoint: null,
        attackCooldown: 0,
        activityUntil: 0,
        lastFireAt: -Infinity,
        rotation: team === 'player' ? 0 : Math.PI,
        flash: 0,
        destroyed: false,
      };
      this.entities.push(building);
      this.navigationRevision += 1;
      if (!isComplete) this.stats[team].buildings += 1;
      return building;
    }

    addUnit(type, team, x, y) {
      const def = Data.UNIT_TYPES[type];
      if (!def) return null;
      const unit = {
        id: this.nextId++,
        kind: 'unit',
        type,
        team,
        x,
        y,
        radius: def.radius,
        collisionRadius: def.collisionRadius || def.radius,
        hp: def.hp,
        maxHp: def.hp,
        armor: def.armor,
        armorClass: def.armorClass,
        speed: def.speed,
        range: def.range,
        damage: def.damage,
        cooldown: def.cooldown,
        vision: def.vision,
        weaponClass: def.weaponClass,
        movementLayer: def.movementLayer || 'ground',
        altitude: def.altitude || 0,
        rotation: team === 'player' ? 0 : Math.PI,
        turretRotation: team === 'player' ? 0 : Math.PI,
        attackCooldown: this.rng() * 0.25,
        command: null,
        commandQueue: [],
        animationDistance: 0,
        lastMoveAt: -Infinity,
        lastFireAt: -Infinity,
        flash: 0,
        destroyed: false,
        stuckTime: 0,
        lastX: x,
        lastY: y,
        navigationPath: [],
        navigationIndex: 0,
        navigationTargetX: null,
        navigationTargetY: null,
        navigationStopDistance: null,
        navigationRevision: -1,
        navigationProgressDistance: Infinity,
        navigationProgressTimer: 0,
        navigationEscapeTime: 0,
        harvestState: type === 'harvester' ? 'seeking' : null,
        mineId: null,
        refineryId: null,
        cargo: 0,
        taskTimer: 0,
      };
      this.entities.push(unit);
      this.stats[team].units += 1;
      return unit;
    }

    loop(now) {
      const elapsed = Math.min(0.12, Math.max(0, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      if (this.state === 'running') {
        this.accumulator += elapsed;
        let steps = 0;
        while (this.accumulator >= FIXED_STEP && steps < 8) {
          this.update(FIXED_STEP);
          this.accumulator -= FIXED_STEP;
          steps += 1;
        }
      }
      this.renderer.render(this);
      if (this.ui) this.ui.update(this);
      requestAnimationFrame(this.loop);
    }

    step(milliseconds) {
      const iterations = Math.min(3600, Math.ceil(milliseconds / (FIXED_STEP * 1000)));
      for (let i = 0; i < iterations; i += 1) this.update(FIXED_STEP);
      this.renderer.render(this);
      if (this.ui) this.ui.update(this, true);
    }

    update(dt) {
      if (this.state !== 'running') return;
      this.time += dt;
      this.updateCamera(dt);
      this.powerAccumulator += dt;
      if (this.powerAccumulator >= 0.5) {
        this.powerAccumulator -= 0.5;
        this.updatePowerAndPopulation();
      }
      this.incomeAccumulator += dt;
      if (this.incomeAccumulator >= 5) {
        this.incomeAccumulator -= 5;
        ['player', 'enemy'].forEach((team) => {
          const hasHq = this.entities.some((e) => e.kind === 'building' && e.type === 'hq'
            && e.team === team && e.hp > 0 && e.complete);
          if (hasHq) this.resources[team] += team === 'enemy'
            ? Math.round(25 * this.difficulty.aiIncomeMultiplier) : 25;
        });
      }

      this.entities.forEach((entity) => {
        if (entity.hp <= 0) return;
        entity.flash = Math.max(0, entity.flash - dt);
        if (entity.kind === 'building') this.updateBuilding(entity, dt);
        else this.updateUnit(entity, dt);
      });
      this.resolveUnitCollisions();
      this.updateProjectiles(dt);
      this.effects.forEach((effect) => { effect.age += dt; });
      this.effects = this.effects.filter((effect) => effect.age < effect.duration);
      this.screenShake = Math.max(0, this.screenShake - dt * 8);
      this.entities = this.entities.filter((entity) => entity.hp > 0);
      this.selectedIds = new Set([...this.selectedIds].filter((id) => this.getEntity(id)));
      this.ai.update(dt);
      this.checkVictory();
      if (this.time >= Data.BALANCE.maximumMatchSeconds && this.state === 'running') {
        this.finishKey('lost', 'game.result.timeout');
      }
    }

    updateCamera(dt) {
      const view = this.renderer.getViewport();
      let dx = 0;
      let dy = 0;
      if (this.keys.has('ArrowLeft')) dx -= 1;
      if (this.keys.has('ArrowRight')) dx += 1;
      if (this.keys.has('ArrowUp')) dy -= 1;
      if (this.keys.has('ArrowDown')) dy += 1;
      if (this.mouse.inside && this.mouse.edgePanArmed && !this.drag) {
        const edge = 15;
        if (this.mouse.screenX < edge) dx -= 1;
        if (this.mouse.screenX > view.width - edge) dx += 1;
        if (this.mouse.screenY < edge) dy -= 1;
        if (this.mouse.screenY > view.height - edge) dy += 1;
      }
      if (dx || dy) {
        const length = Math.hypot(dx, dy) || 1;
        this.camera.x += (dx / length) * this.camera.speed * dt;
        this.camera.y += (dy / length) * this.camera.speed * dt;
        this.clampCamera();
        this.refreshMouseWorld();
      }
    }

    updateBuilding(building, dt) {
      const def = Data.BUILDING_TYPES[building.type];
      building.attackCooldown = Math.max(0, building.attackCooldown - dt);
      if (!building.complete) {
        building.constructionElapsed += dt;
        const progress = Core.clamp(building.constructionElapsed / def.buildTime, 0, 1);
        building.hp = Math.max(building.hp, Math.round(def.hp * (0.25 + progress * 0.75)));
        if (progress >= 1) {
          building.complete = true;
          building.hp = building.maxHp;
          this.logKey('game.building.completed', {
            entity: this.entityTranslation('building', building.type),
          }, building.team === 'player' ? 'success' : 'enemy');
          if (building.team === 'player') this.playTone('complete');
        }
        return;
      }

      if (building.queue.length > 0) {
        const item = building.queue[0];
        const powerFactor = this.getPowerFactor(building.team);
        const aiFactor = building.team === 'enemy' ? 1 / this.difficulty.aiBuildTimeMultiplier : 1;
        item.elapsed += dt * powerFactor * aiFactor;
        if (item.elapsed >= item.total) {
          const unitDef = Data.UNIT_TYPES[item.type];
          const spawnLayer = unitDef.movementLayer || 'ground';
          const blockers = this.entities.filter((entity) => entity.hp > 0
            && entity.id !== building.id && this.getMovementLayer(entity) === spawnLayer);
          if (spawnLayer === 'ground') {
            blockers.push(...this.minerals.filter((mine) => mine.amount > 0));
          }
          const unitCollisionRadius = unitDef.collisionRadius || unitDef.radius;
          const rawSpawn = Core.findOpenSpawn(
            building,
            this.getCollisionRadius(building) + unitCollisionRadius + Data.BALANCE.spawnPadding,
            unitCollisionRadius,
            blockers,
            Data.MAP,
          );
          const spawn = rawSpawn
            && this.isSpawnPointLegal(spawnLayer, unitCollisionRadius, rawSpawn.x, rawSpawn.y, null)
            ? rawSpawn
            : this.findLegalSpawnPoint(spawnLayer, unitCollisionRadius,
              building.x, building.y + this.getCollisionRadius(building) + unitCollisionRadius
                + Data.BALANCE.spawnPadding,
              null);
          if (spawn && this.isSpawnPointLegal(spawnLayer, unitCollisionRadius, spawn.x, spawn.y, null)) {
            const deployed = this.addUnit(item.type, building.team, spawn.x, spawn.y);
            if (deployed && building.rallyPoint) {
              this.setUnitCommand(deployed, {
                type: 'move',
                x: building.rallyPoint.x,
                y: building.rallyPoint.y,
                targetId: null,
              });
            }
            building.queue.shift();
            if (building.team === 'player') {
              this.logKey('game.unit.deployed', {
                entity: this.entityTranslation('unit', item.type),
              }, 'success');
              this.playTone('complete');
            }
          }
        }
      }

      if (building.type === 'turret' && def.damage > 0 && this.getPowerFactor(building.team) > 0.5) {
        const target = this.findNearestEnemy(building, def.range);
        if (target) {
          building.rotation = Math.atan2(target.y - building.y, target.x - building.x);
          if (building.attackCooldown <= 0) {
            this.fire(building, target, def);
            building.attackCooldown = def.cooldown / this.getPowerFactor(building.team);
          }
        }
      }
    }

    updateUnit(unit, dt) {
      unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);
      if (this.getMovementLayer(unit) === 'ground'
        && !this.isGroundPositionOpen(unit, unit.x, unit.y)) {
        const collisionRadius = this.getCollisionRadius(unit);
        const projected = this.findLegalSpawnPoint('ground', collisionRadius, unit.x, unit.y, unit.id);
        if (this.isGroundPositionOpen(unit, projected.x, projected.y)) {
          unit.x = projected.x;
          unit.y = projected.y;
          unit.navigationRevision = -1;
        } else {
          const staticOnly = this.findOpenMovementPoint(unit, unit.x, unit.y);
          if (this.isGroundPositionOpen(unit, staticOnly.x, staticOnly.y)) {
            unit.x = staticOnly.x;
            unit.y = staticOnly.y;
            unit.navigationRevision = -1;
          }
        }
      }
      if (unit.type === 'harvester') {
        this.updateHarvester(unit, dt);
        return;
      }

      let command = unit.command;
      if (command && command.targetId) {
        const target = this.getEntity(command.targetId);
        if (!target || !this.canAttackTarget(unit, target)) {
          if (command.type === 'attack') {
            this.advanceUnitCommand(unit);
            return;
          }
          else if (command.type === 'guardAttack') {
            unit.command = {
              type: 'guardReturn',
              x: command.originX,
              y: command.originY,
            };
          } else command.targetId = null;
          command = unit.command;
        } else {
          const distance = Core.distance(unit, target);
          if (command.type === 'patrol' && distance > unit.vision) {
            command.targetId = null;
            return;
          }
          if (command.type === 'hold' && distance > unit.range + target.radius) {
            command.targetId = null;
            return;
          }
          if (command.type === 'guardAttack') {
            const leash = Math.max(
              Data.BALANCE.guardLeashMinimum,
              unit.range * Data.BALANCE.guardLeashMultiplier,
            );
            const targetFromOrigin = Math.hypot(target.x - command.originX, target.y - command.originY);
            const unitFromOrigin = Math.hypot(unit.x - command.originX, unit.y - command.originY);
            if (targetFromOrigin > leash || unitFromOrigin > leash) {
              unit.command = {
                type: 'guardReturn',
                x: command.originX,
                y: command.originY,
              };
              return;
            }
          }
          if (distance <= unit.range + target.radius) {
            unit.turretRotation = Math.atan2(target.y - unit.y, target.x - unit.x);
            if (unit.attackCooldown <= 0) {
              this.fire(unit, target, Data.UNIT_TYPES[unit.type]);
              unit.attackCooldown = unit.cooldown;
            }
            return;
          }
          this.moveToward(unit, target.x, target.y, dt, Math.max(8, unit.range * 0.82));
          return;
        }
      }

      command = unit.command;
      if (command && (command.type === 'move' || command.type === 'attackMove')) {
        if (command.type === 'attackMove') {
          const target = this.findNearestEnemy(unit, unit.vision);
          if (target) {
            command.targetId = target.id;
            return;
          }
        }
        if (this.moveToward(unit, command.x, command.y, dt, 5)) this.advanceUnitCommand(unit);
        return;
      }

      if (command && command.type === 'patrol') {
        const target = this.findNearestEnemy(unit, unit.vision);
        if (target) {
          command.targetId = target.id;
          return;
        }
        const targetX = command.next === 'a' ? command.aX : command.bX;
        const targetY = command.next === 'a' ? command.aY : command.bY;
        if (this.moveToward(unit, targetX, targetY, dt, 5)) {
          command.next = command.next === 'a' ? 'b' : 'a';
        }
        return;
      }

      if (command && command.type === 'hold') {
        const target = this.findNearestEnemy(unit, unit.range + 100);
        if (target && Core.distance(unit, target) <= unit.range + target.radius) command.targetId = target.id;
        return;
      }

      if (command && command.type === 'guardReturn') {
        if (this.moveToward(unit, command.x, command.y, dt, 5)) unit.command = null;
        return;
      }

      if (command && command.type === 'attack') {
        this.advanceUnitCommand(unit);
        return;
      }

      if (!unit.command) {
        const guardTarget = this.findNearestEnemy(unit, unit.range + Data.BALANCE.guardAcquirePadding);
        if (guardTarget) {
          unit.command = {
            type: 'guardAttack',
            targetId: guardTarget.id,
            originX: unit.x,
            originY: unit.y,
          };
        }
      }
    }

    updateHarvester(unit, dt) {
      if (unit.command && (unit.command.type === 'move' || unit.command.type === 'attackMove')) {
        const arrived = this.moveToward(unit, unit.command.x, unit.command.y, dt, 5);
        if (arrived) this.advanceUnitCommand(unit);
        return;
      }
      if (unit.command && unit.command.type === 'patrol') {
        const command = unit.command;
        const targetX = command.next === 'a' ? command.aX : command.bX;
        const targetY = command.next === 'a' ? command.aY : command.bY;
        if (this.moveToward(unit, targetX, targetY, dt, 5)) {
          command.next = command.next === 'a' ? 'b' : 'a';
        }
        return;
      }
      if (unit.command && unit.command.type === 'hold') return;
      if (unit.command) {
        this.advanceUnitCommand(unit);
        if (unit.command) return;
      }

      const def = Data.UNIT_TYPES.harvester;
      if (unit.harvestState === 'seeking') {
        const mine = this.findNearestMineral(unit);
        const refinery = this.findNearestRefinery(unit);
        if (!mine || !refinery) return;
        unit.mineId = mine.id;
        unit.refineryId = refinery.id;
        unit.harvestState = 'toMine';
      }
      if (unit.harvestState === 'toMine') {
        const mine = this.minerals.find((node) => node.id === unit.mineId && node.amount > 0);
        if (!mine) {
          unit.harvestState = 'seeking';
          return;
        }
        if (this.moveToward(unit, mine.x, mine.y, dt, mine.radius + unit.radius - 8)) {
          unit.harvestState = 'mining';
          unit.taskTimer = def.mineTime;
        }
        return;
      }
      if (unit.harvestState === 'mining') {
        unit.taskTimer -= dt;
        if (unit.taskTimer <= 0) {
          const mine = this.minerals.find((node) => node.id === unit.mineId);
          if (!mine || mine.amount <= 0) {
            unit.harvestState = 'seeking';
            return;
          }
          unit.cargo = Math.min(def.cargo, mine.amount);
          mine.amount -= unit.cargo;
          if (mine.amount <= 0) this.navigationRevision += 1;
          unit.harvestState = 'toRefinery';
        }
        return;
      }
      if (unit.harvestState === 'toRefinery') {
        let refinery = this.getEntity(unit.refineryId);
        if (!refinery || refinery.type !== 'refinery' || refinery.team !== unit.team) {
          refinery = this.findNearestRefinery(unit);
          unit.refineryId = refinery ? refinery.id : null;
        }
        if (!refinery) return;
        if (this.moveToward(unit, refinery.x, refinery.y, dt, refinery.radius + unit.radius - 10)) {
          unit.harvestState = 'unloading';
          unit.taskTimer = def.unloadTime;
        }
        return;
      }
      if (unit.harvestState === 'unloading') {
        const refinery = this.getEntity(unit.refineryId);
        if (!refinery || refinery.type !== 'refinery' || refinery.team !== unit.team) {
          unit.harvestState = 'seeking';
          return;
        }
        refinery.activityUntil = Math.max(refinery.activityUntil || 0, this.time + 0.7);
        unit.taskTimer -= dt;
        if (unit.taskTimer <= 0) {
          const multiplier = unit.team === 'enemy' ? this.difficulty.aiIncomeMultiplier : 1;
          const delivered = Math.round(unit.cargo * multiplier);
          this.resources[unit.team] += delivered;
          this.stats[unit.team].harvested += delivered;
          unit.cargo = 0;
          unit.harvestState = 'seeking';
          if (unit.team === 'player') this.effects.push({
            type: 'income', x: unit.x, y: unit.y, age: 0, duration: 1.2, amount: delivered,
          });
        }
      }
    }

    getCollisionRadius(entity) {
      if (!entity) return 0;
      return Number.isFinite(entity.collisionRadius) ? entity.collisionRadius : (entity.radius || 0);
    }

    getNavigationBlockers(unit) {
      if (this.getMovementLayer(unit) !== 'ground') return [];
      const buildings = this.entities.filter((entity) => entity.kind === 'building' && entity.hp > 0);
      const minerals = this.minerals.filter((mine) => mine.amount > 0);
      return buildings.concat(minerals);
    }

    isGroundPositionOpen(unit, x, y) {
      if (this.getMovementLayer(unit) !== 'ground') return true;
      if (x < Data.MAP.edgePadding || x > Data.MAP.width - Data.MAP.edgePadding
        || y < Data.MAP.edgePadding || y > Data.MAP.height - Data.MAP.edgePadding) return false;
      const unitRadius = this.getCollisionRadius(unit);
      const padding = Data.BALANCE.navigationPadding;
      return !this.getNavigationBlockers(unit).some((blocker) => (
        Math.hypot(x - blocker.x, y - blocker.y)
          < unitRadius + this.getCollisionRadius(blocker) + padding
      ));
    }

    isMovementDestinationOpen(unit, x, y) {
      if (!this.isGroundPositionOpen(unit, x, y)) return false;
      return !this.entities.some((other) => other.kind === 'unit' && other.id !== unit.id && other.hp > 0
        && this.getMovementLayer(other) === this.getMovementLayer(unit)
        && Math.hypot(x - other.x, y - other.y)
          < this.getCollisionRadius(unit) + this.getCollisionRadius(other) + 3);
    }

    findOpenMovementPoint(unit, x, y) {
      const target = {
        x: Core.clamp(x, Data.MAP.edgePadding, Data.MAP.width - Data.MAP.edgePadding),
        y: Core.clamp(y, Data.MAP.edgePadding, Data.MAP.height - Data.MAP.edgePadding),
      };
      if (this.isMovementDestinationOpen(unit, target.x, target.y)) {
        return target;
      }
      const baseAngle = Math.atan2(unit.y - target.y, unit.x - target.x);
      const increment = Data.MAP.gridSize / 2;
      for (let ring = 1; ring <= 12; ring += 1) {
        const radius = ring * increment;
        const candidates = [];
        for (let index = 0; index < 16; index += 1) {
          const angle = baseAngle + (Math.PI * 2 * index) / 16;
          const candidate = {
            x: Core.clamp(target.x + Math.cos(angle) * radius,
              Data.MAP.edgePadding, Data.MAP.width - Data.MAP.edgePadding),
            y: Core.clamp(target.y + Math.sin(angle) * radius,
              Data.MAP.edgePadding, Data.MAP.height - Data.MAP.edgePadding),
          };
          if (this.isMovementDestinationOpen(unit, candidate.x, candidate.y)) candidates.push(candidate);
        }
        if (candidates.length > 0) {
          candidates.sort((a, b) => Core.distanceSquared(unit, a) - Core.distanceSquared(unit, b));
          return candidates[0];
        }
      }
      return target;
    }

    isSpawnPointLegal(layer, collisionRadius, x, y, selfId) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      if (x < Data.MAP.edgePadding || x > Data.MAP.width - Data.MAP.edgePadding
        || y < Data.MAP.edgePadding || y > Data.MAP.height - Data.MAP.edgePadding) return false;
      if (layer === 'ground') {
        const blockedByStatic = this.entities.some((entity) => entity.kind === 'building'
          && entity.hp > 0
          && Math.hypot(x - entity.x, y - entity.y)
            < collisionRadius + this.getCollisionRadius(entity));
        if (blockedByStatic) return false;
        const blockedByMineral = this.minerals.some((mine) => mine.amount > 0
          && Math.hypot(x - mine.x, y - mine.y)
            < collisionRadius + this.getCollisionRadius(mine));
        if (blockedByMineral) return false;
      }
      return !this.entities.some((entity) => entity.kind === 'unit' && entity.hp > 0
        && entity.id !== selfId
        && this.getMovementLayer(entity) === layer
        && Math.hypot(x - entity.x, y - entity.y)
          < collisionRadius + this.getCollisionRadius(entity));
    }

    findLegalSpawnPoint(layer, collisionRadius, x, y, selfId) {
      const target = {
        x: Core.clamp(x, Data.MAP.edgePadding, Data.MAP.width - Data.MAP.edgePadding),
        y: Core.clamp(y, Data.MAP.edgePadding, Data.MAP.height - Data.MAP.edgePadding),
      };
      if (this.isSpawnPointLegal(layer, collisionRadius, target.x, target.y, selfId)) return target;
      for (let ring = 1; ring <= 24; ring += 1) {
        const radius = ring * (Data.MAP.gridSize / 4);
        const slots = 8 + ring * 4;
        let best = null;
        let bestDistance = Infinity;
        for (let index = 0; index < slots; index += 1) {
          const angle = (Math.PI * 2 * index) / slots;
          const candidate = {
            x: Core.clamp(target.x + Math.cos(angle) * radius,
              Data.MAP.edgePadding, Data.MAP.width - Data.MAP.edgePadding),
            y: Core.clamp(target.y + Math.sin(angle) * radius,
              Data.MAP.edgePadding, Data.MAP.height - Data.MAP.edgePadding),
          };
          if (!this.isSpawnPointLegal(layer, collisionRadius, candidate.x, candidate.y, selfId)) {
            continue;
          }
          const candidateDistance = Core.distanceSquared(target, candidate);
          if (candidateDistance < bestDistance) {
            best = candidate;
            bestDistance = candidateDistance;
          }
        }
        if (best) return best;
      }
      return target;
    }

    prepareUnitCommand(unit, command) {
      if (!command) return null;
      const next = { ...command };
      if (['move', 'attackMove', 'guardReturn'].includes(next.type)
        && Number.isFinite(next.x) && Number.isFinite(next.y)) {
        Object.assign(next, this.findOpenMovementPoint(unit, next.x, next.y));
      }
      if (next.type === 'patrol') {
        const a = this.findOpenMovementPoint(unit, next.aX, next.aY);
        const b = this.findOpenMovementPoint(unit, next.bX, next.bY);
        next.aX = a.x;
        next.aY = a.y;
        next.bX = b.x;
        next.bY = b.y;
      }
      return next;
    }

    clearUnitNavigation(unit) {
      unit.navigationPath = [];
      unit.navigationIndex = 0;
      unit.navigationTargetX = null;
      unit.navigationTargetY = null;
      unit.navigationStopDistance = null;
      unit.navigationRevision = -1;
      unit.navigationProgressDistance = Infinity;
      unit.navigationProgressTimer = 0;
      unit.navigationEscapeTime = 0;
      unit.stuckTime = 0;
    }

    isNavigationSegmentOpen(unit, start, end, target, stopDistance) {
      if (this.getMovementLayer(unit) !== 'ground') return true;
      const padding = this.getCollisionRadius(unit) + Data.BALANCE.navigationPadding;
      return !this.getNavigationBlockers(unit).some((blocker) => {
        const blockerRadius = this.getCollisionRadius(blocker);
        const destinationBlocker = target
          && Math.hypot(target.x - blocker.x, target.y - blocker.y) <= blockerRadius + 1
          && stopDistance >= padding + blockerRadius;
        if (destinationBlocker) return false;
        return Core.segmentIntersectsCircle(start, end, blocker, padding);
      });
    }

    buildNavigationPath(unit, targetX, targetY, stopDistance) {
      if (this.getMovementLayer(unit) !== 'ground') return [];
      const blockers = this.getNavigationBlockers(unit);
      const unitPadding = this.getCollisionRadius(unit) + Data.BALANCE.navigationPadding;
      const target = { x: targetX, y: targetY };
      const rawPath = Core.findGridPath(unit, target, {
        bounds: Data.MAP,
        cellSize: Data.MAP.gridSize,
        edgePadding: Data.MAP.edgePadding,
        isBlocked: (x, y) => blockers.some((blocker) => (
          Math.hypot(x - blocker.x, y - blocker.y)
            < unitPadding + this.getCollisionRadius(blocker)
        )),
      });
      if (rawPath.length === 0) return [];
      if (this.isGroundPositionOpen(unit, targetX, targetY)) rawPath.push(target);
      const smoothed = [];
      let anchor = { x: unit.x, y: unit.y };
      let index = 0;
      while (index < rawPath.length) {
        let furthest = index;
        for (let candidate = rawPath.length - 1; candidate >= index; candidate -= 1) {
          if (this.isNavigationSegmentOpen(unit, anchor, rawPath[candidate], target, stopDistance)) {
            furthest = candidate;
            break;
          }
        }
        const point = rawPath[furthest];
        smoothed.push(point);
        anchor = point;
        index = furthest + 1;
      }
      return smoothed;
    }

    ensureNavigationPath(unit, targetX, targetY, stopDistance) {
      if (this.getMovementLayer(unit) !== 'ground') return;
      const targetChanged = unit.navigationTargetX == null
        || Math.hypot(targetX - unit.navigationTargetX, targetY - unit.navigationTargetY)
          >= Data.MAP.gridSize * 0.5
        || Math.abs((unit.navigationStopDistance || 0) - stopDistance) > 1;
      if (!targetChanged && unit.navigationRevision === this.navigationRevision) return;
      const target = { x: targetX, y: targetY };
      unit.navigationPath = this.isNavigationSegmentOpen(unit, unit, target, target, stopDistance)
        ? [] : this.buildNavigationPath(unit, targetX, targetY, stopDistance);
      unit.navigationIndex = 0;
      unit.navigationTargetX = targetX;
      unit.navigationTargetY = targetY;
      unit.navigationStopDistance = stopDistance;
      unit.navigationRevision = this.navigationRevision;
      unit.navigationProgressTimer = 0;
      unit.navigationProgressDistance = this.navigationRemainingDistance(unit, targetX, targetY, stopDistance);
    }

    navigationRemainingDistance(unit, targetX, targetY, stopDistance) {
      const path = Array.isArray(unit.navigationPath) ? unit.navigationPath : [];
      const index = Math.min(unit.navigationIndex || 0, path.length);
      if (index >= path.length) {
        return Math.max(0, Math.hypot(targetX - unit.x, targetY - unit.y) - stopDistance);
      }
      let remaining = Math.hypot(path[index].x - unit.x, path[index].y - unit.y);
      for (let cursor = index + 1; cursor < path.length; cursor += 1) {
        remaining += Math.hypot(path[cursor].x - path[cursor - 1].x,
          path[cursor].y - path[cursor - 1].y);
      }
      const last = path[path.length - 1];
      remaining += Math.max(0, Math.hypot(targetX - last.x, targetY - last.y) - stopDistance);
      return remaining;
    }

    moveUnitWithStaticCollisions(unit, moveX, moveY) {
      const min = Data.MAP.edgePadding;
      const proposed = {
        x: Core.clamp(unit.x + moveX, min, Data.MAP.width - min),
        y: Core.clamp(unit.y + moveY, min, Data.MAP.height - min),
      };
      if (this.getMovementLayer(unit) !== 'ground'
        || this.isGroundPositionOpen(unit, proposed.x, proposed.y)) {
        unit.x = proposed.x;
        unit.y = proposed.y;
        return true;
      }
      const xOnly = { x: proposed.x, y: unit.y };
      if (this.isGroundPositionOpen(unit, xOnly.x, xOnly.y)) {
        unit.x = xOnly.x;
        return true;
      }
      const yOnly = { x: unit.x, y: proposed.y };
      if (this.isGroundPositionOpen(unit, yOnly.x, yOnly.y)) {
        unit.y = yOnly.y;
        return true;
      }
      return false;
    }

    moveToward(unit, targetX, targetY, dt, stopDistance) {
      const finalDistance = Math.hypot(targetX - unit.x, targetY - unit.y);
      if (finalDistance <= stopDistance) {
        this.clearUnitNavigation(unit);
        return true;
      }
      this.ensureNavigationPath(unit, targetX, targetY, stopDistance);
      const path = unit.navigationPath || [];
      const waypointTolerance = Math.max(6, unit.speed * dt * 1.5);
      while (unit.navigationIndex < path.length
        && Math.hypot(path[unit.navigationIndex].x - unit.x,
          path[unit.navigationIndex].y - unit.y) <= waypointTolerance) {
        unit.navigationIndex += 1;
      }
      const destination = unit.navigationIndex < path.length
        ? path[unit.navigationIndex] : { x: targetX, y: targetY };
      let dx = destination.x - unit.x;
      let dy = destination.y - unit.y;
      const routeDistance = Math.hypot(dx, dy) || 1;
      dx /= routeDistance;
      dy /= routeDistance;
      let steerX = dx;
      let steerY = dy;

      this.entities.forEach((other) => {
        if (other.id === unit.id || other.hp <= 0 || other.kind !== 'unit') return;
        if (this.getMovementLayer(other) !== this.getMovementLayer(unit)) return;
        const ox = unit.x - other.x;
        const oy = unit.y - other.y;
        const distance = Math.hypot(ox, oy) || 0.001;
        const desired = this.getCollisionRadius(unit) + this.getCollisionRadius(other) + 2;
        if (distance < desired * 1.8) {
          const force = Core.clamp((desired * 1.8 - distance) / desired, 0, 1.15);
          steerX += (ox / distance) * force;
          steerY += (oy / distance) * force;
        }
        const otherCommand = other.command;
        if (!otherCommand || !Number.isFinite(otherCommand.x) || !Number.isFinite(otherCommand.y)
          || distance >= desired * 2.5) return;
        const otherDx = otherCommand.x - other.x;
        const otherDy = otherCommand.y - other.y;
        const otherLength = Math.hypot(otherDx, otherDy) || 1;
        const headingDot = dx * (otherDx / otherLength) + dy * (otherDy / otherLength);
        if (headingDot < -0.35) {
          steerX += -dy * 0.55;
          steerY += dx * 0.55;
        }
      });
      unit.navigationEscapeTime = Math.max(0, (unit.navigationEscapeTime || 0) - dt);
      if (unit.navigationEscapeTime > 0) {
        steerX += -dy * 0.9;
        steerY += dx * 0.9;
      }
      const steerLength = Math.hypot(steerX, steerY) || 1;
      steerX /= steerLength;
      steerY /= steerLength;
      const remainingToDestination = unit.navigationIndex < path.length
        ? routeDistance : Math.max(0, finalDistance - stopDistance);
      const step = Math.min(unit.speed * dt, remainingToDestination);
      const beforeX = unit.x;
      const beforeY = unit.y;
      this.moveUnitWithStaticCollisions(unit, steerX * step, steerY * step);
      const moved = Math.hypot(unit.x - beforeX, unit.y - beforeY);
      if (moved > 0.001) {
        unit.animationDistance += moved;
        unit.lastMoveAt = this.time;
        const desiredAngle = Math.atan2(unit.y - beforeY, unit.x - beforeX);
        unit.rotation = this.lerpAngle(unit.rotation, desiredAngle, Math.min(1, dt * 8));
        if (unit.type !== 'rifle' && unit.type !== 'rocket') {
          unit.turretRotation = this.lerpAngle(unit.turretRotation, desiredAngle, Math.min(1, dt * 3));
        }
      }
      unit.lastX = unit.x;
      unit.lastY = unit.y;

      const remaining = this.navigationRemainingDistance(unit, targetX, targetY, stopDistance);
      unit.navigationProgressTimer += dt;
      if (unit.navigationProgressTimer >= 0.5) {
        const progress = unit.navigationProgressDistance - remaining;
        unit.stuckTime = progress < 2 ? unit.stuckTime + unit.navigationProgressTimer : 0;
        unit.navigationProgressDistance = remaining;
        unit.navigationProgressTimer = 0;
        if (unit.stuckTime >= Data.BALANCE.navigationRepathSeconds) {
          unit.navigationRevision = -1;
          unit.navigationEscapeTime = Data.BALANCE.navigationEscapeSeconds;
          unit.stuckTime = 0;
        }
      }
      const actualDistance = Math.hypot(targetX - unit.x, targetY - unit.y);
      if (actualDistance <= stopDistance + 1) {
        this.clearUnitNavigation(unit);
        return true;
      }
      return false;
    }

    resolveUnitCollisions() {
      const units = this.entities.filter((entity) => entity.kind === 'unit' && entity.hp > 0);
      for (let pass = 0; pass < 2; pass += 1) {
        for (let i = 0; i < units.length; i += 1) {
          for (let j = i + 1; j < units.length; j += 1) {
            const a = units[i];
            const b = units[j];
            if (this.getMovementLayer(a) !== this.getMovementLayer(b)) continue;
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let distance = Math.hypot(dx, dy);
            if (distance < 0.001) {
              const angle = ((a.id * 31 + b.id * 17) % 360) * (Math.PI / 180);
              dx = Math.cos(angle);
              dy = Math.sin(angle);
              distance = 1;
            }
            const overlap = this.getCollisionRadius(a) + this.getCollisionRadius(b) + 1 - distance;
            if (overlap <= 0) continue;
            const nx = dx / distance;
            const ny = dy / distance;
            const push = Math.min(4, overlap * 0.35);
            const aX = a.x + nx * push;
            const aY = a.y + ny * push;
            const bX = b.x - nx * push;
            const bY = b.y - ny * push;
            if (this.getMovementLayer(a) !== 'ground' || this.isGroundPositionOpen(a, aX, aY)) {
              a.x = Core.clamp(aX, Data.MAP.edgePadding, Data.MAP.width - Data.MAP.edgePadding);
              a.y = Core.clamp(aY, Data.MAP.edgePadding, Data.MAP.height - Data.MAP.edgePadding);
            }
            if (this.getMovementLayer(b) !== 'ground' || this.isGroundPositionOpen(b, bX, bY)) {
              b.x = Core.clamp(bX, Data.MAP.edgePadding, Data.MAP.width - Data.MAP.edgePadding);
              b.y = Core.clamp(bY, Data.MAP.edgePadding, Data.MAP.height - Data.MAP.edgePadding);
            }
          }
        }
      }
    }

    fire(attacker, target, weapon) {
      const multiplierTable = Data.DAMAGE_MULTIPLIERS[weapon.weaponClass] || {};
      const multiplier = multiplierTable[target.armorClass] || 1;
      const variance = 0.92 + this.rng() * 0.16;
      const damage = Core.resolveDamage(weapon.damage * multiplier * variance, target.armor);
      const isRocket = weapon.weaponClass === 'rocket';
      const isCannon = weapon.weaponClass === 'cannon' || weapon.weaponClass === 'turret';
      const sourceAltitude = Number(attacker.altitude) || 0;
      const targetAltitude = Number(target.altitude) || 0;
      this.projectiles.push({
        id: this.nextId++,
        ownerId: attacker.id,
        team: attacker.team,
        weaponClass: weapon.weaponClass,
        x: attacker.x,
        y: attacker.y,
        targetId: target.id,
        targetX: target.x,
        targetY: target.y,
        altitude: sourceAltitude,
        targetAltitude,
        airborne: sourceAltitude > 0 || targetAltitude > 0,
        speed: isRocket ? 360 : isCannon ? 620 : 900,
        damage,
        radius: isRocket ? 4 : isCannon ? 3 : 2,
        life: 2.5,
      });
      this.effects.push({
        type: 'muzzle', x: attacker.x, y: attacker.y, age: 0, duration: 0.16,
        angle: Math.atan2(target.y - attacker.y, target.x - attacker.x), team: attacker.team,
        altitude: sourceAltitude, airborne: sourceAltitude > 0,
      });
      attacker.lastFireAt = this.time;
      if (attacker.team === 'player' && weapon.weaponClass === 'cannon') this.playTone('cannon');
    }

    updateProjectiles(dt) {
      this.projectiles.forEach((projectile) => {
        projectile.life -= dt;
        const target = this.getEntity(projectile.targetId);
        if (target) {
          projectile.targetX = target.x;
          projectile.targetY = target.y;
          projectile.targetAltitude = Number(target.altitude) || 0;
          projectile.airborne = (Number(projectile.altitude) || 0) > 0 || projectile.targetAltitude > 0;
        }
        const dx = projectile.targetX - projectile.x;
        const dy = projectile.targetY - projectile.y;
        const distance = Math.hypot(dx, dy) || 0.001;
        const step = projectile.speed * dt;
        if (distance <= step + (target ? target.radius * 0.45 : 4)) {
          if (target) this.applyDamage(target, projectile.damage, projectile.ownerId);
          projectile.life = 0;
          this.effects.push({
            type: 'impact', x: projectile.targetX, y: projectile.targetY, age: 0,
            duration: projectile.weaponClass === 'cannon' || projectile.weaponClass === 'rocket' ? 0.7 : 0.28,
            heavy: projectile.weaponClass === 'cannon' || projectile.weaponClass === 'rocket',
            team: projectile.team, altitude: projectile.targetAltitude || 0,
            airborne: (projectile.targetAltitude || 0) > 0,
          });
          if (projectile.weaponClass === 'cannon' || projectile.weaponClass === 'rocket') {
            this.screenShake = Math.min(1, this.screenShake + 0.22);
          }
        } else {
          const progress = Math.min(1, step / distance);
          const currentAltitude = Number(projectile.altitude) || 0;
          projectile.x += (dx / distance) * step;
          projectile.y += (dy / distance) * step;
          projectile.altitude = currentAltitude
            + ((Number(projectile.targetAltitude) || 0) - currentAltitude) * progress;
        }
      });
      this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0);
    }

    applyDamage(target, damage, ownerId) {
      if (!target || target.hp <= 0) return;
      target.hp = Math.max(0, target.hp - damage);
      target.flash = 0.1;
      if (target.hp <= 0) this.destroyEntity(target, ownerId);
    }

    destroyEntity(target, ownerId) {
      if (target.destroyed) return;
      target.destroyed = true;
      if (target.kind === 'building') this.navigationRevision += 1;
      const owner = this.getEntity(ownerId);
      if (owner && owner.team !== target.team) this.stats[owner.team].kills += 1;
      this.stats[target.team].losses += 1;
      const def = target.kind === 'unit' ? Data.UNIT_TYPES[target.type] : Data.BUILDING_TYPES[target.type];
      this.effects.push({
        type: 'explosion', x: target.x, y: target.y, age: 0,
        duration: target.kind === 'building' ? 1.5 : 0.9,
        radius: target.radius, team: target.team,
        altitude: Number(target.altitude) || 0,
        airborne: (Number(target.altitude) || 0) > 0,
      });
      this.screenShake = Math.min(1, this.screenShake + (target.kind === 'building' ? 0.8 : 0.3));
      if (target.team === 'player') {
        this.logKey('game.entity.lost', {
          entity: this.entityTranslation(target.kind, target.type),
        }, target.type === 'hq' ? 'critical' : 'warning');
        this.playTone('alert');
      } else if (target.type === 'hq') {
        this.logKey('game.enemyHq.collapsed', null, 'success');
      }
    }

    findNearestEnemy(source, range) {
      const maxDistanceSq = range * range;
      let best = null;
      let bestDistance = maxDistanceSq;
      this.entities.forEach((entity) => {
        if (!this.canAttackTarget(source, entity)) return;
        const distance = Core.distanceSquared(source, entity);
        if (distance <= bestDistance) {
          best = entity;
          bestDistance = distance;
        }
      });
      return best;
    }

    getMovementLayer(entity) {
      if (!entity || entity.kind !== 'unit') return 'ground';
      if (entity.movementLayer) return entity.movementLayer;
      const definition = Data.UNIT_TYPES[entity.type];
      return definition && definition.movementLayer ? definition.movementLayer : 'ground';
    }

    canAttackTarget(attacker, target) {
      if (!attacker || !target || attacker.hp <= 0 || target.hp <= 0 || target.destroyed
        || attacker.team === target.team) return false;
      const definition = attacker.kind === 'unit'
        ? Data.UNIT_TYPES[attacker.type] : Data.BUILDING_TYPES[attacker.type];
      if (!definition || !definition.weaponClass || !(definition.damage > 0)) return false;
      const layers = Array.isArray(definition.targetLayers) && definition.targetLayers.length
        ? definition.targetLayers : ['ground'];
      return layers.includes(this.getMovementLayer(target));
    }

    findNearestMineral(unit) {
      let best = null;
      let bestDistance = Infinity;
      this.minerals.forEach((mine) => {
        if (mine.amount <= 0) return;
        const d = Core.distanceSquared(unit, mine);
        if (d < bestDistance) {
          best = mine;
          bestDistance = d;
        }
      });
      return best;
    }

    findNearestRefinery(unit) {
      let best = null;
      let bestDistance = Infinity;
      this.entities.forEach((entity) => {
        if (entity.kind !== 'building' || entity.type !== 'refinery' || entity.team !== unit.team
          || !entity.complete || entity.hp <= 0) return;
        const d = Core.distanceSquared(unit, entity);
        if (d < bestDistance) {
          best = entity;
          bestDistance = d;
        }
      });
      return best;
    }

    updatePowerAndPopulation() {
      ['player', 'enemy'].forEach((team) => {
        let supply = 0;
        let use = 0;
        let used = 0;
        this.entities.forEach((entity) => {
          if (entity.team !== team || entity.hp <= 0) return;
          if (entity.kind === 'building' && entity.complete) {
            const def = Data.BUILDING_TYPES[entity.type];
            supply += def.powerSupply || 0;
            use += def.powerUse || 0;
          } else if (entity.kind === 'unit') {
            used += Data.UNIT_TYPES[entity.type].population || 0;
          }
        });
        this.power[team] = { supply, use };
        this.population[team] = { used, cap: Data.BALANCE.populationCap };
      });
    }

    getPowerFactor(team) {
      const power = this.power[team];
      return power.supply >= power.use ? 1 : Data.BALANCE.lowPowerProductionMultiplier;
    }

    queueUnit(type, team) {
      const faction = team || 'player';
      const def = Data.UNIT_TYPES[type];
      if (!def) return false;
      this.updatePowerAndPopulation();
      if (this.resources[faction] < def.cost) {
        if (faction === 'player') this.logKey('game.insufficientCredits', {
          entity: this.entityTranslation('unit', type), cost: def.cost,
        }, 'warning');
        return false;
      }
      const queuedPopulation = this.entities.reduce((sum, entity) => {
        if (entity.kind !== 'building' || entity.team !== faction || entity.hp <= 0) return sum;
        return sum + entity.queue.reduce((queueSum, item) => (
          queueSum + (Data.UNIT_TYPES[item.type]?.population || 0)
        ), 0);
      }, 0);
      if (this.population[faction].used + queuedPopulation + def.population > this.population[faction].cap) {
        if (faction === 'player') this.logKey('game.populationFull', null, 'warning');
        return false;
      }
      const buildings = this.entities.filter((entity) => entity.kind === 'building'
        && entity.team === faction && entity.complete && entity.hp > 0
        && Data.BUILDING_TYPES[entity.type].production.includes(type));
      if (buildings.length === 0) {
        if (faction === 'player') this.logKey('game.noProducer', {
          entity: this.entityTranslation('unit', type),
        }, 'warning');
        return false;
      }
      let building = null;
      if (faction === 'player') {
        building = this.getSelected().find((entity) => buildings.includes(entity)) || null;
      }
      if (!building) building = buildings.sort((a, b) => a.queue.length - b.queue.length)[0];
      if (building.queue.length >= 5) {
        if (faction === 'player') this.logKey('game.queueFull', null, 'warning');
        return false;
      }
      this.resources[faction] -= def.cost;
      building.queue.push({ type, elapsed: 0, total: def.buildTime });
      if (faction === 'player') {
        this.logKey('game.queued', { entity: this.entityTranslation('unit', type) }, 'info');
        this.playTone('queue');
      }
      return true;
    }

    beginBuildingPlacement(type) {
      if (this.state !== 'running') return false;
      const def = Data.BUILDING_TYPES[type];
      if (!def || type === 'hq') return false;
      if (!this.hasPrerequisite('player', type)) {
        this.logKey('game.prerequisiteMissing', {
          entity: this.entityTranslation('building', type),
        }, 'warning');
        return false;
      }
      if (this.resources.player < def.cost) {
        this.logKey('game.insufficientCredits', {
          entity: this.entityTranslation('building', type), cost: def.cost,
        }, 'warning');
        return false;
      }
      this.placementType = type;
      this.commandMode = null;
      this.logKey('game.selectBuildLocation', {
        entity: this.entityTranslation('building', type),
      }, 'info');
      return true;
    }

    hasPrerequisite(team, type) {
      const prerequisites = {
        powerPlant: ['hq'],
        refinery: ['powerPlant'],
        barracks: ['powerPlant'],
        factory: ['barracks'],
        airfield: ['factory'],
        turret: ['barracks'],
      };
      return (prerequisites[type] || []).every((needed) => this.entities.some((entity) => (
        entity.kind === 'building' && entity.type === needed && entity.team === team
        && entity.complete && entity.hp > 0
      )));
    }

    getPlacementValidity(type, x, y, team) {
      const faction = team || 'player';
      const def = Data.BUILDING_TYPES[type];
      const invalid = (reasonKey) => ({ valid: false, reasonKey, reason: this.t(reasonKey) });
      if (!def) return invalid('game.build.unknown');
      if (x < def.radius + Data.MAP.edgePadding || x > Data.MAP.width - def.radius - Data.MAP.edgePadding
        || y < def.radius + Data.MAP.edgePadding || y > Data.MAP.height - def.radius - Data.MAP.edgePadding) {
        return invalid('game.build.outOfBounds');
      }
      const anchors = this.entities.filter((entity) => entity.kind === 'building'
        && entity.team === faction && entity.complete && entity.hp > 0);
      if (!anchors.some((anchor) => Core.distance(anchor, { x, y }) <= Data.BALANCE.buildRadius)) {
        return invalid('game.build.outOfRadius');
      }
      const candidate = {
        x, y, radius: def.radius, collisionRadius: def.collisionRadius || def.radius,
      };
      if (this.entities.some((entity) => entity.hp > 0 && Core.circlesOverlap(candidate, entity, Data.BALANCE.buildPadding))) {
        return invalid('game.build.overlap');
      }
      if (this.minerals.some((mine) => mine.amount > 0 && Core.circlesOverlap(candidate, {
        x: mine.x, y: mine.y, radius: mine.radius,
      }, 18))) {
        return invalid('game.build.oreBlocked');
      }
      return { valid: true, reasonKey: null, reason: '' };
    }

    placeBuilding(type, x, y, team, free) {
      const faction = team || 'player';
      const def = Data.BUILDING_TYPES[type];
      const validity = this.getPlacementValidity(type, x, y, faction);
      if (!validity.valid) {
        if (faction === 'player') this.logKey(validity.reasonKey, null, 'warning');
        return null;
      }
      if (!free && this.resources[faction] < def.cost) return null;
      if (!free) this.resources[faction] -= def.cost;
      const building = this.addBuilding(type, faction, x, y, false);
      if (faction === 'player') {
        this.placementType = null;
        this.selectedIds = new Set([building.id]);
        this.logKey('game.foundationPlaced', {
          entity: this.entityTranslation('building', type),
        }, 'info');
        this.playTone('place');
      }
      return building;
    }

    findAiBuildSpot(type) {
      const hq = this.findBuilding('enemy', 'hq');
      if (!hq) return null;
      for (let radius = 190; radius <= Data.BALANCE.buildRadius - 30; radius += 55) {
        for (let i = 0; i < 16; i += 1) {
          const angle = (Math.PI * 2 * i) / 16 + this.rng() * 0.12;
          const x = hq.x + Math.cos(angle) * radius;
          const y = hq.y + Math.sin(angle) * radius;
          if (this.getPlacementValidity(type, x, y, 'enemy').valid) return { x, y };
        }
      }
      return null;
    }

    aiBuild(type) {
      const def = Data.BUILDING_TYPES[type];
      if (!def || this.resources.enemy < def.cost || !this.hasPrerequisite('enemy', type)) return false;
      const position = this.findAiBuildSpot(type);
      if (!position) return false;
      return Boolean(this.placeBuilding(type, position.x, position.y, 'enemy', false));
    }

    setUnitCommand(unit, command, options) {
      if (!unit || unit.kind !== 'unit') return false;
      const opts = options || {};
      const next = this.prepareUnitCommand(unit, command);
      const isTerminal = next && (next.type === 'patrol' || next.type === 'hold');
      const append = Boolean(opts.append && !isTerminal);
      if (!Array.isArray(unit.commandQueue)) unit.commandQueue = [];
      if (!next) {
        unit.command = null;
        unit.commandQueue.length = 0;
        this.clearUnitNavigation(unit);
      } else if (append && unit.command) {
        if (unit.commandQueue.length >= Data.BALANCE.commandQueueLimit) return false;
        unit.commandQueue.push(next);
      } else {
        unit.command = next;
        unit.commandQueue.length = 0;
        this.clearUnitNavigation(unit);
      }
      if (unit.type === 'harvester') unit.harvestState = next ? 'manual' : 'seeking';
      return true;
    }

    advanceUnitCommand(unit) {
      if (!unit || unit.kind !== 'unit') return null;
      if (!Array.isArray(unit.commandQueue)) unit.commandQueue = [];
      unit.command = this.prepareUnitCommand(unit, unit.commandQueue.shift() || null);
      this.clearUnitNavigation(unit);
      if (unit.type === 'harvester') unit.harvestState = unit.command ? 'manual' : 'seeking';
      return unit.command;
    }

    issueMove(x, y, attackMove, options) {
      const units = this.getSelected().filter((entity) => entity.kind === 'unit');
      if (units.length === 0) return false;
      const maximumRadius = Math.max(...units.map((unit) => this.getCollisionRadius(unit)));
      const spacing = Math.max(42, Math.ceil((maximumRadius * 2 + 6) / 0.765));
      const offsets = Core.formationOffsets(units.length, spacing);
      let accepted = 0;
      units.forEach((unit, index) => {
        if (this.setUnitCommand(unit, {
          type: attackMove ? 'attackMove' : 'move',
          x: Core.clamp(x + offsets[index].x, Data.MAP.edgePadding, Data.MAP.width - Data.MAP.edgePadding),
          y: Core.clamp(y + offsets[index].y, Data.MAP.edgePadding, Data.MAP.height - Data.MAP.edgePadding),
          targetId: null,
        }, options)) accepted += 1;
      });
      if (accepted === 0) return false;
      this.effects.push({
        type: 'command', command: attackMove ? 'attack' : 'move', x, y, age: 0, duration: 0.8,
        team: 'player', sources: units.slice(0, 12).map((unit) => ({ x: unit.x, y: unit.y })),
      });
      this.playTone(attackMove ? 'attack' : 'move');
      return true;
    }

    issueAttack(target, options) {
      const units = this.getSelected().filter((entity) => entity.kind === 'unit'
        && this.canAttackTarget(entity, target));
      if (!target || target.team !== 'enemy' || units.length === 0) return false;
      let accepted = 0;
      units.forEach((unit) => {
        if (this.setUnitCommand(unit, { type: 'attack', targetId: target.id }, options)) accepted += 1;
      });
      if (accepted === 0) return false;
      this.effects.push({
        type: 'command', command: 'attack', x: target.x, y: target.y, age: 0, duration: 0.8,
        team: 'player', sources: units.slice(0, 12).map((unit) => ({ x: unit.x, y: unit.y })),
      });
      this.playTone('attack');
      return true;
    }

    commandTeamAttack(team, target) {
      if (!target) return 0;
      const units = this.entities.filter((entity) => entity.kind === 'unit' && entity.team === team
        && entity.hp > 0 && this.canAttackTarget(entity, target));
      units.forEach((unit) => {
        this.setUnitCommand(unit, { type: 'attack', targetId: target.id });
      });
      return units.length;
    }

    issuePatrol(x, y) {
      const units = this.getSelected().filter((entity) => entity.kind === 'unit');
      if (units.length === 0) return false;
      const maximumRadius = Math.max(...units.map((unit) => this.getCollisionRadius(unit)));
      const spacing = Math.max(42, Math.ceil((maximumRadius * 2 + 6) / 0.765));
      const offsets = Core.formationOffsets(units.length, spacing);
      units.forEach((unit, index) => {
        this.setUnitCommand(unit, {
          type: 'patrol',
          aX: unit.x,
          aY: unit.y,
          bX: Core.clamp(x + offsets[index].x, Data.MAP.edgePadding, Data.MAP.width - Data.MAP.edgePadding),
          bY: Core.clamp(y + offsets[index].y, Data.MAP.edgePadding, Data.MAP.height - Data.MAP.edgePadding),
          next: 'b',
          targetId: null,
        });
      });
      this.effects.push({
        type: 'command', command: 'move', x, y, age: 0, duration: 0.8,
        team: 'player', sources: units.slice(0, 12).map((unit) => ({ x: unit.x, y: unit.y })),
      });
      this.playTone('move');
      return true;
    }

    holdSelected() {
      const units = this.getSelected().filter((entity) => entity.kind === 'unit');
      if (units.length === 0) return false;
      units.forEach((unit) => {
        this.setUnitCommand(unit, {
          type: 'hold', x: unit.x, y: unit.y, targetId: null,
        });
      });
      this.commandMode = null;
      this.logKey('game.holdSet', null, 'info');
      this.playTone('stop');
      return true;
    }

    isProductionBuilding(entity) {
      if (!entity || entity.kind !== 'building' || !entity.complete || entity.hp <= 0) return false;
      const definition = Data.BUILDING_TYPES[entity.type];
      return Boolean(definition && definition.production.some((type) => Data.UNIT_TYPES[type]));
    }

    getSelectedProductionBuildings() {
      const selected = this.getSelected();
      if (selected.length === 0 || !selected.every((entity) => this.isProductionBuilding(entity))) return [];
      return selected;
    }

    setRallyPoint(buildings, point) {
      const producers = (buildings || []).filter((entity) => this.isProductionBuilding(entity));
      if (!point || producers.length === 0) return false;
      const rallyPoint = {
        x: Core.clamp(point.x, Data.MAP.edgePadding, Data.MAP.width - Data.MAP.edgePadding),
        y: Core.clamp(point.y, Data.MAP.edgePadding, Data.MAP.height - Data.MAP.edgePadding),
      };
      producers.forEach((building) => { building.rallyPoint = { ...rallyPoint }; });
      this.commandMode = null;
      if (producers.some((building) => building.team === 'player')) {
        this.logKey('game.rallySet', null, 'info');
        this.playTone('move');
      }
      return true;
    }

    clearSelectedRallyPoints() {
      const producers = this.getSelectedProductionBuildings();
      if (producers.length === 0) return false;
      producers.forEach((building) => { building.rallyPoint = null; });
      this.commandMode = null;
      this.logKey('game.rallyCleared', null, 'info');
      this.playTone('stop');
      return true;
    }

    stopSelected() {
      if (this.clearSelectedRallyPoints()) return true;
      let stopped = false;
      this.getSelected().forEach((entity) => {
        if (entity.kind === 'unit') {
          this.setUnitCommand(entity, null);
          stopped = true;
        }
      });
      this.commandMode = null;
      if (stopped) this.playTone('stop');
      return stopped;
    }

    setCommandMode(mode) {
      if (this.state !== 'running') return;
      if (mode === 'stop') {
        this.stopSelected();
        return;
      }
      if (mode === 'hold') {
        this.holdSelected();
        return;
      }
      if (mode === 'rally') {
        if (this.getSelectedProductionBuildings().length === 0) {
          this.logKey('game.selectUnits', null, 'warning');
          return;
        }
        this.placementType = null;
        this.commandMode = mode;
        this.logKey('game.rallyPrompt', null, 'info');
        return;
      }
      const hasUnits = this.getSelected().some((entity) => entity.kind === 'unit');
      if (!hasUnits) {
        this.logKey('game.selectUnits', null, 'warning');
        return;
      }
      this.placementType = null;
      this.commandMode = mode;
      const promptKey = mode === 'attackMove' ? 'game.attackMovePrompt'
        : mode === 'patrol' ? 'game.patrolPrompt' : 'game.movePrompt';
      this.logKey(promptKey, null, 'info');
    }

    contextualCommand(world, options) {
      if (this.state !== 'running') return;
      if (this.placementType) {
        this.placementType = null;
        this.logKey('game.deploymentCancelled', null, 'info');
        return;
      }
      const producers = this.getSelectedProductionBuildings();
      if (producers.length > 0) {
        this.setRallyPoint(producers, world);
        return;
      }
      const enemy = this.pickEntity(world, (entity) => entity.team === 'enemy');
      if (!this.issueAttack(enemy, options)) this.issueMove(world.x, world.y, false, options);
    }

    executeCommandMode(world, options) {
      const mode = this.commandMode;
      this.commandMode = null;
      if (mode === 'attackMove') this.issueMove(world.x, world.y, true, options);
      else if (mode === 'patrol') this.issuePatrol(world.x, world.y);
      else if (mode === 'rally') this.setRallyPoint(this.getSelectedProductionBuildings(), world);
      else this.issueMove(world.x, world.y, false, options);
    }

    pickEntity(world, predicate) {
      const candidates = this.entities.filter((entity) => entity.hp > 0
        && Core.distance(entity, world) <= entity.radius + 8
        && (!predicate || predicate(entity)));
      candidates.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'unit' ? -1 : 1;
        return Core.distanceSquared(a, world) - Core.distanceSquared(b, world);
      });
      return candidates[0] || null;
    }

    selectAt(world, additive) {
      const entity = this.pickEntity(world, (candidate) => candidate.team === 'player');
      if (!entity) {
        if (!additive) this.selectedIds.clear();
        return;
      }
      const selected = this.getSelected();
      if (!additive || selected.some((current) => current.kind !== entity.kind)) this.selectedIds.clear();
      if (additive && this.selectedIds.has(entity.id)) this.selectedIds.delete(entity.id);
      else this.selectedIds.add(entity.id);
    }

    selectRect(rect, additive) {
      const units = Core.selectInRect(this.entities, rect, 'player');
      if (!additive || this.getSelected().some((entity) => entity.kind !== 'unit')) this.selectedIds.clear();
      units.forEach((unit) => this.selectedIds.add(unit.id));
    }

    selectSameTypeAt(world) {
      const picked = this.pickEntity(world, (entity) => entity.team === 'player');
      if (!picked) return false;
      const view = this.renderer.getViewport();
      const right = this.camera.x + view.width;
      const bottom = this.camera.y + view.height;
      const matches = this.entities.filter((entity) => entity.hp > 0 && entity.team === 'player'
        && entity.kind === picked.kind && entity.type === picked.type
        && entity.x >= this.camera.x && entity.x <= right
        && entity.y >= this.camera.y && entity.y <= bottom);
      this.selectedIds = new Set(matches.map((entity) => entity.id));
      return matches.length > 0;
    }

    getControlGroup(slot) {
      const key = String(slot);
      const ids = this.controlGroups.get(key) || [];
      const entities = ids.map((id) => this.getEntity(id)).filter(Boolean);
      if (entities.length !== ids.length) {
        if (entities.length) this.controlGroups.set(key, entities.map((entity) => entity.id));
        else this.controlGroups.delete(key);
      }
      return entities;
    }

    assignControlGroup(slot) {
      const key = String(slot);
      if (!/^[1-9]$/.test(key)) return false;
      const selected = this.getSelected();
      if (selected.length === 0) {
        this.controlGroups.delete(key);
        this.logKey('game.group.cleared', { slot: key }, 'info');
        return true;
      }
      const kind = selected[0].kind;
      const ids = selected.filter((entity) => entity.kind === kind).map((entity) => entity.id);
      this.controlGroups.set(key, ids);
      this.logKey('game.group.assigned', { slot: key, count: ids.length }, 'info');
      this.playTone('queue');
      return true;
    }

    recallControlGroup(slot, options) {
      const key = String(slot);
      if (!/^[1-9]$/.test(key)) return false;
      const entities = this.getControlGroup(key);
      if (entities.length === 0) return false;
      this.selectedIds = new Set(entities.map((entity) => entity.id));
      this.commandMode = null;
      this.placementType = null;
      if (options && options.center) this.centerSelection(entities);
      this.logKey('game.group.recalled', { slot: key, count: entities.length }, 'info');
      return true;
    }

    centerSelection(entities) {
      const selected = entities || this.getSelected();
      if (!selected.length) return false;
      const center = selected.reduce((sum, entity) => ({
        x: sum.x + entity.x,
        y: sum.y + entity.y,
      }), { x: 0, y: 0 });
      this.centerCameraOn(center.x / selected.length, center.y / selected.length);
      return true;
    }

    getSelected() {
      return [...this.selectedIds].map((id) => this.getEntity(id)).filter(Boolean);
    }

    getEntity(id) {
      return this.entities.find((entity) => entity.id === id && entity.hp > 0) || null;
    }

    findBuilding(team, type) {
      return this.entities.find((entity) => entity.kind === 'building' && entity.team === team
        && entity.type === type && entity.hp > 0) || null;
    }

    countType(team, kind, type, completedOnly) {
      return this.entities.filter((entity) => entity.team === team && entity.kind === kind
        && entity.type === type && entity.hp > 0 && (!completedOnly || entity.complete)).length;
    }

    checkVictory() {
      if (this.state !== 'running') return;
      const playerHq = this.findBuilding('player', 'hq');
      const enemyHq = this.findBuilding('enemy', 'hq');
      if (!playerHq && !enemyHq) this.finishKey('lost', 'game.result.mutualLoss');
      else if (!enemyHq) this.finishKey('won', 'game.result.victory');
      else if (!playerHq) this.finishKey('lost', 'game.result.defeat');
    }

    finishKey(result, messageKey, messageParams) {
      this.finish(result, this.t(messageKey, messageParams), messageKey, messageParams || null);
    }

    finish(result, message, messageKey, messageParams) {
      if (this.state !== 'running') return;
      this.state = result;
      this.result = { result, message, messageKey: messageKey || null, messageParams: messageParams || null, time: this.time };
      this.commandMode = null;
      this.placementType = null;
      this.playTone(result === 'won' ? 'victory' : 'defeat');
      if (this.ui) this.ui.onStateChange(this);
    }

    togglePause(force) {
      if (this.state !== 'running' && this.state !== 'paused') return;
      const shouldPause = typeof force === 'boolean' ? force : this.state === 'running';
      this.state = shouldPause ? 'paused' : 'running';
      this.lastFrame = performance.now();
      this.accumulator = 0;
      if (this.ui) this.ui.onStateChange(this);
    }

    log(message, tone) {
      this.logs.unshift({ id: `${Date.now()}-${this.rng()}`, message, tone: tone || 'info', time: this.time });
      this.logs = this.logs.slice(0, 5);
      if (this.ui) this.ui.update(this, true);
    }

    logKey(key, params, tone) {
      this.logs.unshift({
        id: `${Date.now()}-${this.rng()}`,
        key,
        params: params || null,
        message: null,
        tone: tone || 'info',
        time: this.time,
      });
      this.logs = this.logs.slice(0, 5);
      if (this.ui) this.ui.update(this, true);
    }

    isEditableInput(target) {
      if (!target) return false;
      const tagName = String(target.tagName || '').toUpperCase();
      return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
        || Boolean(target.isContentEditable);
    }

    handleKeyDown(event) {
      const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
      if (this.isEditableInput(event.target) || this.isEditableInput(activeElement)) return false;
      const code = event.code || '';
      const prevent = () => {
        if (typeof event.preventDefault === 'function') event.preventDefault();
      };
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) prevent();
      if (/^Arrow/.test(code)) this.keys.add(code);
      if (event.repeat) return true;

      const digitMatch = /^(?:Digit|Numpad)([1-9])$/.exec(code);
      if (digitMatch) {
        const slot = digitMatch[1];
        prevent();
        if (event.ctrlKey || event.metaKey) {
          this.assignControlGroup(slot);
          this.lastControlGroupRecall = { slot: null, at: -Infinity };
        } else {
          const now = Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now();
          const center = this.lastControlGroupRecall.slot === slot
            && now - this.lastControlGroupRecall.at <= Data.BALANCE.controlGroupDoubleTapMs;
          if (this.recallControlGroup(slot, { center })) {
            this.lastControlGroupRecall = { slot, at: now };
          }
        }
        return true;
      }

      if (event.ctrlKey || event.metaKey) return false;
      if (code === 'Escape') {
        if (this.placementType || this.commandMode) {
          this.placementType = null;
          this.commandMode = null;
        } else if (this.state === 'running' || this.state === 'paused') this.togglePause();
        return true;
      }
      if (code === 'KeyB') this.centerCameraOnBase();
      else if (code === 'Space') this.centerSelection();
      else if (this.state !== 'running') return false;
      else if (code === 'KeyM') this.setCommandMode('move');
      else if (code === 'KeyA') this.setCommandMode('attackMove');
      else if (code === 'KeyS') this.stopSelected();
      else if (code === 'KeyP') this.setCommandMode('patrol');
      else if (code === 'KeyH') this.holdSelected();
      else if (code === 'KeyR') this.setCommandMode('rally');
      return true;
    }

    bindInput() {
      this.canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        this.updateMouseFromEvent(event);
        this.contextualCommand(
          { x: this.mouse.worldX, y: this.mouse.worldY },
          { append: event.shiftKey },
        );
      });
      this.canvas.addEventListener('pointerdown', (event) => {
        if (this.state !== 'running') return;
        if (event.isPrimary === false) return;
        if (event.pointerType === 'touch') event.preventDefault();
        this.ensureAudio();
        this.updateMouseFromEvent(event);
        this.mouse.inside = true;
        const world = { x: this.mouse.worldX, y: this.mouse.worldY };
        if (event.button !== 0) return;
        if (event.ctrlKey) return;
        if (this.placementType) {
          this.placeBuilding(this.placementType, world.x, world.y, 'player', false);
          return;
        }
        if (this.commandMode) {
          this.executeCommandMode(world, { append: event.shiftKey });
          return;
        }
        this.activePointerId = event.pointerId;
        if (typeof this.canvas.setPointerCapture === 'function') {
          try { this.canvas.setPointerCapture(event.pointerId); } catch (error) { /* Capture is optional. */ }
        }
        this.drag = {
          startScreenX: this.mouse.screenX,
          startScreenY: this.mouse.screenY,
          startWorldX: world.x,
          startWorldY: world.y,
          currentWorldX: world.x,
          currentWorldY: world.y,
          additive: event.shiftKey,
          pointerType: event.pointerType || 'mouse',
        };
      });
      window.addEventListener('pointermove', (event) => {
        if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;
        if (event.pointerType === 'touch' && this.drag) event.preventDefault();
        this.updateMouseFromEvent(event);
        if (this.state === 'running' && this.mouse.inside && event.pointerType !== 'touch') {
          this.mouse.edgePanArmed = true;
        }
        if (this.drag) {
          this.drag.currentWorldX = this.mouse.worldX;
          this.drag.currentWorldY = this.mouse.worldY;
        }
      });
      window.addEventListener('pointerup', (event) => {
        if (event.button !== 0 || !this.drag || (this.activePointerId !== null && event.pointerId !== this.activePointerId)) return;
        if (event.pointerType === 'touch') event.preventDefault();
        this.updateMouseFromEvent(event);
        const drag = this.drag;
        this.drag = null;
        this.activePointerId = null;
        if (typeof this.canvas.releasePointerCapture === 'function') {
          try { this.canvas.releasePointerCapture(event.pointerId); } catch (error) { /* Capture may already be released. */ }
        }
        const moved = Math.hypot(this.mouse.screenX - drag.startScreenX, this.mouse.screenY - drag.startScreenY);
        if (moved > 7) {
          this.selectRect(Core.normalizeRect(
            { x: drag.startWorldX, y: drag.startWorldY },
            { x: this.mouse.worldX, y: this.mouse.worldY },
          ), drag.additive);
        } else if (drag.pointerType === 'touch') {
          const now = performance.now();
          const repeated = now - this.lastTouchTap.at < 350
            && Math.hypot(this.mouse.screenX - this.lastTouchTap.x, this.mouse.screenY - this.lastTouchTap.y) < 24;
          if (repeated) {
            this.selectSameTypeAt({ x: this.mouse.worldX, y: this.mouse.worldY });
            this.lastTouchTap.at = -Infinity;
          } else {
            this.selectAt({ x: this.mouse.worldX, y: this.mouse.worldY }, drag.additive);
            this.lastTouchTap = { at: now, x: this.mouse.screenX, y: this.mouse.screenY };
          }
        } else {
          this.selectAt({ x: this.mouse.worldX, y: this.mouse.worldY }, drag.additive);
        }
      });
      window.addEventListener('pointercancel', (event) => {
        if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;
        this.drag = null;
        this.activePointerId = null;
        this.mouse.edgePanArmed = false;
      });
      this.canvas.addEventListener('dblclick', (event) => {
        if (this.state !== 'running' || this.placementType || this.commandMode) return;
        this.updateMouseFromEvent(event);
        this.selectSameTypeAt({ x: this.mouse.worldX, y: this.mouse.worldY });
      });
      this.canvas.addEventListener('pointerenter', () => { this.mouse.inside = true; });
      this.canvas.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'touch' && this.drag) return;
        this.mouse.inside = false;
        this.mouse.edgePanArmed = false;
      });
      this.minimap.addEventListener('click', (event) => {
        if (this.state !== 'running') return;
        const rect = this.minimap.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * Data.MAP.width;
        const y = ((event.clientY - rect.top) / rect.height) * Data.MAP.height;
        this.centerCameraOn(x, y);
      });
      window.addEventListener('keydown', (event) => this.handleKeyDown(event));
      window.addEventListener('keyup', (event) => this.keys.delete(event.code));
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.drag = null;
        this.activePointerId = null;
      });
      if (typeof document.addEventListener === 'function') {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden && this.state === 'running') this.togglePause(true);
        });
      }
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.viewportElement);
      }
      window.addEventListener('resize', () => this.resize(), { passive: true });
    }

    updateMouseFromEvent(event) {
      const rect = this.canvas.getBoundingClientRect();
      const view = this.renderer.getViewport();
      this.mouse.screenX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * view.width;
      this.mouse.screenY = ((event.clientY - rect.top) / Math.max(1, rect.height)) * view.height;
      this.refreshMouseWorld();
    }

    refreshMouseWorld() {
      this.mouse.worldX = this.camera.x + this.mouse.screenX;
      this.mouse.worldY = this.camera.y + this.mouse.screenY;
    }

    resize() {
      this.renderer.resize();
      this.clampCamera();
      this.refreshMouseWorld();
    }

    centerCameraOn(x, y) {
      const view = this.renderer.getViewport();
      this.camera.x = x - view.width / 2;
      this.camera.y = y - view.height / 2;
      this.clampCamera();
      this.refreshMouseWorld();
    }

    centerCameraOnBase() {
      const hq = this.findBuilding('player', 'hq');
      if (hq) this.centerCameraOn(hq.x, hq.y);
      else this.centerCameraOn(420, 760);
    }

    scheduleBaseRecenter() {
      const schedule = typeof root.requestAnimationFrame === 'function'
        ? root.requestAnimationFrame.bind(root) : (callback) => root.setTimeout(callback, 0);
      schedule(() => {
        if (this.state !== 'running') return;
        this.resize();
        this.centerCameraOnBase();
        this.renderer.render(this);
      });
    }

    clampCamera() {
      const view = this.renderer.getViewport();
      this.camera.x = Core.clamp(this.camera.x, 0, Math.max(0, Data.MAP.width - view.width));
      this.camera.y = Core.clamp(this.camera.y, 0, Math.max(0, Data.MAP.height - view.height));
    }

    lerpAngle(from, to, amount) {
      let difference = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (difference < -Math.PI) difference += Math.PI * 2;
      return from + difference * amount;
    }

    ensureAudio() {
      if (!this.audioEnabled || this.audioContext) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.audioContext = new AudioContextClass();
    }

    toggleAudio() {
      this.audioEnabled = !this.audioEnabled;
      if (this.audioEnabled) {
        this.ensureAudio();
        this.playTone('queue');
      }
      return this.audioEnabled;
    }

    playTone(type) {
      if (!this.audioEnabled) return;
      this.ensureAudio();
      if (!this.audioContext) return;
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const presets = {
        start: [110, 220, 0.2], move: [420, 520, 0.06], attack: [170, 95, 0.1],
        stop: [280, 190, 0.06], queue: [360, 450, 0.08], place: [120, 155, 0.12],
        complete: [440, 660, 0.18], cannon: [75, 48, 0.1], alert: [190, 140, 0.18],
        victory: [330, 660, 0.45], defeat: [150, 72, 0.45],
      };
      const [from, to, duration] = presets[type] || presets.queue;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type === 'cannon' ? 'sawtooth' : 'square';
      oscillator.frequency.setValueAtTime(from, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(type === 'cannon' ? 0.07 : 0.025, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    }

    diagnostics() {
      const renderer = typeof this.renderer.getDiagnostics === 'function'
        ? this.renderer.getDiagnostics() : { viewport: this.renderer.getViewport(), draw: {}, lastError: null };
      const cssRect = this.viewportElement && typeof this.viewportElement.getBoundingClientRect === 'function'
        ? this.viewportElement.getBoundingClientRect() : null;
      const visibleIds = new Set((renderer.draw && renderer.draw.visibleIds) || []);
      const visibleEntities = this.entities.filter((entity) => visibleIds.has(entity.id));
      return {
        state: this.state,
        locale: this.i18n && typeof this.i18n.getLocale === 'function' ? this.i18n.getLocale() : 'zh-CN',
        camera: { x: this.camera.x, y: this.camera.y },
        viewport: {
          ...renderer.viewport,
          pixelWidth: this.canvas.width,
          pixelHeight: this.canvas.height,
          cssRect: cssRect ? {
            x: cssRect.x,
            y: cssRect.y,
            width: cssRect.width,
            height: cssRect.height,
          } : null,
        },
        visible: {
          total: visibleEntities.length,
          buildings: visibleEntities.filter((entity) => entity.kind === 'building').length,
          units: visibleEntities.filter((entity) => entity.kind === 'unit').length,
          ids: visibleEntities.map((entity) => entity.id),
        },
        navigation: {
          revision: this.navigationRevision,
          pathingUnits: this.entities.filter((entity) => entity.kind === 'unit'
            && entity.hp > 0 && Array.isArray(entity.navigationPath)
            && entity.navigationIndex < entity.navigationPath.length).length,
          recoveringUnits: this.entities.filter((entity) => entity.kind === 'unit'
            && entity.hp > 0 && entity.navigationEscapeTime > 0).length,
          queuedWaypoints: this.entities.reduce((sum, entity) => (
            entity.kind === 'unit' && Array.isArray(entity.navigationPath)
              ? sum + Math.max(0, entity.navigationPath.length - entity.navigationIndex) : sum
          ), 0),
        },
        minerals: {
          nodes: this.minerals.length,
          remaining: this.minerals.reduce((sum, mine) => sum + Math.max(0, mine.amount), 0),
          capacity: this.minerals.reduce((sum, mine) => sum + mine.maxAmount, 0),
        },
        draw: renderer.draw,
        performance: renderer.performance || { renderMsP95: 0 },
        assets: this.assets && typeof this.assets.status === 'function'
          ? this.assets.status() : { state: 'unavailable', total: 0, loaded: [], pending: [], failed: [] },
        lastError: renderer.lastError,
      };
    }

    probeFrame() {
      const sample = (context, canvas, rect) => {
        const x = Math.max(0, Math.floor(rect.x));
        const y = Math.max(0, Math.floor(rect.y));
        const right = Math.min(canvas.width, Math.ceil(rect.x + rect.width));
        const bottom = Math.min(canvas.height, Math.ceil(rect.y + rect.height));
        if (right <= x || bottom <= y) {
          return {
            offscreen: true,
            x,
            y,
            width: 0,
            height: 0,
            uniqueColors: 0,
            friendlyPixels: 0,
            hostilePixels: 0,
            brightPixels: 0,
          };
        }
        const width = right - x;
        const height = bottom - y;
        const data = context.getImageData(x, y, width, height).data;
        const colors = new Set();
        let friendlyPixels = 0;
        let hostilePixels = 0;
        let brightPixels = 0;
        const stride = data.length > 4_000_000 ? 16 : 4;
        for (let index = 0; index < data.length; index += stride) {
          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
          if (Math.abs(red - 69) < 58 && Math.abs(green - 214) < 58 && Math.abs(blue - 232) < 58) friendlyPixels += 1;
          if (Math.abs(red - 223) < 58 && Math.abs(green - 96) < 58 && Math.abs(blue - 74) < 58) hostilePixels += 1;
          if (red + green + blue > 480) brightPixels += 1;
        }
        return {
          offscreen: false,
          x,
          y,
          width,
          height,
          uniqueColors: colors.size,
          friendlyPixels,
          hostilePixels,
          brightPixels,
        };
      };

      try {
        const view = this.renderer.getViewport();
        const hq = this.findBuilding('player', 'hq');
        const centerX = ((hq ? hq.x : 420) - this.camera.x) * view.dpr;
        const centerY = ((hq ? hq.y : 760) - this.camera.y) * view.dpr;
        const radius = 105 * view.dpr;
        const minimapView = this.renderer.minimapViewport || { dpr: 1, width: this.minimap.width, height: this.minimap.height };
        return {
          main: sample(this.renderer.ctx, this.canvas, {
            x: centerX - radius,
            y: centerY - radius,
            width: radius * 2,
            height: radius * 2,
          }),
          minimap: sample(this.renderer.minimapCtx, this.minimap, {
            x: 0,
            y: 0,
            width: this.minimap.width || minimapView.width,
            height: this.minimap.height || minimapView.height,
          }),
          unavailableReason: null,
        };
      } catch (error) {
        return {
          main: null,
          minimap: null,
          unavailableReason: error && error.message ? error.message : String(error),
        };
      }
    }

    snapshot() {
      return {
        state: this.state,
        time: Number(this.time.toFixed(2)),
        difficulty: this.difficultyKey,
        resources: { ...this.resources },
        power: JSON.parse(JSON.stringify(this.power)),
        population: JSON.parse(JSON.stringify(this.population)),
        wave: this.wave,
        entityCount: this.entities.length,
        unitCount: this.entities.filter((e) => e.kind === 'unit').length,
        buildingCount: this.entities.filter((e) => e.kind === 'building').length,
        selectedIds: [...this.selectedIds],
        playerHqHp: this.findBuilding('player', 'hq')?.hp || 0,
        enemyHqHp: this.findBuilding('enemy', 'hq')?.hp || 0,
      };
    }
  }

  root.IronGame = IronGame;
})(window);
