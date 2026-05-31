/**
 * Groups POIs into daily itineraries using a greedy clustering approach based on distance matrix and weather conditions.
 * @param {Array} pois - List of POI objects
 * @param {Array<Array<number>>} distanceMatrix - Matrix of travel durations (seconds)
 * @param {number} days - Number of days for the itinerary
 * @param {Array} [weather] - Optional daily weather forecast list to optimize indoor/outdoor activities
 * @returns {Array<Array>} - Array of days, each containing an ordered list of POIs
 */
export function clusterPOIs(pois, distanceMatrix, days = 3, weather = []) {
  if (!pois || pois.length === 0) return [];

  const categoryKey = (poi) => (poi.category || 'poi').toLowerCase();

  const isOutdoorPOI = (poi) => {
    const cat = categoryKey(poi);
    return ['park', 'garden', 'attraction', 'monument', 'memorial', 'castle', 'viewpoint', 'theme_park'].includes(cat)
      || cat.includes('historic');
  };

  const categoryPenaltyForCluster = (cluster, poi) => {
    const cat = categoryKey(poi);
    const sameCategoryCount = cluster.filter((item) => categoryKey(item) === cat).length;
    if (sameCategoryCount === 0) return 0;
    if (sameCategoryCount === 1) return 900;
    return sameCategoryCount * 1800;
  };

  // Determine which days have inclement weather (WMO weather codes >= 51 mean rain/snow/thunderstorm)
  const dayIsRainy = weather.map(w => {
    const code = w.weatherCode;
    return typeof code === 'number' && code >= 51;
  });

  const clusters = [];
  for (let i = 0; i < days; i++) {
    clusters.push([]);
  }

  // Find seeds (K-means++ initialization logic)
  const seedIndices = [0]; // Pick the first POI as the first seed
  
  while (seedIndices.length < days && seedIndices.length < pois.length) {
    let maxDist = -1;
    let nextSeed = -1;
    
    for (let i = 0; i < pois.length; i++) {
      if (seedIndices.includes(i)) continue;
      
      let minDistToSeed = Infinity;
      for (const seedIndex of seedIndices) {
        const dist = distanceMatrix[seedIndex][i] || 0;
        if (dist < minDistToSeed) {
          minDistToSeed = dist;
        }
      }
      
      if (minDistToSeed > maxDist) {
        maxDist = minDistToSeed;
        nextSeed = i;
      }
    }
    
    if (nextSeed !== -1) {
      seedIndices.push(nextSeed);
    } else {
      break;
    }
  }

  // Assign remaining POIs to the nearest seed with weather constraints
  const unassigned = [];
  for (let i = 0; i < pois.length; i++) {
    if (!seedIndices.includes(i)) {
      unassigned.push(i);
    }
  }

  seedIndices.forEach((seedIdx, clusterIdx) => {
    clusters[clusterIdx].push(pois[seedIdx]);
  });

  for (const poiIdx of unassigned) {
    const poi = pois[poiIdx];
    const isOutdoor = isOutdoorPOI(poi);
    
    let bestCluster = 0;
    let minScore = Infinity;
    
    for (let i = 0; i < seedIndices.length; i++) {
      const seedIdx = seedIndices[i];
      const dist = distanceMatrix[seedIdx][poiIdx];
      
      // Basic balancing: discourage clusters from getting too large
      const sizePenalty = clusters[i].length * 600; // 600 seconds penalty per item
      
      // Weather penalty: if day i is rainy and this is an outdoor POI, add a penalty
      let weatherPenalty = 0;
      if (dayIsRainy[i] && isOutdoor) {
        weatherPenalty = 3600; // 1-hour travel time penalty proxy to avoid outdoor POIs on rainy days
      } else if (!dayIsRainy[i] && dayIsRainy.some(r => r) && !isOutdoor) {
        // If this day is nice, but other days are rainy, try to save indoor POIs for the rainy days
        weatherPenalty = 1800;
      }
      
      const totalScore = dist + sizePenalty + weatherPenalty + categoryPenaltyForCluster(clusters[i], poi);
      
      if (totalScore < minScore) {
        minScore = totalScore;
        bestCluster = i;
      }
    }
    
    clusters[bestCluster].push(poi);
  }

  // 2. Intra-cluster routing (Travelling Salesperson Problem approximation - Nearest Neighbor)
  const orderedClusters = clusters.map(cluster => {
    if (cluster.length <= 1) return cluster;
    
    const ordered = [cluster[0]];
    const remaining = [...cluster.slice(1)];
    
    let currentIdx = pois.findIndex(p => p.id === cluster[0].id);
    
    while (remaining.length > 0) {
      let nearestIdx = -1;
      let minDist = Infinity;
      let remainingArrayIdx = -1;
      
      for (let i = 0; i < remaining.length; i++) {
        const targetIdx = pois.findIndex(p => p.id === remaining[i].id);
        const dist = distanceMatrix[currentIdx][targetIdx];
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = targetIdx;
          remainingArrayIdx = i;
        }
      }
      
      ordered.push(remaining[remainingArrayIdx]);
      currentIdx = nearestIdx;
      remaining.splice(remainingArrayIdx, 1);
    }
    
    return ordered;
  });

  return orderedClusters;
}

