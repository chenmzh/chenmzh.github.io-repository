import { CATALOG_ITEMS, PRIZES, itemKey, variantsFor, catalogForPool, SERIES, seriesForItem, itemsForSeries } from './catalog.js';

// Presentation-only feedback. Reconstruct the receipt's own timeline rather than
// counting later draws from another tab. Nothing here changes any game state.
export function receiptFeedback(state, entry) {
  const counts = Object.fromEntries(CATALOG_ITEMS.map(item => [item.id, 0]));
  for (const earlier of state.history) {
    if (earlier.id >= entry.id) continue;
    for (const result of earlier.results) counts[itemKey(result)]++;
  }
  const version = entry.poolVersion || 1;
  const stylesFor = id => version === 4 ? itemsForSeries(id) : variantsFor(id, version);
  const ordinary = catalogForPool(version).filter(item => item.prize !== 'LAST');
  // Historical receipts retain their tier-based milestones. V4 uses primary series,
  // including cross-tier dogs; the optional bonus is never a completion milestone.
  const series = version === 4 ? SERIES.filter(s => s.id !== 'bonus') : PRIZES.filter(p => stylesFor(p.id).length);
  const completed = new Set(series.filter(p => stylesFor(p.id).every(v => counts[v.id] > 0)).map(p => p.id));
  const newlyCompleted = [];
  const results = entry.results.map(result => {
    const key = itemKey(result), before = counts[key];
    counts[key]++;
    const seriesId = version === 4 ? seriesForItem(key)?.id : result.prize;
    const styles = seriesId === 'bonus' ? [] : stylesFor(seriesId);
    const completesSeries = styles.length > 0 && !completed.has(seriesId) && styles.every(v => counts[v.id] > 0);
    if (completesSeries) { completed.add(seriesId); newlyCompleted.push(seriesId); }
    return { key, isNew: before === 0, ownedAfter: counts[key], completesSeries };
  });
  return {
    results,
    newCount: results.filter(r => r.isNew).length,
    duplicateCount: results.filter(r => !r.isNew).length,
    newlyCompleted,
    unlocked: ordinary.filter(item => counts[item.id] > 0).length,
    total: ordinary.length,
  };
}
