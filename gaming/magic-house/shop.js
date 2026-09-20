import { CATALOG_ITEMS, itemKey } from './catalog.js';
import { ownedItems, placedCopies } from './ownership.js';
export const SHOP_BANK = 200000;
const integer = n => Number.isSafeInteger(n) && n >= 0;
const itemById = key => CATALOG_ITEMS.find(item => item.id === key);
export function shopBase(key) {
  const item = itemById(key);
  if (!item) throw new Error('未知藏品');
  return item.shopPremium ? 260 : ({ A: 1400, B: 900, C: 600, D: 180, E: 220, F: 80, LAST: 500 })[item.prize];
}
export const shopSupply = key => ['A','B','C','LAST'].includes(itemById(key)?.prize) ? 2 : 6;
function initial() { return { stock: Object.fromEntries(CATALOG_ITEMS.map(i => [i.id, shopSupply(i.id)])), cash: SHOP_BANK, fees: 0, delta: 0 }; }
export function shopQuote(book, key, side) {
  if (!['buy','sell'].includes(side) || !itemById(key)) throw new Error('无效商店订单');
  // Marginal quotes rise when inventory is scarce; broad spread prevents a round-trip gain.
  const scarcity = Math.max(-2, Math.min(2, (shopSupply(key) - book.stock[key]) * .06));
  const mid = shopBase(key) * Math.exp(scarcity);
  const price = side === 'buy' ? Math.ceil(mid * 1.12) : Math.max(1, Math.floor(mid * .88));
  const fee = Math.max(1, Math.ceil(price * .01));
  return { price, fee, total: side === 'buy' ? price + fee : price - fee };
}
function apply(book, key, side) {
  const quote = shopQuote(book, key, side);
  if (side === 'buy') {
    if (!book.stock[key]) throw new Error('商店此款已售罄，需要有人卖回才会补货。');
    book.stock[key]--; book.cash += quote.price; book.delta -= quote.total;
  } else {
    if (book.cash < quote.price) throw new Error('商店回收资金不足，暂时无法买入。');
    book.stock[key]++; book.cash -= quote.price; book.delta += quote.total;
  }
  book.fees += quote.fee;
  return quote;
}
export function shopBook(state) {
  const book = initial();
  for (const e of state.shop?.entries || []) apply(book, e.key, e.side);
  return book;
}
export function validateShop(state, initialBalance, giftAmount) {
  if (state.shop === undefined) return 0;
  const shop = state.shop;
  if (!shop || shop.version !== 1 || !Array.isArray(shop.entries) || shop.entries.length > 10000) throw new Error('无效商店账本');
  const book = initial(), counts = Object.fromEntries(CATALOG_ITEMS.map(i => [i.id, 0]));
  let draws = 0, gifts = 0, spent = 0;
  for (const [index, e] of shop.entries.entries()) {
    if (!e || e.id !== index + 1 || !integer(e.time) || !integer(e.draws) || e.draws < draws || e.draws > state.history.length || !integer(e.gifts) || e.gifts < gifts || e.gifts > state.giftCount) throw new Error('无效商店收据');
    while (draws < e.draws) {
      const receipt = state.history[draws++]; spent += receipt.cost;
      for (const result of receipt.results) counts[itemKey(result)]++;
    }
    gifts = e.gifts;
    if (initialBalance + gifts * giftAmount - spent + book.delta < 0) throw new Error('商店历史资金不足');
    if (!itemById(e.key) || !['buy','sell'].includes(e.side) || (e.side === 'sell' && counts[e.key] < 1)) throw new Error('商店历史所有权不足');
    const quote = apply(book, e.key, e.side);
    if (['price','fee','total'].some(k => quote[k] !== e[k]) || initialBalance + gifts * giftAmount - spent + book.delta < 0) throw new Error('商店价格或资金校验失败');
    counts[e.key] += e.side === 'buy' ? 1 : -1;
  }
  return book.delta;
}
export function tradeItem(state, key, side, revision = state.shop?.entries.length || 0, now = Date.now()) {
  const entries = state.shop?.entries || [];
  if (entries.length !== revision) throw new Error('商店报价已更新，请确认新报价后重试。');
  if (entries.length >= 10000) throw new Error('商店账本已达 10,000 笔上限，原收藏和存档仍保留。');
  if (!integer(now)) throw new Error('无效时间');
  const book = shopBook(state), quote = shopQuote(book, key, side);
  if (side === 'buy' && state.balance < quote.total) throw new Error('体验积分不足。');
  if (side === 'sell' && (ownedItems(state)[key] || 0) - placedCopies(state, key) < 1) throw new Error('没有可卖出的闲置份数，请先从所有占用该份数的场景收回。');
  apply(book, key, side);
  const balance = state.balance + (side === 'buy' ? -quote.total : quote.total);
  if (!integer(balance)) throw new Error('积分超过安全范围');
  const entry = { id: entries.length + 1, key, side, ...quote, draws: state.history.length, gifts: state.giftCount, time: now };
  return { ...state, balance, shop: { version: 1, entries: [...entries, entry] } };
}
