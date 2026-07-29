'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('mobile HUD exposes production, minimap, focus, and dismiss controls', () => {
  const html = read('index.html');
  for (const id of [
    'mobile-action-bar',
    'mobile-build-button',
    'mobile-map-button',
    'mobile-focus-button',
    'mobile-rack-close',
    'mobile-map-close',
    'mobile-panel-backdrop',
  ]) assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  assert.match(html, /viewport-fit=cover/);
});

test('responsive CSS removes desktop minimums and respects touch and safe areas', () => {
  const css = read('css/style.css');
  assert.match(css, /@media\s*\([^)]*max-width:\s*760px[^)]*\)/);
  assert.match(css, /@media\s*\(max-width:\s*1024px\)[\s\S]*?\.mobile-action-bar/);
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /min-height:\s*0/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /\.mobile-action-bar/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /is-mobile-rack-open/);
  assert.match(css, /is-mobile-map-open/);
});

test('mobile drawer controller keeps classes and expanded state synchronized', () => {
  const ui = read('js/ui.js');
  assert.match(ui, /toggleMobilePanel\('rack'\)/);
  assert.match(ui, /toggleMobilePanel\('map'\)/);
  assert.match(ui, /classList\.toggle\('is-mobile-rack-open', rackOpen\)/);
  assert.match(ui, /classList\.toggle\('is-mobile-map-open', mapOpen\)/);
  assert.match(ui, /setAttribute\('aria-expanded', String\(rackOpen\)\)/);
  assert.match(ui, /setAttribute\('aria-expanded', String\(mapOpen\)\)/);
});

test('touch input uses Pointer Events and the installable app allows portrait', () => {
  const game = read('js/game.js');
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.match(game, /pointerdown/);
  assert.match(game, /pointermove/);
  assert.match(game, /pointerup/);
  assert.match(game, /pointercancel/);
  assert.equal(manifest.orientation, 'any');
});

test('mobile control translations have exact Chinese and English parity', () => {
  const source = read('js/i18n.js');
  for (const key of [
    'mobile.controls',
    'mobile.production',
    'mobile.minimap',
    'mobile.focus',
    'mobile.closeProduction',
    'mobile.closeMinimap',
    'mobile.touchHint',
  ]) {
    const occurrences = source.match(new RegExp(`['"]${key.replace('.', '\\.')}['"]\\s*:`, 'g')) || [];
    assert.equal(occurrences.length, 2, `${key} must exist in both dictionaries`);
  }
});
