import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildMarkerHtml } from '../utils/mapUtils.js';

const markerInstances = [];
const polylineInstances = [];
const popupHandlers = {};

const mockMap = {
  remove: vi.fn(),
  removeLayer: vi.fn(),
  addLayer: vi.fn(),
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
};

vi.mock('leaflet', () => {
  class Layer {
    addTo() { return this; }
    remove() { return this; }
    bringToBack() { return this; }
    on(event, handler) {
      if (event === 'click') this._click = handler;
      return this;
    }
    bindPopup() { return this; }
    setPopupContent() { return this; }
    setIcon() { return this; }
    setZIndexOffset() { return this; }
    openPopup() { return this; }
    closePopup() { return this; }
  }

  class Marker extends Layer {
    constructor() {
      super();
      markerInstances.push(this);
    }
  }

  class Polyline extends Layer {
    constructor() {
      super();
      polylineInstances.push(this);
      this.setStyle = vi.fn();
    }
  }

  class TileLayer extends Layer {}
  class LayerGroup extends Layer {
    clearLayers = vi.fn();
    removeLayer = vi.fn();
  }

  const latLngBounds = vi.fn(() => ({
    extend: vi.fn(),
    isValid: vi.fn(() => true),
  }));

  return {
    default: {
      map: vi.fn(() => mockMap),
      tileLayer: vi.fn(() => new TileLayer()),
      layerGroup: vi.fn(() => new LayerGroup()),
      marker: vi.fn(() => new Marker()),
      polyline: vi.fn(() => new Polyline()),
      divIcon: vi.fn((opts) => opts),
      latLngBounds,
    },
  };
});

import Map, { createNumberedIcon } from './Map.jsx';

describe('Map', () => {
  beforeEach(() => {
    markerInstances.length = 0;
    polylineInstances.length = 0;
    vi.clearAllMocks();
  });

  it('renders accessible map region', () => {
    render(
      <Map
        center={{ lat: 48.8, lon: 2.3 }}
        pois={[{ id: 1, name: 'Louvre', category: 'museum', lat: 48.8, lon: 2.3 }]}
        itineraries={[]}
        theme="dark"
      />
    );

    expect(screen.getByRole('application', { name: /interactive trip map/i })).toBeInTheDocument();
  });

  it('creates numbered div icon', () => {
    const icon = createNumberedIcon(1, '#fff', false);
    expect(icon.html).toContain(buildMarkerHtml(1, '#fff', false));
  });

  it('creates markers and routes when itineraries are provided', async () => {
    const onMarkerClick = vi.fn();
    render(
      <Map
        center={{ lat: 48.8, lon: 2.3 }}
        pois={[]}
        itineraries={[[
          { id: 1, name: 'A', category: 'museum', lat: 48.8, lon: 2.3 },
          { id: 2, name: 'B', category: 'park', lat: 48.81, lon: 2.31, routeGeometry: null },
        ]]}
        activeDay={0}
        theme="light"
        selectedPoiKey="0-1"
        onMarkerClick={onMarkerClick}
      />
    );

    expect(markerInstances.length).toBeGreaterThan(0);
    expect(polylineInstances.length).toBeGreaterThan(0);
    expect(mockMap.fitBounds).toHaveBeenCalled();

    markerInstances[0]._click?.();
    expect(onMarkerClick).toHaveBeenCalled();
  });

  it('updates when theme changes after markers are rendered', async () => {
    const { rerender } = render(
      <Map
        center={{ lat: 48.8, lon: 2.3 }}
        pois={[{ id: 1, name: 'A', category: 'museum', lat: 48.8, lon: 2.3 }]}
        itineraries={[[{ id: 1, name: 'A', category: 'museum', lat: 48.8, lon: 2.3 }]]}
        theme="dark"
      />
    );

    rerender(
      <Map
        center={{ lat: 48.8, lon: 2.3 }}
        pois={[{ id: 1, name: 'A', category: 'museum', lat: 48.8, lon: 2.3 }]}
        itineraries={[[{ id: 1, name: 'A', category: 'museum', lat: 48.8, lon: 2.3 }]]}
        theme="light"
      />
    );

    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(mockMap.invalidateSize).toHaveBeenCalled();
  });
});
