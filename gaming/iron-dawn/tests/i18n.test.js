'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const IronI18n = require('../js/i18n.js');

function fakeElement(dataset) {
  const listeners = {};
  return {
    dataset: { ...(dataset || {}) },
    attributes: {},
    textContent: '',
    innerHTML: '',
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name]; },
    addEventListener(name, listener) { listeners[name] = listener; },
    click() { if (listeners.click) listeners.click(); },
  };
}

test('Chinese and English dictionaries have exact, non-empty key parity', () => {
  const zhKeys = Object.keys(IronI18n.dictionaries['zh-CN']).sort();
  const enKeys = Object.keys(IronI18n.dictionaries.en).sort();

  assert.deepEqual(enKeys, zhKeys);
  zhKeys.forEach((key) => {
    assert.ok(IronI18n.dictionaries['zh-CN'][key].trim(), `${key} is empty in zh-CN`);
    assert.ok(IronI18n.dictionaries.en[key].trim(), `${key} is empty in en`);
    assert.doesNotMatch(IronI18n.dictionaries.en[key], /[\p{Script=Han}]/u, `${key} contains Han text in en`);
  });
});

test('locale normalization handles browser variants and safely falls back to Chinese', () => {
  assert.equal(IronI18n.normalizeLocale('en-US'), 'en');
  assert.equal(IronI18n.normalizeLocale('EN-gb'), 'en');
  assert.equal(IronI18n.normalizeLocale('zh-Hans-CN'), 'zh-CN');
  assert.equal(IronI18n.normalizeLocale('fr-FR'), 'zh-CN');
});

test('translations interpolate nested entity keys and plural forms', () => {
  const i18n = IronI18n.createI18n({ locale: 'en', storage: null });

  assert.equal(i18n.t('game.insufficientCredits', {
    entity: { $t: 'entity.unit.tank.name' },
    cost: 850,
  }), 'Insufficient credits: Bastion Battle Tank requires 850.');
  assert.equal(i18n.plural('queue.remaining', 1), '1 item queued');
  assert.equal(i18n.plural('queue.remaining', 4), '4 items queued');
  assert.equal(i18n.t('missing.translation.key'), 'missing.translation.key');
});

test('both language controls stay synchronized and the choice persists', () => {
  const stored = new Map();
  const storage = {
    getItem: (key) => stored.get(key) || null,
    setItem: (key, value) => stored.set(key, value),
  };
  const title = fakeElement({ i18n: 'briefing.title' });
  const chineseA = fakeElement({ language: 'zh-CN' });
  const englishA = fakeElement({ language: 'en' });
  const chineseB = fakeElement({ language: 'zh-CN' });
  const englishB = fakeElement({ language: 'en' });
  const elements = {
    '[data-i18n]': [title],
    '[data-i18n-html]': [],
    '[data-i18n-aria-label]': [],
    '[data-i18n-title]': [],
    '[data-i18n-content]': [],
    '[data-language]': [chineseA, englishA, chineseB, englishB],
  };
  const documentRoot = {
    documentElement: { lang: '' },
    querySelectorAll: (selector) => elements[selector] || [],
  };
  const i18n = IronI18n.createI18n({ locale: 'zh-CN', storage });

  i18n.bind(documentRoot);
  englishB.click();

  assert.equal(i18n.getLocale(), 'en');
  assert.equal(documentRoot.documentElement.lang, 'en');
  assert.equal(title.textContent, 'MISSION BRIEF');
  assert.equal(chineseA.attributes['aria-pressed'], 'false');
  assert.equal(englishA.attributes['aria-pressed'], 'true');
  assert.equal(chineseB.attributes['aria-pressed'], 'false');
  assert.equal(englishB.attributes['aria-pressed'], 'true');
  assert.equal(stored.get(IronI18n.storageKey), 'en');

  const restored = IronI18n.createI18n({ storage, browserLocale: 'zh-CN' });
  assert.equal(restored.getLocale(), 'en');
});

test('storage denial never prevents an in-session language switch', () => {
  const deniedStorage = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
  };
  const i18n = IronI18n.createI18n({ storage: deniedStorage, browserLocale: 'zh-CN' });

  assert.doesNotThrow(() => i18n.setLocale('en'));
  assert.equal(i18n.getLocale(), 'en');
});

test('subscribers receive one notification per effective language change', () => {
  const i18n = IronI18n.createI18n({ locale: 'zh-CN', storage: null });
  const locales = [];
  const unsubscribe = i18n.subscribe((locale) => locales.push(locale));

  i18n.setLocale('zh-CN', { persist: false });
  i18n.setLocale('en', { persist: false });
  i18n.setLocale('en-US', { persist: false });
  i18n.setLocale('zh-Hans', { persist: false });
  unsubscribe();
  i18n.setLocale('en', { persist: false });

  assert.deepEqual(locales, ['en', 'zh-CN']);
});

test('every translation key referenced by index.html exists in both dictionaries', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const references = [...html.matchAll(/data-i18n(?:-html|-aria-label|-title|-content)?="([^"]+)"/g)]
    .map((match) => match[1]);

  assert.ok(references.length > 80);
  references.forEach((key) => {
    assert.ok(IronI18n.dictionaries['zh-CN'][key], `${key} is missing from zh-CN`);
    assert.ok(IronI18n.dictionaries.en[key], `${key} is missing from en`);
  });
});

test('classic RTS controls and control-group feedback are localized in both languages', () => {
  const zh = IronI18n.createI18n({ locale: 'zh-CN', storage: null });
  const en = IronI18n.createI18n({ locale: 'en', storage: null });

  assert.equal(zh.t('commands.attackMove'), '攻击移动');
  assert.equal(en.t('commands.attackMove'), 'ATTACK MOVE');
  assert.equal(zh.t('game.group.assigned', { slot: 4, count: 7 }), '编队 4 已保存（7 个实体）。');
  assert.equal(en.t('game.group.assigned', { slot: 4, count: 7 }), 'Control group 4 saved (7 entities).');
  assert.match(zh.t('help.groups'), /1–9|数字/);
  assert.match(en.t('help.groups'), /group/i);
  assert.equal(en.t('assets.progress', { loaded: 19, total: 28 }), 'LOADING ART ASSETS 19 / 28');
});

test('airfield, fighter, and expanded crystal guidance are localized in both languages', () => {
  const zh = IronI18n.createI18n({ locale: 'zh-CN', storage: null });
  const en = IronI18n.createI18n({ locale: 'en', storage: null });

  assert.equal(zh.t('entity.building.airfield.name'), '天穹空军基地');
  assert.equal(en.t('entity.building.airfield.name'), 'Skyforge Airfield');
  assert.equal(zh.t('entity.building.airfield.short'), '机场');
  assert.equal(en.t('entity.building.airfield.short'), 'AF');
  assert.equal(zh.t('build.role.airfield'), '空军');
  assert.equal(en.t('build.role.airfield'), 'AIR FORCE');

  assert.equal(zh.t('entity.unit.fighter.name'), '曙光截击机');
  assert.equal(en.t('entity.unit.fighter.name'), 'Dawn Interceptor');
  assert.equal(zh.t('entity.unit.fighter.short'), '截击');
  assert.equal(en.t('entity.unit.fighter.short'), 'INT');
  assert.equal(zh.t('unit.role.fighter'), '空地制空');
  assert.equal(en.t('unit.role.fighter'), 'AIR / GROUND');

  assert.match(zh.t('briefing.story2'), /晶矿藏|陆空|截击机/);
  assert.match(en.t('briefing.story2'), /crystal reserves|ground-air|interceptors/i);
  assert.match(zh.t('help.tipCopy'), /晶矿藏.*机场.*截击机/);
  assert.match(en.t('help.tipCopy'), /crystal reserves.*airfield.*interceptors/i);
  assert.match(zh.t('help.rally'), /机场/);
  assert.match(en.t('help.rally'), /airfield/i);
});
