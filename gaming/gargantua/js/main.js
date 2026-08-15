// GARGANTUA — Schwarzschild black hole raytracer.
// Fullscreen fragment-shader null-geodesic integration, HDR bloom pipeline,
// ACES tonemapping, OrbitControls, presets, HUD, persistence and screenshot API.
// No build step required: serve the repository root over HTTP.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import {
  FULLSCREEN_VERT, MAIN_FRAG, BRIGHT_FRAG, DOWNSAMPLE_FRAG, BLUR_FRAG, FINAL_FRAG,
} from './shaders.js';
import {
  STORAGE_KEY, QUALITY_PRESETS, DEFAULT_QUALITY, PARAM_DEFS, DEFAULT_PARAMS, VIEW_PRESETS, DEBUG_VIEWS,
} from './config.js';
import { AmbientAudio } from './audio.js';
import { initUI } from './ui.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const $ = (sel) => document.querySelector(sel);

// ---------------------------------------------------------------------------
// State / persistence / URL parameters
// ---------------------------------------------------------------------------
const state = {
  quality: DEFAULT_QUALITY,
  params: { ...DEFAULT_PARAMS },
  preset: 1,
  debug: 0,
  autoRotate: false,
  showHUD: true,
  musicEnabled: false,
  camera: null, // persisted spherical coords (optional)
};

function detectDefaultQuality() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 760;
  return coarse || small ? 'standard' : DEFAULT_QUALITY;
}

function loadPersisted() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) { raw = null; }
  if (!raw) {
    state.quality = detectDefaultQuality();
    const q = QUALITY_PRESETS[state.quality];
    state.params.maxSteps = q.maxSteps;
    state.params.stepScale = q.stepScale;
    return;
  }
  if (raw.quality && QUALITY_PRESETS[raw.quality]) state.quality = raw.quality;
  if (raw.params) {
    for (const def of PARAM_DEFS) {
      const v = Number(raw.params[def.key]);
      if (Number.isFinite(v)) state.params[def.key] = clamp(v, def.min, def.max);
    }
  }
  const q = QUALITY_PRESETS[state.quality];
  if (!raw.params || !Number.isFinite(raw.params.maxSteps)) state.params.maxSteps = q.maxSteps;
  if (!raw.params || !Number.isFinite(raw.params.stepScale)) state.params.stepScale = q.stepScale;
  if (Number.isInteger(raw.preset) && raw.preset >= 0 && raw.preset < VIEW_PRESETS.length) state.preset = raw.preset;
  if (Number.isInteger(raw.debug) && raw.debug >= 0 && raw.debug <= 9) state.debug = raw.debug;
  state.autoRotate = !!raw.autoRotate;
  state.musicEnabled = !!raw.musicEnabled;
  if (typeof raw.showHUD === 'boolean') state.showHUD = raw.showHUD;
  if (raw.camera && Number.isFinite(raw.camera.distance)) state.camera = raw.camera;
}

function applyURLParams() {
  const sp = new URLSearchParams(location.search);
  for (const def of PARAM_DEFS) {
    if (sp.has(def.key)) {
      const v = parseFloat(sp.get(def.key));
      if (Number.isFinite(v)) state.params[def.key] = clamp(v, def.min, def.max);
    }
  }
  if (sp.has('quality') && QUALITY_PRESETS[sp.get('quality')]) state.quality = sp.get('quality');
  const preset = parseInt(sp.get('preset'), 10);
  if (Number.isInteger(preset) && preset >= 0 && preset < VIEW_PRESETS.length) state.preset = preset;
  const debug = parseInt(sp.get('debug'), 10);
  if (Number.isInteger(debug) && debug >= 0 && debug <= 9) state.debug = debug;
  if (sp.has('autorotate')) state.autoRotate = sp.get('autorotate') === '1';
  if (sp.has('music')) state.musicEnabled = sp.get('music') === '1';
  if (sp.has('hud')) state.showHUD = sp.get('hud') === '1';
  return {
    screenshot: sp.get('screenshot') === '1',
    download: sp.get('download') === '1',
    waitMs: Number(sp.get('wait')) || 0,
    fovSpecified: sp.has('fov'),
    presetSpecified: sp.has('preset'),
  };
}

let persistTimer = 0;
function persistNow() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      quality: state.quality,
      params: state.params,
      preset: state.preset,
      debug: state.debug,
      autoRotate: state.autoRotate,
      musicEnabled: audio.enabled,
      showHUD: state.showHUD,
      camera: currentSpherical(),
    }));
  } catch (_) { /* private mode / quota */ }
}
function persistSoon() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 250);
}

loadPersisted();
const urlOptions = applyURLParams();

// ---------------------------------------------------------------------------
// Renderer / scenes / render targets
// ---------------------------------------------------------------------------
let renderer = null;
let mainScene = null;
let mainCam = null;
let mainMaterial = null;
let mainUniforms = null;

let postScene = null;
let postCam = null;
let brightQuad = null;
let downQuad = null;
let blurQuad = null;
let finalQuad = null;
let finalMaterial = null;

let sceneRT = null;
let brightRT = null;
let bloomA = null;
let bloomB = null;
let halfFloat = false;

let camera = null;
let controls = null;
let camTransition = null;
let autoBase = null;
let autoTime = 0;
let frameCount = 0;
let elapsedTime = 0;
let running = false;
let firstFrameRendered = false;
let shaderFault = null;
let shotWaiter = null;

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const v4 = new THREE.Vector3();

const ui = initUI({
  getState: () => state,
  callbacks: {
    onParam: (key, value) => setParam(key, value),
    onPreset: (i) => setPreset(i),
    onQuality: (q) => setQuality(q),
    onDebug: (d) => setDebug(d),
    onToggleMusic: () => toggleMusic(),
    onToggleAutoRotate: () => toggleAutoRotate(),
    onReset: () => resetAll(),
    onRetry: () => window.location.reload(),
  },
});

const oggSupported = (() => {
  try { const a = document.createElement('audio'); return !!(a.canPlayType && a.canPlayType('audio/ogg')); }
  catch (_) { return false; }
})();
const audio = new AmbientAudio({
  assetUrl: oggSupported ? 'assets/audio/gargantua_ambient.ogg' : 'assets/audio/gargantua_ambient.mp3',
  volume: state.params.musicVolume,
});

function createRenderer() {
  const canvas = $('#gl');
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true, // required by the screenshot API / URL automation
  });
  if (!renderer.capabilities.isWebGL2) {
    throw new Error('需要 WebGL2。请使用支持 WebGL2 的现代浏览器并启用硬件加速。');
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 1);
  renderer.autoClear = true;

  const gl = renderer.getContext();
  halfFloat = !!(gl && renderer.extensions.has('EXT_color_buffer_float'));

  renderer.debug.checkShaderErrors = true;
  renderer.debug.onShaderError = (glctx, program, vs, fs) => {
    const log = (obj) => {
      try { return obj ? glctx.getShaderInfoLog(obj) : ''; } catch (_) { return ''; }
    };
    const programLog = (() => { try { return glctx.getProgramInfoLog(program); } catch (_) { return ''; } })();
    const vsLog = log(vs);
    const fsLog = log(fs);
    const first = (vsLog || fsLog || programLog || '').split('\n').filter(Boolean).slice(0, 5).join(' | ');
    shaderFault = `着色器编译失败：${first || glctx.getError()}`;
    console.error('[GARGANTUA shader error]', { programLog, vsLog, fsLog });
  };

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    running = false;
    cancelAnimationFrame(rafId);
    persistNow();
    ui.showError('WebGL 上下文已丢失。页面将在恢复后自动重新加载…');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    setTimeout(() => window.location.reload(), 350);
  });
  canvas.addEventListener('webglcontextcreationerror', (event) => {
    ui.showError(`无法创建 WebGL 上下文：${event.statusMessage || 'unknown'}`);
  });
}

function makeTarget(w, h) {
  const options = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  };
  if (halfFloat) options.type = THREE.HalfFloatType;
  const rt = new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), options);
  if (rt.texture) {
    rt.texture.generateMipmaps = false;
    rt.texture.colorSpace = THREE.NoColorSpace;
  }
  return rt;
}

function createScenes() {
  const quadGeom = new THREE.PlaneGeometry(2, 2);

  mainUniforms = {
    uResolution: { value: new THREE.Vector2(2, 2) },
    uTime: { value: 0 },
    uFrame: { value: 0 },
    uCamPos: { value: new THREE.Vector3(0, 6, 10) },
    uCamFwd: { value: new THREE.Vector3(0, -0.5, -0.86) },
    uCamRight: { value: new THREE.Vector3(1, 0, 0) },
    uCamUp: { value: new THREE.Vector3(0, 0.86, -0.5) },
    uTanFov: { value: 0.577 },
    uAspect: { value: 1.6 },
    uDiskInner: { value: state.params.diskInner },
    uDiskOuter: { value: state.params.diskOuter },
    uDiskBrightness: { value: state.params.diskBrightness },
    uDiskOpacity: { value: state.params.diskOpacity },
    uDiskTurbulence: { value: state.params.diskTurbulence },
    uDiskSpeed: { value: state.params.diskSpeed },
    uDiskThickness: { value: state.params.diskThickness },
    uDiskTempK: { value: state.params.diskTempK },
    uStarBrightness: { value: state.params.starBrightness },
    uGalaxyBrightness: { value: state.params.galaxyBrightness },
    uStarDensity: { value: state.params.starDensity },
    uGalaxyNormal: { value: new THREE.Vector3(0.36, 0.86, 0.35).normalize() },
    uGalaxyCenter: { value: new THREE.Vector3(-0.55, 0.32, -0.77).normalize() },
    uRingBoost: { value: state.params.ringBoost },
    uMaxStepsF: { value: state.params.maxSteps },
    uStepScale: { value: state.params.stepScale },
    uSubSamplesF: { value: QUALITY_PRESETS[state.quality].samples },
    uDebug: { value: state.debug },
  };

  mainMaterial = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: MAIN_FRAG,
    uniforms: mainUniforms,
    depthTest: false,
    depthWrite: false,
  });
  const mainQuad = new THREE.Mesh(quadGeom, mainMaterial);
  mainQuad.frustumCulled = false;
  mainScene = new THREE.Scene();
  mainScene.add(mainQuad);
  mainCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Post-processing quads.
  const brightMat = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: BRIGHT_FRAG,
    uniforms: {
      uTex: { value: null },
      uThreshold: { value: state.params.bloomThreshold },
      uKnee: { value: 0.45 },
    },
    depthTest: false, depthWrite: false,
  });
  const downMat = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: DOWNSAMPLE_FRAG,
    uniforms: { uTex: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) } },
    depthTest: false, depthWrite: false,
  });
  const blurMat = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: BLUR_FRAG,
    uniforms: { uTex: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) }, uOffset: { value: 1.0 } },
    depthTest: false, depthWrite: false,
  });
  finalMaterial = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: FINAL_FRAG,
    uniforms: {
      uScene: { value: null },
      uBloom: { value: null },
      uResolution: { value: new THREE.Vector2(2, 2) },
      uTime: { value: 0 },
      uExposure: { value: state.params.exposure },
      uBloomStrength: { value: state.params.bloomStrength },
      uAberration: { value: state.params.aberration },
      uVignette: { value: state.params.vignette },
      uGrain: { value: state.params.grain },
      uSaturation: { value: state.params.saturation },
      uDebug: { value: state.debug },
      uFrame: { value: 0 },
    },
    depthTest: false, depthWrite: false,
  });

  brightQuad = new THREE.Mesh(quadGeom, brightMat);
  downQuad = new THREE.Mesh(quadGeom, downMat);
  blurQuad = new THREE.Mesh(quadGeom, blurMat);
  finalQuad = new THREE.Mesh(quadGeom, finalMaterial);
  for (const q of [brightQuad, downQuad, blurQuad, finalQuad]) {
    q.frustumCulled = false;
    q.visible = false;
  }
  postScene = new THREE.Scene();
  postScene.add(brightQuad, downQuad, blurQuad, finalQuad);
  postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}

function syncMainUniforms() {
  if (!mainUniforms) return;
  mainUniforms.uDiskInner.value = state.params.diskInner;
  mainUniforms.uDiskOuter.value = state.params.diskOuter;
  mainUniforms.uDiskBrightness.value = state.params.diskBrightness;
  mainUniforms.uDiskOpacity.value = state.params.diskOpacity;
  mainUniforms.uDiskTurbulence.value = state.params.diskTurbulence;
  mainUniforms.uDiskSpeed.value = state.params.diskSpeed;
  mainUniforms.uDiskThickness.value = state.params.diskThickness;
  mainUniforms.uDiskTempK.value = state.params.diskTempK;
  mainUniforms.uStarBrightness.value = state.params.starBrightness;
  mainUniforms.uGalaxyBrightness.value = state.params.galaxyBrightness;
  mainUniforms.uStarDensity.value = state.params.starDensity;
  mainUniforms.uRingBoost.value = state.params.ringBoost;
  mainUniforms.uMaxStepsF.value = state.params.maxSteps;
  mainUniforms.uStepScale.value = state.params.stepScale;
  mainUniforms.uSubSamplesF.value = QUALITY_PRESETS[state.quality].samples;
  mainUniforms.uDebug.value = state.debug;

  finalMaterial.uniforms.uExposure.value = state.params.exposure;
  finalMaterial.uniforms.uBloomStrength.value = state.params.bloomStrength;
  finalMaterial.uniforms.uAberration.value = state.params.aberration;
  finalMaterial.uniforms.uVignette.value = state.params.vignette;
  finalMaterial.uniforms.uGrain.value = state.params.grain;
  finalMaterial.uniforms.uSaturation.value = state.params.saturation;
  finalMaterial.uniforms.uDebug.value = state.debug;
  if (brightQuad) brightQuad.material.uniforms.uThreshold.value = state.params.bloomThreshold;
}

// ---------------------------------------------------------------------------
// Camera / presets / cinematic loop
// ---------------------------------------------------------------------------
function createCamera() {
  camera = new THREE.PerspectiveCamera(state.params.fov, 1, 0.1, 200);
  camera.position.set(0, 2.2, 8.4);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.85;
  controls.enablePan = false;
  controls.minDistance = 2.2;
  controls.maxDistance = 46.0;
  controls.addEventListener('start', () => {
    camTransition = null;
    if (state.autoRotate) toggleAutoRotate(false);
  });
}

function currentSpherical() {
  if (!camera) return state.camera || { distance: 10, polar: 1.1, azimuth: 0.8 };
  const off = v1.copy(camera.position).sub(controls.target);
  const s = new THREE.Spherical().setFromVector3(off);
  return { distance: s.radius, polar: s.phi, azimuth: s.theta };
}

function applySpherical(s) {
  const sp = new THREE.Spherical(s.distance, s.polar, s.azimuth);
  v2.setFromSpherical(sp);
  camera.position.copy(v2);
  camera.lookAt(controls.target);
  controls.update();
}

function setPreset(index, instant = false, keepFov = false) {
  if (!VIEW_PRESETS[index]) return;
  state.preset = index;
  const preset = VIEW_PRESETS[index];
  if (!keepFov) {
    state.params.fov = preset.fov;
    camera.fov = preset.fov;
  } else {
    camera.fov = state.params.fov;
  }
  camera.updateProjectionMatrix();
  const to = { distance: preset.distance, polar: preset.polar, azimuth: preset.azimuth };
  if (instant) {
    applySpherical(to);
    camTransition = null;
  } else {
    const from = currentSpherical();
    // Unwrap azimuth for a short, natural turn.
    while (to.azimuth - from.azimuth > Math.PI) from.azimuth += Math.PI * 2;
    while (to.azimuth - from.azimuth < -Math.PI) from.azimuth -= Math.PI * 2;
    camTransition = { from, to, t: 0, duration: 1.35 };
  }
  ui.updateBadges({ quality: state.quality, preset: state.preset, debug: state.debug, autoRotate: state.autoRotate });
  ui.syncParams();
  persistSoon();
  ui.toast(`${preset.label} — ${preset.desc}`);
}

function toggleAutoRotate(force) {
  state.autoRotate = typeof force === 'boolean' ? force : !state.autoRotate;
  if (state.autoRotate) {
    autoBase = currentSpherical();
    autoTime = 0;
    ui.toast('电影镜头循环已开启');
  } else {
    autoBase = null;
    ui.toast('电影镜头循环已关闭');
  }
  ui.updateBadges({ quality: state.quality, preset: state.preset, debug: state.debug, autoRotate: state.autoRotate });
  persistSoon();
}

function updateCameraAnimation(dt) {
  if (camTransition) {
    camTransition.t = Math.min(1, camTransition.t + dt / camTransition.duration);
    const t = camTransition.t;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const a = camTransition.from;
    const b = camTransition.to;
    applySpherical({
      distance: a.distance + (b.distance - a.distance) * e,
      polar: a.polar + (b.polar - a.polar) * e,
      azimuth: a.azimuth + (b.azimuth - a.azimuth) * e,
    });
    if (t >= 1) camTransition = null;
  } else if (state.autoRotate && autoBase) {
    autoTime += dt;
    applySpherical({
      distance: clamp(autoBase.distance + Math.sin(autoTime * 0.13) * 0.9, 2.4, 40),
      polar: clamp(autoBase.polar + Math.sin(autoTime * 0.081) * 0.13, 0.18, Math.PI - 0.18),
      azimuth: autoBase.azimuth + autoTime * 0.042,
    });
  } else {
    controls.update();
  }
}

function updateCameraUniforms() {
  camera.updateMatrixWorld(true);
  const e = camera.matrixWorld.elements;
  v1.set(e[0], e[1], e[2]).normalize();        // right
  v2.set(e[4], e[5], e[6]).normalize();        // up
  v3.set(-e[8], -e[9], -e[10]).normalize();    // forward (-Z)
  mainUniforms.uCamPos.value.copy(camera.position);
  mainUniforms.uCamFwd.value.copy(v3);
  mainUniforms.uCamRight.value.copy(v1);
  mainUniforms.uCamUp.value.copy(v2);
  mainUniforms.uTanFov.value = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  mainUniforms.uAspect.value = sceneRT.width / Math.max(1, sceneRT.height);
}

// ---------------------------------------------------------------------------
// Resize / quality
// ---------------------------------------------------------------------------
function currentSize() {
  const q = QUALITY_PRESETS[state.quality];
  const pr = clamp(window.devicePixelRatio || 1, 0.75, q.maxPixelRatio);
  const w = Math.max(2, Math.floor(window.innerWidth * pr * q.renderScale));
  const h = Math.max(2, Math.floor(window.innerHeight * pr * q.renderScale));
  return { w, h };
}

function resize() {
  if (!renderer) return;
  const { w, h } = currentSize();
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);

  if (sceneRT) { sceneRT.dispose(); brightRT.dispose(); bloomA.dispose(); bloomB.dispose(); }
  sceneRT = makeTarget(w, h);
  brightRT = makeTarget(w, h);
  bloomA = makeTarget(Math.max(2, w >> 1), Math.max(2, h >> 1));
  bloomB = makeTarget(Math.max(2, w >> 1), Math.max(2, h >> 1));

  mainUniforms.uResolution.value.set(w, h);
  finalMaterial.uniforms.uResolution.value.set(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function setQuality(key) {
  if (!QUALITY_PRESETS[key]) return;
  state.quality = key;
  const q = QUALITY_PRESETS[key];
  state.params.maxSteps = q.maxSteps;
  state.params.stepScale = q.stepScale;
  syncMainUniforms();
  resize();
  ui.syncParams();
  ui.updateBadges({ quality: state.quality, preset: state.preset, debug: state.debug, autoRotate: state.autoRotate });
  persistSoon();
  ui.toast(`画质档位：${q.label}`);
}

// ---------------------------------------------------------------------------
// State mutations exposed to UI / API / keyboard
// ---------------------------------------------------------------------------
function setParam(key, value) {
  const def = PARAM_DEFS.find((d) => d.key === key);
  if (!def) return;
  state.params[key] = clamp(value, def.min, def.max);
  if (key === 'fov' && camera) {
    camera.fov = state.params.fov;
    camera.updateProjectionMatrix();
  }
  if (key === 'musicVolume') audio.setVolume(state.params.musicVolume);
  syncMainUniforms();
  persistSoon();
}

function setDebug(index) {
  if (!Number.isInteger(index) || index < 0 || index > 9) return;
  state.debug = index;
  syncMainUniforms();
  ui.updateBadges({ quality: state.quality, preset: state.preset, debug: state.debug, autoRotate: state.autoRotate });
  persistSoon();
  ui.toast(`调试视图 ${index} · ${DEBUG_VIEWS[index]}`);
}

async function toggleMusic() {
  const on = await audio.toggle();
  state.musicEnabled = audio.enabled;
  ui.updateMusicButton(on);
  persistSoon();
  return on;
}

function resetAll() {
  state.quality = DEFAULT_QUALITY;
  state.params = { ...DEFAULT_PARAMS };
  state.debug = 0;
  state.autoRotate = false;
  autoBase = null;
  audio.disable();
  audio.setVolume(state.params.musicVolume);
  state.musicEnabled = false;
  ui.updateMusicButton(false);
  syncMainUniforms();
  setQuality(state.quality);
  setPreset(1, true);
  setDebug(0);
  ui.syncParams();
  ui.updateBadges({ quality: state.quality, preset: state.preset, debug: state.debug, autoRotate: state.autoRotate });
  persistSoon();
  ui.toast('已重置为默认参数');
}

// ---------------------------------------------------------------------------
// Bloom pipeline
// ---------------------------------------------------------------------------
function setQuadVisible(active) {
  brightQuad.visible = active === brightQuad;
  downQuad.visible = active === downQuad;
  blurQuad.visible = active === blurQuad;
  finalQuad.visible = active === finalQuad;
}

function renderPipeline() {
  // 1) Geodesic raytracing -> HDR scene buffer.
  renderer.setRenderTarget(sceneRT);
  renderer.render(mainScene, mainCam);

  // 2) Bright-pass threshold.
  renderer.setRenderTarget(brightRT);
  setQuadVisible(brightQuad);
  brightQuad.material.uniforms.uTex.value = sceneRT.texture;
  renderer.render(postScene, postCam);

  // 3) Downsample to half resolution.
  renderer.setRenderTarget(bloomA);
  setQuadVisible(downQuad);
  downQuad.material.uniforms.uTex.value = brightRT.texture;
  downQuad.material.uniforms.uTexel.value.set(1 / brightRT.width, 1 / brightRT.height);
  renderer.render(postScene, postCam);

  // 4) Kawase-style progressive blur, ping-pong.
  let src = bloomA;
  let dst = bloomB;
  const iterations = QUALITY_PRESETS[state.quality].blurIterations;
  for (let i = 0; i < iterations; i++) {
    renderer.setRenderTarget(dst);
    setQuadVisible(blurQuad);
    blurQuad.material.uniforms.uTex.value = src.texture;
    blurQuad.material.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
    blurQuad.material.uniforms.uOffset.value = 0.75 + i * 1.45;
    renderer.render(postScene, postCam);
    const tmp = src; src = dst; dst = tmp;
  }

  // 5) Final composite: HDR + bloom -> ACES -> vignette/grain -> sRGB.
  renderer.setRenderTarget(null);
  setQuadVisible(finalQuad);
  finalMaterial.uniforms.uScene.value = sceneRT.texture;
  finalMaterial.uniforms.uBloom.value = src.texture;
  finalMaterial.uniforms.uTime.value = elapsedTime;
  finalMaterial.uniforms.uFrame.value = frameCount;
  renderer.render(postScene, postCam);
}

// ---------------------------------------------------------------------------
// Screenshot automation API
// ---------------------------------------------------------------------------
function captureNow() {
  let dataURL = null;
  try {
    dataURL = renderer.domElement.toDataURL('image/png');
  } catch (err) {
    ui.toast(`截图失败：${err.message}`);
    return null;
  }
  window.__GARGANTUA_SHOT__ = dataURL;
  document.dispatchEvent(new CustomEvent('gargantua-shot', { detail: { dataURL } }));
  if (shotWaiter?.download) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `gargantua_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  if (shotWaiter?.resolve) shotWaiter.resolve(dataURL);
  shotWaiter = null;
  ui.toast('截图已生成 (PNG)');
  return dataURL;
}

function requestScreenshot({ waitFrames = 2, download = false } = {}) {
  return new Promise((resolve) => {
    shotWaiter = { frames: Math.max(0, waitFrames), download, resolve };
  });
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
let rafId = 0;
let resizeTimer = 0;
let lastNow = performance.now();
let fpsWindow = 0;
let fpsFrames = 0;
let fpsStart = performance.now();
let telemetryFps = 0;

function animate(now) {
  rafId = requestAnimationFrame(animate);
  if (!running) return;

  const dt = clamp((now - lastNow) / 1000, 0, 0.1);
  lastNow = now;
  elapsedTime = (performance.now() - fpsStart) / 1000; // fpsStart is module start; fine for shader time

  updateCameraAnimation(dt);
  updateCameraUniforms();

  mainUniforms.uTime.value = elapsedTime;
  mainUniforms.uFrame.value = frameCount;

  try {
    renderPipeline();
  } catch (err) {
    running = false;
    cancelAnimationFrame(rafId);
    ui.showError(`渲染异常：${err.message}`);
    console.error(err);
    return;
  }

  frameCount = (frameCount + 1) % 16777216;
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    if (shaderFault) {
      running = false;
      ui.showError(shaderFault);
      return;
    }
    ui.hideSplash();
    ui.showHUD(state.showHUD);
    ui.updateBadges({ quality: state.quality, preset: state.preset, debug: state.debug, autoRotate: state.autoRotate });
    window.__GARGANTUA_READY__ = true;
    document.dispatchEvent(new CustomEvent('gargantua-ready'));
  }

  // Telemetry.
  fpsWindow += dt;
  fpsFrames++;
  if (fpsWindow >= 0.5) {
    telemetryFps = fpsFrames / fpsWindow;
    fpsWindow = 0;
    fpsFrames = 0;
  }
  const dist = camera.position.length();
  const polarDeg = THREE.MathUtils.radToDeg(Math.acos(clamp(camera.position.y / dist, -1, 1)));
  ui.updateTelemetry({ fps: telemetryFps, dist, angle: polarDeg, width: sceneRT.width, height: sceneRT.height });

  // Screenshot waiter (URL or API).
  if (shotWaiter) {
    shotWaiter.frames--;
    if (shotWaiter.frames <= 0) captureNow();
  }
}

// ---------------------------------------------------------------------------
// Global API / keyboard / bootstrap
// ---------------------------------------------------------------------------
function setupKeyboard() {
  window.addEventListener('keydown', (event) => {
    const tag = event.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    const k = event.key;
    if (k >= '0' && k <= '9') {
      setDebug(parseInt(k, 10));
    } else if (k === 'F1' || k === 'F2' || k === 'F3' || k === 'F4') {
      event.preventDefault();
      setPreset(parseInt(k.slice(1), 10) - 1);
    } else if (k === 'h' || k === 'H') {
      const open = ui.els.panel.classList.contains('hidden');
      ui.setPanel(open);
    } else if (k === 'c' || k === 'C') {
      toggleAutoRotate();
    } else if (k === 'q' || k === 'Q') {
      const keys = Object.keys(QUALITY_PRESETS);
      const next = keys[(keys.indexOf(state.quality) + 1) % keys.length];
      setQuality(next);
    } else if (k === 'm' || k === 'M') {
      toggleMusic();
    } else if (k === 's' || k === 'S') {
      requestScreenshot({ waitFrames: 1, download: true });
    } else if (k === 'r' || k === 'R') {
      resetAll();
    }
  });
}

function cloneStateObject() {
  return {
    quality: state.quality,
    params: { ...state.params },
    preset: state.preset,
    debug: state.debug,
    autoRotate: state.autoRotate,
    musicEnabled: audio.enabled,
  };
}

function setupGlobalAPI() {
  window.GARGANTUA = {
    version: '1.0.0',
    ready: true,
    getState: () => cloneStateObject(),
    setParam: (k, v) => setParam(k, v),
    getParam: (k) => state.params[k],
    setQuality: (q) => setQuality(q),
    setPreset: (i, instant = false) => setPreset(i, instant),
    setDebug: (d) => setDebug(d),
    setAutoRotate: (on) => toggleAutoRotate(!!on),
    toggleMusic: () => toggleMusic(),
    reset: () => resetAll(),
    screenshot: (opts = {}) => {
      const waitFrames = Number.isFinite(opts.waitFrames) ? opts.waitFrames
        : Number.isFinite(opts.wait) ? Math.ceil(opts.wait / 16.67) : 2;
      return requestScreenshot({ waitFrames, download: !!opts.download });
    },
    toDataURL: () => renderer ? renderer.domElement.toDataURL('image/png') : null,
  };
}

let firstGestureBound = false;
function setupFirstGestureAudio() {
  if (firstGestureBound) return;
  firstGestureBound = true;
  const start = () => {
    if (state.musicEnabled && !audio.started) audio.enable();
  };
  window.addEventListener('pointerdown', start, { once: true });
  window.addEventListener('keydown', start, { once: true });
}

function bootstrap() {
  try {
    createRenderer();
    createScenes();
    createCamera();
    resize();

    syncMainUniforms();
    ui.syncParams();
    ui.showHUD(state.showHUD);
    ui.updateBadges({ quality: state.quality, preset: state.preset, debug: state.debug, autoRotate: state.autoRotate });
    ui.updateMusicButton(false);

    // Apply persisted or URL camera position; otherwise go to the active preset.
    if (state.camera && !urlOptions.presetSpecified && !urlScreenshotMode) {
      applySpherical(state.camera);
    } else {
      setPreset(state.preset, true, urlOptions.fovSpecified);
    }

    const scheduleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => resize(), 90);
    };
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', scheduleResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleResize);

    setupKeyboard();
    setupGlobalAPI();
    setupFirstGestureAudio();

    running = true;
    lastNow = performance.now();
    rafId = requestAnimationFrame(animate);

    if (urlScreenshotMode) {
      const waitFrames = Math.max(4, Math.ceil((urlOptions.waitMs || 700) / 16.67));
      requestScreenshot({ waitFrames, download: urlOptions.download });
    }
  } catch (err) {
    ui.showError(err.message || String(err));
    console.error(err);
  }
}

const urlScreenshotMode = urlOptions.screenshot;
window.addEventListener('beforeunload', persistNow);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persistNow();
});

bootstrap();
