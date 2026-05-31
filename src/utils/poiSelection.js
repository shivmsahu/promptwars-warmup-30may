const DEFAULT_CATEGORY_CAP = 2;

const CATEGORY_CAPS = {
  restaurant: 3,
  cafe: 3,
  museum: 3,
  attraction: 3,
  park: 3,
  monument: 2,
  gallery: 2,
  viewpoint: 2,
  garden: 2,
  theatre: 2,
  bar: 2,
  marketplace: 2,
};

function normalizeCategory(category) {
  return (category || 'poi').toLowerCase().trim();
}

/**
 * Picks a balanced mix of POIs across categories instead of taking the first N results.
 * @param {Array} pois
 * @param {number} limit
 * @returns {Array}
 */
export function selectDiversePOIs(pois, limit = 15) {
  if (!pois?.length) return [];
  if (pois.length <= limit) return [...pois];

  const byCategory = {};
  pois.forEach((poi) => {
    const cat = normalizeCategory(poi.category);
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(poi);
  });

  const categories = Object.keys(byCategory).sort(
    (a, b) => byCategory[b].length - byCategory[a].length
  );

  const selected = [];
  const pickedCounts = {};
  const pickedIds = new Set();

  const tryPick = (cat) => {
    const cap = CATEGORY_CAPS[cat] ?? DEFAULT_CATEGORY_CAP;
    const count = pickedCounts[cat] || 0;
    const pool = byCategory[cat] || [];

    if (count >= cap || count >= pool.length) return false;

    const poi = pool[count];
    if (pickedIds.has(poi.id)) return false;

    selected.push(poi);
    pickedIds.add(poi.id);
    pickedCounts[cat] = count + 1;
    return true;
  };

  let progress = true;
  while (selected.length < limit && progress) {
    progress = false;
    for (const cat of categories) {
      if (selected.length >= limit) break;
      if (tryPick(cat)) progress = true;
    }
  }

  if (selected.length < limit) {
    for (const poi of pois) {
      if (selected.length >= limit) break;
      if (!pickedIds.has(poi.id)) {
        selected.push(poi);
        pickedIds.add(poi.id);
      }
    }
  }

  return selected;
}
