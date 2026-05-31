import { getCategoryEmoji } from './categoryEmoji.js';
import { getGoogleMapsUrl } from './mapsLink.js';

export const MARKER_BOX = 44;
export const MARKER_ANCHOR = MARKER_BOX / 2;

export function poiKey(dayIdx, poiId) {
  return `${dayIdx}-${poiId}`;
}

export function buildGlobalIndexMap(itineraries) {
  const globalIndexMap = {};
  let globalCounter = 0;

  itineraries.forEach((dayPOIs, dayIndex) => {
    dayPOIs.forEach((poi) => {
      globalCounter += 1;
      globalIndexMap[poiKey(dayIndex, poi.id)] = globalCounter;
    });
  });

  return globalIndexMap;
}

export function buildPoiPopup(poi, globalIndex, dayIndex, color, isLight) {
  const emoji = getCategoryEmoji(poi.category);
  const textClass = isLight ? 'text-slate-800' : 'text-[#dae2fd]';
  const mutedClass = isLight ? 'text-slate-500' : 'text-[#cbc3d7]/70';

  return `<div class="p-3 min-w-[200px] ${textClass}">
    <div class="flex items-center gap-2 mb-1.5">
      <span class="inline-flex w-6 h-6 rounded-full items-center justify-center text-[10px] font-bold text-white" style="background-color:${color}">${globalIndex}</span>
      <span class="text-lg" aria-hidden="true">${emoji}</span>
      <span class="inline-block text-[9px] uppercase font-bold tracking-wider text-white px-2 py-0.5 rounded" style="background-color:${color}">${poi.category}</span>
    </div>
    <h3 class="font-bold text-sm leading-tight">${poi.name}</h3>
    <p class="text-[11px] ${mutedClass} mt-1">Day ${dayIndex + 1} · Stop ${globalIndex}</p>
    ${poi.openingHours && poi.openingHours !== 'Varies' ? `<p class="text-[10px] ${mutedClass} mt-1">Hours: ${poi.openingHours}</p>` : ''}
    ${poi.website ? `<a href="${poi.website}" target="_blank" rel="noreferrer" class="inline-block text-[10px] text-violet-500 hover:underline mt-2 mr-3">Visit Website</a>` : ''}
    <a href="${getGoogleMapsUrl(poi)}" target="_blank" rel="noreferrer" class="inline-block text-[10px] text-cyan-500 hover:underline mt-2">Open in Google Maps</a>
  </div>`;
}

export function buildMarkerHtml(globalIndex, color, selected) {
  const innerSize = selected ? 36 : 32;

  return `<div class="marker-slot">
    <div class="marker-dot ${selected ? 'marker-dot-selected' : ''}" style="
      width:${innerSize}px;height:${innerSize}px;
      background-color:${color};
      font-size:${selected ? 13 : 12}px;
      ${selected ? `box-shadow:0 0 0 4px ${color}55, 0 0 16px ${color}99, 0 4px 12px ${color}40;` : ''}
    " aria-hidden="true">${globalIndex}</div>
  </div>`;
}

export function toLatLngPath(coordinates) {
  return coordinates.map(([lon, lat]) => [lat, lon]);
}
