import { PRIZES, VARIANTS, CATALOG_ITEMS, catalogForPool, prizeForPool, CURRENT_POOL_VERSION, prizeById, variantsFor, itemKey } from './catalog.js';
import { validRoom } from './room-state.js';
import { ownedItems } from './ownership.js';
import { validateShop } from './shop.js';
import { validateMarket } from './market.js';
export { CURRENT_POOL_VERSION, SERIES, seriesForItem, itemsForSeries, prizeForPool, catalogForPool, PRIZES, VARIANTS, CATALOG_ITEMS, prizeById, variantsFor, variantById, itemKey, itemName } from './catalog.js';
// Keep the original storage key so existing players are upgraded rather than reset.
export const STORAGE_KEY = 'magic-house:v1';
export const RULES = Object.freeze({ price: 69, initialBalance: 6900, gift: 690, total: 100 });

// Rejection sampling avoids the modulo bias of uint32 % max.
export function randomIndex(max) {
  if (!Number.isSafeInteger(max) || max < 1 || max > 2 ** 32) throw new Error('无效随机范围');
  const limit = Math.floor(2 ** 32 / max) * max;
  const buffer = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % max;
}
export function shuffled(values, random = randomIndex) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) throw new Error('无效随机索引');
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function createRound(number = 1, lastPrize = false, random = randomIndex, poolVersion = CURRENT_POOL_VERSION) {
  if (![1, 2, 3, 4].includes(poolVersion)) throw new Error('无效奖池版本');
  const pool = poolVersion === 4
    ? PRIZES.filter(p => p.id !== 'LAST').flatMap(p => {
      const styles = variantsFor(p.id, poolVersion);
      return Array.from({ length: prizeForPool(p.id, poolVersion).count }, () => {
        const index = random(styles.length);
        if (!Number.isInteger(index) || index < 0 || index >= styles.length) throw new Error('无效随机索引');
        return { prize: p.id, variant: styles[index].variant };
      });
    })
    : catalogForPool(poolVersion).filter(item => item.prize !== 'LAST').flatMap(item =>
      Array.from({ length: item.count }, () => ({ prize: item.prize, variant: item.id === item.prize ? null : item.id })),
    );
  return {
    number, poolVersion, lastPrize, lastAwarded: false,
    tickets: shuffled(pool, random).map((item, index) => ({ number: index + 1, ...item, drawn: false })),
  };
}
export function createGame(random = randomIndex) {
  return { version: 2, balance: RULES.initialBalance, spent: 0, giftCount: 0, round: createRound(1, false, random), history: [] };
}
// A new identity lets queued operations in other tabs reject the old game,
// even when both the old and the new save are on round 1. Older saves omit it.
export function resetGame(random = randomIndex) {
  return { ...createGame(random), resetId: crypto.randomUUID() };
}
export function remaining(state) { return state.round.tickets.filter(t => !t.drawn); }
export function stock(state, id, variant = undefined) {
  return remaining(state).filter(t => t.prize === id && (variant === undefined || t.variant === variant)).length;
}
export function randomTickets(state, count, random = randomIndex) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 10) throw new Error('每次可抽 1–10 签');
  const tickets = remaining(state);
  if (tickets.length < count) throw new Error('剩余签数不足，请调整抽取数量');
  return shuffled(tickets, random).slice(0, count).map(t => t.number);
}
// Tier and style are pre-bound to each ticket. Opening the gift never rerolls either.
export function draw(state, numbers, now = Date.now()) {
  if (!Array.isArray(numbers) || numbers.length < 1 || numbers.length > 10) throw new Error('每次可抽 1–10 签');
  if (new Set(numbers).size !== numbers.length) throw new Error('不能重复选择同一张签');
  const chosen = numbers.map(n => state.round.tickets.find(t => t.number === n));
  if (chosen.some(t => !t || t.drawn)) throw new Error('所选签已被抽走，请重新选择');
  const cost = numbers.length * RULES.price;
  if (state.balance < cost) throw new Error('体验积分不足，可领取免费积分后再来');
  const next = structuredClone(state);
  const results = chosen.map(t => ({ ticket: t.number, prize: t.prize, variant: t.variant }));
  for (const n of numbers) next.round.tickets[n - 1].drawn = true;
  next.balance -= cost;
  next.spent += cost;
  if (next.round.lastPrize && !next.round.lastAwarded && remaining(next).length === 0) {
    results.push({ ticket: null, prize: 'LAST', variant: null });
    next.round.lastAwarded = true;
  }
  const entry = { id: next.history.length + 1, round: next.round.number, poolVersion: next.round.poolVersion || 1, time: now, cost, results };
  next.history.push(entry);
  return { state: next, entry };
}
export function addGift(state) {
  if (state.balance > Number.MAX_SAFE_INTEGER - RULES.gift) throw new Error('积分已达上限');
  return { ...state, balance: state.balance + RULES.gift, giftCount: state.giftCount + 1 };
}
export function nextRound(state, lastPrize = false, random = randomIndex) {
  if (remaining(state).length !== 0) throw new Error('当前奖池未抽完，不能刷新或重置奖池');
  return { ...state, round: createRound(state.round.number + 1, lastPrize, random) };
}
export function collection(state) {
  const counts = Object.fromEntries(PRIZES.map(p => [p.id, 0]));
  const items = ownedItems(state);
  for (const item of CATALOG_ITEMS) counts[item.prize] += items[item.id];
  return counts;
}
export const itemCollection = ownedItems;

function validVariant(result, version) {
  const styles = variantsFor(result.prize, version);
  return styles.length
    ? styles.some(style => result.variant === (style.id === result.prize ? null : style.id))
    : result.variant === null;
}
// Validate exact tier inventory and version-specific identities; only old pools have style quotas.
function checkState(state, legacy = false) {
  const integer = n => Number.isSafeInteger(n) && n >= 0;
  if (!state || state.version !== (legacy ? 1 : 2) || !integer(state.balance) || !integer(state.spent) || !integer(state.giftCount)) return false;
  if (state.storageRevision !== undefined && !integer(state.storageRevision)) return false;
  if (state.resetId !== undefined && (typeof state.resetId !== 'string' || !/^[0-9a-f-]{36}$/.test(state.resetId))) return false;
  const r = state.round;
  if (r && ![undefined, 1, 2, 3, 4].includes(r.poolVersion)) return false;
  if (legacy && (r?.poolVersion || 1) !== 1) return false;
  if (!r || !integer(r.number) || r.number < 1 || typeof r.lastPrize !== 'boolean' || typeof r.lastAwarded !== 'boolean') return false;
  if (!Array.isArray(r.tickets) || r.tickets.length !== RULES.total || !Array.isArray(state.history)) return false;
  if (r.number > Math.floor(state.history.length / 10) + 1) return false;
  if (r.tickets.some((t, i) => !t || t.number !== i + 1 || typeof t.drawn !== 'boolean' || !prizeById(t.prize) || t.prize === 'LAST' || (!legacy && !validVariant(t, r.poolVersion || 1)))) return false;
  const pool = catalogForPool(r.poolVersion || 1);
  for (const p of PRIZES.filter(p => p.id !== 'LAST')) if (r.tickets.filter(t => t.prize === p.id).length !== prizeForPool(p.id, r.poolVersion || 1).count) return false;
  if (!legacy && (r.poolVersion || 1) < 4) for (const v of VARIANTS) if (r.tickets.filter(t => t.variant === v.id).length !== (pool.find(item => item.id === v.id)?.count || 0)) return false;
  let spent = 0, latestRound = 1;
  const rounds = new Map();
  for (const [index, e] of state.history.entries()) {
    if (!e || e.id !== index + 1 || !integer(e.round) || e.round < latestRound || e.round > r.number || !integer(e.time) || !Array.isArray(e.results)) return false;
    if (e.legacyVariants !== undefined && typeof e.legacyVariants !== 'boolean') return false;
    latestRound = e.round;
    if (![undefined, 1, 2, 3, 4].includes(e.poolVersion) || (legacy && (e.poolVersion || 1) !== 1)) return false;
    const version = e.poolVersion || 1;
    if (e.round === r.number && version !== (r.poolVersion || 1)) return false;
    if (!rounds.has(e.round)) rounds.set(e.round, { tickets: new Set(), prizes: {}, variants: {}, last: 0, version });
    const log = rounds.get(e.round);
    if (log.version !== version) return false;
    const regular = e.results.filter(x => x && x.prize !== 'LAST');
    if (regular.length < 1 || regular.length > 10 || e.cost !== regular.length * RULES.price) return false;
    for (const result of e.results) {
      if (!result || !prizeById(result.prize) || (!legacy && !validVariant(result, version))) return false;
      if (result.prize === 'LAST') {
        if (result.ticket !== null || ++log.last > 1) return false;
      } else {
        if (!Number.isInteger(result.ticket) || result.ticket < 1 || result.ticket > RULES.total || log.tickets.has(result.ticket)) return false;
        log.tickets.add(result.ticket);
        log.prizes[result.prize] = (log.prizes[result.prize] || 0) + 1;
        if (!legacy && result.variant) log.variants[result.variant] = (log.variants[result.variant] || 0) + 1;
        if (e.round === r.number) {
          const ticket = r.tickets[result.ticket - 1];
          if (!ticket.drawn || ticket.prize !== result.prize || (!legacy && ticket.variant !== result.variant)) return false;
        }
      }
    }
    if (log.last && log.tickets.size !== RULES.total) return false;
    spent += e.cost;
  }
  for (let n = 1; n < r.number; n++) if (rounds.get(n)?.tickets.size !== RULES.total) return false;
  for (const log of rounds.values()) {
    const items = catalogForPool(log.version);
    for (const p of PRIZES.filter(p => p.id !== 'LAST')) if ((log.prizes[p.id] || 0) > prizeForPool(p.id, log.version).count) return false;
    if (!legacy && log.version < 4) for (const v of VARIANTS) if ((log.variants[v.id] || 0) > (items.find(item => item.id === v.id)?.count || 0)) return false;
  }
  const current = rounds.get(r.number);
  if ((current?.tickets.size || 0) !== r.tickets.filter(t => t.drawn).length) return false;
  const expectedLast = r.lastPrize && remaining(state).length === 0;
  if (r.lastAwarded !== expectedLast || (current?.last || 0) !== Number(expectedLast)) return false;
  let shopDelta;
  try { shopDelta = validateShop(state, RULES.initialBalance, RULES.gift); } catch { return false; }
  return spent === state.spent && Number.isSafeInteger(spent) && state.balance === RULES.initialBalance + state.giftCount * RULES.gift - spent + shopDelta && validateMarket(state) && validRoom(state);
}
export function validateState(state) { try { return checkState(state); } catch { return false; } }

// V1 had no item identity below the tier. Deterministically fill in styles by ticket
// number without changing any prize tier, drawn flag, balance, or historic charge.
// Mark old receipts as backfilled rather than claiming these styles existed before.
function migrateLegacy(state) {
  const next = structuredClone(state);
  const rounds = new Map([[next.round.number, next.round.tickets]]);
  for (const e of next.history) {
    if (e.round === next.round.number) continue;
    if (!rounds.has(e.round)) rounds.set(e.round, []);
    for (const r of e.results) if (r.prize !== 'LAST') rounds.get(e.round).push({ number: r.ticket, prize: r.prize });
  }
  const assignments = new Map();
  for (const [round, tickets] of rounds) {
    const counters = {};
    for (const ticket of [...tickets].sort((a, b) => a.number - b.number)) {
      const styles = variantsFor(ticket.prize, 1).flatMap(v => Array(v.count).fill(v.id));
      const index = counters[ticket.prize] || 0;
      const variant = styles.length ? styles[index] : null;
      counters[ticket.prize] = index + 1;
      assignments.set(`${round}:${ticket.number}`, variant);
      if (round === next.round.number) ticket.variant = variant;
    }
  }
  for (const e of next.history) {
    e.legacyVariants = e.results.some(r => variantsFor(r.prize, 1).length > 0);
    for (const r of e.results) r.variant = r.prize === 'LAST' ? null : assignments.get(`${e.round}:${r.ticket}`);
  }
  next.version = 2;
  return validateState(next) ? next : null;
}
export function restoreGame(serialized) {
  try {
    const state = JSON.parse(serialized);
    if (state?.version === 1 && checkState(state, true)) return migrateLegacy(state);
    return validateState(state) ? state : null;
  } catch { return null; }
}
