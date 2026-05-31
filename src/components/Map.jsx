import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DAY_HEX_COLORS, TILE_URLS } from '../constants/dayColors';
import {
  MARKER_ANCHOR,
  MARKER_BOX,
  buildGlobalIndexMap,
  buildMarkerHtml,
  buildPoiPopup,
  poiKey,
  toLatLngPath,
} from '../utils/mapUtils';

function createNumberedIcon(globalIndex, color, selected) {
  return L.divIcon({
    className: 'numbered-marker-icon',
    html: buildMarkerHtml(globalIndex, color, selected),
    iconSize: [MARKER_BOX, MARKER_BOX],
    iconAnchor: [MARKER_ANCHOR, MARKER_ANCHOR],
    popupAnchor: [0, -MARKER_ANCHOR],
  });
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
        keyboard: true,
        title: `Stop ${globalIndex}: ${poi.name}`,
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
        attachMarker(poi, poiKey(0, poi.id), idx + 1, 0, '#64748b', true);
      });
    } else {
      itineraries.forEach((dayPOIs, dayIndex) => {
        const color = DAY_HEX_COLORS[dayIndex % DAY_HEX_COLORS.length];
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

  const stopCount = itineraries.length
    ? itineraries.reduce((sum, day) => sum + day.length, 0)
    : pois.length;

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapContainer}
        className={`absolute inset-0 z-0 map-container ${theme === 'light' ? 'map-light' : ''}`}
        role="application"
        aria-label={`Interactive trip map${stopCount ? ` showing ${stopCount} stops` : ''}. Use the itinerary list in the sidebar to select stops.`}
        tabIndex={0}
      />
    </div>
  );
}

export { createNumberedIcon };
