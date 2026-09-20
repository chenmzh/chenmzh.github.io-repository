// Collectible-linked simulated shares/options. Cents are integers; no path to lottery points.
// European options: CRR, r=0, no dividends, 252 trading days/year, multiplier ONE.
import { CATALOG_ITEMS, seriesForItem } from './catalog.js';
// Frozen historical instruments are replayed verbatim, never relabelled as collectibles.
export const LEGACY_SECURITIES = Object.freeze([
  { id: 'HOME', name: '日常工坊', item: 'D-10', sector: '生活物品', start: 10000, volatility: .32 },
  { id: 'PAWS', name: '毛绒伙伴社', item: 'E-13', sector: '猫狗藏品', start: 8000, volatility: .50 },
  { id: 'POST', name: '风景印社', item: 'F-03', sector: '插画卡册', start: 6000, volatility: .40 },
]);
const starts = { A: 28000, B: 18000, C: 12000, D: 10000, E: 8000, F: 6000, LAST: 20000 };
const volatilities = { A: .55, B: .42, C: .46, D: .32, E: .50, F: .40, LAST: .48 };
// Version-2 event move arrays use this fixed order, independent of future catalog sorting.
const V2_KEYS = ['A','A-01','B','B-01','C','C-01','D-04','D-05','D-06','D-07','D-08','D-09','D-10','D-11','D-12','D-01','D-02','D-03','D-13','E-01','E-02','E-03','E-04','E-05','E-06','E-07','E-08','E-09','E-10','E-11','E-12','E-13','E-14','E-15','E-16','E-17','E-18','E-19','E-20','E-21','E-22','E-23','F-01','F-02','F-03','F-04','F-05','F-06','F-07','F-08','LAST'];
export const SECURITIES = Object.freeze(V2_KEYS.map(id => {
  const item = CATALOG_ITEMS.find(item => item.id === id);
  return Object.freeze({ id, item: id, name: item.name, sector: seriesForItem(id).name,
    start: starts[item.prize || id], volatility: volatilities[item.prize || id] });
}));
export const MARKET_RULES = Object.freeze({ initialCash: 1000000, dealerCash: 100000000, shares: 10000, maxEvents: 4000, maxContracts: 100, multiplier: 1, rate: 0 });
const integer = n => Number.isSafeInteger(n) && n >= 0;
const security = id => SECURITIES.find(s => s.id === id) || LEGACY_SECURITIES.find(s => s.id === id);
const isLegacy = id => LEGACY_SECURITIES.some(s => s.id === id);
const cache = new WeakMap();
const keyOf = c => `${c.symbol}:${c.type}:${c.strike}:${c.expiry}`;
const feeFor = amount => amount ? Math.max(1, Math.ceil(amount * .001)) : 0;
function initial(version = 2) {
  const universe = version === 1 ? LEGACY_SECURITIES : SECURITIES;
  return { version, securities: [...universe], day: 0, revision: 0, cash: MARKET_RULES.initialCash, dealer: MARKET_RULES.dealerCash, fees: 0, realized: 0,
    prices: Object.fromEntries(universe.map(s => [s.id, s.start])),
    shares: Object.fromEntries(universe.map(s => [s.id, { qty: 0, cost: 0 }])), options: [], tape: [],
    candles: Object.fromEntries(universe.map(s => [s.id, [candle(0, s.start, s.start)]])),
    chart: Object.fromEntries(universe.map(s => [s.id, [s.start]])), settlements: [] };
}
function candle(day, open, close, range = 0, volatility = 0) {
  const wick = Math.round(open * volatility / Math.sqrt(252) * .35 * range / 1000);
  return { day, open, high: Math.max(open,close)+wick, low: Math.max(1,Math.min(open,close)-wick), close, volume: 0, turnover: 0 };
}
function upgrade(m) {
  if (m.version === 2) return;
  for (const s of SECURITIES) {
    m.prices[s.id] = s.start; m.shares[s.id] = { qty: 0, cost: 0 };
    m.chart[s.id] = [s.start]; m.candles[s.id] = [candle(m.day,s.start,s.start)];
  }
  m.version = 2; m.securities = [...SECURITIES,...LEGACY_SECURITIES];
}
export function optionValue(spot, strike, days, volatility, type) {
  if (![spot,strike,volatility].every(n => Number.isFinite(n) && n > 0) || !Number.isInteger(days) || days < 0 || days > 20 || !['call','put'].includes(type)) throw new Error('无效期权参数');
  const payoff = s => Math.max(0, type === 'call' ? s - strike : strike - s);
  if (!days) return payoff(spot);
  const u = Math.exp(volatility / Math.sqrt(252)), d = 1 / u, p = (1 - d) / (u - d);
  const values = Array.from({ length: days + 1 }, (_, up) => payoff(spot * u ** up * d ** (days - up)));
  for (let n = days; n > 0; n--) for (let j = 0; j < n; j++) values[j] = p * values[j + 1] + (1 - p) * values[j];
  return values[0];
}
export function contracts(m, symbol, term = 5) {
  if (!security(symbol) || !m.prices[symbol] || (m.version === 2 && isLegacy(symbol)) || ![5,20].includes(term)) throw new Error('无效合约');
  const step = Math.max(100, Math.round(m.prices[symbol] * .05 / 100) * 100);
  const center = Math.max(step, Math.round(m.prices[symbol] / step) * step);
  return [...new Set([Math.max(step, center-step), center, center+step])].flatMap(strike => ['call','put'].map(type => ({ symbol, type, strike, expiry: m.day + term })));
}
function validContract(m, c) {
  return c && security(c.symbol) && m.prices[c.symbol] && ['call','put'].includes(c.type) && integer(c.strike) && c.strike > 0 && integer(c.expiry) && c.expiry > m.day && c.expiry <= m.day + 20;
}
export function marketQuote(m, order) {
  if (!order || !['buy','sell'].includes(order.side) || !Number.isInteger(order.qty) || order.qty < 1 || order.qty > 100 || !security(order.symbol) || !m.prices[order.symbol]) throw new Error('订单数量须为 1–100 的整数');
  let fair, spread;
  if (order.kind === 'stock') {
    fair = m.prices[order.symbol];
    // Inventory pressure widens both sides, never moves the option settlement mark.
    spread = .004 + m.shares[order.symbol].qty / MARKET_RULES.shares * .02;
  } else if (order.kind === 'option' && validContract(m, order)) {
    fair = optionValue(m.prices[order.symbol], order.strike, order.expiry - m.day, security(order.symbol).volatility, order.type);
    spread = .06;
  } else throw new Error('无效或已到期期权');
  const bid = Math.max(0, Math.floor(fair * (1 - spread)) - (order.kind === 'option' ? 1 : 0));
  const ask = Math.ceil(fair * (1 + spread)) + (order.kind === 'option' ? 1 : 0);
  const unit = order.side === 'buy' ? ask : bid, amount = unit * order.qty, fee = feeFor(amount);
  return { fair, bid, ask, unit, amount, fee, total: order.side === 'buy' ? amount + fee : amount - fee };
}
// Full worst-branch collateral for this bounded price tree, not real-world unlimited calls.
// Ceil at each future step also covers cent rounding in the daily stock marks.
export function optionReserve(m, c) {
  if (c.type === 'put') return c.strike * c.qty;
  let top = m.prices[c.symbol];
  const u = Math.exp(security(c.symbol).volatility / Math.sqrt(252));
  for (let i = m.day; i < c.expiry; i++) top = Math.ceil(top * u);
  return Math.max(0, top - c.strike) * c.qty;
}
export const reservedCash = m => m.options.reduce((sum, c) => sum + optionReserve(m, c), 0);
function checkCash(m) {
  if (![m.cash,m.dealer,m.fees].every(integer) || m.cash + m.dealer + m.fees !== MARKET_RULES.initialCash + MARKET_RULES.dealerCash) throw new Error('市场资金守恒校验失败');
  if (m.dealer < reservedCash(m)) throw new Error('做市商可用资金不足，无法覆盖合约最坏情景。');
}
function applyTrade(m, order) {
  const q = marketQuote(m, order), buy = order.side === 'buy';
  if (buy && m.version === 2 && isLegacy(order.symbol)) throw new Error('旧版公司标的仅可卖出或平仓，不能新增持仓。');
  if (buy && m.cash < q.total) throw new Error('模拟资金不足，不能借款或用体验积分补足。');
  let holding;
  if (order.kind === 'stock') {
    holding = m.shares[order.symbol];
    if (buy && holding.qty + order.qty > MARKET_RULES.shares) throw new Error('做市商股票库存不足');
  } else {
    holding = m.options.find(c => keyOf(c) === keyOf(order));
    if (buy && !holding && ![5,20].some(term => contracts(m, order.symbol, term).some(c => keyOf(c) === keyOf(order)))) throw new Error('该合约当前没有挂牌');
    if (buy && m.options.reduce((sum,c) => sum+c.qty,0) + order.qty > MARKET_RULES.maxContracts) throw new Error('最多持有 100 张期权');
    if (buy && !holding) { holding = { symbol: order.symbol, type: order.type, strike: order.strike, expiry: order.expiry, qty: 0, cost: 0 }; m.options.push(holding); }
  }
  if (!buy && (!holding || holding.qty < order.qty)) throw new Error('持仓不足；只能卖出已有股票或平仓期权，不能裸卖空。');
  if (buy) {
    m.cash -= q.total; m.dealer += q.amount; holding.qty += order.qty; holding.cost += q.total;
  } else {
    const cost = order.qty === holding.qty ? holding.cost : Math.floor(holding.cost * order.qty / holding.qty);
    m.cash += q.total; m.dealer -= q.amount; holding.qty -= order.qty; holding.cost -= cost; m.realized += q.total - cost;
  }
  m.fees += q.fee;
  m.options = m.options.filter(c => c.qty);
  checkCash(m);
  if (order.kind === 'stock') {
    const bar = m.candles[order.symbol].at(-1);
    bar.volume += order.qty; bar.turnover += q.amount;
  }
  m.tape.push({ ...order, ...q, day: m.day, id: m.revision + 1 });
}
function applyDay(m, e) {
  if (!Array.isArray(e.moves) || e.moves.length !== m.securities.length || e.moves.some(n => ![-1,1].includes(n))) throw new Error('无效市场情景');
  if (e.ranges !== undefined && (!Array.isArray(e.ranges) || e.ranges.length !== m.securities.length || e.ranges.some(n => !integer(n) || n > 1000))) throw new Error('无效K线情景');
  m.day++; m.settlements = [];
  m.securities.forEach((s,i) => {
    const open = m.prices[s.id];
    const price = Math.round(open * Math.exp(e.moves[i] * s.volatility / Math.sqrt(252)));
    if (!integer(price) || price < 1 || price > 1000000000) throw new Error('价格达到模拟模型边界，本次推进未保存。');
    m.prices[s.id] = price; m.chart[s.id].push(price);
    if (m.chart[s.id].length > 241) m.chart[s.id].shift();
    m.candles[s.id].push(candle(m.day,open,price,e.ranges?.[i] || 0,s.volatility));
    if (m.candles[s.id].length > 241) m.candles[s.id].shift();
  });
  for (const c of m.options.filter(c => c.expiry === m.day)) {
    const payout = Math.max(0, c.type === 'call' ? m.prices[c.symbol] - c.strike : c.strike - m.prices[c.symbol]) * c.qty;
    m.cash += payout; m.dealer -= payout; m.realized += payout - c.cost;
    const receipt = { ...c, payout, realized: payout-c.cost, day: m.day, kind: 'settlement', id: m.revision+1 };
    m.settlements.push(receipt); m.tape.push(receipt);
  }
  m.options = m.options.filter(c => c.expiry > m.day);
  checkCash(m);
  m.tape.push({ kind: 'day', day: m.day, id: m.revision+1, moves: e.moves, symbols: m.securities.map(s => s.id) });
}
function apply(m, e) {
  if (!e || !integer(e.time)) throw new Error('无效市场记录');
  if (e.kind === 'day') applyDay(m,e); else applyTrade(m,e);
  m.revision++;
}
// Store only the versioned journal. Replay derives balances, positions, marks and fees,
// rather than trusting client-supplied aggregate holdings or account balances.
export function marketState(state, verify = false) {
  const journal = state.market;
  if (journal === undefined) return initial();
  if (!journal || ![1,2].includes(journal.version) || !Array.isArray(journal.events) || journal.events.length > MARKET_RULES.maxEvents) throw new Error('无效市场账本');
  const legacyCount = journal.version === 1 ? journal.events.length : journal.legacyCount;
  if (legacyCount !== undefined && (!integer(legacyCount) || legacyCount > journal.events.length)) throw new Error('无效旧账本边界');
  if (!verify && cache.has(journal)) return cache.get(journal);
  const m = initial(legacyCount === undefined ? 2 : 1);
  for (let i=0; i<journal.events.length; i++) {
    if (i === legacyCount) upgrade(m);
    apply(m,journal.events[i]);
  }
  upgrade(m);
  cache.set(journal,m);
  return m;
}
export function validateMarket(state) { try { marketState(state, true); return true; } catch { return false; } }
export function marketOrder(state, order, revision = state.market?.events.length || 0, now = Date.now()) {
  marketState(state, true); // Do not normalize an invalid/unknown journal into version 2.
  const events = state.market?.events || [];
  if (revision !== events.length) throw new Error('市场报价已更新，本次未成交。请确认新价格后重试。');
  if (events.length >= MARKET_RULES.maxEvents) throw new Error('市场达到 4,000 笔模拟记录上限，持仓与记录保留。');
  if (!order || typeof order !== 'object') throw new Error('无效订单');
  const e = order.kind === 'day' ? { kind: 'day', moves: order.moves, ...(order.ranges ? { ranges: order.ranges } : {}), time: now } : {
    kind: order.kind, symbol: order.symbol, side: order.side, qty: order.qty, time: now,
    ...(order.kind === 'option' ? { type: order.type, strike: order.strike, expiry: order.expiry } : {}),
  };
  const legacyCount = state.market?.version === 1 ? events.length : state.market?.legacyCount;
  const next = { ...state, market: { version: 2, ...(legacyCount === undefined ? {} : { legacyCount }), events: [...events,e] } };
  marketState(next, true); // Validate before returning any mutated state.
  return next;
}
export function advanceMarket(state, revision, random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2**32) {
  const sample = () => { const n=random(); if (!Number.isFinite(n) || n<0 || n>=1) throw new Error('无效随机数'); return n; };
  const universe = marketState(state).securities;
  const moves = universe.map(() => sample()<.5 ? -1 : 1);
  const ranges = universe.map(() => Math.floor(sample()*1001));
  return marketOrder(state,{kind:'day',moves,ranges},revision);
}
export function marketEquity(m) {
  return m.cash + m.securities.reduce((n,s) => n + m.shares[s.id].qty*m.prices[s.id],0) + m.options.reduce((n,c) => n + optionValue(m.prices[c.symbol],c.strike,c.expiry-m.day,security(c.symbol).volatility,c.type)*c.qty,0);
}
