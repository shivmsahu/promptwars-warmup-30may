# Traveler Pro — AI Travel Planning POC

A zero-infrastructure travel planner that turns a destination and trip length into a multi-day itinerary with an interactive map. Enter a city, pick your dates, and the app discovers nearby points of interest, clusters them into daily routes, and renders everything on a Leaflet map — using free public APIs by default.

## What it does

1. **Geocode** the destination into coordinates
2. **Discover POIs** (museums, parks, restaurants, historic sites, and more) within a configurable radius
3. **Build a travel-time matrix** between all stops
4. **Cluster and order** stops into day-by-day itineraries, factoring in weather and category diversity
5. **Draw driving routes** and display numbered markers, daily colors, and sidebar cards synced with the map

No backend server is required. All logic runs in the browser; data is fetched directly from third-party APIs.

## Features

### Trip planning
- Destination search with configurable **search radius** (km) and **trip length** (days)
- **Start date picker** with auto-calculated end date and **2N3D-style** duration badge
- **Daily weather** forecast per day (temperature + conditions icon)
- Greedy **multi-day clustering** with route optimization within each day
- **Category-balanced POI selection** — museums, parks, restaurants, historic sites, and more (not just the nearest 15 results)
- **Weather-aware scheduling** — outdoor stops are deprioritized on rainy days
- **Category diversity penalty** — avoids stacking too many similar stops on the same day

### Map & itinerary UI
- **Leaflet** map with CARTO dark/light basemap tiles
- **Light/dark theme** toggle (persisted in `localStorage`)
- **Numbered stops** on sidebar cards and map markers
- **Category emojis** for quick visual scanning
- **Day tabs** with color-coded routes; all days visible on the map (active day highlighted)
- **Card ↔ map sync** — click a sidebar card to highlight a marker; click a marker to scroll the sidebar and zoom in
- **Toggle popups** on marker click (tap again to close)
- **Google Maps links** for every POI; website link when available
- **Full-screen loader** during planning with stage progress (geocoding, POI discovery, routing, etc.)
- Optional **Radar.io** and **OpenRouteService** API keys in settings for higher-quality geocoding and routing

## External services

| Layer | Service | Purpose | API key |
|-------|---------|---------|---------|
| Geocoding | [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) | Convert city name → lat/lon | No |
| Geocoding (optional) | [Radar.io Search](https://radar.com/) | Autocomplete geocoding fallback | Optional |
| POI discovery | [Overpass API](https://overpass-api.de/) (OpenStreetMap) | Museums, attractions, parks, restaurants, etc. | No |
| Routing matrix | [OSRM](https://router.project-osrm.org/) | Travel-time matrix between POIs | No |
| Routing matrix (optional) | [OpenRouteService](https://openrouteservice.org/) | Driving matrix + directions | Optional |
| Route geometry | OSRM / OpenRouteService | Polyline paths drawn on the map | Optional |
| Weather | [Open-Meteo](https://open-meteo.com/) | Daily forecast (temp, weather code) | No |
| Map tiles | [CARTO](https://carto.com/) via Leaflet | Dark (`dark_all`) and light (`light_all`) basemaps | No |
| Deep links | Google Maps Search URLs | Open any stop in Google Maps | No |

When optional keys are not set, the app falls back to Nominatim, Overpass, OSRM, and Open-Meteo — all free and keyless.

## Tech stack

- **React 19** + **Vite**
- **Tailwind CSS** — glassmorphism UI, theme variables
- **Leaflet** — map, markers, polylines, popups
- **Axios** — HTTP client for external APIs
- **Lucide React** — icons

## Project structure

```
src/
├── App.jsx              # Main UI, search flow, sidebar, theme
├── components/Map.jsx   # Leaflet map, markers, routes, theme tiles
├── engine/clustering.js # Multi-day POI clustering + weather logic
├── services/
│   ├── geocoding.js     # Nominatim + optional Radar.io
│   ├── poi.js           # Overpass POI fetch + diverse selection
│   ├── routing.js       # ORS/OSRM matrix + polylines
│   └── weather.js       # Open-Meteo forecast
└── utils/               # Dates, category emojis, Google Maps links, POI selection
```

## Getting started

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal (typically `http://localhost:5173`).

### Optional API keys

Open **Settings** in the sidebar to add:

- **Radar.io** — improves geocoding for ambiguous place names
- **OpenRouteService** — higher rate limits and more reliable routing than the public OSRM instance

Keys are stored in `localStorage` only; they are never sent to a custom backend.

## Accessibility

- Skip link to jump to the map and itinerary
- Semantic landmarks: sidebar (`complementary`), map (`main`), labeled forms
- All controls have visible labels, `aria-*` states, and keyboard focus styles
- Itinerary stops are real buttons with `aria-pressed` selection state
- Screen reader live region announces planning progress, errors, and stop selection
- Loading overlay uses `role="alertdialog"` with labelled status text
- Respects `prefers-reduced-motion` for animations

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # coverage report (90%+ lines/statements/functions)
```

Vitest + React Testing Library cover utilities, services, the planning engine, and UI components.

### Share links

Trip inputs sync to the URL as you edit the form. Share links add `run=1` so recipients get the same settings and the itinerary plans automatically.

| Param | Meaning |
|-------|---------|
| `to` | Destination |
| `start` | Start date (`YYYY-MM-DD`) |
| `days` | Trip length (1–5) |
| `radius` | Search radius in km (2–100) |
| `run=1` | Auto-plan on load (included in copied share links) |

Example: `/?to=Paris&start=2026-06-01&days=3&radius=5&run=1`

## Data flow

```
User input (city, days, radius, start date)
    → Geocode (Nominatim / Radar)
    → Weather forecast (Open-Meteo)
    → POI discovery (Overpass) → diverse category selection
    → Travel-time matrix (OSRM / ORS)
    → Cluster into daily itineraries (weather + category aware)
    → Route polylines per day (OSRM / ORS)
    → Render on Leaflet map + sidebar
```
