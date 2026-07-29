(() => {
  "use strict";

  const W = 1000;
  const H = 650;
  const INITIAL_PARTICLES = 34;
  const MIN_MASS = 65;
  const FIXED_DT = 1 / 120;
  const TAU = Math.PI * 2;
  const WORLD_SCALE = 0.014;

  const canvas = document.getElementById("gameCanvas");
  if (!window.THREE) throw new Error("The local 3D runtime could not be loaded.");
  const THREE = window.THREE;
  const boardWrap = document.getElementById("boardWrap");
  const startOverlay = document.getElementById("startOverlay");
  const introPanel = document.getElementById("introPanel");
  const mobileOptionsPanel = document.getElementById("mobileOptionsPanel");
  const messageOverlay = document.getElementById("messageOverlay");
  const startButton = document.getElementById("startButton");
  const continueButton = document.getElementById("continueButton");
  const resetButton = document.getElementById("resetButton");
  const pauseButton = document.getElementById("pauseButton");
  const soundButton = document.getElementById("soundButton");
  const gyroButton = document.getElementById("gyroButton");
  const gyroStatus = document.getElementById("gyroStatus");
  const overlayGyroButton = document.getElementById("overlayGyroButton");
  const overlayGyroStatus = document.getElementById("overlayGyroStatus");
  const sensitivityControl = document.getElementById("sensitivityControl");
  const sensitivitySlider = document.getElementById("sensitivitySlider");
  const sensitivityValue = document.getElementById("sensitivityValue");
  const overlaySensitivityControl = document.getElementById("overlaySensitivityControl");
  const overlaySensitivitySlider = document.getElementById("overlaySensitivitySlider");
  const overlaySensitivityValue = document.getElementById("overlaySensitivityValue");
  const fullscreenButton = document.getElementById("fullscreenButton");
  const fullscreenStatus = document.getElementById("fullscreenStatus");
  const optionsButton = document.getElementById("optionsButton");
  const closeOptionsButton = document.getElementById("closeOptionsButton");
  const pauseFlag = document.getElementById("pauseFlag");
  const levelReadout = document.getElementById("levelReadout");
  const massReadout = document.getElementById("massReadout");
  const timeReadout = document.getElementById("timeReadout");
  const nodeReadout = document.getElementById("nodeReadout");
  const tiltIndicator = document.getElementById("tiltIndicator");
  let renderer;
  let scene;
  let camera;
  let boardGroup;
  let particleMaterial;
  const visualTilt = { x: 0, y: 0 };
  const sceneRefs = {
    particles: [],
    nodes: [],
    gates: [],
    hazards: [],
    goal: null,
    dust: null
  };

  const levels = [
    {
      name: "Calibration",
      code: "CHAMBER / 01",
      start: { x: 125, y: 530 },
      goal: { x: 872, y: 105, r: 49 },
      nodes: [
        { x: 315, y: 514, r: 20 },
        { x: 510, y: 315, r: 20 },
        { x: 775, y: 162, r: 20 }
      ],
      walls: [
        { x: 0, y: 0, w: 1000, h: 24 }, { x: 0, y: 626, w: 1000, h: 24 },
        { x: 0, y: 0, w: 24, h: 650 }, { x: 976, y: 0, w: 24, h: 650 },
        { x: 205, y: 415, w: 28, h: 211 },
        { x: 205, y: 389, w: 196, h: 26 },
        { x: 375, y: 245, w: 26, h: 144 },
        { x: 375, y: 219, w: 240, h: 26 },
        { x: 589, y: 219, w: 26, h: 131 },
        { x: 589, y: 350, w: 226, h: 26, gate: 1 },
        { x: 789, y: 188, w: 26, h: 162 },
        { x: 720, y: 85, w: 26, h: 103 }
      ],
      hazards: [
        { type: "heat", x: 431, y: 474, w: 184, h: 58 },
        { type: "pit", x: 690, y: 500, r: 42 }
      ],
      arrows: [{ x: 110, y: 570, angle: 0 }, { x: 475, y: 278, angle: -Math.PI / 2 }]
    },
    {
      name: "Bifurcation",
      code: "CHAMBER / 02",
      start: { x: 105, y: 110 },
      goal: { x: 875, y: 535, r: 50 },
      nodes: [
        { x: 312, y: 102, r: 20 },
        { x: 502, y: 520, r: 20 },
        { x: 722, y: 268, r: 20 }
      ],
      walls: [
        { x: 0, y: 0, w: 1000, h: 24 }, { x: 0, y: 626, w: 1000, h: 24 },
        { x: 0, y: 0, w: 24, h: 650 }, { x: 976, y: 0, w: 24, h: 650 },
        { x: 205, y: 24, w: 25, h: 170 },
        { x: 205, y: 194, w: 190, h: 25 },
        { x: 370, y: 194, w: 25, h: 228 },
        { x: 220, y: 397, w: 150, h: 25, gate: 0 },
        { x: 220, y: 397, w: 25, h: 156 },
        { x: 220, y: 553, w: 170, h: 25 },
        { x: 510, y: 90, w: 25, h: 358 },
        { x: 510, y: 423, w: 205, h: 25, gate: 1 },
        { x: 690, y: 228, w: 25, h: 195 },
        { x: 690, y: 203, w: 188, h: 25 },
        { x: 853, y: 203, w: 25, h: 198 },
        { x: 760, y: 401, w: 118, h: 25 }
      ],
      hazards: [
        { type: "heat", x: 264, y: 284, w: 86, h: 74 },
        { type: "pit", x: 447, y: 307, r: 34 },
        { type: "heat", x: 574, y: 488, w: 128, h: 54 },
        { type: "pit", x: 802, y: 116, r: 38 }
      ],
      arrows: [{ x: 83, y: 155, angle: 0 }, { x: 456, y: 570, angle: 0 }, { x: 760, y: 300, angle: 0 }]
    },
    {
      name: "Final Assay",
      code: "CHAMBER / 03",
      start: { x: 92, y: 548 },
      goal: { x: 895, y: 98, r: 48 },
      nodes: [
        { x: 195, y: 330, r: 20 },
        { x: 530, y: 535, r: 20 },
        { x: 782, y: 280, r: 20 }
      ],
      walls: [
        { x: 0, y: 0, w: 1000, h: 24 }, { x: 0, y: 626, w: 1000, h: 24 },
        { x: 0, y: 0, w: 24, h: 650 }, { x: 976, y: 0, w: 24, h: 650 },
        { x: 135, y: 430, w: 210, h: 25 },
        { x: 320, y: 255, w: 25, h: 200 },
        { x: 135, y: 230, w: 210, h: 25, gate: 0 },
        { x: 135, y: 105, w: 25, h: 125 },
        { x: 320, y: 105, w: 210, h: 25 },
        { x: 505, y: 105, w: 25, h: 305 },
        { x: 505, y: 385, w: 190, h: 25, gate: 1 },
        { x: 670, y: 250, w: 25, h: 160 },
        { x: 670, y: 225, w: 205, h: 25 },
        { x: 850, y: 24, w: 25, h: 202 },
        { x: 695, y: 505, w: 200, h: 25 },
        { x: 870, y: 375, w: 25, h: 155 }
      ],
      hazards: [
        { type: "pit", x: 235, y: 532, r: 36 },
        { type: "heat", x: 378, y: 490, w: 95, h: 62 },
        { type: "heat", x: 381, y: 174, w: 89, h: 49 },
        { type: "pit", x: 597, y: 305, r: 39 },
        { type: "heat", x: 720, y: 440, w: 118, h: 45 }
      ],
      arrows: [{ x: 78, y: 492, angle: -Math.PI / 2 }, { x: 565, y: 455, angle: 0 }, { x: 800, y: 165, angle: -Math.PI / 2 }]
    }
  ];

  const state = {
    mode: "intro",
    levelIndex: 0,
    particles: [],
    nodes: [false, false, false],
    keys: new Set(),
    touchDirs: new Set(),
    elapsed: 0,
    totalScore: 0,
    hazardClock: 0,
    shake: 0,
    sound: true,
    audio: null,
    lastTime: performance.now(),
    accumulator: 0,
    trailTime: 0,
    gyro: {
      supported: "DeviceOrientationEvent" in window,
      enabled: false,
      active: false,
      waiting: false,
      betaZero: null,
      gammaZero: null,
      x: 0,
      y: 0,
      sensitivity: 1,
      timeout: null
    }
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const pad = (n, size = 2) => String(n).padStart(size, "0");

  function setupCanvas() {
    if (!renderer || !camera) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function seedParticles(point) {
    state.particles = [];
    for (let i = 0; i < INITIAL_PARTICLES; i++) {
      const angle = i * 2.39996;
      const radius = 4.5 * Math.sqrt(i);
      state.particles.push({
        x: point.x + Math.cos(angle) * radius,
        y: point.y + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        r: 9.5 + (i % 4) * 0.45,
        phase: Math.random() * TAU
      });
    }
  }

  function loadLevel(index) {
    state.levelIndex = index;
    state.nodes = [false, false, false];
    state.elapsed = 0;
    state.hazardClock = 0;
    state.shake = 0;
    seedParticles(levels[index].start);
    buildLevelScene(levels[index]);
    updateHud();
  }

  function beginGame() {
    initAudio();
    loadLevel(0);
    state.totalScore = 0;
    state.mode = "playing";
    startOverlay.classList.remove("visible");
    messageOverlay.classList.remove("visible");
    tone(330, .08, "sine", .045);
    setTimeout(() => tone(520, .12, "sine", .04), 70);
  }

  function resetLevel() {
    if (state.mode === "intro") return;
    loadLevel(state.levelIndex);
    state.mode = "playing";
    messageOverlay.classList.remove("visible");
    pauseFlag.classList.remove("visible");
    pauseButton.textContent = "PAUSE";
    tone(190, .1, "triangle", .03);
  }

  function togglePause() {
    if (!['playing', 'paused'].includes(state.mode)) return;
    state.mode = state.mode === "playing" ? "paused" : "playing";
    pauseFlag.classList.toggle("visible", state.mode === "paused");
    pauseButton.textContent = state.mode === "paused" ? "RESUME" : "PAUSE";
    state.lastTime = performance.now();
  }

  function initAudio() {
    if (!state.sound || state.audio) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) state.audio = new AudioCtx();
  }

  function tone(frequency, duration, type = "sine", volume = .035) {
    if (!state.sound || !state.audio) return;
    const now = state.audio.currentTime;
    const osc = state.audio.createOscillator();
    const gain = state.audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(state.audio.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function setGyroUi(label, status, pressed = state.gyro.enabled) {
    gyroButton.textContent = `GYRO: ${label}`;
    gyroButton.setAttribute("aria-pressed", String(pressed));
    gyroStatus.textContent = status;
    overlayGyroButton.textContent = `GYRO: ${label}`;
    overlayGyroButton.setAttribute("aria-pressed", String(pressed));
    overlayGyroStatus.textContent = status;
  }

  function setGyroSensitivity(value, persist = true) {
    state.gyro.sensitivity = clamp(Number(value) || 1, .5, 2);
    const formatted = state.gyro.sensitivity.toFixed(1);
    sensitivitySlider.value = formatted;
    sensitivityValue.textContent = `${formatted}×`;
    sensitivitySlider.setAttribute("aria-valuetext", `${formatted} times gyro acceleration`);
    overlaySensitivitySlider.value = formatted;
    overlaySensitivityValue.textContent = `${formatted}×`;
    overlaySensitivitySlider.setAttribute("aria-valuetext", `${formatted} times gyro acceleration`);
    const fill = (state.gyro.sensitivity - .5) / 1.5 * 100;
    sensitivityControl.style.setProperty("--sensitivity-fill", `${fill}%`);
    overlaySensitivityControl.style.setProperty("--sensitivity-fill", `${fill}%`);
    if (persist) {
      try { localStorage.setItem("chroma-drop-gyro-sensitivity", formatted); } catch (_) { /* Storage can be unavailable in private contexts. */ }
    }
  }

  function initGyroOption() {
    if (!state.gyro.supported) {
      overlayGyroButton.disabled = true;
      overlaySensitivitySlider.disabled = true;
      setGyroUi("OFF", "UNAVAILABLE", false);
      return;
    }
    gyroButton.hidden = false;
    gyroStatus.hidden = false;
    sensitivityControl.hidden = false;
    let savedSensitivity = 1;
    try { savedSensitivity = localStorage.getItem("chroma-drop-gyro-sensitivity") || 1; } catch (_) { /* Keep the default. */ }
    setGyroSensitivity(savedSensitivity, false);
    if (!window.isSecureContext) {
      gyroButton.disabled = true;
      setGyroUi("OFF", "HTTPS ONLY", false);
      return;
    }
    setGyroUi("OFF", "AVAILABLE", false);
  }

  function currentFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function setFullscreenUi(active, status = active ? "FULLSCREEN ACTIVE" : "DISPLAY READY") {
    fullscreenButton.textContent = active ? "EXIT FULLSCREEN  ×" : "FULLSCREEN  ⛶";
    fullscreenButton.setAttribute("aria-pressed", String(active));
    fullscreenStatus.textContent = status;
  }

  async function toggleFullscreen() {
    const activeElement = currentFullscreenElement();
    try {
      if (activeElement) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
        document.body.classList.remove("focus-mode");
        setFullscreenUi(false);
        return;
      }
      if (document.body.classList.contains("focus-mode")) {
        document.body.classList.remove("focus-mode");
        setFullscreenUi(false);
        return;
      }
      const root = document.documentElement;
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!request) throw new Error("Fullscreen API unavailable");
      await request.call(root, { navigationUI: "hide" });
      setFullscreenUi(true);
    } catch (_) {
      document.body.classList.add("focus-mode");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setFullscreenUi(true, "FOCUS MODE · BROWSER UI MAY REMAIN");
      setupCanvas();
    }
  }

  function showMobileOptions(show) {
    introPanel.hidden = show;
    mobileOptionsPanel.hidden = !show;
    optionsButton.setAttribute("aria-expanded", String(show));
    (show ? overlayGyroButton : optionsButton).focus({ preventScroll: true });
  }

  function calibrateGyro() {
    state.gyro.betaZero = null;
    state.gyro.gammaZero = null;
    state.gyro.x = 0;
    state.gyro.y = 0;
    if (state.gyro.enabled) setGyroUi("ON", "CENTERING", true);
  }

  function screenAngle() {
    const angle = screen.orientation?.angle ?? window.orientation ?? 0;
    return ((Number(angle) % 360) + 360) % 360;
  }

  function applyDeadZone(value) {
    const absolute = Math.abs(value);
    if (absolute < .055) return 0;
    return Math.sign(value) * (absolute - .055) / .945;
  }

  function handleOrientation(event) {
    if (!state.gyro.enabled || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    if (state.gyro.betaZero === null || state.gyro.gammaZero === null) {
      state.gyro.betaZero = event.beta;
      state.gyro.gammaZero = event.gamma;
      state.gyro.active = true;
      state.gyro.waiting = false;
      clearTimeout(state.gyro.timeout);
      setGyroUi("ON", "CENTERED", true);
      return;
    }

    const betaDelta = ((event.beta - state.gyro.betaZero + 540) % 360) - 180;
    const gammaDelta = event.gamma - state.gyro.gammaZero;
    let horizontal = gammaDelta;
    let vertical = betaDelta;
    const angle = screenAngle();
    if (angle === 90) { horizontal = betaDelta; vertical = -gammaDelta; }
    else if (angle === 180) { horizontal = -gammaDelta; vertical = -betaDelta; }
    else if (angle === 270) { horizontal = -betaDelta; vertical = gammaDelta; }

    const targetX = applyDeadZone(clamp(horizontal / 26 * state.gyro.sensitivity, -1, 1));
    const targetY = applyDeadZone(clamp(vertical / 26 * state.gyro.sensitivity, -1, 1));
    state.gyro.x += (targetX - state.gyro.x) * .18;
    state.gyro.y += (targetY - state.gyro.y) * .18;
    setGyroUi("ON", `${Math.round(Math.hypot(state.gyro.x, state.gyro.y) * 100)}%`, true);
  }

  function disableGyro(status = "AVAILABLE") {
    window.removeEventListener("deviceorientation", handleOrientation);
    clearTimeout(state.gyro.timeout);
    Object.assign(state.gyro, {
      enabled: false,
      active: false,
      waiting: false,
      betaZero: null,
      gammaZero: null,
      x: 0,
      y: 0,
      timeout: null
    });
    setGyroUi("OFF", status, false);
  }

  async function toggleGyro() {
    if (state.gyro.enabled) return disableGyro();
    if (!window.isSecureContext) return setGyroUi("OFF", "HTTPS ONLY", false);
    state.gyro.waiting = true;
    setGyroUi("…", "REQUESTING", false);
    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          state.gyro.waiting = false;
          setGyroUi("OFF", "DENIED", false);
          return;
        }
      }
      state.gyro.enabled = true;
      state.gyro.active = false;
      state.gyro.waiting = true;
      calibrateGyro();
      window.addEventListener("deviceorientation", handleOrientation);
      state.gyro.timeout = setTimeout(() => {
        if (!state.gyro.active) disableGyro("NO SENSOR");
      }, 1900);
    } catch (error) {
      state.gyro.waiting = false;
      setGyroUi("OFF", error?.name === "NotAllowedError" ? "DENIED" : "UNAVAILABLE", false);
    }
  }

  function inputVector() {
    let x = 0;
    let y = 0;
    if (state.keys.has("ArrowLeft") || state.keys.has("KeyA") || state.touchDirs.has("left")) x--;
    if (state.keys.has("ArrowRight") || state.keys.has("KeyD") || state.touchDirs.has("right")) x++;
    if (state.keys.has("ArrowUp") || state.keys.has("KeyW") || state.touchDirs.has("up")) y--;
    if (state.keys.has("ArrowDown") || state.keys.has("KeyS") || state.touchDirs.has("down")) y++;
    const manualLength = Math.hypot(x, y);
    let result;
    if (manualLength > 0) {
      result = { x: x / manualLength, y: y / manualLength };
    } else if (state.gyro.enabled && state.gyro.active) {
      const gyroLength = Math.hypot(state.gyro.x, state.gyro.y);
      const scale = gyroLength > 1 ? 1 / gyroLength : 1;
      result = { x: state.gyro.x * scale, y: state.gyro.y * scale };
    } else {
      result = { x: 0, y: 0 };
    }
    visualTilt.x = result.x;
    visualTilt.y = result.y;
    tiltIndicator.style.transform = `translate(${result.x * 8}px, ${result.y * 8}px)`;
    return result;
  }

  function activeWalls(level) {
    return level.walls.filter(w => w.gate === undefined || !state.nodes[w.gate]);
  }

  function resolveWall(p, wall) {
    const nearestX = clamp(p.x, wall.x, wall.x + wall.w);
    const nearestY = clamp(p.y, wall.y, wall.y + wall.h);
    let dx = p.x - nearestX;
    let dy = p.y - nearestY;
    let distSq = dx * dx + dy * dy;
    if (distSq >= p.r * p.r) return;

    if (distSq < .0001) {
      const left = Math.abs(p.x - wall.x);
      const right = Math.abs(wall.x + wall.w - p.x);
      const top = Math.abs(p.y - wall.y);
      const bottom = Math.abs(wall.y + wall.h - p.y);
      const min = Math.min(left, right, top, bottom);
      if (min === left) { dx = -1; dy = 0; }
      else if (min === right) { dx = 1; dy = 0; }
      else if (min === top) { dx = 0; dy = -1; }
      else { dx = 0; dy = 1; }
      distSq = 1;
    }

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = p.r - dist;
    p.x += nx * overlap;
    p.y += ny * overlap;
    const normalSpeed = p.vx * nx + p.vy * ny;
    if (normalSpeed < 0) {
      p.vx -= normalSpeed * nx * 1.18;
      p.vy -= normalSpeed * ny * 1.18;
    }
  }

  function insideHazard(p, hazard) {
    if (hazard.type === "pit") return Math.hypot(p.x - hazard.x, p.y - hazard.y) < hazard.r - 2;
    return p.x > hazard.x && p.x < hazard.x + hazard.w && p.y > hazard.y && p.y < hazard.y + hazard.h;
  }

  function step(dt) {
    if (state.mode !== "playing") return;
    state.elapsed += dt;
    state.hazardClock -= dt;
    state.shake = Math.max(0, state.shake - dt * 18);
    const level = levels[state.levelIndex];
    const tilt = inputVector();
    const particles = state.particles;
    const walls = activeWalls(level);
    const acceleration = 355;

    let cx = 0, cy = 0;
    for (const p of particles) { cx += p.x; cy += p.y; }
    cx /= particles.length || 1;
    cy /= particles.length || 1;

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < .01 || distSq > 12000) continue;
        const dist = Math.sqrt(distSq);
        dx /= dist; dy /= dist;
        let force = 0;
        const target = a.r + b.r - 2;
        if (dist < target) force = -(target - dist) * 85;
        else if (dist < 82) force = Math.min(46, (dist - target) * 1.9);
        const fx = dx * force * dt;
        const fy = dy * force * dt;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }

    for (const p of particles) {
      p.vx += tilt.x * acceleration * dt + (cx - p.x) * 1.3 * dt;
      p.vy += tilt.y * acceleration * dt + (cy - p.y) * 1.3 * dt;
      const drag = Math.exp(-1.7 * dt);
      p.vx *= drag;
      p.vy *= drag;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 360) { p.vx *= 360 / speed; p.vy *= 360 / speed; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      for (const wall of walls) resolveWall(p, wall);
      p.x = clamp(p.x, p.r + 24, W - p.r - 24);
      p.y = clamp(p.y, p.r + 24, H - p.r - 24);
    }

    for (let i = 0; i < level.nodes.length; i++) {
      if (state.nodes[i]) continue;
      const node = level.nodes[i];
      if (particles.some(p => Math.hypot(p.x - node.x, p.y - node.y) < node.r + p.r)) {
        state.nodes[i] = true;
        state.shake = 2;
        tone(410 + i * 130, .17, "sine", .055);
        updateHud();
      }
    }

    if (state.hazardClock <= 0) {
      const victimIndex = particles.findIndex(p => level.hazards.some(h => insideHazard(p, h)));
      if (victimIndex >= 0) {
        particles.splice(victimIndex, 1);
        state.hazardClock = .18;
        state.shake = 4;
        tone(92, .09, "sawtooth", .025);
        updateHud();
        if (massPercent() < MIN_MASS) failLevel();
      }
    }

    if (state.nodes.every(Boolean) && particles.length) {
      let inGoal = 0;
      for (const p of particles) if (Math.hypot(p.x - level.goal.x, p.y - level.goal.y) < level.goal.r) inGoal++;
      if (inGoal / particles.length > .58) completeLevel();
    }
  }

  function massPercent() { return Math.round(state.particles.length / INITIAL_PARTICLES * 100); }

  function completeLevel() {
    if (state.mode !== "playing") return;
    state.mode = "complete";
    const mass = massPercent();
    const score = Math.max(0, Math.round(mass * 70 + 6000 - state.elapsed * 45));
    state.totalScore += score;
    document.getElementById("resultIndex").textContent = state.levelIndex === levels.length - 1 ? "ASSAY COMPLETE" : "CHAMBER CLEAR";
    document.getElementById("resultTitle").innerHTML = state.levelIndex === levels.length - 1 ? "Pure<br>motion." : "Stable<br>matter.";
    document.getElementById("resultCopy").textContent = state.levelIndex === levels.length - 1 ? "All samples delivered. The instrument is satisfied." : "The sample arrived intact. Proceed while the charge is stable.";
    document.getElementById("resultMass").textContent = `${mass}%`;
    document.getElementById("resultTime").textContent = formatTime(state.elapsed, false);
    document.getElementById("resultScore").textContent = pad(score, 4);
    continueButton.innerHTML = state.levelIndex === levels.length - 1 ? "RUN AGAIN <b>↻</b>" : "NEXT CHAMBER <b>↗</b>";
    messageOverlay.classList.add("visible");
    tone(520, .15, "sine", .05);
    setTimeout(() => tone(660, .16, "sine", .04), 110);
    setTimeout(() => tone(820, .25, "sine", .035), 220);
  }

  function failLevel() {
    state.mode = "failed";
    document.getElementById("resultIndex").textContent = "SAMPLE LOST";
    document.getElementById("resultTitle").innerHTML = "Critical<br>mass.";
    document.getElementById("resultCopy").textContent = `Mass fell below ${MIN_MASS}%. Reset the chamber and avoid the thermal drains.`;
    document.getElementById("resultMass").textContent = `${massPercent()}%`;
    document.getElementById("resultTime").textContent = formatTime(state.elapsed, false);
    document.getElementById("resultScore").textContent = "0000";
    continueButton.innerHTML = "RETRY CHAMBER <b>↻</b>";
    messageOverlay.classList.add("visible");
  }

  function continueGame() {
    if (state.mode === "failed") return resetLevel();
    if (state.levelIndex < levels.length - 1) {
      loadLevel(state.levelIndex + 1);
      state.mode = "playing";
      messageOverlay.classList.remove("visible");
    } else {
      state.totalScore = 0;
      loadLevel(0);
      state.mode = "playing";
      messageOverlay.classList.remove("visible");
    }
  }

  function formatTime(seconds, tenths = true) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${pad(mins)}:${pad(secs)}${tenths ? `.${Math.floor(seconds * 10) % 10}` : ""}`;
  }

  function updateHud() {
    levelReadout.textContent = `${pad(state.levelIndex + 1)} / ${pad(levels.length)}`;
    massReadout.textContent = `${massPercent()}%`;
    massReadout.style.color = massPercent() < 78 ? "#ffb84d" : "";
    [...nodeReadout.children].forEach((node, i) => node.classList.toggle("active", state.nodes[i]));
    nodeReadout.setAttribute("aria-label", `${state.nodes.filter(Boolean).length} of 3 charge nodes active`);
  }

  function roundedRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  }

  function drawBoard(level, t) {
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, "#17201d");
    gradient.addColorStop(.55, "#111714");
    gradient.addColorStop(1, "#0c1110");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(219,231,220,.035)";
    ctx.lineWidth = 1;
    for (let x = 45; x < W; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 45; y < H; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    ctx.save();
    ctx.fillStyle = "rgba(232,224,206,.12)";
    ctx.font = "700 10px Arial Narrow, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText(level.code, 42, 52);
    ctx.fillText(level.name.toUpperCase(), 42, 68);
    ctx.fillText("TILT VECTOR / PARTICULATE COHESION", 735, 610);
    ctx.restore();

    for (const arrow of level.arrows) drawArrow(arrow.x, arrow.y, arrow.angle);
    for (const hazard of level.hazards) drawHazard(hazard, t);
    drawGoal(level.goal, state.nodes.every(Boolean), t);
    level.nodes.forEach((node, i) => drawNode(node, state.nodes[i], i, t));

    for (const wall of level.walls) {
      if (wall.gate !== undefined && state.nodes[wall.gate]) {
        drawOpenGate(wall);
      } else {
        drawWall(wall);
      }
    }
  }

  function drawArrow(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = "rgba(232,224,206,.18)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 13, -7); ctx.lineTo(i * 13 + 8, 0); ctx.lineTo(i * 13, 7); ctx.stroke();
    }
    ctx.restore();
  }

  function drawWall(wall) {
    const isGate = wall.gate !== undefined;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.65)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 5;
    const gradient = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
    gradient.addColorStop(0, isGate ? "#9f6529" : "#43504a");
    gradient.addColorStop(.45, isGate ? "#4f3420" : "#26312d");
    gradient.addColorStop(1, isGate ? "#281e18" : "#141c19");
    roundedRect(wall.x, wall.y, wall.w, wall.h, 4);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = isGate ? "rgba(255,184,77,.75)" : "rgba(193,211,201,.23)";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (isGate) {
      ctx.strokeStyle = "rgba(255,184,77,.24)";
      ctx.setLineDash([5, 6]);
      ctx.strokeRect(wall.x + 6, wall.y + 6, wall.w - 12, wall.h - 12);
    }
    ctx.restore();
  }

  function drawOpenGate(wall) {
    ctx.save();
    ctx.strokeStyle = "rgba(95,246,227,.24)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 9]);
    ctx.strokeRect(wall.x + 2, wall.y + 2, wall.w - 4, wall.h - 4);
    ctx.restore();
  }

  function drawNode(node, active, i, t) {
    ctx.save();
    ctx.translate(node.x, node.y);
    const pulse = 1 + Math.sin(t * 3 + i) * .08;
    ctx.strokeStyle = active ? "rgba(95,246,227,.95)" : "rgba(232,224,206,.35)";
    ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath(); ctx.arc(0, 0, node.r * 1.7 * pulse, 0, TAU); ctx.stroke();
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(0, 0, node.r * 1.28, -t, TAU - t); ctx.stroke();
    ctx.setLineDash([]);
    const glow = ctx.createRadialGradient(-4, -5, 1, 0, 0, node.r);
    glow.addColorStop(0, active ? "#d9fff9" : "#f0b869");
    glow.addColorStop(.25, active ? "#5ff6e3" : "#67563e");
    glow.addColorStop(1, active ? "rgba(95,246,227,.04)" : "#1d2522");
    ctx.shadowColor = active ? "#5ff6e3" : "transparent";
    ctx.shadowBlur = active ? 24 : 0;
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, node.r, 0, TAU); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = active ? "#06110f" : "#d0a660";
    ctx.font = "800 9px Arial Narrow, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`0${i + 1}`, 0, 3);
    ctx.restore();
  }

  function drawGoal(goal, open, t) {
    ctx.save();
    ctx.translate(goal.x, goal.y);
    ctx.fillStyle = "#070a09";
    ctx.shadowColor = open ? "rgba(95,246,227,.4)" : "rgba(0,0,0,.8)";
    ctx.shadowBlur = open ? 22 : 10;
    ctx.beginPath(); ctx.arc(0, 0, goal.r, 0, TAU); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = open ? "#5ff6e3" : "#59625d";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, goal.r + 8, 0, TAU); ctx.stroke();
    ctx.setLineDash([4, 8]);
    ctx.lineDashOffset = -t * 15;
    ctx.beginPath(); ctx.arc(0, 0, goal.r - 9, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = open ? "#5ff6e3" : "#69716d";
    ctx.font = "800 9px Arial Narrow, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(open ? "DRAIN OPEN" : "DRAIN LOCK", 0, 3);
    ctx.restore();
  }

  function drawHazard(hazard, t) {
    ctx.save();
    if (hazard.type === "pit") {
      const g = ctx.createRadialGradient(hazard.x, hazard.y, 3, hazard.x, hazard.y, hazard.r);
      g.addColorStop(0, "#020303");
      g.addColorStop(.58, "#080b0a");
      g.addColorStop(.74, "#6e261e");
      g.addColorStop(1, "rgba(255,96,73,.08)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,96,73,.35)";
      ctx.setLineDash([3, 7]);
      ctx.lineDashOffset = t * 13;
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.r + 7, 0, TAU); ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(89,24,18,.52)";
      ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
      ctx.beginPath();
      for (let x = hazard.x - hazard.h; x < hazard.x + hazard.w; x += 18) {
        ctx.moveTo(x, hazard.y + hazard.h);
        ctx.lineTo(x + hazard.h, hazard.y);
      }
      ctx.strokeStyle = "rgba(255,96,73,.3)";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,96,73,.65)";
      ctx.lineWidth = 1;
      ctx.strokeRect(hazard.x, hazard.y, hazard.w, hazard.h);
    }
    ctx.restore();
  }

  function drawFluid(t) {
    const particles = state.particles;
    if (!particles.length) return;

    ctx.save();
    ctx.globalAlpha = .38;
    ctx.strokeStyle = "#3fd1c1";
    ctx.lineWidth = 15;
    ctx.lineCap = "round";
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 < 650) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.restore();

    for (const p of particles) {
      const speed = Math.hypot(p.vx, p.vy);
      const stretch = clamp(speed / 240, 0, .38);
      const angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.scale(1 + stretch, 1 - stretch * .42);
      ctx.shadowColor = "rgba(72,255,230,.42)";
      ctx.shadowBlur = 12;
      const g = ctx.createRadialGradient(-3.5, -4.5, 1, 0, 0, p.r * 1.3);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(.12, "#c9fff8");
      g.addColorStop(.42, "#5ff6e3");
      g.addColorStop(.78, "#138779");
      g.addColorStop(1, "#07372f");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, p.r + Math.sin(t * 3 + p.phase) * .35, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function render(now) {
    const t = now / 1000;
    ctx.save();
    if (state.shake > 0) ctx.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake);
    drawBoard(levels[state.levelIndex], t);
    drawFluid(t);
    ctx.restore();
  }

  const worldX = x => (x - W / 2) * WORLD_SCALE;
  const worldZ = y => (y - H / 2) * WORLD_SCALE;

  function init3D() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07100e);
    scene.fog = new THREE.FogExp2(0x07100e, 0.035);

    camera = new THREE.PerspectiveCamera(34, W / H, .1, 80);
    camera.position.set(0, 12.2, 13.4);
    camera.lookAt(0, -.15, .2);

    scene.add(new THREE.HemisphereLight(0xbffff5, 0x070706, 1.45));
    const key = new THREE.DirectionalLight(0xfff0ce, 3.6);
    key.position.set(-5, 11, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -.0005;
    scene.add(key);

    const cyan = new THREE.PointLight(0x42ffe4, 2.4, 18, 2);
    cyan.position.set(-6, 3.4, 4.5);
    scene.add(cyan);
    const amber = new THREE.PointLight(0xff9d3c, 1.8, 15, 2);
    amber.position.set(6, 3, -3.5);
    scene.add(amber);

    boardGroup = new THREE.Group();
    boardGroup.rotation.order = "YXZ";
    scene.add(boardGroup);

    particleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x70fff0,
      emissive: 0x063d38,
      emissiveIntensity: .8,
      metalness: .72,
      roughness: .09,
      clearcoat: 1,
      clearcoatRoughness: .05,
      reflectivity: 1
    });

    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = [];
    for (let i = 0; i < 260; i++) {
      dustPositions.push((Math.random() - .5) * 35, Math.random() * 17 - 3, (Math.random() - .5) * 30);
    }
    dustGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3));
    sceneRefs.dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      color: 0x92d5ca,
      size: .026,
      transparent: true,
      opacity: .32,
      depthWrite: false
    }));
    scene.add(sceneRefs.dust);
    setupCanvas();
  }

  function disposeBoard() {
    while (boardGroup.children.length) {
      const child = boardGroup.children.pop();
      child.traverse(object => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach(material => material !== particleMaterial && material.dispose?.());
        else if (object.material && object.material !== particleMaterial) object.material.dispose?.();
        if (object.material?.map) object.material.map.dispose?.();
      });
    }
    sceneRefs.particles = [];
    sceneRefs.nodes = [];
    sceneRefs.gates = [];
    sceneRefs.hazards = [];
    sceneRefs.goal = null;
  }

  function addBoardGrid() {
    const points = [];
    const halfW = W * WORLD_SCALE / 2;
    const halfH = H * WORLD_SCALE / 2;
    for (let x = -halfW; x <= halfW; x += .63) {
      points.push(new THREE.Vector3(x, -.085, -halfH), new THREE.Vector3(x, -.085, halfH));
    }
    for (let z = -halfH; z <= halfH; z += .63) {
      points.push(new THREE.Vector3(-halfW, -.085, z), new THREE.Vector3(halfW, -.085, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    boardGroup.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
      color: 0x9ab7ae,
      transparent: true,
      opacity: .075
    })));
  }

  function makeLabelSprite(text, color = "#d9d3c5") {
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 512;
    labelCanvas.height = 96;
    const labelCtx = labelCanvas.getContext("2d");
    labelCtx.fillStyle = color;
    labelCtx.font = "700 30px Arial Narrow, sans-serif";
    labelCtx.fillText(text, 8, 55);
    const texture = new THREE.CanvasTexture(labelCanvas);
    texture.encoding = THREE.sRGBEncoding;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: .52, depthWrite: false }));
    sprite.scale.set(3.55, .67, 1);
    return sprite;
  }

  function makeWall(wall) {
    const isGate = wall.gate !== undefined;
    const geometry = new THREE.BoxGeometry(wall.w * WORLD_SCALE, .68, wall.h * WORLD_SCALE);
    const material = new THREE.MeshStandardMaterial({
      color: isGate ? 0x8b4f20 : 0x2a3934,
      emissive: isGate ? 0x2d1003 : 0x010403,
      emissiveIntensity: isGate ? .7 : .2,
      metalness: .75,
      roughness: isGate ? .24 : .33
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(worldX(wall.x + wall.w / 2), .25, worldZ(wall.y + wall.h / 2));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    boardGroup.add(mesh);
    if (isGate) {
      const beacon = new THREE.PointLight(0xff9d3c, .7, 2.2, 2);
      beacon.position.set(0, .55, 0);
      mesh.add(beacon);
      sceneRefs.gates.push({ mesh, beacon, index: wall.gate });
    }
  }

  function makeNode(node, index) {
    const group = new THREE.Group();
    group.position.set(worldX(node.x), -.01, worldZ(node.y));
    const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xa3783e, emissive: 0x3a2107, emissiveIntensity: .7, metalness: .85, roughness: .2 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(node.r * WORLD_SCALE * 1.55, .035, 10, 48), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .035;
    group.add(ring);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(node.r * WORLD_SCALE * 2.1, .012, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xb38a52, transparent: true, opacity: .35 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = .04;
    group.add(halo);
    const coreMaterial = new THREE.MeshStandardMaterial({ color: 0xd3a35c, emissive: 0x55300a, emissiveIntensity: 1.2, metalness: .4, roughness: .16 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(node.r * WORLD_SCALE * .48, 20, 14), coreMaterial);
    core.position.y = .12;
    core.castShadow = true;
    group.add(core);
    const light = new THREE.PointLight(0xffa742, .35, 1.5, 2);
    light.position.y = .28;
    group.add(light);
    boardGroup.add(group);
    sceneRefs.nodes.push({ group, ring, halo, core, light, index });
  }

  function makeGoal(goal) {
    const group = new THREE.Group();
    group.position.set(worldX(goal.x), -.07, worldZ(goal.y));
    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(goal.r * WORLD_SCALE, goal.r * WORLD_SCALE * .88, .12, 48),
      new THREE.MeshStandardMaterial({ color: 0x010302, metalness: .5, roughness: .16 })
    );
    group.add(well);
    const ringMaterial = new THREE.MeshStandardMaterial({ color: 0x4c5a55, emissive: 0x08100e, emissiveIntensity: .3, metalness: .85, roughness: .2 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(goal.r * WORLD_SCALE * 1.12, .045, 12, 64), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .105;
    group.add(ring);
    const light = new THREE.PointLight(0x4fffe7, 0, 3.5, 2);
    light.position.y = .35;
    group.add(light);
    boardGroup.add(group);
    sceneRefs.goal = { group, ring, light };
  }

  function makeHazard(hazard, index) {
    const group = new THREE.Group();
    group.position.set(
      worldX(hazard.type === "pit" ? hazard.x : hazard.x + hazard.w / 2),
      -.065,
      worldZ(hazard.type === "pit" ? hazard.y : hazard.y + hazard.h / 2)
    );
    const material = new THREE.MeshStandardMaterial({ color: 0x5d140d, emissive: 0xe62a17, emissiveIntensity: 1.25, metalness: .18, roughness: .38 });
    if (hazard.type === "pit") {
      const pit = new THREE.Mesh(
        new THREE.CylinderGeometry(hazard.r * WORLD_SCALE, hazard.r * WORLD_SCALE * .82, .1, 40),
        new THREE.MeshStandardMaterial({ color: 0x010101, emissive: 0x2a0301, emissiveIntensity: .8, metalness: .3, roughness: .2 })
      );
      group.add(pit);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(hazard.r * WORLD_SCALE * 1.04, .04, 8, 48), material);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = .08;
      group.add(rim);
    } else {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(hazard.w * WORLD_SCALE, .055, hazard.h * WORLD_SCALE), material);
      group.add(pad);
      const barMaterial = new THREE.MeshBasicMaterial({ color: 0xff563e, transparent: true, opacity: .72 });
      for (let i = -2; i <= 2; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(hazard.w * WORLD_SCALE * .08, .012, hazard.h * WORLD_SCALE * .82), barMaterial);
        bar.position.set(i * hazard.w * WORLD_SCALE * .18, .038, 0);
        bar.rotation.y = -.42;
        group.add(bar);
      }
    }
    const light = new THREE.PointLight(0xff351f, .45, 2.4, 2);
    light.position.y = .24;
    group.add(light);
    boardGroup.add(group);
    sceneRefs.hazards.push({ group, material, light, index });
  }

  function addParticleMeshes() {
    const geometry = new THREE.SphereGeometry(.145, 20, 16);
    for (let i = 0; i < INITIAL_PARTICLES; i++) {
      const mesh = new THREE.Mesh(geometry, particleMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      boardGroup.add(mesh);
      sceneRefs.particles.push(mesh);
    }
  }

  function buildLevelScene(level) {
    if (!boardGroup) return;
    disposeBoard();
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x101916, emissive: 0x020504, emissiveIntensity: .3, metalness: .68, roughness: .42 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(W * WORLD_SCALE + .8, .42, H * WORLD_SCALE + .8), baseMaterial);
    base.position.y = -.31;
    base.receiveShadow = true;
    base.castShadow = true;
    boardGroup.add(base);
    addBoardGrid();
    level.walls.forEach(makeWall);
    level.nodes.forEach(makeNode);
    level.hazards.forEach(makeHazard);
    makeGoal(level.goal);
    addParticleMeshes();

    const label = makeLabelSprite(`${level.code}  /  ${level.name.toUpperCase()}`);
    label.position.set(-4.7, .46, -3.85);
    boardGroup.add(label);

    const boltMaterial = new THREE.MeshStandardMaterial({ color: 0x8f9a94, metalness: .95, roughness: .18 });
    const boltGeometry = new THREE.CylinderGeometry(.09, .09, .08, 12);
    const halfW = W * WORLD_SCALE / 2 + .2;
    const halfH = H * WORLD_SCALE / 2 + .2;
    for (const [x, z] of [[-halfW, -halfH], [halfW, -halfH], [-halfW, halfH], [halfW, halfH]]) {
      const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
      bolt.position.set(x, -.06, z);
      bolt.castShadow = true;
      boardGroup.add(bolt);
    }
  }

  function sync3D(t) {
    boardGroup.rotation.x += (visualTilt.y * .07 - boardGroup.rotation.x) * .12;
    boardGroup.rotation.z += (-visualTilt.x * .07 - boardGroup.rotation.z) * .12;
    const shake = state.shake * .006;
    boardGroup.position.x = (Math.random() - .5) * shake;
    boardGroup.position.z = (Math.random() - .5) * shake;

    sceneRefs.particles.forEach((mesh, i) => {
      const p = state.particles[i];
      mesh.visible = Boolean(p);
      if (!p) return;
      const speed = Math.hypot(p.vx, p.vy);
      const stretch = clamp(speed / 430, 0, .38);
      mesh.position.set(worldX(p.x), .075 + Math.sin(t * 4 + p.phase) * .009, worldZ(p.y));
      mesh.rotation.y = -Math.atan2(p.vy, p.vx);
      const size = p.r * WORLD_SCALE / .145;
      mesh.scale.set(size * (1 + stretch), size * (1 - stretch * .24), size * (1 - stretch * .5));
    });

    sceneRefs.nodes.forEach(ref => {
      const active = state.nodes[ref.index];
      const color = active ? 0x5ff6e3 : 0xd3a35c;
      const emissive = active ? 0x0cc9b4 : 0x55300a;
      ref.group.rotation.y = t * (active ? .85 : .25) + ref.index;
      ref.halo.scale.setScalar(1 + Math.sin(t * 3.4 + ref.index) * .08);
      ref.ring.material.color.setHex(color);
      ref.ring.material.emissive.setHex(emissive);
      ref.ring.material.emissiveIntensity = active ? 1.8 : .7;
      ref.core.material.color.setHex(active ? 0xc9fff8 : color);
      ref.core.material.emissive.setHex(emissive);
      ref.light.color.setHex(active ? 0x5ff6e3 : 0xffa742);
      ref.light.intensity = active ? 1.15 + Math.sin(t * 4) * .15 : .35;
    });

    sceneRefs.gates.forEach(ref => {
      ref.mesh.visible = !state.nodes[ref.index];
      ref.beacon.intensity = .55 + Math.sin(t * 5 + ref.index) * .25;
    });
    sceneRefs.hazards.forEach(ref => {
      const pulse = 1 + Math.sin(t * 5 + ref.index * 1.4) * .28;
      ref.material.emissiveIntensity = 1.15 * pulse;
      ref.light.intensity = .4 * pulse;
    });

    if (sceneRefs.goal) {
      const open = state.nodes.every(Boolean);
      sceneRefs.goal.group.rotation.y = t * (open ? 1.2 : .25);
      sceneRefs.goal.ring.material.color.setHex(open ? 0x5ff6e3 : 0x4c5a55);
      sceneRefs.goal.ring.material.emissive.setHex(open ? 0x0ab5a3 : 0x08100e);
      sceneRefs.goal.ring.material.emissiveIntensity = open ? 2 : .3;
      sceneRefs.goal.light.intensity = open ? 1.4 + Math.sin(t * 4) * .2 : 0;
    }
    if (sceneRefs.dust) sceneRefs.dust.rotation.y = t * .012;
  }

  function render3D(now) {
    sync3D(now / 1000);
    renderer.render(scene, camera);
  }

  function frame(now) {
    const frameTime = Math.min(.05, (now - state.lastTime) / 1000);
    state.lastTime = now;
    state.accumulator += frameTime;
    while (state.accumulator >= FIXED_DT) {
      step(FIXED_DT);
      state.accumulator -= FIXED_DT;
    }
    if (state.mode === "playing") timeReadout.textContent = formatTime(state.elapsed);
    render3D(now);
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", event => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "KeyP" || event.code === "Space") togglePause();
    if (event.code === "KeyR") resetLevel();
    state.keys.add(event.code);
  });
  window.addEventListener("keyup", event => state.keys.delete(event.code));
  window.addEventListener("blur", () => {
    state.keys.clear();
    state.touchDirs.clear();
    if (state.mode === "playing" && !state.gyro.waiting) togglePause();
  });
  window.addEventListener("orientationchange", calibrateGyro);
  screen.orientation?.addEventListener?.("change", calibrateGyro);

  document.querySelectorAll(".tilt-pad button").forEach(button => {
    const dir = button.dataset.dir;
    const down = event => { event.preventDefault(); state.touchDirs.add(dir); button.setPointerCapture?.(event.pointerId); };
    const up = event => { event.preventDefault(); state.touchDirs.delete(dir); };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("pointerleave", event => { if (event.buttons === 0) up(event); });
  });

  startButton.addEventListener("click", beginGame);
  continueButton.addEventListener("click", continueGame);
  resetButton.addEventListener("click", resetLevel);
  pauseButton.addEventListener("click", togglePause);
  gyroButton.addEventListener("click", toggleGyro);
  overlayGyroButton.addEventListener("click", toggleGyro);
  sensitivitySlider.addEventListener("input", event => setGyroSensitivity(event.target.value));
  overlaySensitivitySlider.addEventListener("input", event => setGyroSensitivity(event.target.value));
  fullscreenButton.addEventListener("click", toggleFullscreen);
  optionsButton.addEventListener("click", () => showMobileOptions(true));
  closeOptionsButton.addEventListener("click", () => showMobileOptions(false));
  soundButton.addEventListener("click", () => {
    state.sound = !state.sound;
    soundButton.textContent = `SOUND: ${state.sound ? "ON" : "OFF"}`;
    soundButton.setAttribute("aria-pressed", String(state.sound));
    if (state.sound) { initAudio(); tone(420, .1); }
  });

  window.addEventListener("resize", setupCanvas);
  document.addEventListener("fullscreenchange", () => {
    const active = Boolean(currentFullscreenElement());
    if (!active) document.body.classList.remove("focus-mode");
    setFullscreenUi(active);
    setupCanvas();
  });
  document.addEventListener("webkitfullscreenchange", () => {
    const active = Boolean(currentFullscreenElement());
    setFullscreenUi(active);
    setupCanvas();
  });
  init3D();
  initGyroOption();
  loadLevel(0);
  requestAnimationFrame(frame);

  window.__CHROMA_DROP__ = {
    getGraphics: () => ({
      renderer: "WebGL",
      threeRevision: THREE.REVISION,
      sceneChildren: scene.children.length,
      boardObjects: boardGroup.children.length,
      boardTilt: { x: boardGroup.rotation.x, z: boardGroup.rotation.z }
    }),
    getState: () => ({
      mode: state.mode,
      level: state.levelIndex,
      mass: massPercent(),
      nodes: [...state.nodes],
      particles: state.particles.length
    }),
    getControls: () => ({
      gyro: {
        supported: state.gyro.supported,
        enabled: state.gyro.enabled,
        active: state.gyro.active,
        x: state.gyro.x,
        y: state.gyro.y,
        sensitivity: state.gyro.sensitivity
      }
    }),
    setGyroSensitivity: value => setGyroSensitivity(value),
    toggleFullscreen: () => toggleFullscreen(),
    showMobileOptions: show => showMobileOptions(show),
    getDisplay: () => ({ fullscreen: Boolean(currentFullscreenElement()), focusMode: document.body.classList.contains("focus-mode"), optionsOpen: !mobileOptionsPanel.hidden }),
    simulateGyro: (beta, gamma) => {
      state.gyro.enabled = true;
      handleOrientation({ beta, gamma });
    },
    disableGyro: () => disableGyro(),
    activateAllNodes: () => { state.nodes = [true, true, true]; updateHud(); },
    moveToGoal: () => {
      const goal = levels[state.levelIndex].goal;
      state.particles.forEach((p, i) => {
        const a = i / state.particles.length * TAU;
        p.x = goal.x + Math.cos(a) * 18;
        p.y = goal.y + Math.sin(a) * 18;
        p.vx = p.vy = 0;
      });
    }
  };
})();
