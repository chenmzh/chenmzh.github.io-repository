// HUD / control-panel wiring. Pure DOM; all render state lives in main.js.

import { PARAM_DEFS, QUALITY_PRESETS, VIEW_PRESETS, DEBUG_VIEWS } from './config.js';

const $ = (sel) => document.querySelector(sel);

function fmtValue(def, value) {
  if (def.key === 'diskTempK' || def.key === 'starDensity' || def.key === 'fov') {
    return Number(value).toFixed(0);
  }
  if (def.step >= 1) return Number(value).toFixed(0);
  if (def.step >= 0.1) return Number(value).toFixed(1);
  return Number(value).toFixed(3);
}

export function initUI({ getState, callbacks }) {
  const els = {
    splash: $('#splash'),
    hud: $('#hud'),
    helpbar: $('#helpbar'),
    panel: $('#panel'),
    panelToggle: $('#panelToggle'),
    panelClose: $('#panelClose'),
    musicToggle: $('#musicToggle'),
    telemetry: {
      fps: $('#fps'),
      dist: $('#camDist'),
      angle: $('#camAngle'),
      res: $('#resolution'),
    },
    badges: {
      quality: $('#badgeQuality'),
      preset: $('#badgePreset'),
      debug: $('#badgeDebug'),
    },
    paramGroups: $('#paramGroups'),
    presetRow: $('#presetRow'),
    qualityRow: $('#qualityRow'),
    debugSelect: $('#debugSelect'),
    autoRotateBtn: $('#autoRotateBtn'),
    resetBtn: $('#resetBtn'),
    errorOverlay: $('#errorOverlay'),
    errorMessage: $('#errorMessage'),
    errorRetry: $('#errorRetry'),
    toast: $('#toast'),
  };

  // ---------------- parameter sliders ----------------
  const groups = new Map();
  for (const def of PARAM_DEFS) {
    if (!groups.has(def.group)) {
      const section = document.createElement('div');
      section.className = 'param-group';
      const h = document.createElement('h3');
      h.textContent = def.group;
      section.appendChild(h);
      groups.set(def.group, section);
      els.paramGroups.appendChild(section);
    }
    const section = groups.get(def.group);
    const row = document.createElement('div');
    row.className = 'param-row';

    const label = document.createElement('label');
    label.textContent = def.label;
    label.htmlFor = `param-${def.key}`;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = `param-${def.key}`;
    input.min = String(def.min);
    input.max = String(def.max);
    input.step = String(def.step);
    input.value = String(getState().params[def.key] ?? def.value);

    const output = document.createElement('output');
    output.htmlFor = input.id;
    output.textContent = fmtValue(def, input.value);

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      output.textContent = fmtValue(def, v);
      callbacks.onParam(def.key, v);
    });
    row.append(label, input, output);
    section.appendChild(row);
  }

  function syncParams() {
    const p = getState().params;
    for (const def of PARAM_DEFS) {
      const input = document.getElementById(`param-${def.key}`);
      if (!input) continue;
      const v = p[def.key] ?? def.value;
      input.value = String(v);
      const output = input.nextElementSibling;
      if (output) output.textContent = fmtValue(def, v);
    }
  }

  // ---------------- presets ----------------
  for (let i = 0; i < VIEW_PRESETS.length; i++) {
    const preset = VIEW_PRESETS[i];
    const btn = document.createElement('button');
    btn.className = 'preset-button';
    btn.type = 'button';
    btn.innerHTML = `<span>F${i + 1} · ${preset.label}</span><small>${preset.desc}</small>`;
    btn.addEventListener('click', () => callbacks.onPreset(i));
    els.presetRow.appendChild(btn);
    preset._btn = btn;
  }

  // ---------------- quality ----------------
  for (const [key, q] of Object.entries(QUALITY_PRESETS)) {
    const btn = document.createElement('button');
    btn.className = 'quality-button';
    btn.type = 'button';
    btn.textContent = q.label;
    btn.dataset.quality = key;
    btn.addEventListener('click', () => callbacks.onQuality(key));
    els.qualityRow.appendChild(btn);
    q._btn = btn;
  }

  // ---------------- debug views ----------------
  for (let i = 0; i < DEBUG_VIEWS.length; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i} · ${DEBUG_VIEWS[i]}`;
    els.debugSelect.appendChild(opt);
  }
  els.debugSelect.addEventListener('change', () => {
    callbacks.onDebug(parseInt(els.debugSelect.value, 10));
  });

  // ---------------- panel / overlays ----------------
  function setPanel(open) {
    els.panel.classList.toggle('hidden', !open);
    els.panelToggle.classList.toggle('hidden', open);
  }
  els.panelToggle.addEventListener('click', () => setPanel(true));
  els.panelClose.addEventListener('click', () => setPanel(false));
  els.musicToggle.addEventListener('click', async () => {
    const on = await callbacks.onToggleMusic();
    els.musicToggle.classList.toggle('active', on);
  });
  els.autoRotateBtn.addEventListener('click', () => callbacks.onToggleAutoRotate());
  els.resetBtn.addEventListener('click', () => callbacks.onReset());
  els.errorRetry.addEventListener('click', () => callbacks.onRetry());

  let toastTimer = 0;
  function toast(msg, ms = 1800) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.add('hidden'), ms);
  }

  return {
    els,
    syncParams,
    setPanel,
    toast,
    showError(message) {
      els.errorMessage.textContent = message;
      els.errorOverlay.classList.remove('hidden');
    },
    hideError() {
      els.errorOverlay.classList.add('hidden');
    },
    hideSplash() {
      els.splash.classList.add('fade');
      setTimeout(() => els.splash.classList.add('hidden'), 950);
    },
    showHUD(show) {
      els.hud.classList.toggle('hidden', !show);
      els.helpbar.classList.toggle('hidden', !show);
      els.panelToggle.classList.toggle('hidden', !show || !els.panel.classList.contains('hidden'));
      els.musicToggle.classList.toggle('hidden', !show);
    },
    updateTelemetry({ fps, dist, angle, width, height }) {
      els.telemetry.fps.textContent = `${fps.toFixed(0)} FPS`;
      els.telemetry.dist.textContent = `r=${dist.toFixed(2)} rs`;
      els.telemetry.angle.textContent = `θ=${angle.toFixed(1)}°`;
      els.telemetry.res.textContent = `${width}×${height}`;
    },
    updateBadges({ quality, preset, debug, autoRotate }) {
      els.badges.quality.textContent = QUALITY_PRESETS[quality]?.label || quality;
      els.badges.preset.textContent = VIEW_PRESETS[preset]?.label || '';
      els.badges.debug.textContent = `调试 ${debug} · ${DEBUG_VIEWS[debug]}`;
      els.debugSelect.value = String(debug);
      for (const [key, q] of Object.entries(QUALITY_PRESETS)) {
        q._btn.classList.toggle('active', key === quality);
      }
      for (let i = 0; i < VIEW_PRESETS.length; i++) {
        VIEW_PRESETS[i]._btn.classList.toggle('active', i === preset);
      }
      els.autoRotateBtn.classList.toggle('active', autoRotate);
    },
    updateMusicButton(on) {
      els.musicToggle.classList.toggle('active', on);
    },
  };
}
