'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.join(__dirname, '..');

function loadIronUI() {
  const source = fs.readFileSync(path.join(projectRoot, 'js', 'ui.js'), 'utf8');
  const document = {
    readyState: 'loading',
    body: { dataset: {} },
    addEventListener() {},
    getElementById() { return null; },
    querySelectorAll() { return []; },
  };
  const sandbox = {
    document,
    performance: { now: () => 0 },
    setTimeout,
    clearTimeout,
    Set,
    Map,
    IronData: { UNIT_TYPES: {}, BUILDING_TYPES: {}, BALANCE: { defaultDifficulty: 'normal' } },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'ui.js' });
  return sandbox.IronUI;
}

function element() {
  return {
    textContent: '',
    disabled: false,
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); },
  };
}

function classList() {
  const values = new Set();
  return {
    toggle(name, force) { force ? values.add(name) : values.delete(name); },
    contains(name) { return values.has(name); },
  };
}

function groupButton(slot) {
  const count = element();
  return {
    dataset: { controlGroup: String(slot) },
    attributes: {},
    classList: classList(),
    querySelector(selector) { return selector === '.group-slot__count' ? count : null; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    count,
  };
}

test('asset progress uses the manifest total instead of a fixed legacy count', () => {
  const IronUI = loadIronUI();
  const startButton = element();
  const startButtonLabel = element();
  const startButtonStatus = element();
  const ui = Object.create(IronUI.prototype);
  ui.elements = { startButton, startButtonLabel, startButtonStatus };
  ui.t = (key, params) => {
    if (key === 'assets.progress') return `${params.loaded}/${params.total}`;
    if (key === 'assets.status.uplink') return 'UPLINK';
    return key;
  };

  ui.updateAssetProgress({
    state: 'loading',
    total: 28,
    loaded: new Array(11).fill('loaded'),
    failed: [],
    pending: new Array(17).fill('pending'),
    idle: [],
  });

  assert.equal(startButtonLabel.textContent, '11/28');
  assert.equal(startButtonStatus.textContent, 'UPLINK');
  assert.equal(startButton.disabled, true);
  assert.equal(startButton.attributes['aria-busy'], 'true');
});

test('control group rail reports live counts and current selection', () => {
  const IronUI = loadIronUI();
  const first = groupButton(1);
  const second = groupButton(2);
  const ui = Object.create(IronUI.prototype);
  ui.elements = {
    controlGroups: {
      querySelectorAll() { return [first, second]; },
    },
  };
  ui.t = (key, params) => `${key}:${params.slot}:${params.count}`;
  const entities = new Map([
    [10, { id: 10, hp: 100 }],
    [11, { id: 11, hp: 80 }],
  ]);
  const game = {
    selectedIds: new Set([10, 11]),
    getControlGroup(slot) { return slot === '1' ? [10, 11] : []; },
    getEntity(id) { return entities.get(id) || null; },
  };

  ui.renderControlGroups(game);

  assert.equal(first.count.textContent, '2');
  assert.equal(first.attributes['aria-pressed'], 'true');
  assert.equal(first.attributes['aria-disabled'], 'false');
  assert.equal(first.classList.contains('is-active'), true);
  assert.equal(second.count.textContent, '—');
  assert.equal(second.attributes['aria-disabled'], 'true');
  assert.equal(second.classList.contains('is-empty'), true);
});

test('HUD contains nine control-group slots and the complete classic command deck', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const slots = [...html.matchAll(/data-control-group="([1-9])"/g)].map((match) => match[1]);
  const commands = [...html.matchAll(/data-command="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(slots, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  assert.deepEqual(commands, ['move', 'attackMove', 'patrol', 'hold', 'rally', 'stop']);
  assert.match(html, /<script src="js\/animation\.js[^>]*><\/script>/);
});

test('production rack exposes the airfield and fighter with localized labels and current costs', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const buildings = [...html.matchAll(/data-build="([^"]+)"/g)].map((match) => match[1]);
  const units = [...html.matchAll(/data-unit="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(buildings, ['powerPlant', 'refinery', 'barracks', 'factory', 'airfield', 'turret']);
  assert.deepEqual(units, ['rifle', 'rocket', 'scout', 'tank', 'fighter', 'harvester']);
  assert.match(html, /data-build="airfield"[\s\S]*?entity\.building\.airfield\.name[\s\S]*?<span data-cost>1500<\/span>[\s\S]*?build\.role\.airfield/);
  assert.match(html, /data-unit="fighter"[\s\S]*?entity\.unit\.fighter\.name[\s\S]*?<span data-cost>900<\/span>[\s\S]*?unit\.role\.fighter/);
});

test('index cache-busts every local stylesheet and script with the mobile release version', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const versionedResources = [...html.matchAll(/(?:href|src)="(?:css|js)\/[^"?]+\?v=([^"]+)"/g)]
    .map((match) => match[1]);

  assert.equal(versionedResources.length, 10);
  assert.deepEqual([...new Set(versionedResources)], ['20260729.1']);
  assert.doesNotMatch(html, /20260716\.4/);
});

test('bright HUD palette and compact 1024px layout remain explicit', () => {
  const css = fs.readFileSync(path.join(projectRoot, 'css', 'style.css'), 'utf8');

  assert.match(css, /--ground:\s*#71858b/);
  assert.match(css, /--friendly:\s*#25d9ff/);
  assert.match(css, /--hostile:\s*#ff654f/);
  assert.match(css, /@media \(max-width: 1120px\)/);
  assert.match(css, /\.control-group-rail/);
  assert.match(css, /grid-template-columns:\s*repeat\(9,/);
});
