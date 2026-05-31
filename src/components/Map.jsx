import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DAY_COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b'];

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function buildPoiPopup(poi, dayIndex = null, index = null, color = null) {
  if (dayIndex !== null) {
    return `<div class="p-3 text-[#dae2fd] min-w-[200px]">
      <span class="inline-block text-[9px] uppercase font-bold tracking-wider text-[#0b1326] px-2 py-0.5 rounded mb-1.5" style="background-color: ${color}">${poi.category}</span>
      <h3 class="font-bold text-sm leading-tight text-[#dae2fd]">${poi.name}</h3>
      <p class="text-[11px] text-[#cbc3d7]/70 mt-1">Day ${dayIndex + 1} - Stop ${index + 1}</p>
      ${poi.openingHours && poi.openingHours !== 'Varies' ? `<p class="text-[10px] text-[#cbc3d7]/50 mt-1">🕒 ${poi.openingHours}</p>` : ''}
      ${poi.website ? `<a href="${poi.website}" target="_blank" class="inline-block text-[10px] text-[#4cd7f6] hover:underline mt-2">Visit Website ↗</a>` : ''}
    </div>`;
  }

  return `<div class="p-3 text-[#dae2fd]">
    <h3 class="font-bold text-sm text-[#d0bcff]">${poi.name}</h3>
    <p class="text-xs text-[#cbc3d7]/70 capitalize mt-1">${poi.category}</p>
  </div>`;
}

function createNumberedIcon(index, color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50%;border:2px solid white;
      display:flex;align-items:center;justify-content:center;
      font-weight:bold;color:white;font-size:12px;cursor:pointer;
      background-color:${color};box-shadow:0 4px 12px ${color}40, inset 0 2px 4px rgba(255,255,255,0.2);
    ">${index + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function toLatLngPath(coordinates) {
  return coordinates.map(([lon, lat]) => [lat, lon]);
}

export default function Map({ center, pois = [], itineraries = [], activeDay = null }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const layersRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [center?.lat || 20, center?.lon || 0],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer(TILE_URL, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map.current);

    layersRef.current = L.layerGroup().addTo(map.current);
    setMapLoaded(true);

    return () => {
      map.current?.remove();
      map.current = null;
      layersRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    const resizeObserver = new ResizeObserver(() => {
      map.current?.invalidateSize();
    });

    resizeObserver.observe(mapContainer.current);
    return () => resizeObserver.disconnect();
  }, [mapLoaded]);

  useEffect(() => {
    if (map.current && center?.lon && center?.lat) {
      map.current.flyTo([center.lat, center.lon], 12, { duration: 1.5 });
    }
  }, [center, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !map.current || !layersRef.current) return;

    layersRef.current.clearLayers();

    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    if (!itineraries || itineraries.length === 0) {
      pois.forEach((poi) => {
        bounds.extend([poi.lat, poi.lon]);
        hasPoints = true;

        L.marker([poi.lat, poi.lon])
          .bindPopup(buildPoiPopup(poi), { offset: [0, -10] })
          .addTo(layersRef.current);
      });
    } else {
      itineraries.forEach((dayPOIs, dayIndex) => {
        const isDayActive = activeDay === null || activeDay === dayIndex;
        const color = DAY_COLORS[dayIndex % DAY_COLORS.length];

        if (!isDayActive) return;

        dayPOIs.forEach((poi, index) => {
          bounds.extend([poi.lat, poi.lon]);
          hasPoints = true;

          L.marker([poi.lat, poi.lon], { icon: createNumberedIcon(index, color) })
            .bindPopup(buildPoiPopup(poi, dayIndex, index, color), { offset: [0, -10] })
            .addTo(layersRef.current);
        });

        if (dayPOIs.length > 1) {
          const dayRoute = dayPOIs.routeGeometry
            ? toLatLngPath(dayPOIs.routeGeometry)
            : dayPOIs.map((p) => [p.lat, p.lon]);

          L.polyline(dayRoute, {
            color: '#0b1326',
            weight: 6,
            opacity: 0.5,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(layersRef.current);

          L.polyline(dayRoute, {
            color,
            weight: 4,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(layersRef.current);
        }
      });
    }

    if (hasPoints && bounds.isValid()) {
      map.current.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: 14,
        animate: true,
        duration: 1.5,
      });
    }
  }, [pois, itineraries, activeDay, mapLoaded]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="absolute inset-0 z-0" />
      <div className="absolute top-4 right-4 glass-card rounded-xl p-1.5 flex flex-col gap-1 z-[1000] shadow-2xl">
        <button
          onClick={() => map.current?.zoomIn()}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[#cbc3d7] hover:bg-white/10 hover:text-white transition-all"
        >
          +
        </button>
        <button
          onClick={() => map.current?.zoomOut()}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[#cbc3d7] hover:bg-white/10 hover:text-white transition-all"
        >
          −
        </button>
      </div>
    </div>
  );
}
