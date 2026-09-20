import { RULES, PRIZES, CATALOG_ITEMS, STORAGE_KEY, createGame, resetGame, restoreGame, remaining, stock, draw, randomTickets, addGift, nextRound, collection, itemCollection, prizeById, variantsFor, variantById, itemKey, itemName } from './game.js';
import { art } from './art.js';
import { PRIZE_IMAGES } from './prize-images.js';
import { receiptFeedback } from './rewards.js';
import { catalogForPool, prizeForPool, CURRENT_POOL_VERSION, SERIES, itemsForSeries, seriesForItem } from './catalog.js';
import { createRoom } from './room.js';
import { createMarketUI } from './market-ui.js';
import { coordinatedSave, clearCoordinatedSave, recoverCoordinatedSave } from './storage-coordinator.js';

const $ = selector => document.querySelector(selector);
const money = n => n.toLocaleString('zh-CN');
const pad = n => String(n).padStart(3, '0');
let state, storageAvailable = true, startupMessage = '', busy = false, toastTimer, currentView = 'draw', historyPage = 0;
let selected = new Set();
let revealSession = null;
let collectionGrouping = 'series', collectionSeries = 'all';
// Capture image failures before inserting any product image. Keep the original
// vector visible as a local fallback; a missing image never blocks the game.
document.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.hasAttribute('data-prize-image')) return;
  const container = image.closest('.product-visual');
  image.hidden = true;
  container.classList.add('image-failed');
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', image.alt);
  container.querySelector('.image-fallback').hidden = false;
}, true);
try {
  let raw = localStorage.getItem(STORAGE_KEY);
  state = raw ? restoreGame(raw) : null;
  if(state){raw=await recoverCoordinatedSave(STORAGE_KEY);state=raw?restoreGame(raw):null;}
  if (raw && !state) {
    localStorage.setItem(`${STORAGE_KEY}:recovery:${Date.now()}`, raw);
    startupMessage = '旧存档校验未通过，已备份并创建新的体验存档。';
  }
  if (!state) { await clearCoordinatedSave(STORAGE_KEY); state = createGame(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); await recoverCoordinatedSave(STORAGE_KEY); }
  else if (JSON.parse(raw).version === 1) {
    localStorage.setItem(`${STORAGE_KEY}:before-catalog-v2:${Date.now()}`, raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    startupMessage = '藏品已升级：积分、档位与签号保留；旧版 D–F 记录已按固定规则补全款式。';
  }
} catch {
  state ||= createGame();
  storageAvailable = false;
  startupMessage = '浏览器存储不可用：本次仅为临时体验，关闭页面后进度不保留。';
  $('.demo-label').textContent = '临时体验 · 存储不可用 · 进度不保留';
}
const poolStyles = id => variantsFor(id, state.round.poolVersion || 1);
const initialStock = (id, variant) => state.round.tickets.filter(t => t.prize === id && (variant === undefined || t.variant === (variant === id ? null : variant))).length;
const currentPrize = p => prizeForPool(p.id, state.round.poolVersion || 1);
const fallbackArt = (p, style, className = '') => (['A-01', 'B-01', 'C-01', 'D-13', 'E-23', 'F-08'].includes(style?.id) || ['household', 'dog', 'companions'].includes(p.kind) && !style?.legacy) ? `<span class="toy-art ${className}" role="img" aria-label="${style?.name || p.name}">图片暂不可用 · ${style?.name || p.name}</span>` : art(style?.legacy ? style.prize === 'D' ? 'building' : 'vehicle' : p.kind, style?.color || p.color, className, style?.motif);
const illustrate = (p, variant = null, className = '') => {
  const style = variant || CATALOG_ITEMS.find(item => item.id === p.id) || poolStyles(p.id)[0];
  const imageId = style?.id || p.id;
  const image = PRIZE_IMAGES[imageId];
  if (!image) return fallbackArt(p, style, className);
  const prominent = className.includes('flagship-art') || className.includes('detail-product');
  return `<span class="toy-art product-visual product-${p.id} ${className}" data-art-kind="${p.kind}"><img data-prize-image="${imageId}" src="${image.src}" srcset="${image.thumbnail} 480w, ${image.src} ${image.width}w" sizes="${prominent ? '(max-width: 540px) 90vw, 550px' : '(max-width: 540px) 46vw, (max-width: 800px) 30vw, 380px'}" width="${image.width}" height="${image.height}" loading="${prominent ? 'eager' : 'lazy'}" decoding="async" alt="${style?.name || p.name}，ImageGen 生成的虚拟藏品效果图"><span class="image-fallback" hidden>${fallbackArt(p, style)}</span></span>`;
};
$('#hero-art').innerHTML = `<span class="showcase-orbit" aria-hidden="true"></span>${illustrate(prizeById('A'), null, 'flagship-art')}<span class="showcase-caption">STAR PILOT <i>01 / 01</i></span>`;

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3600);
}
const roomUI = createRoom({ getState: () => state, getBusy: () => busy, transact, toast });
const marketUI = createMarketUI({ getState: () => state, getBusy: () => busy, transact, toast });
function prizeCard(p, mode = 'pool') {
  if (mode === 'pool') p = { ...currentPrize(p), count: initialStock(p.id) };
  const left = stock(state, p.id), owned = collection(state)[p.id], styles = mode === 'pool' ? poolStyles(p.id) : variantsFor(p.id);
  const isPool = mode === 'pool', isSeries = styles.length > 0;
  const preview = isSeries ? `<div class="series-preview">${styles.slice(0, 3).map(v => illustrate(p, v)).join('')}</div>` : illustrate(p);
  return `<button class="prize-card tier-${p.id} ${isSeries ? 'series-prize' : 'major-prize'} ${isPool && !left ? 'sold-out' : ''} ${!isPool && !owned ? 'unowned' : ''}" data-prize="${p.id}" aria-label="${p.id}赏 ${p.name}，${p.format}，${isPool ? `剩余${left}份` : `已收藏${owned}份`}，查看详情"><div class="prize-art" style="--tint:${p.color}38"><span class="prize-badge">${p.id === 'LAST' ? 'LAST' : p.id + '赏'}</span><span class="prize-limit">${p.id === 'LAST' ? '模拟加赠' : p.count + ' 份 / 场'}</span>${preview}<span class="product-format">${p.format}${isSeries ? ' · ' + styles.length + ' 款' : ''}</span></div><div class="prize-info"><h3>${p.name}</h3><p class="prize-subtitle">${p.subtitle}</p><div class="product-features">${(isSeries ? ['款式独立揭晓', '可能重复'] : p.features.slice(0, 2)).map(f => `<span>${f}</span>`).join('')}</div>${isPool ? `<div class="prize-stock"><span>剩余 <strong>${left}</strong> / ${p.count}</span><span>${left ? isSeries ? '查看系列全款 ↗' : '查看大娃细节 ↗' : '本场已出完'}</span></div><div class="stock-bar"><span style="width:${left / p.count * 100}%"></span></div>` : `<p class="owned-label">${owned ? `同款收藏 × ${owned}` : '等待解锁'}</p>`}</div></button>`;
}
function variantCard(p, v, mode = 'collection', counts = itemCollection(state)) {
  const owned = counts[v.id], left = stock(state, p.id, v.id === p.id ? null : v.id);
  return `<button class="variant-card ${!owned && mode === 'collection' ? 'unowned' : ''}" data-prize="${p.id}" data-variant="${v.id}" aria-label="${p.name}，${v.name}，已收藏${owned}份"><div class="variant-art" style="--tint:${v.color}35">${illustrate(p, v)}<span class="variant-code">${v.id}</span></div><h4>${v.name}</h4><p>${mode === 'pool' ? `本场剩余 ${left} / ${initialStock(p.id, v.id)}` : owned ? `已收藏 × ${owned}` : '尚未收藏'}</p></button>`;
}
function render() {
  const left = remaining(state).length;
  selected = new Set([...selected].filter(n => state.round.tickets[n - 1] && !state.round.tickets[n - 1].drawn));
  $('#balance').textContent = money(state.balance);
  const aLeft = stock(state, 'A');
  $('#featured-stock').textContent = aLeft ? `本场 A 档剩余 ${aLeft} / 1 份` : '本场 A 赏已揭晓';
  $('#featured-probability').textContent = `当前概率 ${left ? (aLeft / left * 100).toFixed(2) : '0.00'}%`;
  $('.flagship-hero').classList.toggle('is-claimed', !aLeft);
  $('#collection-count').textContent = Object.values(collection(state)).reduce((a, b) => a + b, 0);
  $('#prize-grid').innerHTML = PRIZES.filter(p => p.id !== 'LAST').map(p => prizeCard(p)).join('');
  renderJourney();
  $('#round-number').textContent = `第 ${pad(state.round.number)} 场`;
  $('#remaining-count').textContent = left;
  $('#pool-migration-note').hidden = state.round.poolVersion === CURRENT_POOL_VERSION;
  $('#progress-fill').style.width = `${left}%`;
  $('#pool-status').textContent = left ? '进行中' : '已完结';
  $('#ticket-grid').innerHTML = state.round.tickets.map(t => `<button class="ticket ${t.drawn ? 'drawn' : ''} ${selected.has(t.number) ? 'chosen' : ''}" data-ticket="${t.number}" ${t.drawn || busy ? 'disabled' : ''} aria-pressed="${selected.has(t.number)}" aria-label="${pad(t.number)}号签${t.drawn ? '，已揭晓' + t.prize + '赏' : selected.has(t.number) ? '，已选择' : '，可选择'}">${t.drawn ? t.prize + '赏' : pad(t.number)}</button>`).join('');
  renderSelection();
  $('#draw-one').disabled = busy || !left || state.balance < RULES.price;
  $('#draw-ten').disabled = busy || left < 10 || state.balance < RULES.price * 10;
  $('#random-pick').disabled = busy || !left;
  $('#next-round-box').hidden = left > 0;
  $('#next-round').disabled = busy;
  $('#last-note').textContent = state.round.lastPrize ? '✧ 本场最后一签额外赠送「晚安月亮」（模拟规则）' : '本场未启用最后赏 · 无隐藏保底机制';
  $('#gift-button').disabled = busy;
  $('#wallet-button').disabled = busy;
  $('#reset-game').disabled = busy;
  $('#confirm-reset').disabled = busy;
  if (currentView === 'room') roomUI.render();
  if (currentView === 'market') marketUI.render();
  if (currentView === 'collection') renderCollection();
  if (currentView === 'history') renderHistory();
}
function renderSelection() {
  $('#selected-count').textContent = selected.size;
  $('#total-cost').textContent = money(selected.size * RULES.price);
  $('#draw-selected').disabled = busy || !selected.size || state.balance < selected.size * RULES.price;
  $('#draw-selected').textContent = busy ? '正在收好你的惊喜…' : !selected.size ? '选择你的幸运签' : state.balance < selected.size * RULES.price ? '积分不足 · 先领取体验积分' : `开启 ${selected.size} 份惊喜  →`;
  $('#clear-selection').disabled = busy || !selected.size;
  for (const el of document.querySelectorAll('[data-ticket]:not(:disabled)')) {
    const n = Number(el.dataset.ticket), chosen = selected.has(n);
    el.classList.toggle('chosen', chosen);
    el.setAttribute('aria-pressed', String(chosen));
    el.setAttribute('aria-label', `${pad(n)}号签，${chosen ? '已选择' : '可选择'}`);
  }
}
function stat(label, value) { return `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`; }
function renderJourney() {
  const counts = itemCollection(state), ordinary = catalogForPool().filter(item => item.prize !== 'LAST');
  const unlocked = ordinary.filter(item => counts[item.id] > 0).length;
  const figures = ordinary.filter(item => ['A', 'B', 'C'].includes(item.prize));
  const figuresOwned = figures.filter(item => counts[item.id] > 0).length;
  $('#journey-count').innerHTML = `${unlocked} <small>/ ${ordinary.length}</small>`;
  $('#journey-progress').style.width = `${unlocked / ordinary.length * 100}%`;
  $('#journey-caption').textContent = `大娃 ${figuresOwned} / ${figures.length} 款 · 其他藏品 ${unlocked - figuresOwned} / ${ordinary.length - figures.length} 款 · 可跨多场慢慢收集，不保证一场集齐`;
  $('#journey-slots').innerHTML = ['A', 'B', 'C'].map(id => `<button class="journey-slot ${counts[id] ? 'collected' : ''}" data-prize="${id}" aria-label="${prizeById(id).name}，${counts[id] ? '已收藏' : '未收藏'}"><span>${id}</span><small>${counts[id] ? '已入藏 ✓' : '待相遇'}</small></button>`).join('');
}
function renderCollection() {
  const counts = itemCollection(state);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const kinds = CATALOG_ITEMS.filter(item => counts[item.id]).length;
  $('#collection-summary').innerHTML = stat('收藏总数 / 含重复', total) + stat('全部款式 / 含最后赏', `${kinds} / ${CATALOG_ITEMS.length}`) + stat('累计使用体验积分', money(state.spent));
  $('#collection-filter').innerHTML = '<option value="all">全部系列</option>' + SERIES.map(series => `<option value="${series.id}" ${collectionSeries === series.id ? 'selected' : ''}>${series.name} · ${itemsForSeries(series.id).length} 款</option>`).join('');
  $('#collection-grid').innerHTML = '';
  const groups = collectionGrouping === 'series'
    ? SERIES.map(series => ({ ...series, items: itemsForSeries(series.id) }))
    : PRIZES.map(prize => prizeForPool(prize.id)).map(prize => ({ id: prize.id, name: `${prize.id} 赏 · ${prize.name}`, description: prize.subtitle, items: CATALOG_ITEMS.filter(item => item.prize === prize.id) }));
  $('#collection-series').innerHTML = groups.map(group => {
    const styles = group.items.filter(item => collectionSeries === 'all' || item.seriesId === collectionSeries);
    if (!styles.length) return '';
    const unlocked = styles.filter(item => counts[item.id] > 0).length;
    return `<section class="series-collection" data-series="${group.id}"><div class="series-heading"><div><span class="section-kicker">SERIES COLLECTION</span><h2>${group.name} <small>${group.description}</small></h2></div><span class="series-completion">${unlocked} / ${styles.length} 款${unlocked === styles.length ? ' · 已集齐' : ''}</span></div><div class="series-progress-track" aria-label="已集齐${unlocked}款，共${styles.length}款"><i style="width:${unlocked / styles.length * 100}%"></i></div><div class="variant-grid">${styles.map(item => variantCard(prizeForPool(item.prize), item, 'collection', counts)).join('')}</div></section>`;
  }).join('');
  $('#collection-empty').hidden = total > 0;
}
$('#collection-grouping').addEventListener('change', event => { collectionGrouping = event.target.value; renderCollection(); });
$('#collection-filter').addEventListener('change', event => { collectionSeries = event.target.value; renderCollection(); });
function renderHistory() {
  const list = [...state.history].reverse(), pages = Math.ceil(list.length / 10);
  historyPage = Math.max(0, Math.min(historyPage, pages - 1));
  $('#history-summary').innerHTML = stat('累计抽取签数', state.spent / RULES.price) + stat('累计使用体验积分', money(state.spent)) + stat('当前场次', pad(state.round.number));
  if (!list.length) {
    $('#history-list').innerHTML = '<div class="empty-state"><span>⌁</span><h3>还没有抽赏记录</h3><p>你的第一份小幸运，会从这里开始记录。</p><button class="primary-button" data-view="draw">去抽一份惊喜</button></div>';
    return;
  }
  $('#history-list').innerHTML = list.slice(historyPage * 10, historyPage * 10 + 10).map(e => `<article class="history-entry"><div class="history-entry-header"><span>第 ${pad(e.round)} 场 · ${e.cost / RULES.price} 签</span><time>${new Date(e.time).toLocaleString('zh-CN', { hour12: false })}</time><strong>−${e.cost} 积分</strong><button class="text-button" data-replay="${e.id}">回看奖品 ↗</button></div><div class="history-items">${e.results.map(r => `<span class="history-chip"><b>${r.prize === 'LAST' ? 'LAST' : r.prize + '赏'}</b> ${itemName(r)}<small>${r.ticket ? '#' + pad(r.ticket) : '最后签加赠'}${r.variant ? ' · ' + r.variant : ''}</small></span>`).join('')}</div>${e.legacyVariants ? '<p class="legacy-note">旧版仅记录档位，此条系列款式由升级时补全。</p>' : ''}</article>`).join('') + `<div class="history-paging"><button class="secondary-button" data-page="-1" ${historyPage === 0 ? 'disabled' : ''}>上一页</button><span>${historyPage + 1} / ${pages}</span><button class="secondary-button" data-page="1" ${historyPage >= pages - 1 ? 'disabled' : ''}>下一页</button></div>`;
}
function setView(view) {
  if (!['draw', 'room', 'collection', 'history', 'market'].includes(view)) view = 'draw';
  if (view !== 'room') roomUI.suspend();
  currentView = view;
  for (const section of document.querySelectorAll('.view')) section.hidden = section.id !== `view-${view}`;
  for (const nav of document.querySelectorAll('.nav-item')) nav.classList.toggle('active', nav.dataset.view === view);
  if (view === 'room') roomUI.render();
  if (view === 'market') marketUI.render();
  if (view === 'collection') renderCollection();
  if (view === 'history') renderHistory();
  if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
}
function showInfo(title, html, theme = '') {
  $('#info-title').textContent = title;
  $('#info-content').innerHTML = html;
  $('#info-dialog').dataset.theme = theme;
  if (!$('#info-dialog').open) $('#info-dialog').showModal();
}
function showProbability() {
  const left = remaining(state).length;
  showInfo('奖池与实时概率', `<div class="rules-copy"><p class="rules-callout">第 ${pad(state.round.number)} 场，剩余 ${left} 签。每个签号在开场时已随机绑定奖品，抽走后不补回。以下为下一张随机签的概率，不是十连必出承诺。</p><table class="probability-table"><thead><tr><th>奖项</th><th>原创奖品</th><th>构成</th><th>剩余 / 初始</th><th>当前概率</th></tr></thead><tbody>${PRIZES.filter(p => p.id !== 'LAST').map(p => `<tr><td>${p.id}赏</td><td>${currentPrize(p).name}</td><td>${poolStyles(p.id).length ? poolStyles(p.id).length + ' 款系列' : '固定大娃'}</td><td>${stock(state, p.id)} / ${initialStock(p.id)}</td><td>${left ? (stock(state, p.id) / left * 100).toFixed(2) + '%' : '已售罄'}</td></tr>`).join('')}</tbody></table><p style="margin-top:15px">每签 69 虚拟积分，无折扣，无暗改概率。所选签号不影响公平性。档位概率按“该档剩余数 ÷ 总剩余签数”计算，显示值四舍五入。新版 A–F 每张签都预先绑定具体款式；开场时同档内等概率、独立选择款式，再绑定签号。一批可能缺少某些款式，也可能重复，可跨多场收集。单款实时概率按本场实际绑定库存计算，不会在开箱时重新随机。</p><p>最后赏：${state.round.lastPrize ? '已启用，抽走本场最后一签额外加赠，不占普通奖池。' : '未启用。'}这是本作可选模拟规则，不是经核实的官方机制。</p></div>`);
}
function showRules() {
  showInfo('小屋规则与资料来源', `<div class="rules-copy"><p class="rules-callout">本作是「魔力小屋」原创抽赏模拟器，与泡泡玛特无关联、无授权。全部奖品为原创虚拟藏品，所有藏品与小屋背景均使用 ImageGen 生成图；小屋内所有藏品均使用已验证的透明图；旧款商品详情仍保留摄影图。小狗、卡册和部分生活物品使用真实差分帧，其他互动保留轻动效。旧图失败时回退原 SVG，新物品失败时显示名称。无充值、无提现、无实物寄送。不是官方产品或官方规则的完整复刻。</p><h3>01 / 来自历史资料的体验</h3><ul><li>参考历史活动的 <b>69 元 / 次</b>形式，本作改用 <b>69 免费虚拟积分 / 签</b>。</li><li>采用分档奖品与开箱体验；不同历史场次的奖项并不一致，不宣称本作奖池是官方奖池。</li></ul><h3>02 / 本作明确的模拟设定</h3><ul><li>新场每场 100 签：A × 1、B × 2、C × 3、D × 54、E × 12、F × 28。旧场保持原比例、交通模型及全部绑定签，不会中途替换奖品；实际库存以本场概率表为准。每张签都有一份奖品，不存在空签。</li><li><b>新版 A–F 全档多品种</b>：A 新增月球漫步者，B 新增森林抱抱狐，C 新增蘑菇信使；原机械宇航员、垂耳兔和草莓精灵保留身份。同档每签独立等概率选款，可能重复，不保证一批 100 签集齐。</li><li><b>系列与档位分别展示</b>：小猫系列包含三花猫、橘猫、布偶猫和新增英短蓝猫；动物园六伙伴、全部狗狗、旧建筑和交通模型均进入新版奖池。D 新增星星抱枕、F 新增森林漫记。收藏册、市集和收藏篮可按系列筛选；同系列的款式与拥有量清楚列出。</li><li>每张签在开场时同时绑定档位与款式，抽中后按具体款式计入收藏。不是抽到档位后再另开一个奖池，不暗中替换成未收集款。</li><li>开场使用浏览器加密随机数打乱奖池，签号与奖品、款式一次性绑定；抽取不放回、不补货，刷新页面不会刷新奖池。</li><li>手选或随机选签，每次最多 10 签。十连没有额外折扣，也不保证稀有奖。已选签不会被快捷随机抽取优先使用。</li><li>选签只是暂选，点击抽取后才扣积分并揭晓。积分不足或签号无效时不扣分、不消耗库存。</li><li>本场所有签抽完才可开启下一场；积分、收藏、历史记录保留。如需从头开始，可使用页脚「重置游戏」；确认后清空整个游戏进度并恢复初始积分，与保留收藏的换场不同。</li><li>「最后赏」默认关闭。开启新场前可勾选，最后一签额外送“晚安月亮”，每场最多一次，不占 100 签名额。<b>未核实为官方规则。</b></li><li>初始赠送 6,900 积分，可免费重复领取 690 积分。这是测试补给，不是官方签到或充值活动。</li><li>奖品的“设定参考值”只用于模拟分档，不是售价、回收价或收益。重复款按数量收藏，不自动折现或分解。</li></ul><h3>藏品商店与证券沙盒</h3><p>市集可用体验积分买卖藏品（包括原有抽奖藏品），库存、回收预算、价差与费用公开。所有藏品均可买卖；猫咪、萨摩耶及动物园六伙伴也可从新版奖池抽到。旧场绑定签不改动，抽完换场才启用新池。卖出仅使用所有场景之外的闲置份数；收藏显示当前拥有量，抽赏历史永久保留。开箱的首次入藏、重复与集齐反馈只统计该收据之前的抽奖结果，商店另行记账，不代表当前可卖出数量。</p><p>股票与欧式现金结算期权使用独立模拟资金，不能与积分兑换。无借款、无裸卖空，报价含价差，成交另收费用；主动推进模拟日才会改变价格及结算到期合约。全部公司和行情均为虚构教学模型，不是真实市场、完整经济系统或投资建议。详细假设见市集底部；重置会清空商店与证券账本、持仓。</p><h3>小屋布置</h3><p>已拥有的藏品可摆放、拖动、缩放、点击互动、收回；重复款按实际数量摆放，最多同时 60 件。布局和灯光随存档保存；收回不消耗收藏，不收费，不改变概率。全部藏品在小屋内使用透明背景，不再套照片展框。陪玩模式支持小狗走跑、鼠标跟随、地板召唤、抚摸、握爪、嗅闻和睡觉；陪玩位置不写入存档，切回布置回到摆放位置。可切换原木小屋、晴日花园、雨声书房、星光露台。首次到访空场景，不沿用其他场景的摆件；返回时自动恢复该场景的位置、大小和灯光；同一收藏可用于各场景，每场仍不能超过拥有数量，不增加收藏。场景按钮按已摆出的物品开放追球、浇水、茶与故事、音乐会、听雨休息、晚安和观星。联动动作不花积分、不改变抽奖；晚安仪式会保存已摆出灯具的点亮状态，其余环境与动作仅为暂态展示。音乐盒默认静音，可主动开启点击音效。环境动效可单独关闭，动画尊重减少动态效果设置。重置游戏会一并清空所有场景布局。</p><h3>03 / 存档与公平性边界</h3><p>进度仅保存在当前浏览器 localStorage。正常刷新可恢复；清除站点数据会丢失存档，无账号或云同步。旧版存档升级保留积分、档位、签号、场次和抽取记录；旧 D/E/F 原本没有款式信息，将按签号确定性补全，并在历史记录中标明。抽取时先保存结果，再逐张或一键揭晓；关闭、跳过或回看开箱都不会重抽。首次入藏、重复数量和系列集齐仅为收藏反馈，不发放额外积分或改变概率。可在历史记录里免费回看奖品。现代浏览器使用 Web Locks 协调同源多标签页；不支持时请只使用一个标签页。所有逻辑在客户端，懂开发工具的用户可以查看奖池，因此不适用于真实付费抽奖。</p><h3>04 / 可核对的历史资料</h3><ul><li><a href="https://www.bilibili.com/video/BV13a411M7ER/" target="_blank" rel="noopener noreferrer">B站：泡泡玛特魔力屋开箱测评（2022-07-17） ↗</a>：页面简介记录分档奖品、690 元开箱体验。个人体验不代表官方概率。</li><li><a href="https://zj.tousu.sina.com.cn/complaint/view/17374767859/" target="_blank" rel="noopener noreferrer">黑猫投诉：2024 年活动用户记录 ↗</a>：提及 69 元每次、A–F 分档。属于投诉者陈述，争议指控未经本作认定。</li></ul><p>全档多品种与跨场系列收藏的结构按本次需求设计；具体角色、系列、款式数，以及 100 签、不放回、数量分布、选签、最后赏、库存展示及补给机制均为模拟设定，尚未取得官方当期规则证明。若提供官方截图，可进一步调整实现。</p></div>`);
}
function showPrize(id, variantId = null) {
  let p = prizeById(id);
  if (!p) return;
  const styles = poolStyles(id), left = remaining(state).length;
  const v = variantId ? CATALOG_ITEMS.find(item => item.prize === id && item.id === variantId) : null;
  p = v ? prizeForPool(id) : currentPrize(p);
  if (variantId && !v) return;
  if (styles.length && !v) {
    showInfo(`${id}赏 · ${p.name}系列`, `<div class="series-detail"><p class="detail-story">${p.story}</p><div class="detail-tags">${p.features.map(f => `<span>${f}</span>`).join('')}</div><p class="series-explainer">${id} 赏的候选款式如下；本场未配置的款式库存为 0。可能重复，可跨多批收集，不保证一场集齐。点击任一款查看库存和概率。</p><div class="variant-grid modal-variants">${styles.map(style => variantCard(p, style, 'pool')).join('')}</div><p class="catalog-disclaimer">款式与签号在开场时一并确定，展示或刷新不会重抽。全部为原创虚拟藏品。</p></div>`, id);
    return;
  }
  const available = stock(state, id, v ? v.id === id ? null : v.id : undefined), owned = itemCollection(state)[v?.id || id];
  const series = seriesForItem(v?.id || id);
  showInfo(`${id === 'LAST' ? '模拟最后赏' : id + '赏'} · ${series?.name || (id === 'LAST' ? '纪念摆件' : '大娃藏品')}`, `<div class="detail-stage tier-${id}"><span class="detail-edition">${v ? v.id + ' / SERIES ITEM' : id === 'A' ? 'THE STAR PILOT / COLLECTOR EDITION' : p.format}</span><div class="detail-art">${illustrate(p, v, 'detail-product')}</div></div><div class="detail-copy"><h3>${v?.name || p.name}</h3><p>${p.subtitle}</p><p class="detail-story">${v ? '这是一个独立收藏身份。再次抽到同款会计入重复数量，不会自动换成未收集款。' : p.story}</p><div class="detail-tags">${p.features.map(f => `<span>${f}</span>`).join('')}</div><div class="detail-facts"><div><span>同款收藏</span><strong>${owned}</strong></div><div><span>${id === 'LAST' ? '本场启用' : '本款剩余'}</span><strong>${id === 'LAST' ? state.round.lastPrize ? '是' : '否' : available}</strong></div><div><span>${id === 'LAST' ? '获得方式' : '下一签抽中本款'}</span><strong>${id === 'LAST' ? '最后签' : left ? (available / left * 100).toFixed(2) + '%' : '—'}</strong></div></div>${series ? `<p class="fixed-item-note">所属系列：${series.name} · ${itemsForSeries(series.id).map(item => item.name).join('、')}</p>` : ''}<p>可在市集买卖${id === 'LAST' ? '，或在启用最后赏的场次获得加赠。' : '，也可在新版抽赏中获得。本场未配置的款式剩余为 0，可跨多场收集，不保证集齐。'}</p><button class="text-button" data-view="market" data-close="info-dialog">去市集买卖 ↗</button><p class="catalog-disclaimer">原创虚拟藏品 · A–F 为 ImageGen 效果图 · 不提供实物兑换</p></div>`, id);
}

// Persist before showing any result. Cross-tab operations acquire the same origin-scoped lock.
async function transact(operation) {
  if (busy) return null;
  const expectedResetId = state.resetId;
  busy = true;
  render();
  const apply = raw => {
    const latest = storageAvailable ? restoreGame(raw) : state;
    if (!latest) throw new Error('存档发生异常，未执行本次操作。请重新加载页面。');
    state = latest;
    if (latest.resetId !== expectedResetId) {
      clearTransientState();
      throw new Error('游戏已在另一个标签页重置，本次操作未执行。请确认新进度后重试。');
    }
    return operation(latest);
  };
  const execute = async () => {
    const result = storageAvailable ? await coordinatedSave(STORAGE_KEY, apply) : apply(null);
    state = result.state || result;
    return result;
  };
  try { return navigator.locks ? await navigator.locks.request(STORAGE_KEY, execute) : await execute(); }
  catch (error) { toast(error.message || '操作未完成，请重试。'); return null; }
  finally { busy = false; render(); }
}
async function performDraw(mode) {
  const numbers = [...selected];
  const expectedRound = state.round.number;
  const result = await transact(latest => {
    if (latest.round.number !== expectedRound) throw new Error('场次已在另一个页面更新，请确认新奖池后再抽取。');
    return draw(latest, mode === 'selected' ? numbers : randomTickets(latest, mode === 'one' ? 1 : 10));
  });
  if (!result) return;
  selected.clear();
  historyPage = 0;
  render();
  showResult(result.entry);
}
function showResult(entry) {
  $('#reveal-cover').hidden = false;
  $('#revealed-results').hidden = true;
  revealSession = { entry, feedback: receiptFeedback(state, entry), opened: new Set() };
  $('#result-dialog').classList.remove('celebration-A');
  $('#result-title').textContent = '你的惊喜，已经抵达';
  $('#result-eyebrow').textContent = 'A LITTLE MOMENT, JUST FOR YOU';
  $('#result-headline').textContent = '这一份，亲手打开。';
  $('#a-celebration').hidden = true;
  $('#result-summary').hidden = true;
  $('#reveal-controls').hidden = false;
  $('#reveal-status').textContent = `已揭晓 0 / ${entry.results.length} 份`;
  $('#reveal-next').disabled = false;
  $('#reveal-all').disabled = false;
  $('#result-description').textContent = `第 ${pad(entry.round)} 场 · 消耗 ${entry.cost} 体验积分${entry.results.some(r => r.prize === 'LAST') ? ' · 含最后赏加赠' : ''}`;
  $('#result-grid').classList.toggle('single', entry.results.length === 1);
  $('#result-grid').classList.toggle('few', entry.results.length > 1 && entry.results.length <= 3);
  $('#result-grid').innerHTML = entry.results.map((r, i) => {
    const p = prizeForPool(r.prize, entry.poolVersion || 1), v = variantById(r.prize, r.variant), feedback = revealSession.feedback.results[i];
    return `<article class="result-card sealed" data-item="${itemKey(r)}" data-result-index="${i}" style="--i:${i}"><button class="reveal-card-button" data-reveal-index="${i}" aria-label="揭晓第${i + 1}份，${r.ticket ? '签号' + pad(r.ticket) : '最后赏加赠'}"><span class="sealed-emblem" aria-hidden="true">✧</span><span class="sealed-number">${r.ticket ? '#' + pad(r.ticket) : 'LAST'}</span><strong>打开这一份</strong><small>轻触揭晓</small></button><div class="revealed-item" hidden><span class="prize-badge">${r.prize === 'LAST' ? 'LAST' : r.prize + '赏'}</span>${illustrate(p, v)}<div class="result-item-copy"><span class="arrival-badge ${feedback.isNew ? 'new-arrival' : 'repeat-arrival'}">${feedback.isNew ? 'NEW · 首次入藏' : '同款收藏 × ' + feedback.ownedAfter}</span><span class="result-item-format">${v ? p.name + '系列 · ' + v.id : p.format}</span><h3>${itemName(r)}</h3><small>${r.ticket ? '幸运签号 #' + pad(r.ticket) : '最后一签 · 额外赠送'}</small></div></div></article>`;
  }).join('');
  $('#result-dialog').showModal();
  $('#reveal-button').focus();
}
function revealCard(index, focus = true) {
  if (!revealSession || $('#revealed-results').hidden || revealSession.opened.has(index)) return;
  const result = revealSession.entry.results[index];
  if (!result) return;
  revealSession.opened.add(index);
  const card = $(`[data-result-index="${index}"]`);
  card.querySelector('.reveal-card-button').hidden = true;
  card.querySelector('.revealed-item').hidden = false;
  card.classList.remove('sealed');
  card.classList.add(`tier-${result.prize}`, 'just-opened');
  if (['A', 'B', 'C'].includes(result.prize)) card.classList.add('large-figure-result');
  if (result.prize === 'A') {
    $('#result-dialog').classList.add('celebration-A');
    $('#a-celebration').hidden = false;
    $('#result-eyebrow').textContent = 'A / THE STAR PILOT HAS ARRIVED';
    $('#result-headline').textContent = '领航员，这次为你而来。';
  }
  const total = revealSession.entry.results.length, count = revealSession.opened.size;
  $('#reveal-status').textContent = `已揭晓 ${count} / ${total} 份 · ${itemName(result)} · ${revealSession.feedback.results[index].isNew ? '首次入藏' : '同款收藏'}`;
  if (count === total) {
    $('#reveal-next').disabled = true;
    $('#reveal-all').disabled = true;
    const feedback = revealSession.feedback;
    $('#result-summary').innerHTML = `<span class="summary-kicker">本次抽赏手记 · 仅统计抽奖入藏，商店另算</span><strong>${feedback.newCount ? `${feedback.newCount} 款，第一次相遇。` : '熟悉的朋友，又见面了。'}</strong><p>${feedback.newCount} 份首次入藏 · ${feedback.duplicateCount} 份重复收藏 · 普通款式已点亮 ${feedback.unlocked} / ${feedback.total}</p>${feedback.newlyCompleted.map(id => `<div class="series-achievement"><span aria-hidden="true">✧</span><div><b>${revealSession.entry.poolVersion === 4 ? SERIES.find(series => series.id === id).name : prizeForPool(id, revealSession.entry.poolVersion || 1).name} · 系列集齐</b><small>${revealSession.entry.poolVersion === 4 ? itemsForSeries(id).length : variantsFor(id, revealSession.entry.poolVersion || 1).length} 款都已收藏，去展柜看看它们吧。</small></div></div>`).join('')}`;
    $('#result-summary').hidden = false;
    if (!$('#result-dialog').classList.contains('celebration-A')) $('#result-headline').textContent = '这一刻，收进你的小世界。';
  }
  $('#result-title').textContent = $('#result-headline').textContent;
  if (focus) $(count === total ? '#see-collection' : '#reveal-next').focus({ preventScroll: true });
}
function clearTransientState() {
  selected.clear();
  historyPage = 0;
  revealSession = null;
  $('#last-prize-toggle').checked = false;
  roomUI.reset();
  marketUI.reset();
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  $('#result-grid').innerHTML = '';
  $('#result-summary').innerHTML = '';
  renderCollection();
  renderHistory();
}
async function gift() {
  const result = await transact(addGift);
  if (result) toast('已收到 690 免费体验积分，慢慢享受每一份惊喜。');
}

document.addEventListener('click', e => {
  const button = e.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.view) { setView(button.dataset.view); window.scrollTo({ top: 0, behavior: 'instant' }); }
  if (button.dataset.close) document.getElementById(button.dataset.close).close();
  if (button.dataset.prize) showPrize(button.dataset.prize, button.dataset.variant);
  if (button.dataset.revealIndex !== undefined) revealCard(Number(button.dataset.revealIndex));
  if (button.dataset.replay) {
    const entry = state.history.find(entry => entry.id === Number(button.dataset.replay));
    if (entry) showResult(entry);
  }
  if (button.dataset.page) { historyPage += Number(button.dataset.page); renderHistory(); }
  if (button.dataset.ticket) {
    const n = Number(button.dataset.ticket);
    if (selected.has(n)) selected.delete(n);
    else if (selected.size >= 10) return toast('每次最多选择 10 签，可以先抽取或清空选择。');
    else selected.add(n);
    renderSelection();
  }
});
$('#clear-selection').addEventListener('click', () => { selected.clear(); renderSelection(); });
$('#random-pick').addEventListener('click', () => { selected = new Set(randomTickets(state, 1)); renderSelection(); });
$('#draw-selected').addEventListener('click', () => performDraw('selected'));
$('#draw-one').addEventListener('click', () => performDraw('one'));
$('#draw-ten').addEventListener('click', () => performDraw('ten'));
$('#reset-game').addEventListener('click', () => {
  $('#reset-initial-balance').textContent = money(RULES.initialBalance);
  $('#reset-error').hidden = true;
  $('#reset-dialog').showModal();
  $('#cancel-reset').focus();
});
$('#confirm-reset').addEventListener('click', async () => {
  if (busy || !$('#reset-dialog').open) return;
  $('#reset-error').hidden = true;
  // Replace only the active game save, in the same lock/save-before-display
  // transaction as drawing. Never clear unrelated localStorage or backups.
  const result = await transact(() => resetGame());
  if (!result) {
    $('#reset-error').textContent = $('#toast').textContent || '重置未完成，原进度已保留。';
    $('#reset-error').hidden = false;
    return;
  }
  clearTransientState();
  setView('draw');
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
  toast(`游戏已重置，已获得 ${money(RULES.initialBalance)} 免费体验积分。`);
});
$('#gift-button').addEventListener('click', gift);
$('#wallet-button').addEventListener('click', gift);
$('#next-round').addEventListener('click', async () => {
  const lastPrize = $('#last-prize-toggle').checked;
  const result = await transact(latest => nextRound(latest, lastPrize));
  if (result) { selected.clear(); render(); toast(`第 ${pad(state.round.number)} 场已开启，收藏和积分为你保留。`); }
});
$('#reveal-button').addEventListener('click', () => {
  $('#reveal-cover').hidden = true;
  $('#revealed-results').hidden = false;
  $('#result-title').textContent = $('#result-headline').textContent;
  if (revealSession.entry.results.length === 1) revealCard(0);
  else $('#reveal-next').focus({ preventScroll: true });
  $('#result-dialog').scrollTop = 0;
});
$('#reveal-next').addEventListener('click', () => {
  if (revealSession) revealCard(revealSession.entry.results.findIndex((_, i) => !revealSession.opened.has(i)));
});
$('#reveal-all').addEventListener('click', () => {
  if (!revealSession) return;
  revealSession.entry.results.forEach((_, i) => revealCard(i, false));
  $('#see-collection').focus({ preventScroll: true });
});
$('#result-dialog').addEventListener('close', () => { revealSession = null; });
$('#see-collection').addEventListener('click', () => { $('#result-dialog').close(); setView('collection'); window.scrollTo({ top: 0, behavior: 'instant' }); });
$('#probability-button').addEventListener('click', showProbability);
$('#go-draw').addEventListener('click', () => {
  $('.draw-section').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  $('#draw-title').setAttribute('tabindex', '-1');
  $('#draw-title').focus({ preventScroll: true });
});
for (const id of ['hero-rules', 'bottom-rules']) document.getElementById(id).addEventListener('click', showRules);
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', e => {
  if (e.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
});
window.addEventListener('hashchange', () => setView(location.hash.slice(1)));
window.addEventListener('storage', e => {
  if (e.key !== STORAGE_KEY || busy) return;
  // Background tabs can receive old events after several newer transactions.
  // Reconcile the current saved value, never roll the UI back to an event payload.
  let raw;
  try { raw = localStorage.getItem(STORAGE_KEY); }
  catch { toast('暂时无法同步存档，请重新加载页面。'); return; }
  if (raw === JSON.stringify(state)) return;
  const restored = restoreGame(raw);
  if (restored) {
    const wasReset = restored.resetId !== state.resetId;
    state = restored;
    if (wasReset) clearTransientState();
    else selected.clear();
    render();
    toast(wasReset ? '游戏已在另一个标签页重置，已同步新的初始进度。' : '已同步另一个标签页的最新进度。');
  }
  else toast('存档已被清除或变更，请重新加载页面。');
});
render();
setView(location.hash.slice(1) || 'draw');
if (startupMessage) toast(startupMessage);
