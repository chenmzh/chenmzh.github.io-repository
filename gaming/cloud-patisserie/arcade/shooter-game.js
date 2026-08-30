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
  const REWARD_CAP = 300;
  const GRAZE_SCORE = 30;

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
        grazeRadius: 25,
        lives: 3,
        invulnerableMs: 0,
        fireCooldownMs: 0,
      },
      enemies: [],
      playerBullets: [],
      enemyBullets: [],
    };
  }

  function cloneSession(state) {
    return {
      ...state,
      player: { ...state.player },
      enemies: state.enemies.map((enemy) => ({ ...enemy })),
      playerBullets: state.playerBullets.map((bullet) => ({ ...bullet })),
      enemyBullets: state.enemyBullets.map((bullet) => ({ ...bullet })),
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
    return Math.min(10, Math.max(1, wave));
  }

  function addPlayerBullet(state) {
    state.playerBullets.push({
      id: state.nextId++,
      x: state.player.x,
      y: state.player.y - 14,
      vx: 0,
      vy: -560,
      radius: 3,
      damage: 1,
    });
  }

  function addAimedEnemyBullet(state, enemy, angleOffset, speedMultiplier) {
    const baseAngle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    const speed = (118 + difficultyForWave(state.wave) * 14) * (speedMultiplier || 1);
    const angle = baseAngle + angleOffset;
    state.enemyBullets.push({
      id: state.nextId++,
      x: enemy.x,
      y: enemy.y + enemy.radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: enemy.type === "boss" ? 5 : 4,
      grazed: false,
    });
  }

  function fireEnemy(state, enemy) {
    if (enemy.type === "boss") {
      for (let index = -4; index <= 4; index += 1) {
        addAimedEnemyBullet(state, enemy, index * 0.16, 1.1);
      }
      return;
    }

    addAimedEnemyBullet(state, enemy, 0, 1);
    if (state.wave >= 3) {
      addAimedEnemyBullet(state, enemy, -0.22, 0.92);
      addAimedEnemyBullet(state, enemy, 0.22, 0.92);
    }
  }

  function spawnEnemy(state) {
    const margin = 28;
    const x = margin + nextRandom(state) * (state.width - margin * 2);
    const difficulty = difficultyForWave(state.wave);
    const sturdy = state.wave >= 4 && nextRandom(state) > 0.7;
    const hp = sturdy ? Math.min(6, 3 + Math.floor((difficulty - 4) / 3)) : Math.min(5, 1 + Math.floor((difficulty - 1) / 2));
    state.enemies.push({
      id: state.nextId++,
      type: sturdy ? "carrier" : "scout",
      x,
      y: -24,
      vx: (nextRandom(state) - 0.5) * (24 + difficulty * 5),
      vy: 48 + difficulty * 10,
      radius: sturdy ? 18 : 13,
      hp,
      maxHp: hp,
      fireCooldownMs: 500 + nextRandom(state) * 800,
      points: sturdy ? 720 : 260 + state.wave * 70,
    });
  }

  function spawnBoss(state) {
    state.lastBossWave = state.wave;
    const bossCycle = Math.floor(state.wave / BOSS_WAVE_INTERVAL);
    const hp = Math.min(96, 40 + bossCycle * 8);
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
      fireCooldownMs: 260,
      points: 4_000 + bossCycle * 1_000,
    });
  }

  function getReward(score) {
    const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
    return Math.min(REWARD_CAP, Math.floor(safeScore / 20));
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

    state.elapsedMs += frameMs;
    state.wave = waveForTime(state.elapsedMs);
    state.player.invulnerableMs = Math.max(0, state.player.invulnerableMs - frameMs);
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
      state.player.fireCooldownMs += PLAYER_FIRE_INTERVAL_MS;
    }

    for (const bullet of state.playerBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    }
    for (const bullet of state.enemyBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    }

    for (const enemy of state.enemies) {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      if (enemy.type === "boss") {
        if (enemy.x < enemy.radius || enemy.x > state.width - enemy.radius) {
          enemy.x = clamp(enemy.x, enemy.radius, state.width - enemy.radius);
          enemy.vx *= -1;
        }
      } else if (enemy.x < enemy.radius || enemy.x > state.width - enemy.radius) {
        enemy.x = clamp(enemy.x, enemy.radius, state.width - enemy.radius);
        enemy.vx *= -1;
      }

      enemy.fireCooldownMs -= frameMs;
      while (enemy.fireCooldownMs <= 0) {
        fireEnemy(state, enemy);
        enemy.fireCooldownMs += enemy.type === "boss"
          ? 560
          : Math.max(720, 1_320 - difficultyForWave(state.wave) * 105);
      }
    }

    state.spawnCooldownMs -= frameMs;
    while (state.spawnCooldownMs <= 0) {
      spawnEnemy(state);
      const interval = Math.max(430, 1_020 - difficultyForWave(state.wave) * 105);
      state.spawnCooldownMs += interval;
    }
    const bossIsActive = state.enemies.some((enemy) => enemy.type === "boss");
    if (state.wave % BOSS_WAVE_INTERVAL === 0 && state.lastBossWave !== state.wave && !bossIsActive) {
      spawnBoss(state);
    }

    const spentPlayerBullets = new Set();
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

    state.playerBullets = state.playerBullets.filter((bullet) => (
      !spentPlayerBullets.has(bullet.id)
      && bullet.y > -24
      && bullet.x > -24
      && bullet.x < state.width + 24
    ));
    state.enemies = state.enemies.filter((enemy) => (
      !defeatedEnemies.has(enemy.id) && enemy.y < state.height + enemy.radius * 2
    ));

    const spentEnemyBullets = new Set();
    for (const bullet of state.enemyBullets) {
      const hitRadius = state.player.radius + bullet.radius;
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
        const contactRadius = state.player.radius + enemy.radius;
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
    state.enemyBullets = state.enemyBullets.slice(-260);
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
    context.save();
    context.font = "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textBaseline = "top";
    context.fillStyle = "rgba(4, 10, 28, 0.72)";
    context.fillRect(10, 10, state.width - 20, 48);
    context.fillStyle = "#f6fbff";
    context.fillText(`SCORE ${String(state.score).padStart(6, "0")}`, 20, 18);
    context.fillStyle = "#ffd166";
    context.fillText(`COIN +${state.reward}`, 20, 37);
    context.fillStyle = "#f6fbff";
    context.textAlign = "right";
    context.fillText(`LIFE ${"◆".repeat(Math.max(0, state.player.lives))}`, state.width - 20, 18);
    context.fillText(`ENDLESS  WAVE ${state.wave}`, state.width - 20, 37);
    context.restore();
  }

  function drawSession(context, state) {
    drawStarfield(context, state);

    context.fillStyle = "#ffe36e";
    for (const bullet of state.playerBullets) {
      context.fillRect(bullet.x - 2, bullet.y - 7, 4, 12);
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
    function handlePointerDown(event) {
      pointerId = event.pointerId;
      pointerOriginX = event.clientX;
      pointerOriginY = event.clientY;
      canvas.setPointerCapture(pointerId);
      canvas.focus({ preventScroll: true });
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

    root.addEventListener("keydown", handleKeyDown, { passive: false });
    root.addEventListener("keyup", handleKeyUp, { passive: false });
    canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
    canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
    canvas.addEventListener("pointerup", handlePointerEnd, { passive: false });
    canvas.addEventListener("pointercancel", handlePointerEnd, { passive: false });
    drawSession(context, session);

    function destroy() {
      stop();
      root.removeEventListener("keydown", handleKeyDown);
      root.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerEnd);
      canvas.removeEventListener("pointercancel", handlePointerEnd);
    }

    return { start, stop, destroy, setInput };
  }

  return {
    WAVE_DURATION_MS,
    BOSS_WAVE_INTERVAL,
    REWARD_CAP,
    GRAZE_SCORE,
    createSession,
    stepSession,
    getReward,
    mount,
  };
});
