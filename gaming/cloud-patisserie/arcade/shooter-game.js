(function attachCloudShooter(root, factory) {
  const api = factory(root);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.CloudShooterGame = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCloudShooterApi(root) {
  "use strict";

  const DEFAULT_WIDTH = 360;
  const DEFAULT_HEIGHT = 640;
  const WAVE_DURATION_MS = 8_000;
  const BOSS_WAVE_INTERVAL = 5;
  const PLAYER_SPEED = 260;
  const PLAYER_FIRE_INTERVAL_MS = 135;
  const PLAYER_INVULNERABLE_MS = 1_200;
  const GRAZE_SCORE = 30;
  const MISSILE_SPEED = 390;
  const MISSILE_DAMAGE = 5;
  const MISSILE_CD_MS = 380;
  const MISSILE_REGEN_MS = 5_000;
  const MISSILE_MAX = 3;
  const SHIELD_DURATION_MS = 2_600;
  const SHIELD_CD_MS = 9_000;
  const PICKUP_DROP_RATE = 0.32;
  const PICKUP_SPEED = 96;
  const UPGRADE_TOKENS_REQUIRED = 2;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function nextRandom(state) {
    state.seed = (Math.imul(state.seed, 1_664_525) + 1_013_904_223) >>> 0;
    return state.seed / 4_294_967_296;
  }

  function createSession(options) {
    const settings = options || {};
    const width = Number.isFinite(settings.width) && settings.width >= 240
      ? settings.width
      : DEFAULT_WIDTH;
    const height = Number.isFinite(settings.height) && settings.height >= 360
      ? settings.height
      : DEFAULT_HEIGHT;
    const seed = Number.isInteger(settings.seed) ? settings.seed >>> 0 : 0xC10D5EED;

    return {
      status: "running",
      finishedReason: null,
      width,
      height,
      elapsedMs: 0,
      seed,
      nextId: 1,
      wave: 1,
      lastBossWave: 0,
      spawnCooldownMs: 420,
      score: 0,
      reward: 0,
      kills: 0,
      grazes: 0,
      player: {
        x: width / 2,
        y: height - 72,
        radius: 8,
        hitRadius: 4,
        grazeRadius: 25,
        lives: 3,
        invulnerableMs: 0,
        fireCooldownMs: 0,
        fireIntervalMs: PLAYER_FIRE_INTERVAL_MS,
        fireDamage: 1,
        missileMax: MISSILE_MAX,
        missiles: MISSILE_MAX,
        missileRegenMs: MISSILE_REGEN_MS,
        missileRegenCd: MISSILE_REGEN_MS,
        missileCd: 0,
        shieldDurationMs: SHIELD_DURATION_MS,
        shieldRemainingMs: 0,
        shieldCdMs: SHIELD_CD_MS,
        shieldCd: 0,
        skillRequest: null,
        level: 1,
      },
      enemies: [],
      playerBullets: [],
      playerMissiles: [],
      enemyBullets: [],
      pickups: [],
      upgradeTokens: 0,
      upgradeReady: false,
      upgradePick: null,
    };
  }

  function cloneSession(state) {
    return {
      ...state,
      player: { ...state.player },
      enemies: state.enemies.map((enemy) => ({ ...enemy })),
      playerBullets: state.playerBullets.map((bullet) => ({ ...bullet })),
      playerMissiles: state.playerMissiles.map((missile) => ({ ...missile })),
      enemyBullets: state.enemyBullets.map((bullet) => ({ ...bullet })),
      pickups: state.pickups.map((pickup) => ({ ...pickup })),
    };
  }

  function normalizeInput(input) {
    const controls = input || {};
    let horizontal = Number.isFinite(controls.x)
      ? clamp(controls.x, -1, 1)
      : (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    let vertical = Number.isFinite(controls.y)
      ? clamp(controls.y, -1, 1)
      : (controls.down ? 1 : 0) - (controls.up ? 1 : 0);
    const length = Math.hypot(horizontal, vertical);

    if (length > 1) {
      horizontal /= length;
      vertical /= length;
    }

    return { x: horizontal, y: vertical };
  }

  function waveForTime(elapsedMs) {
    return 1 + Math.floor(elapsedMs / WAVE_DURATION_MS);
  }

  function difficultyForWave(wave) {
    return Math.min(8, 1 + Math.floor(Math.max(0, wave - 1) / 2));
  }

  function addPlayerBullet(state) {
    state.playerBullets.push({
      id: state.nextId++,
      x: state.player.x,
      y: state.player.y - 14,
      vx: 0,
      vy: -560,
      radius: 3,
      damage: state.player.fireDamage,
    });
  }

  function addAimedEnemyBullet(state, enemy, angleOffset, speedMultiplier) {
    const baseAngle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    const speed = (88 + difficultyForWave(state.wave) * 6) * (speedMultiplier || 1);
    const angle = baseAngle + angleOffset;
    state.enemyBullets.push({
      id: state.nextId++,
      x: enemy.x,
      y: enemy.y + enemy.radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: enemy.type === "boss" ? 4 : 3,
      grazed: false,
    });
  }

  function fireEnemy(state, enemy) {
    if (enemy.type === "boss") {
      for (let index = -3; index <= 3; index += 1) {
        addAimedEnemyBullet(state, enemy, index * 0.2, 1.04);
      }
      return;
    }

    addAimedEnemyBullet(state, enemy, 0, 1);
    if (state.wave >= 4) {
      addAimedEnemyBullet(state, enemy, -0.18, 0.9);
      addAimedEnemyBullet(state, enemy, 0.18, 0.9);
    }
  }

  function spawnEnemy(state) {
    const margin = 28;
    const x = margin + nextRandom(state) * (state.width - margin * 2);
    const difficulty = difficultyForWave(state.wave);
    const sturdy = state.wave >= 5 && nextRandom(state) > 0.76;
    const hp = sturdy ? Math.min(7, 3 + Math.floor((difficulty - 4) / 2)) : Math.min(5, 1 + Math.floor((difficulty - 1) / 2));
    state.enemies.push({
      id: state.nextId++,
      type: sturdy ? "carrier" : "scout",
      x,
      y: -24,
      vx: (nextRandom(state) - 0.5) * (22 + difficulty * 4),
      vy: 42 + difficulty * 7,
      radius: sturdy ? 18 : 13,
      hp,
      maxHp: hp,
      fireCooldownMs: 600 + nextRandom(state) * 900,
      points: sturdy ? 720 : 260 + state.wave * 70,
    });
  }

  function spawnBoss(state) {
    state.lastBossWave = state.wave;
    const bossCycle = Math.floor(state.wave / BOSS_WAVE_INTERVAL);
    const hp = Math.min(92, 40 + bossCycle * 7);
    state.enemies.push({
      id: state.nextId++,
      type: "boss",
      x: state.width / 2,
      y: 82,
      vx: 58,
      vy: 0,
      radius: 34,
      hp,
      maxHp: hp,
      fireCooldownMs: 280,
      points: 4_000 + bossCycle * 1_000,
    });
  }

  function nearestEnemy(state, x, y) {
    let closest = null;
    let best = Infinity;
    for (const enemy of state.enemies) {
      const d = distanceSquared({ x, y }, enemy);
      if (d < best) {
        best = d;
        closest = enemy;
      }
    }
    return closest;
  }

  function fireMissile(state) {
    const player = state.player;
    if (player.missiles <= 0 || player.missileCd > 0) return false;
    state.playerMissiles.push({
      id: state.nextId++,
      x: player.x,
      y: player.y - 12,
      vx: 0,
      vy: -MISSILE_SPEED,
      targetId: nearestEnemy(state, player.x, player.y)?.id || null,
      radius: 5,
      damage: MISSILE_DAMAGE,
    });
    player.missiles -= 1;
    player.missileCd = MISSILE_CD_MS;
    return true;
  }

  function activateShield(state) {
    const player = state.player;
    if (player.shieldCd > 0) return false;
    player.shieldRemainingMs = player.shieldDurationMs;
    player.shieldCd = player.shieldCdMs;
    return true;
  }

  function applyUpgrade(state, choice) {
    const player = state.player;
    if (choice === 0) {
      // 弹匣扩充
      player.missileMax += 2;
      player.missiles = Math.min(player.missileMax, player.missiles + 2);
      player.missileRegenMs = Math.max(2_600, player.missileRegenMs - 260);
    } else if (choice === 1) {
      // 基础弹药强化
      player.fireIntervalMs = Math.max(84, player.fireIntervalMs - 16);
      player.fireDamage += 0.5;
    } else {
      // 导弹补给 + 护罩充满
      player.missiles = Math.min(player.missileMax, player.missiles + 3);
      player.shieldCd = 0;
      player.shieldRemainingMs = Math.max(player.shieldRemainingMs, player.shieldDurationMs * 0.5);
    }
    player.level += 1;
    state.upgradeTokens -= UPGRADE_TOKENS_REQUIRED;
    state.upgradeReady = false;
    state.upgradePick = null;
    return state;
  }

  function collectPickup(state, pickup) {
    state.upgradeTokens += 1;
    if (state.upgradeTokens >= UPGRADE_TOKENS_REQUIRED) {
      state.upgradeReady = true;
    }
  }

  function spawnPickup(state, enemy) {
    state.pickups.push({
      id: state.nextId++,
      x: enemy.x,
      y: enemy.y,
      vy: PICKUP_SPEED,
      radius: 9,
    });
  }

  function getReward(score) {
    const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
    return Math.floor(safeScore / 20);
  }

  function finishSession(state, reason) {
    if (state.status === "finished") {
      return state;
    }

    state.status = "finished";
    state.finishedReason = reason;
    state.reward = getReward(state.score);
    return state;
  }

  function applyPlayerHit(state) {
    if (state.player.invulnerableMs > 0 || state.status === "finished") {
      return false;
    }
    if (state.player.shieldRemainingMs > 0) {
      return false;
    }

    state.player.lives -= 1;
    state.player.invulnerableMs = PLAYER_INVULNERABLE_MS;
    if (state.player.lives <= 0) {
      finishSession(state, "lives");
    }
    return true;
  }

  function stepSession(previousState, input, dtMs) {
    if (!previousState || !previousState.player || !Array.isArray(previousState.enemies)) {
      throw new Error("CloudShooterGame: invalid session state");
    }
    if (!Number.isFinite(dtMs) || dtMs < 0) {
      throw new Error("CloudShooterGame: dtMs must be a non-negative number");
    }

    const state = cloneSession(previousState);
    if (state.status !== "running" || dtMs === 0) {
      return state;
    }

    const frameMs = dtMs;
    const dt = frameMs / 1_000;
    const movement = normalizeInput(input);

    const skillRequest = state.player.skillRequest;
    state.player.skillRequest = null;

    // 升级选择暂停：等待玩家按键/点卡片，不推进世界。
    if (state.upgradeReady) {
      if (state.upgradePick !== null && state.upgradePick >= 0 && state.upgradePick <= 2) {
        applyUpgrade(state, state.upgradePick);
      } else {
        return state;
      }
    }

    if (skillRequest === "missile") fireMissile(state);
    if (skillRequest === "shield") activateShield(state);

    state.elapsedMs += frameMs;
    state.wave = waveForTime(state.elapsedMs);
    state.player.invulnerableMs = Math.max(0, state.player.invulnerableMs - frameMs);
    state.player.shieldRemainingMs = Math.max(0, state.player.shieldRemainingMs - frameMs);
    state.player.shieldCd = Math.max(0, state.player.shieldCd - frameMs);
    state.player.missileCd = Math.max(0, state.player.missileCd - frameMs);
    state.player.missileRegenCd -= frameMs;
    while (state.player.missileRegenCd <= 0 && state.player.missiles < state.player.missileMax) {
      state.player.missiles += 1;
      state.player.missileRegenCd += state.player.missileRegenMs;
    }
    state.player.x = clamp(
      state.player.x + movement.x * PLAYER_SPEED * dt,
      state.player.radius,
      state.width - state.player.radius,
    );
    state.player.y = clamp(
      state.player.y + movement.y * PLAYER_SPEED * dt,
      state.player.radius + 34,
      state.height - state.player.radius,
    );

    state.player.fireCooldownMs -= frameMs;
    while (state.player.fireCooldownMs <= 0) {
      addPlayerBullet(state);
      state.player.fireCooldownMs += state.player.fireIntervalMs;
    }

    for (const bullet of state.playerBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    }
    for (const missile of state.playerMissiles) {
      const target = missile.targetId
        ? state.enemies.find((enemy) => enemy.id === missile.targetId)
        : null;
      const aim = target || nearestEnemy(state, missile.x, missile.y);
      if (aim) {
        const angle = Math.atan2(aim.y - missile.y, aim.x - missile.x);
        missile.vx = Math.cos(angle) * MISSILE_SPEED;
        missile.vy = Math.sin(angle) * MISSILE_SPEED;
      } else {
        missile.vx = 0;
        missile.vy = -MISSILE_SPEED;
      }
      missile.x += missile.vx * dt;
      missile.y += missile.vy * dt;
    }
    for (const bullet of state.enemyBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    }
    for (const pickup of state.pickups) {
      pickup.y += pickup.vy * dt;
    }

    for (const enemy of state.enemies) {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      if (enemy.x < enemy.radius || enemy.x > state.width - enemy.radius) {
        enemy.x = clamp(enemy.x, enemy.radius, state.width - enemy.radius);
        enemy.vx *= -1;
      }

      enemy.fireCooldownMs -= frameMs;
      while (enemy.fireCooldownMs <= 0) {
        fireEnemy(state, enemy);
        enemy.fireCooldownMs += enemy.type === "boss"
          ? 760
          : Math.max(1_000, 1_650 - difficultyForWave(state.wave) * 85);
      }
    }

    state.spawnCooldownMs -= frameMs;
    while (state.spawnCooldownMs <= 0) {
      spawnEnemy(state);
      state.spawnCooldownMs += Math.max(640, 1_250 - difficultyForWave(state.wave) * 80);
    }
    const bossIsActive = state.enemies.some((enemy) => enemy.type === "boss");
    if (state.wave % BOSS_WAVE_INTERVAL === 0 && state.lastBossWave !== state.wave && !bossIsActive) {
      spawnBoss(state);
    }

    const spentPlayerBullets = new Set();
    const spentMissiles = new Set();
    const defeatedEnemies = new Set();
    for (const bullet of state.playerBullets) {
      for (const enemy of state.enemies) {
        if (defeatedEnemies.has(enemy.id)) {
          continue;
        }
        const collisionRadius = bullet.radius + enemy.radius;
        if (distanceSquared(bullet, enemy) > collisionRadius * collisionRadius) {
          continue;
        }
        spentPlayerBullets.add(bullet.id);
        enemy.hp -= bullet.damage || 1;
        if (enemy.hp <= 0) {
          defeatedEnemies.add(enemy.id);
          state.kills += 1;
          state.score += enemy.points || 250;
        }
        break;
      }
    }
    for (const missile of state.playerMissiles) {
      if (spentMissiles.has(missile.id)) {
        continue;
      }
      for (const enemy of state.enemies) {
        if (defeatedEnemies.has(enemy.id)) {
          continue;
        }
        const collisionRadius = missile.radius + enemy.radius;
        if (distanceSquared(missile, enemy) > collisionRadius * collisionRadius) {
          continue;
        }
        spentMissiles.add(missile.id);
        enemy.hp -= missile.damage || MISSILE_DAMAGE;
        if (enemy.hp <= 0) {
          defeatedEnemies.add(enemy.id);
          state.kills += 1;
          state.score += enemy.points || 250;
        }
        break;
      }
    }

    // 击杀掉落升级拾取物
    for (const enemyId of defeatedEnemies) {
      if (nextRandom(state) < PICKUP_DROP_RATE) {
        const enemy = state.enemies.find((item) => item.id === enemyId);
        if (enemy) spawnPickup(state, enemy);
      }
    }

    state.playerBullets = state.playerBullets.filter((bullet) => (
      !spentPlayerBullets.has(bullet.id)
      && bullet.y > -24
      && bullet.x > -24
      && bullet.x < state.width + 24
    ));
    state.playerMissiles = state.playerMissiles.filter((missile) => (
      !spentMissiles.has(missile.id)
      && missile.y > -80
      && missile.y < state.height + 80
      && missile.x > -80
      && missile.x < state.width + 80
    ));

    // 拾取升级 token
    const collectedPickups = new Set();
    for (const pickup of state.pickups) {
      const reach = state.player.radius + pickup.radius + 4;
      if (distanceSquared(pickup, state.player) <= reach * reach) {
        collectedPickups.add(pickup.id);
        collectPickup(state, pickup);
      }
    }
    state.pickups = state.pickups.filter((pickup) => (
      !collectedPickups.has(pickup.id) && pickup.y < state.height + 24
    ));

    state.enemies = state.enemies.filter((enemy) => (
      !defeatedEnemies.has(enemy.id) && enemy.y < state.height + enemy.radius * 2
    ));

    const spentEnemyBullets = new Set();
    for (const bullet of state.enemyBullets) {
      const hitRadius = state.player.hitRadius + bullet.radius;
      const grazeRadius = state.player.grazeRadius + bullet.radius;
      const playerDistance = distanceSquared(bullet, state.player);
      if (playerDistance <= hitRadius * hitRadius && applyPlayerHit(state)) {
        spentEnemyBullets.add(bullet.id);
      } else if (!bullet.grazed && playerDistance <= grazeRadius * grazeRadius) {
        bullet.grazed = true;
        state.grazes += 1;
        state.score += GRAZE_SCORE;
      }
    }

    if (state.status === "running") {
      for (const enemy of state.enemies) {
        const contactRadius = state.player.hitRadius + enemy.radius;
        if (distanceSquared(enemy, state.player) <= contactRadius * contactRadius) {
          if (applyPlayerHit(state) && enemy.type !== "boss") {
            defeatedEnemies.add(enemy.id);
          }
          break;
        }
      }
    }

    state.enemyBullets = state.enemyBullets.filter((bullet) => (
      !spentEnemyBullets.has(bullet.id)
      && bullet.y > -32
      && bullet.y < state.height + 32
      && bullet.x > -32
      && bullet.x < state.width + 32
    ));
    state.enemies = state.enemies.filter((enemy) => !defeatedEnemies.has(enemy.id));

    state.playerBullets = state.playerBullets.slice(-90);
    state.playerMissiles = state.playerMissiles.slice(-24);
    state.enemyBullets = state.enemyBullets.slice(-260);
    state.pickups = state.pickups.slice(-12);
    state.enemies = state.enemies.slice(-48);
    state.reward = getReward(state.score);

    return state;
  }

  function drawStarfield(context, state) {
    context.fillStyle = "#091126";
    context.fillRect(0, 0, state.width, state.height);
    for (let index = 0; index < 54; index += 1) {
      const x = (index * 79 + 23) % state.width;
      const y = (index * 137 + state.elapsedMs * (0.012 + (index % 3) * 0.004)) % state.height;
      context.globalAlpha = 0.25 + (index % 5) * 0.13;
      context.fillStyle = index % 7 === 0 ? "#ffd166" : "#d8f4ff";
      context.fillRect(x, y, index % 7 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1);
    }
    context.globalAlpha = 1;
  }

  function drawPlayer(context, state) {
    const player = state.player;
    if (player.shieldRemainingMs > 0) {
      context.save();
      context.translate(player.x, player.y);
      context.strokeStyle = "rgba(120, 232, 255, 0.9)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, player.radius + 12, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "rgba(120, 232, 255, 0.16)";
      context.fill();
      context.restore();
    }
    if (player.invulnerableMs > 0 && Math.floor(player.invulnerableMs / 90) % 2 === 0) {
      return;
    }

    context.save();
    context.translate(player.x, player.y);
    context.fillStyle = "#72e8ff";
    context.beginPath();
    context.moveTo(0, -17);
    context.lineTo(12, 13);
    context.lineTo(0, 8);
    context.lineTo(-12, 13);
    context.closePath();
    context.fill();
    context.fillStyle = "#fff3bd";
    context.fillRect(-3, -8, 6, 13);
    context.fillStyle = "#ff6b8a";
    context.fillRect(-2, 9, 4, 8);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(0, 0, player.radius / 2.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawEnemy(context, enemy) {
    context.save();
    context.translate(enemy.x, enemy.y);
    if (enemy.type === "boss") {
      context.fillStyle = "#8c67ff";
      context.beginPath();
      context.moveTo(0, 31);
      context.lineTo(-42, -9);
      context.lineTo(-17, -23);
      context.lineTo(0, -14);
      context.lineTo(17, -23);
      context.lineTo(42, -9);
      context.closePath();
      context.fill();
      context.fillStyle = "#ffde59";
      context.fillRect(-9, -7, 18, 13);
    } else {
      context.fillStyle = enemy.type === "carrier" ? "#ff9e64" : "#ff668a";
      context.beginPath();
      context.moveTo(0, 15);
      context.lineTo(-enemy.radius, -9);
      context.lineTo(0, -4);
      context.lineTo(enemy.radius, -9);
      context.closePath();
      context.fill();
      context.fillStyle = "#fff0c7";
      context.fillRect(-4, -7, 8, 8);
    }
    context.restore();
  }

  function drawHud(context, state) {
    const player = state.player;
    context.save();
    context.font = "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textBaseline = "top";
    context.fillStyle = "rgba(4, 10, 28, 0.72)";
    context.fillRect(10, 10, state.width - 20, 66);
    context.fillStyle = "#f6fbff";
    context.fillText(`SCORE ${String(state.score).padStart(6, "0")}`, 20, 18);
    context.fillStyle = "#ffd166";
    context.fillText(`COIN +${state.reward}`, 20, 37);
    context.textAlign = "right";
    context.fillStyle = "#f6fbff";
    context.fillText(`LIFE ${"◆".repeat(Math.max(0, player.lives))}`, state.width - 20, 18);
    context.fillText(`ENDLESS  WAVE ${state.wave}`, state.width - 20, 37);
    context.textAlign = "left";

    const skillY = 58;
    context.fillStyle = player.missiles > 0 ? "#ffb36b" : "rgba(255, 179, 107, 0.4)";
    context.fillText(`MISSILE ${player.missiles}/${player.missileMax} [X]`, 20, skillY);
    context.fillStyle = player.shieldRemainingMs > 0
      ? "#8affdd"
      : (player.shieldCd > 0 ? "rgba(138, 255, 221, 0.4)" : "#8affdd");
    context.fillText(
      player.shieldRemainingMs > 0
        ? `SHIELD ON ${(player.shieldRemainingMs / 1000).toFixed(1)}s`
        : (player.shieldCd > 0 ? `SHIELD ${Math.ceil(player.shieldCd / 1000)}s` : "SHIELD READY [Z]"),
      132,
      skillY,
    );
    context.fillStyle = "#9be8ff";
    context.fillText(`UPGRADE ▲ ${state.upgradeTokens}/${UPGRADE_TOKENS_REQUIRED}`, 300, skillY);
    context.fillStyle = "#ffe36e";
    context.fillText(`LV ${player.level}`, state.width - 20, skillY);
    context.restore();
  }

  function upgradeCardRects(state) {
    const cardWidth = 132;
    const cardHeight = 150;
    const gap = 20;
    const total = cardWidth * 3 + gap * 2;
    const startX = (state.width - total) / 2;
    const y = state.height / 2 - cardHeight / 2 + 22;
    return Array.from({ length: 3 }, (_, index) => ({
      x: startX + index * (cardWidth + gap),
      y,
      w: cardWidth,
      h: cardHeight,
    }));
  }

  function drawUpgradePicker(context, state) {
    context.save();
    context.fillStyle = "rgba(4, 9, 25, 0.74)";
    context.fillRect(0, 0, state.width, state.height);
    const rects = upgradeCardRects(state);
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.font = "800 18px system-ui, sans-serif";
    context.fillText("升级！选择一项", state.width / 2, rects[0].y - 36);
    context.fillStyle = "#d8f4ff";
    context.font = "600 11px system-ui, sans-serif";
    context.fillText("按 1 / 2 / 3 或点击卡片", state.width / 2, rects[0].y - 15);

    const cards = [
      { title: "弹匣扩充", lines: ["导弹上限 +2", "回铃加快"] },
      { title: "弹药强化", lines: ["射速提升", "子弹伤害提升"] },
      { title: "导弹·护罩", lines: ["导弹 +3", "护罩立即充能"] },
    ];
    for (let index = 0; index < cards.length; index += 1) {
      const rect = rects[index];
      context.fillStyle = "rgba(18, 28, 66, 0.92)";
      context.fillRect(rect.x, rect.y, rect.w, rect.h);
      context.strokeStyle = index === 0 ? "#ffd166" : "rgba(255, 255, 255, 0.25)";
      context.lineWidth = 1.5;
      context.strokeRect(rect.x, rect.y, rect.w, rect.h);
      context.fillStyle = "#ffd166";
      context.font = "800 22px system-ui, sans-serif";
      context.fillText(String(index + 1), rect.x + rect.w / 2, rect.y + 26);
      context.fillStyle = "#ffffff";
      context.font = "800 14px system-ui, sans-serif";
      context.fillText(cards[index].title, rect.x + rect.w / 2, rect.y + 52);
      context.fillStyle = "#cfe8ff";
      context.font = "600 11px system-ui, sans-serif";
      cards[index].lines.forEach((line, lineIndex) => {
        context.fillText(line, rect.x + rect.w / 2, rect.y + 78 + lineIndex * 16);
      });
    }
    context.restore();
  }

  function drawSession(context, state) {
    drawStarfield(context, state);

    context.fillStyle = "#ffe36e";
    for (const bullet of state.playerBullets) {
      context.fillRect(bullet.x - 2, bullet.y - 7, 4, 12);
    }
    for (const missile of state.playerMissiles) {
      context.save();
      context.translate(missile.x, missile.y);
      context.rotate(Math.atan2(missile.vy, missile.vx) + Math.PI / 2);
      context.fillStyle = "#ffe36e";
      context.beginPath();
      context.moveTo(0, -9);
      context.lineTo(4, 6);
      context.lineTo(-4, 6);
      context.closePath();
      context.fill();
      context.fillStyle = "rgba(255, 227, 110, 0.42)";
      context.fillRect(-1.5, 2, 3, 10);
      context.restore();
    }
    for (const pickup of state.pickups) {
      context.save();
      context.translate(pickup.x, pickup.y);
      context.fillStyle = "#9be8ff";
      context.beginPath();
      context.moveTo(0, -9);
      context.lineTo(9, 0);
      context.lineTo(0, 9);
      context.lineTo(-9, 0);
      context.closePath();
      context.fill();
      context.fillStyle = "#ffd166";
      context.beginPath();
      context.arc(0, 0, 3, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    for (const bullet of state.enemyBullets) {
      context.fillStyle = bullet.grazed ? "#8affdd" : "#ff6ba8";
      context.beginPath();
      context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      context.fill();
    }
    for (const enemy of state.enemies) {
      drawEnemy(context, enemy);
    }
    drawPlayer(context, state);

    const boss = state.enemies.find((enemy) => enemy.type === "boss");
    if (boss) {
      const barWidth = state.width - 60;
      context.fillStyle = "rgba(255, 255, 255, 0.2)";
      context.fillRect(30, 67, barWidth, 6);
      context.fillStyle = "#b792ff";
      context.fillRect(30, 67, barWidth * Math.max(0, boss.hp / boss.maxHp), 6);
    }

    drawHud(context, state);
    if (state.status === "finished") {
      context.fillStyle = "rgba(4, 9, 25, 0.78)";
      context.fillRect(0, 0, state.width, state.height);
      context.textAlign = "center";
      context.fillStyle = "#ffffff";
      context.font = "800 30px system-ui, sans-serif";
      context.fillText("生命耗尽 · 返航整备", state.width / 2, state.height / 2 - 42);
      context.fillStyle = "#ffd166";
      context.font = "800 22px system-ui, sans-serif";
      context.fillText(`获得 ${state.reward} 云朵币`, state.width / 2, state.height / 2 + 4);
      context.fillStyle = "#d8f4ff";
      context.font = "600 14px system-ui, sans-serif";
      context.fillText(`分数 ${state.score} · 擦弹 ${state.grazes}`, state.width / 2, state.height / 2 + 39);
    }

    if (state.upgradeReady && state.status !== "finished") {
      drawUpgradePicker(context, state);
    }
  }

  function mount(canvas, callbacks) {
    if (!canvas || typeof canvas.getContext !== "function") {
      throw new Error("CloudShooterGame.mount requires a canvas element");
    }
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("CloudShooterGame.mount could not create a 2D context");
    }

    const handlers = callbacks || {};
    const onScore = typeof handlers.onScore === "function" ? handlers.onScore : function noop() {};
    const onFinish = typeof handlers.onFinish === "function" ? handlers.onFinish : function noop() {};
    if (!canvas.width) canvas.width = DEFAULT_WIDTH;
    if (!canvas.height) canvas.height = DEFAULT_HEIGHT;
    canvas.style.touchAction = "none";
    if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = 0;

    const controls = { left: false, right: false, up: false, down: false, x: null, y: null };
    let session = createSession({ width: canvas.width, height: canvas.height });
    let frameRequest = null;
    let lastFrameTime = null;
    let lastScore = null;
    let lastWave = null;
    let lastLives = null;
    let finishReported = false;
    let pointerId = null;
    let pointerOriginX = 0;
    let pointerOriginY = 0;

    function reportScore() {
      if (session.score !== lastScore || session.wave !== lastWave || session.player.lives !== lastLives) {
        lastScore = session.score;
        lastWave = session.wave;
        lastLives = session.player.lives;
        onScore(session.score, session.reward, session);
      }
    }

    function frame(time) {
      if (frameRequest === null) return;
      const elapsed = lastFrameTime === null ? 0 : Math.min(50, time - lastFrameTime);
      lastFrameTime = time;
      session = stepSession(session, controls, elapsed);
      drawSession(context, session);
      reportScore();

      if (session.status === "finished") {
        frameRequest = null;
        if (!finishReported) {
          finishReported = true;
          onFinish({
            score: session.score,
            reward: session.reward,
            reason: session.finishedReason,
            grazes: session.grazes,
            kills: session.kills,
            session,
          });
        }
        return;
      }
      frameRequest = root.requestAnimationFrame(frame);
    }

    function start(options) {
      stop();
      const settings = options || {};
      session = createSession({
        width: canvas.width,
        height: canvas.height,
        seed: Number.isInteger(settings.seed) ? settings.seed : Date.now() >>> 0,
      });
      finishReported = false;
      lastFrameTime = null;
      lastScore = null;
      lastWave = null;
      lastLives = null;
      drawSession(context, session);
      reportScore();
      frameRequest = root.requestAnimationFrame(frame);
      canvas.focus({ preventScroll: true });
      return session;
    }

    function stop() {
      if (frameRequest !== null) {
        root.cancelAnimationFrame(frameRequest);
        frameRequest = null;
      }
      lastFrameTime = null;
      return session;
    }

    function setInput(direction, active) {
      if (direction && typeof direction === "object") {
        for (const name of ["left", "right", "up", "down"]) {
          if (Object.prototype.hasOwnProperty.call(direction, name)) {
            controls[name] = Boolean(direction[name]);
          }
        }
        if (Number.isFinite(direction.x)) controls.x = clamp(direction.x, -1, 1);
        if (Number.isFinite(direction.y)) controls.y = clamp(direction.y, -1, 1);
        return { ...controls };
      }
      if (["left", "right", "up", "down"].includes(direction)) {
        controls[direction] = active !== false;
        if (direction === "left" || direction === "right") controls.x = null;
        if (direction === "up" || direction === "down") controls.y = null;
      }
      return { ...controls };
    }

    const keyDirections = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      ArrowUp: "up",
      KeyW: "up",
      ArrowDown: "down",
      KeyS: "down",
    };

    function handleKey(event, active) {
      const direction = keyDirections[event.code];
      if (!direction) return;
      event.preventDefault();
      setInput(direction, active);
    }
    function handleKeyDown(event) { handleKey(event, true); }
    function handleKeyUp(event) { handleKey(event, false); }

    const skillKeys = { KeyX: "missile", KeyZ: "shield" };
    function handleSkillKey(event) {
      if (skillKeys[event.code]) {
        event.preventDefault();
        session.player.skillRequest = skillKeys[event.code];
        return;
      }
      if (event.code === "Digit1" || event.code === "Digit2" || event.code === "Digit3") {
        event.preventDefault();
        if (session.upgradeReady) session.upgradePick = Number(event.code.slice(-1)) - 1;
      }
    }

    function skillAtPointer(event) {
      if (!session.upgradeReady) return null;
      const rect = canvas.getBoundingClientRect();
      const px = (event.clientX - rect.left) * (canvas.width / rect.width);
      const py = (event.clientY - rect.top) * (canvas.height / rect.height);
      const cards = upgradeCardRects(session);
      const index = cards.findIndex((card) => (
        px >= card.x && px <= card.x + card.w && py >= card.y && py <= card.y + card.h
      ));
      return index >= 0 ? index : null;
    }

    function handlePointerDown(event) {
      pointerId = event.pointerId;
      pointerOriginX = event.clientX;
      pointerOriginY = event.clientY;
      canvas.setPointerCapture(pointerId);
      canvas.focus({ preventScroll: true });
      if (session.upgradeReady) {
        const picked = skillAtPointer(event);
        if (picked !== null) session.upgradePick = picked;
        event.preventDefault();
        return;
      }
      controls.x = 0;
      controls.y = 0;
      event.preventDefault();
    }
    function handlePointerMove(event) {
      if (event.pointerId !== pointerId) return;
      controls.x = clamp((event.clientX - pointerOriginX) / 32, -1, 1);
      controls.y = clamp((event.clientY - pointerOriginY) / 32, -1, 1);
      event.preventDefault();
    }
    function handlePointerEnd(event) {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      controls.x = null;
      controls.y = null;
      event.preventDefault();
    }

    function setSkill(name) {
      if (session.status !== "running") return;
      session.player.skillRequest = name;
    }

    root.addEventListener("keydown", handleKeyDown, { passive: false });
    root.addEventListener("keyup", handleKeyUp, { passive: false });
    root.addEventListener("keydown", handleSkillKey, { passive: false });
    canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
    canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
    canvas.addEventListener("pointerup", handlePointerEnd, { passive: false });
    canvas.addEventListener("pointercancel", handlePointerEnd, { passive: false });
    drawSession(context, session);

    function destroy() {
      stop();
      root.removeEventListener("keydown", handleKeyDown);
      root.removeEventListener("keyup", handleKeyUp);
      root.removeEventListener("keydown", handleSkillKey);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerEnd);
      canvas.removeEventListener("pointercancel", handlePointerEnd);
    }

    return { start, stop, destroy, setInput, setSkill };
  }

  return {
    WAVE_DURATION_MS,
    BOSS_WAVE_INTERVAL,
    GRAZE_SCORE,
    createSession,
    stepSession,
    getReward,
    mount,
  };
});
