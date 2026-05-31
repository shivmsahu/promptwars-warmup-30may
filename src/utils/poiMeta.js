/**
 * Builds a lookup map of POI keys to global stop index and metadata.
 */
export function buildPoiMetaMap(itineraries) {
  const meta = {};
  let globalIndex = 0;

  itineraries.forEach((dayPOIs, dayIdx) => {
    dayPOIs.forEach((poi) => {
      globalIndex += 1;
      meta[`${dayIdx}-${poi.id}`] = { globalIndex, dayIdx, poi };
    });
  });

  return meta;
}

/**
 * Sums travel time across all day routes using the routing matrix (minutes).
 */
export function computeTotalTravelMinutes(itineraries, pois, matrix) {
  let cumTime = 0;

  itineraries.forEach((day) => {
    for (let i = 0; i < day.length - 1; i += 1) {
      const fromIdx = pois.findIndex((p) => p.id === day[i].id);
      const toIdx = pois.findIndex((p) => p.id === day[i + 1].id);
      if (fromIdx !== -1 && toIdx !== -1) {
        cumTime += matrix[fromIdx][toIdx] || 0;
      }
    }
  });

  return Math.round(cumTime / 60);
}
