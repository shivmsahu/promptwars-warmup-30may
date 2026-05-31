import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCategoryEmoji } from '../utils/categoryEmoji';
import { getGoogleMapsUrl } from '../utils/mapsLink';

const DAY_COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b'];

const TILE_URLS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};

function buildPoiPopup(poi, globalIndex, dayIndex, color, isLight) {
  const emoji = getCategoryEmoji(poi.category);
  const textClass = isLight ? 'text-slate-800' : 'text-[#dae2fd]';
  const mutedClass = isLight ? 'text-slate-500' : 'text-[#cbc3d7]/70';

  return `<div class="p-3 min-w-[200px] ${textClass}">
    <div class="flex items-center gap-2 mb-1.5">
      <span class="inline-flex w-6 h-6 rounded-full items-center justify-center text-[10px] font-bold text-white" style="background-color:${color}">${globalIndex}</span>
      <span class="text-lg">${emoji}</span>
      <span class="inline-block text-[9px] uppercase font-bold tracking-wider text-white px-2 py-0.5 rounded" style="background-color:${color}">${poi.category}</span>
    </div>
    <h3 class="font-bold text-sm leading-tight">${poi.name}</h3>
    <p class="text-[11px] ${mutedClass} mt-1">Day ${dayIndex + 1} · Stop ${globalIndex}</p>
    ${poi.openingHours && poi.openingHours !== 'Varies' ? `<p class="text-[10px] ${mutedClass} mt-1">🕒 ${poi.openingHours}</p>` : ''}
    ${poi.website ? `<a href="${poi.website}" target="_blank" rel="noreferrer" class="inline-block text-[10px] text-violet-500 hover:underline mt-2 mr-3">Visit Website ↗</a>` : ''}
    <a href="${getGoogleMapsUrl(poi)}" target="_blank" rel="noreferrer" class="inline-block text-[10px] text-cyan-500 hover:underline mt-2">Google Maps ↗</a>
  </div>`;
}

const MARKER_BOX = 44;
const MARKER_ANCHOR = MARKER_BOX / 2;

function createNumberedIcon(globalIndex, color, selected) {
  const innerSize = selected ? 36 : 32;

  return L.divIcon({
    className: 'numbered-marker-icon',
    html: `<div class="marker-slot">
      <div class="marker-dot ${selected ? 'marker-dot-selected' : ''}" style="
        width:${innerSize}px;height:${innerSize}px;
        background-color:${color};
        font-size:${selected ? 13 : 12}px;
        ${selected ? `box-shadow:0 0 0 4px ${color}55, 0 0 16px ${color}99, 0 4px 12px ${color}40;` : ''}
      ">${globalIndex}</div>
    </div>`,
    iconSize: [MARKER_BOX, MARKER_BOX],
    iconAnchor: [MARKER_ANCHOR, MARKER_ANCHOR],
    popupAnchor: [0, -MARKER_ANCHOR],
  });
}

function toLatLngPath(coordinates) {
  return coordinates.map(([lon, lat]) => [lat, lon]);
}

function poiKey(dayIdx, poiId) {
  return `${dayIdx}-${poiId}`;
}

function buildGlobalIndexMap(itineraries) {
  const globalIndexMap = {};
  let globalCounter = 0;
  itineraries.forEach((dayPOIs, dayIndex) => {
    dayPOIs.forEach((poi) => {
      globalCounter += 1;
      globalIndexMap[`${dayIndex}-${poi.id}`] = globalCounter;
    });
  });
  return globalIndexMap;
}

export default function Map({
  center,
  pois = [],
  itineraries = [],
  activeDay = null,
  theme = 'dark',
  selectedPoiKey = null,
  focusRequest = null,
  onMarkerClick,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const tileLayerRef = useRef(null);
  const layersRef = useRef(null);
  const routeLayersRef = useRef([]);
  const markersRef = useRef({});
  const markersMetaRef = useRef({});
  const onMarkerClickRef = useRef(onMarkerClick);
  const [mapLoaded, setMapLoaded] = useState(false);
  const skipNextFitRef = useRef(false);
  const lastFitKeyRef = useRef('');

  onMarkerClickRef.current = onMarkerClick;

  useEffect(() => {
    if (map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [center?.lat || 20, center?.lon || 0],
      zoom: 12,
      zoomControl: false,
    });

    tileLayerRef.current = L.tileLayer(TILE_URLS.dark, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map.current);

    layersRef.current = L.layerGroup().addTo(map.current);
    setMapLoaded(true);

    return () => {
      map.current?.remove();
      map.current = null;
      tileLayerRef.current = null;
      layersRef.current = null;
      markersRef.current = {};
      markersMetaRef.current = {};
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const url = TILE_URLS[theme] || TILE_URLS.dark;

    if (tileLayerRef.current) {
      map.current.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(url, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map.current);

    tileLayerRef.current.bringToBack();

    const container = mapContainer.current;
    if (container) {
      container.classList.toggle('map-light', theme === 'light');
    }

    // Force Leaflet to recalculate layout and reload visible tiles
    requestAnimationFrame(() => {
      map.current?.invalidateSize(true);
    });
  }, [theme, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    const resizeObserver = new ResizeObserver(() => {
      map.current?.invalidateSize();
    });

    resizeObserver.observe(mapContainer.current);
    return () => resizeObserver.disconnect();
  }, [mapLoaded]);

  useEffect(() => {
    if (map.current && center?.lon && center?.lat && !focusRequest) {
      map.current.flyTo([center.lat, center.lon], 12, { duration: 1.5 });
    }
  }, [center, mapLoaded, focusRequest]);

  useEffect(() => {
    if (!mapLoaded || !map.current || !focusRequest) return;
    skipNextFitRef.current = true;
    map.current.flyTo([focusRequest.lat, focusRequest.lon], focusRequest.zoom || 16, {
      duration: 1.2,
    });
  }, [focusRequest, mapLoaded]);

  // Build markers & routes — only when data changes, not on selection
  useEffect(() => {
    if (!mapLoaded || !map.current || !layersRef.current) return;

    layersRef.current.clearLayers();
    routeLayersRef.current.forEach((layer) => layersRef.current.removeLayer(layer.outline));
    routeLayersRef.current.forEach((layer) => layersRef.current.removeLayer(layer.route));
    routeLayersRef.current = [];
    markersRef.current = {};
    markersMetaRef.current = {};

    const bounds = L.latLngBounds([]);
    let hasPoints = false;
    const isLight = theme === 'light';
    const globalIndexMap = buildGlobalIndexMap(itineraries);

    const attachMarker = (poi, key, globalIndex, dayIndex, color, highlighted) => {
      bounds.extend([poi.lat, poi.lon]);
      hasPoints = true;

      const marker = L.marker([poi.lat, poi.lon], {
        icon: createNumberedIcon(globalIndex, color, false),
        opacity: highlighted ? 1 : 0.55,
        zIndexOffset: globalIndex,
      })
        .bindPopup(buildPoiPopup(poi, globalIndex, dayIndex, color, isLight), {
          offset: [0, -8],
          autoClose: false,
          closeOnClick: false,
          autoPan: false,
        })
        .addTo(layersRef.current);

      marker.on('click', () => {
        onMarkerClickRef.current?.({
          poiId: poi.id,
          dayIdx: dayIndex,
          globalIndex,
          key,
        });
      });

      markersRef.current[key] = marker;
      markersMetaRef.current[key] = { globalIndex, color, poi, dayIndex, isLight };
    };

    if (!itineraries || itineraries.length === 0) {
      pois.forEach((poi, idx) => {
        attachMarker(poi, `0-${poi.id}`, idx + 1, 0, '#64748b', true);
      });
    } else {
      itineraries.forEach((dayPOIs, dayIndex) => {
        const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
        const isHighlighted = activeDay === null || activeDay === dayIndex;

        dayPOIs.forEach((poi) => {
          const key = poiKey(dayIndex, poi.id);
          attachMarker(poi, key, globalIndexMap[key], dayIndex, color, isHighlighted);
        });

        if (dayPOIs.length > 1) {
          const dayRoute = dayPOIs.routeGeometry
            ? toLatLngPath(dayPOIs.routeGeometry)
            : dayPOIs.map((p) => [p.lat, p.lon]);

          const lineOpacity = isHighlighted ? 0.95 : 0.45;
          const outlineOpacity = isHighlighted ? 0.6 : 0.25;

          const outline = L.polyline(dayRoute, {
            color: isLight ? '#cbd5e1' : '#0b1326',
            weight: 7,
            opacity: outlineOpacity,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(layersRef.current);

          const route = L.polyline(dayRoute, {
            color,
            weight: 4,
            opacity: lineOpacity,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(layersRef.current);

          routeLayersRef.current.push({
            outline,
            route,
            color,
            isHighlighted,
          });
        }
      });
    }

    if (hasPoints && bounds.isValid() && !skipNextFitRef.current) {
      const fitKey = itineraries.length
        ? itineraries.map((d) => d.map((p) => p.id).join(',')).join('|')
        : pois.map((p) => p.id).join(',');

      if (fitKey !== lastFitKeyRef.current) {
        map.current.fitBounds(bounds, {
          padding: [80, 80],
          maxZoom: 14,
          animate: true,
          duration: 1.5,
        });
        lastFitKeyRef.current = fitKey;
      }
    }
    skipNextFitRef.current = false;
  }, [pois, itineraries, activeDay, mapLoaded]);

  // Refresh popup + route colors on theme change without rebuilding markers
  useEffect(() => {
    if (!mapLoaded) return;

    const isLight = theme === 'light';

    Object.entries(markersMetaRef.current).forEach(([key, meta]) => {
      const marker = markersRef.current[key];
      if (!marker) return;
      meta.isLight = isLight;
      marker.setPopupContent(
        buildPoiPopup(meta.poi, meta.globalIndex, meta.dayIndex, meta.color, isLight)
      );
    });

    routeLayersRef.current.forEach(({ outline, route, color, isHighlighted }) => {
      const lineOpacity = isHighlighted ? 0.95 : 0.45;
      const outlineOpacity = isHighlighted ? 0.6 : 0.25;
      outline.setStyle({
        color: isLight ? '#cbd5e1' : '#0b1326',
        opacity: outlineOpacity,
      });
      route.setStyle({ color, opacity: lineOpacity });
    });

    requestAnimationFrame(() => {
      map.current?.invalidateSize(true);
    });
  }, [theme, mapLoaded]);

  // Update highlight + popup without rebuilding markers
  useEffect(() => {
    if (!mapLoaded) return;

    Object.entries(markersRef.current).forEach(([key, marker]) => {
      const meta = markersMetaRef.current[key];
      if (!meta) return;

      const isSelected = selectedPoiKey === key;
      marker.setIcon(createNumberedIcon(meta.globalIndex, meta.color, isSelected));
      marker.setZIndexOffset(isSelected ? 1000 : meta.globalIndex);

      if (isSelected) {
        marker.openPopup();
      } else {
        marker.closePopup();
      }
    });
  }, [selectedPoiKey, mapLoaded]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className={`absolute inset-0 z-0 map-container ${theme === 'light' ? 'map-light' : ''}`} />
    </div>
  );
}
