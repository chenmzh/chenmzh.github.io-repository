import { CATALOG_ITEMS, itemKey } from './catalog.js';
// Lottery receipts are immutable provenance; current ownership also includes shop trades.
export function ownedItems(state) {
  const counts = Object.fromEntries(CATALOG_ITEMS.map(item => [item.id, 0]));
  for (const entry of state.history) for (const result of entry.results) counts[itemKey(result)]++;
  for (const entry of state.shop?.entries || []) counts[entry.key] += entry.side === 'buy' ? 1 : -1;
  return counts;
}
export function placedCopies(state, key) {
  return Math.max(0, ...[state.room?.items || [], ...Object.values(state.room?.layouts || {})].map(items => items.filter(item => item.key === key).length));
}
