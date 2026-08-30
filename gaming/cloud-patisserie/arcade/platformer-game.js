(function initCloudPlatformer(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CloudPlatformerGame = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCloudPlatformerApi() {
  "use strict";

  const VIEW_WIDTH = 800;
  const VIEW_HEIGHT = 450;
  const WORLD_WIDTH = 2_920;
  const TIME_LIMIT_MS = 55_000;
  const REWARD_CAP = 200;
  const PLAYER_SPEED = 255;
  const JUMP_SPEED = 610;
  const GRAVITY = 1_720;
  const PLAYER_START = Object.freeze({ x: 72, y: 344 });

  const PLATFORMS = Object.freeze([
    { x: 0, y: 390, w: 520, h: 60 },
    { x: 590, y: 390, w: 650, h: 60 },
    { x: 1_300, y: 390, w: 480, h: 60 },
    { x: 1_840, y: 390, w: 430, h: 60 },
    { x: 2_330, y: 390, w: 590, h: 60 },
    { x: 245, y: 300, w: 185, h: 18 },
    { x: 720, y: 285, w: 180, h: 18 },
    { x: 1_020, y: 230, w: 150, h: 18 },
    { x: 1_420, y: 290, w: 200, h: 18 },
    { x: 1_950, y: 275, w: 180, h: 18 },
    { x: 2_430, y: 300, w: 190, h: 18 },
  ]);

  const COIN_LAYOUT = Object.freeze([
    { x: 300, y: 258 }, { x: 370, y: 258 },
    { x: 674, y: 338 }, { x: 770, y: 243 }, { x: 850, y: 243 },
    { x: 1_070, y: 188 }, { x: 1_390, y: 338 }, { x: 1_500, y: 248 },
    { x: 1_585, y: 248 }, { x: 1_925, y: 338 }, { x: 2_000, y: 233 },
    { x: 2_080, y: 233 }, { x: 2_430, y: 338 }, { x: 2_500, y: 258 },
    { x: 2_585, y: 258 },
  ]);

  const ENEMY_LAYOUT = Object.freeze([
    { x: 405, y: 356, left: 330, right: 485, speed: 68 },
    { x: 1_090, y: 356, left: 965, right: 1_190, speed: 76 },
    { x: 1_665, y: 356, left: 1_545, right: 1_745, speed: 82 },
    { x: 2_115, y: 356, left: 2_000, right: 2_235, speed: 88 },
    { x: 2_700, y: 356, left: 2_610, right: 2_780, speed: 92 },
  ]);

  const CHECKPOINT = Object.freeze({ x: 1_470, y: 320, w: 22, h: 70 });
  const FINISH = Object.freeze({ x: 2_825, y: 292, w: 28, h: 98 });

  function createSession(options = {}) {
    const requestedLimit = options.timeLimitMs === undefined ? TIME_LIMIT_MS : Number(options.timeLimitMs);
    if (!Number.isFinite(requestedLimit) || requestedLimit <= 0) {
      throw new Error("timeLimitMs 必须是正数");
    }

    return {
      status: "playing",
      elapsedMs: 0,
      timeLimitMs: requestedLimit,
      score: 0,
      lives: 3,
      checkpointActive: false,
      checkpoint: { ...PLAYER_START },
      jumpWasDown: false,
      player: {
        ...PLAYER_START,
        w: 34,
        h: 46,
        vx: 0,
        vy: 0,
        onGround: true,
        facing: 1,
        invulnerableMs: 0,
      },
      coins: COIN_LAYOUT.map((coin, index) => ({ id: index, ...coin, radius: 12, collected: false })),
      enemies: ENEMY_LAYOUT.map((enemy, index) => ({
        id: index,
        ...enemy,
        w: 34,
        h: 34,
        direction: index % 2 === 0 ? -1 : 1,
        alive: true,
      })),
    };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function collectCoins(next) {
    for (const coin of next.coins) {
      if (coin.collected) continue;
      const coinBox = { x: coin.x - coin.radius, y: coin.y - coin.radius, w: coin.radius * 2, h: coin.radius * 2 };
      if (overlaps(next.player, coinBox)) {
        coin.collected = true;
        next.score += 120;
      }
    }
  }

  function loseLife(next) {
    next.lives -= 1;
    if (next.lives <= 0) {
      next.status = "lost";
      next.player.vx = 0;
      next.player.vy = 0;
      return;
    }

    next.player = {
      ...next.player,
      x: next.checkpoint.x,
      y: next.checkpoint.y,
      vx: 0,
      vy: 0,
      onGround: false,
      invulnerableMs: 1_300,
    };
  }

  function moveEnemies(next, seconds) {
    for (const enemy of next.enemies) {
      if (!enemy.alive) continue;
      enemy.x += enemy.speed * enemy.direction * seconds;
      if (enemy.x <= enemy.left) {
        enemy.x = enemy.left;
        enemy.direction = 1;
      } else if (enemy.x >= enemy.right) {
        enemy.x = enemy.right;
        enemy.direction = -1;
      }
    }
  }

  function resolveEnemies(next, previousBottom) {
    for (const enemy of next.enemies) {
      if (!enemy.alive || !overlaps(next.player, enemy)) continue;

      const landedOnEnemy = next.player.vy > 0 && previousBottom <= enemy.y + 7;
      if (landedOnEnemy) {
        enemy.alive = false;
        next.player.y = enemy.y - next.player.h;
        next.player.vy = -JUMP_SPEED * 0.55;
        next.player.onGround = false;
        next.score += 220;
      } else if (next.player.invulnerableMs <= 0) {
        loseLife(next);
      }
      break;
    }
  }

  function finishLevel(next) {
    const secondsLeft = Math.max(0, Math.ceil((next.timeLimitMs - next.elapsedMs) / 1_000));
    next.score += 1_000 + secondsLeft * 10;
    next.status = "won";
    next.player.vx = 0;
    next.player.vy = 0;
  }

  function advanceSlice(state, input, sliceMs, jumpPressed) {
    const next = {
      ...state,
      player: { ...state.player },
      coins: state.coins.map((coin) => ({ ...coin })),
      enemies: state.enemies.map((enemy) => ({ ...enemy })),
    };

    next.elapsedMs = Math.min(next.timeLimitMs, next.elapsedMs + sliceMs);
    if (next.elapsedMs >= next.timeLimitMs) {
      next.status = "timeout";
      next.player.vx = 0;
      next.player.vy = 0;
      return next;
    }

    const seconds = sliceMs / 1_000;
    const horizontal = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    next.player.vx = horizontal * PLAYER_SPEED;
    if (horizontal !== 0) next.player.facing = horizontal;
    if (jumpPressed && next.player.onGround) {
      next.player.vy = -JUMP_SPEED;
      next.player.onGround = false;
    }

    next.player.invulnerableMs = Math.max(0, next.player.invulnerableMs - sliceMs);
    next.player.x = Math.max(0, Math.min(WORLD_WIDTH - next.player.w, next.player.x + next.player.vx * seconds));

    const previousBottom = next.player.y + next.player.h;
    next.player.vy += GRAVITY * seconds;
    next.player.y += next.player.vy * seconds;
    next.player.onGround = false;

    if (next.player.vy >= 0) {
      for (const platform of PLATFORMS) {
        const nextBottom = next.player.y + next.player.h;
        const isOverPlatform = next.player.x + next.player.w > platform.x && next.player.x < platform.x + platform.w;
        if (isOverPlatform && previousBottom <= platform.y + 3 && nextBottom >= platform.y) {
          next.player.y = platform.y - next.player.h;
          next.player.vy = 0;
          next.player.onGround = true;
          break;
        }
      }
    }

    moveEnemies(next, seconds);
    collectCoins(next);
    resolveEnemies(next, previousBottom);
    if (next.status !== "playing") return next;

    if (!next.checkpointActive && next.player.x + next.player.w >= CHECKPOINT.x) {
      next.checkpointActive = true;
      next.checkpoint = { x: CHECKPOINT.x + 34, y: 330 };
      next.score += 300;
    }

    if (next.player.x + next.player.w >= FINISH.x) {
      finishLevel(next);
    } else if (next.player.y > VIEW_HEIGHT + 110) {
      loseLife(next);
    }

    return next;
  }

  function stepSession(state, input = {}, dtMs = 16) {
    if (!state || !state.player || !Array.isArray(state.coins) || !Array.isArray(state.enemies)) {
      throw new Error("无效的平台跳跃游戏状态");
    }
    if (!Number.isFinite(dtMs) || dtMs < 0) throw new Error("dtMs 必须是非负数");
    if (state.status !== "playing" || dtMs === 0) return state;

    const controls = { left: Boolean(input.left), right: Boolean(input.right), jump: Boolean(input.jump) };
    let next = state;
    let remaining = dtMs;
    let firstSlice = true;
    while (remaining > 0 && next.status === "playing") {
      const slice = Math.min(16, remaining);
      const jumpPressed = firstSlice && controls.jump && !state.jumpWasDown;
      next = advanceSlice(next, controls, slice, jumpPressed);
      remaining -= slice;
      firstSlice = false;
    }

    if (next === state) return state;
    return { ...next, jumpWasDown: controls.jump };
  }

  function getReward(score) {
    if (!Number.isFinite(score)) throw new Error("score 必须是有限数值");
    return Math.min(REWARD_CAP, Math.floor(Math.max(0, score) / 15));
  }

  function mount(canvas, callbacks = {}) {
    if (!canvas || typeof canvas.getContext !== "function") {
      throw new Error("mount 需要一个 canvas 元素");
    }

    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法创建 2D Canvas 上下文");
    const browserRoot = canvas.ownerDocument?.defaultView;
    if (!browserRoot) throw new Error("canvas 必须属于一个浏览器文档");

    const onScore = typeof callbacks.onScore === "function" ? callbacks.onScore : function noop() {};
    const onFinish = typeof callbacks.onFinish === "function" ? callbacks.onFinish : function noop() {};
    const controls = { left: false, right: false, jump: false };
    const activePointers = new Map();
    let session = createSession();
    let animationFrame = 0;
    let lastFrameAt = 0;
    let running = false;
    let finishReported = false;

    canvas.width = VIEW_WIDTH;
    canvas.height = VIEW_HEIGHT;
    canvas.style.touchAction = "none";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "云朵烘焙坊横版跳跃游戏");
    if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = 0;

    function roundedRect(x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      context.beginPath();
      context.roundRect(x, y, width, height, r);
    }

    function drawCloud(x, y, scale) {
      context.fillStyle = "rgba(255,255,255,.78)";
      context.beginPath();
      context.arc(x, y, 22 * scale, 0, Math.PI * 2);
      context.arc(x + 26 * scale, y - 10 * scale, 28 * scale, 0, Math.PI * 2);
      context.arc(x + 58 * scale, y, 22 * scale, 0, Math.PI * 2);
      context.fill();
    }

    function render() {
      const cameraX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, session.player.x - 210));
      const sky = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
      sky.addColorStop(0, "#88d8eb");
      sky.addColorStop(1, "#fff1c9");
      context.fillStyle = sky;
      context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

      drawCloud(90 - cameraX * 0.08, 86, 1);
      drawCloud(430 - cameraX * 0.12, 125, 0.75);
      drawCloud(735 - cameraX * 0.08, 70, 0.9);

      context.save();
      context.translate(-cameraX, 0);

      for (const platform of PLATFORMS) {
        context.fillStyle = "#7b4f36";
        roundedRect(platform.x, platform.y, platform.w, platform.h, 8);
        context.fill();
        context.fillStyle = "#f4a86a";
        context.fillRect(platform.x + 4, platform.y, platform.w - 8, Math.min(13, platform.h));
        context.fillStyle = "rgba(255,255,255,.3)";
        for (let x = platform.x + 20; x < platform.x + platform.w - 10; x += 42) {
          context.fillRect(x, platform.y + 5, 12, 3);
        }
      }

      context.fillStyle = session.checkpointActive ? "#5bbf91" : "#9f8f89";
      context.fillRect(CHECKPOINT.x, CHECKPOINT.y, 7, CHECKPOINT.h);
      context.fillStyle = session.checkpointActive ? "#d7fff0" : "#eee3de";
      context.beginPath();
      context.moveTo(CHECKPOINT.x + 7, CHECKPOINT.y);
      context.lineTo(CHECKPOINT.x + 52, CHECKPOINT.y + 14);
      context.lineTo(CHECKPOINT.x + 7, CHECKPOINT.y + 30);
      context.fill();

      context.fillStyle = "#8555c7";
      context.fillRect(FINISH.x, FINISH.y, 8, FINISH.h);
      context.fillStyle = "#fff4a9";
      context.beginPath();
      context.moveTo(FINISH.x + 8, FINISH.y);
      context.lineTo(FINISH.x + 72, FINISH.y + 20);
      context.lineTo(FINISH.x + 8, FINISH.y + 43);
      context.fill();
      context.fillStyle = "#8555c7";
      context.font = "bold 18px sans-serif";
      context.fillText("GOAL", FINISH.x + 14, FINISH.y + 26);

      for (const coin of session.coins) {
        if (coin.collected) continue;
        const bob = Math.sin(session.elapsedMs / 180 + coin.id) * 3;
        context.fillStyle = "#ffc94d";
        context.beginPath();
        context.arc(coin.x, coin.y + bob, coin.radius, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = "#a76a2c";
        context.lineWidth = 3;
        context.stroke();
        context.fillStyle = "#fff1a8";
        context.fillRect(coin.x - 2, coin.y - 7 + bob, 4, 14);
      }

      for (const enemy of session.enemies) {
        if (!enemy.alive) continue;
        context.fillStyle = "#6c4b72";
        roundedRect(enemy.x, enemy.y + 7, enemy.w, enemy.h - 7, 10);
        context.fill();
        context.beginPath();
        context.moveTo(enemy.x + 4, enemy.y + 11);
        context.lineTo(enemy.x + 9, enemy.y);
        context.lineTo(enemy.x + 15, enemy.y + 11);
        context.moveTo(enemy.x + 19, enemy.y + 11);
        context.lineTo(enemy.x + 25, enemy.y);
        context.lineTo(enemy.x + 31, enemy.y + 11);
        context.fill();
        context.fillStyle = "#fff";
        context.fillRect(enemy.x + 8, enemy.y + 17, 5, 5);
        context.fillRect(enemy.x + 22, enemy.y + 17, 5, 5);
      }

      if (session.player.invulnerableMs <= 0 || Math.floor(session.elapsedMs / 80) % 2 === 0) {
        const player = session.player;
        context.save();
        context.translate(player.x + (player.facing < 0 ? player.w : 0), player.y);
        context.scale(player.facing < 0 ? -1 : 1, 1);
        context.fillStyle = "#fff8e5";
        roundedRect(0, 8, player.w, player.h - 8, 10);
        context.fill();
        context.fillStyle = "#f18f79";
        context.beginPath();
        context.moveTo(5, 13);
        context.lineTo(9, 0);
        context.lineTo(15, 11);
        context.lineTo(23, 11);
        context.lineTo(28, 0);
        context.lineTo(31, 14);
        context.fill();
        context.fillStyle = "#513f47";
        context.fillRect(9, 20, 4, 5);
        context.fillRect(23, 20, 4, 5);
        context.fillStyle = "#e56f69";
        context.fillRect(14, 31, 12, 8);
        context.restore();
      }

      context.restore();

      context.fillStyle = "rgba(62,42,52,.86)";
      roundedRect(16, 14, 405, 48, 14);
      context.fill();
      context.fillStyle = "#fffdf5";
      context.font = "bold 18px system-ui, sans-serif";
      const secondsLeft = Math.max(0, Math.ceil((session.timeLimitMs - session.elapsedMs) / 1_000));
      context.fillText(`分数 ${session.score}   生命 ${"♥".repeat(Math.max(0, session.lives))}   时间 ${secondsLeft}s`, 32, 45);

      context.fillStyle = "rgba(62,42,52,.72)";
      roundedRect(515, 15, 267, 40, 12);
      context.fill();
      context.fillStyle = "#fffdf5";
      context.font = "14px system-ui, sans-serif";
      context.fillText("← → / A D 移动 · ↑ / W / 空格跳跃", 530, 41);

      if (!running || session.status !== "playing") {
        context.fillStyle = "rgba(47,31,43,.64)";
        context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        context.fillStyle = "#fffdf5";
        context.textAlign = "center";
        context.font = "bold 38px system-ui, sans-serif";
        const title = session.status === "won" ? "送达成功！" : session.status === "lost" ? "今日售罄" : session.status === "timeout" ? "打烊时间到" : "云朵配送大冒险";
        context.fillText(title, VIEW_WIDTH / 2, 196);
        context.font = "18px system-ui, sans-serif";
        const subtitle = session.status === "playing" ? "穿过奶油平台，收集金币并抵达终点" : `最终分数 ${session.score} · 奖励 ${getReward(session.score)} 云朵币`;
        context.fillText(subtitle, VIEW_WIDTH / 2, 236);
        context.textAlign = "start";
      }
    }

    function reportFinish() {
      if (finishReported || session.status === "playing") return;
      finishReported = true;
      onFinish({ status: session.status, score: session.score, reward: getReward(session.score), session });
    }

    function frame(now) {
      if (!running) return;
      const dt = lastFrameAt === 0 ? 16 : Math.min(50, now - lastFrameAt);
      lastFrameAt = now;
      const previousScore = session.score;
      session = stepSession(session, controls, dt);
      if (session.score !== previousScore) onScore(session.score);
      render();
      if (session.status !== "playing") {
        running = false;
        reportFinish();
        return;
      }
      animationFrame = browserRoot.requestAnimationFrame(frame);
    }

    function setKey(event, pressed) {
      if (!running) return;
      const key = event.key.toLowerCase();
      if (["arrowleft", "a"].includes(key)) controls.left = pressed;
      else if (["arrowright", "d"].includes(key)) controls.right = pressed;
      else if (["arrowup", "w", " "].includes(key)) controls.jump = pressed;
      else return;
      event.preventDefault();
    }

    function syncPointerControls() {
      controls.left = false;
      controls.right = false;
      controls.jump = false;
      for (const control of activePointers.values()) controls[control] = true;
    }

    function pointerDown(event) {
      if (!running) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const control = x < rect.width * 0.21 ? "left" : x < rect.width * 0.45 ? "right" : "jump";
      activePointers.set(event.pointerId, control);
      if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
      syncPointerControls();
      event.preventDefault();
    }

    function pointerUp(event) {
      if (!activePointers.has(event.pointerId)) return;
      activePointers.delete(event.pointerId);
      syncPointerControls();
      event.preventDefault();
    }

    function start() {
      if (running) return;
      session = createSession();
      controls.left = false;
      controls.right = false;
      controls.jump = false;
      activePointers.clear();
      finishReported = false;
      lastFrameAt = 0;
      running = true;
      canvas.focus({ preventScroll: true });
      onScore(0);
      animationFrame = browserRoot.requestAnimationFrame(frame);
    }

    function stop() {
      if (!running) return;
      running = false;
      browserRoot.cancelAnimationFrame(animationFrame);
      render();
    }

    function destroy() {
      stop();
      browserRoot.removeEventListener("keydown", keyDown);
      browserRoot.removeEventListener("keyup", keyUp);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("contextmenu", preventMenu);
    }

    const keyDown = (event) => setKey(event, true);
    const keyUp = (event) => setKey(event, false);
    const preventMenu = (event) => event.preventDefault();
    browserRoot.addEventListener("keydown", keyDown, { passive: false });
    browserRoot.addEventListener("keyup", keyUp, { passive: false });
    canvas.addEventListener("pointerdown", pointerDown, { passive: false });
    canvas.addEventListener("pointerup", pointerUp, { passive: false });
    canvas.addEventListener("pointercancel", pointerUp, { passive: false });
    canvas.addEventListener("contextmenu", preventMenu);
    render();

    return { start, stop, destroy };
  }

  return Object.freeze({
    VIEW_WIDTH,
    VIEW_HEIGHT,
    WORLD_WIDTH,
    TIME_LIMIT_MS,
    REWARD_CAP,
    LEVEL: Object.freeze({ platforms: PLATFORMS, checkpoint: CHECKPOINT, finish: FINISH }),
    createSession,
    stepSession,
    getReward,
    mount,
  });
});
