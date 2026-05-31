import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { planTrip } from './engine/planTrip';
import Map from './components/Map';
import SearchForm from './components/SearchForm';
import SettingsPanel from './components/SettingsPanel';
import WeatherForecast from './components/WeatherForecast';
import ItineraryPanel from './components/ItineraryPanel';
import LoadingOverlay from './components/LoadingOverlay';
import ShareTripPanel from './components/ShareTripPanel';
import { buildPoiMetaMap } from './utils/poiMeta';
import { usePersistedState } from './hooks/usePersistedState';
import {
  todayISO,
  formatShortDate,
  formatTripDuration,
  getTripEndDate,
} from './utils/dates';
import {
  getInitialTripStateFromUrl,
  writeShareParamsToLocation,
} from './utils/tripShare';
import { Compass, Sun, Moon, Settings } from 'lucide-react';

export default function App() {
  const initialTripRef = useRef(null);
  if (!initialTripRef.current) {
    initialTripRef.current = getInitialTripStateFromUrl();
  }
  const initialTrip = initialTripRef.current;

  const [destination, setDestination] = useState(initialTrip.destination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('idle');

  const [radarKey, setRadarKey] = usePersistedState('radar_key', '');
  const [orsKey, setOrsKey] = usePersistedState('ors_key', '');
  const [theme, setTheme] = usePersistedState('theme', 'dark');
  const [showSettings, setShowSettings] = useState(false);

  const [daysCount, setDaysCount] = useState(initialTrip.daysCount);
  const [radiusKm, setRadiusKm] = useState(initialTrip.radiusKm);
  const [startDate, setStartDate] = useState(initialTrip.startDate);

  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState([]);
  const [pois, setPois] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [activeDay, setActiveDay] = useState(null);
  const [selectedPoiKey, setSelectedPoiKey] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [totalTime, setTotalTime] = useState(0);
  const [liveMessage, setLiveMessage] = useState('');

  const cardRefs = useRef({});
  const itineraryScrollRef = useRef(null);
  const autoRunPendingRef = useRef(initialTrip.autoRun && initialTrip.destination.trim());

  const endDate = useMemo(() => getTripEndDate(startDate, daysCount), [startDate, daysCount]);
  const tripDurationLabel = formatTripDuration(daysCount);
  const poiMeta = useMemo(() => buildPoiMetaMap(itineraries), [itineraries]);
  const shareBaseUrl = useMemo(
    () => `${window.location.origin}${window.location.pathname}`,
    []
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    writeShareParamsToLocation({
      destination,
      startDate,
      daysCount,
      radiusKm,
    });
  }, [destination, startDate, daysCount, radiusKm]);

  const announce = useCallback((message) => {
    setLiveMessage('');
    requestAnimationFrame(() => setLiveMessage(message));
  }, []);

  const runSearch = useCallback(async (overrides = {}) => {
    const nextDestination = (overrides.destination ?? destination).trim();
    const nextDaysCount = overrides.daysCount ?? daysCount;
    const nextRadiusKm = overrides.radiusKm ?? radiusKm;

    if (!nextDestination) return;

    setLoading(true);
    setError(null);
    setItineraries([]);
    setPois([]);
    setActiveDay(null);
    setSelectedPoiKey(null);
    setFocusRequest(null);
    setTotalTime(0);
    setLiveMessage('');
    cardRefs.current = {};

    try {
      const result = await planTrip({
        destination: nextDestination,
        radarKey,
        orsKey,
        radiusKm: nextRadiusKm,
        daysCount: nextDaysCount,
        onStage: setStage,
      });

      setLocation(result.location);
      setWeather(result.weather);
      setPois(result.pois);
      setItineraries(result.itineraries);
      setTotalTime(result.totalTime);
      announce(`Itinerary ready with ${result.pois.length} stops over ${nextDaysCount} days`);
    } catch (err) {
      const message = err.message || 'An error occurred during planning.';
      setError(message);
      announce(message);
    } finally {
      setLoading(false);
    }
  }, [announce, daysCount, destination, orsKey, radarKey, radiusKm]);

  useEffect(() => {
    if (!autoRunPendingRef.current) return;
    autoRunPendingRef.current = false;

    if (initialTrip.hasSharedTrip) {
      announce(`Loaded shared trip to ${initialTrip.destination}`);
    }

    runSearch({
      destination: initialTrip.destination,
      daysCount: initialTrip.daysCount,
      radiusKm: initialTrip.radiusKm,
    });
  }, [announce, initialTrip, runSearch]);

  const handlePoiSelect = useCallback((key) => {
    if (selectedPoiKey === key) {
      setSelectedPoiKey(null);
      announce('Stop deselected');
      return;
    }

    const meta = poiMeta[key];
    if (!meta) return;

    setSelectedPoiKey(key);
    setActiveDay(meta.dayIdx);
    announce(`Selected stop ${meta.globalIndex}: ${meta.poi.name}`);
  }, [poiMeta, selectedPoiKey, announce]);

  const handleMarkerClick = useCallback(({ key, dayIdx }) => {
    if (selectedPoiKey === key) {
      setSelectedPoiKey(null);
      announce('Stop deselected');
      return;
    }

    const meta = poiMeta[key];
    setSelectedPoiKey(key);
    setActiveDay(dayIdx);

    if (meta) {
      setFocusRequest({
        lat: meta.poi.lat,
        lon: meta.poi.lon,
        zoom: 16,
        ts: Date.now(),
      });
      announce(`Selected stop ${meta.globalIndex}: ${meta.poi.name}`);
    }

    setTimeout(() => {
      cardRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardRefs.current[key]?.focus({ preventScroll: true });
    }, 100);
  }, [poiMeta, selectedPoiKey, announce]);

  const handleSearch = async (e) => {
    e.preventDefault();
    await runSearch();
  };

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      announce(`Switched to ${next} theme`);
      return next;
    });
  };

  const handleViewAllDays = () => {
    setActiveDay(null);
    setSelectedPoiKey(null);
    announce('Showing all days on the map');
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to map and itinerary
      </a>

      <div
        className="flex h-screen w-full theme-bg theme-text overflow-hidden font-sans selection:bg-primary/30 transition-colors duration-500"
        aria-busy={loading}
      >
        <aside
          className="w-80 flex-shrink-0 flex flex-col theme-sidebar backdrop-blur-3xl border-r theme-border z-10 relative overflow-hidden"
          aria-label="Trip planner sidebar"
        >
          <div className="absolute top-0 -left-1/4 w-[150%] h-[350px] bg-gradient-to-br from-violet-500/10 via-cyan-400/5 to-transparent blur-[120px] pointer-events-none rounded-full animate-pulse-slow motion-reduce:animate-none" aria-hidden="true" />

          <header className="p-6 relative z-10 border-b theme-border flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight theme-accent flex items-center gap-2">
                <Compass className="w-6 h-6 animate-spin-slow motion-reduce:animate-none" aria-hidden="true" />
                Traveler Pro
              </h1>
              <p className="text-[10px] uppercase font-bold tracking-wider theme-muted mt-1">Premium Planner</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl border theme-border theme-surface hover:theme-accent transition-all hover:scale-105 active:scale-95 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={theme === 'light'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => setShowSettings((open) => !open)}
                className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ${showSettings ? 'theme-accent-bg theme-accent border-violet-400/50' : 'theme-surface theme-border theme-muted hover:theme-accent'}`}
                aria-label="API developer settings"
                aria-expanded={showSettings}
                aria-controls="settings-panel"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div ref={itineraryScrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative z-10 py-6 space-y-6">
            {showSettings && (
              <SettingsPanel
                radarKey={radarKey}
                orsKey={orsKey}
                onRadarKeyChange={setRadarKey}
                onOrsKeyChange={setOrsKey}
              />
            )}

            <SearchForm
              destination={destination}
              startDate={startDate}
              daysCount={daysCount}
              radiusKm={radiusKm}
              loading={loading}
              endDate={endDate}
              onDestinationChange={setDestination}
              onStartDateChange={setStartDate}
              onDaysCountChange={setDaysCount}
              onRadiusKmChange={setRadiusKm}
              onSubmit={handleSearch}
            />

            <ShareTripPanel
              destination={destination}
              startDate={startDate}
              daysCount={daysCount}
              radiusKm={radiusKm}
              baseUrl={shareBaseUrl}
              onAnnounce={announce}
            />

            {error && (
              <div
                className="mx-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs animate-slide-down motion-reduce:animate-none"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <div className="px-6 space-y-6">
              <WeatherForecast
                weather={weather}
                location={location}
                daysCount={daysCount}
                startDate={startDate}
              />

              <ItineraryPanel
                itineraries={itineraries}
                pois={pois}
                totalTime={totalTime}
                startDate={startDate}
                activeDay={activeDay}
                selectedPoiKey={selectedPoiKey}
                poiMeta={poiMeta}
                cardRefs={cardRefs}
                onActiveDayChange={setActiveDay}
                onPoiSelect={handlePoiSelect}
                onViewAllDays={handleViewAllDays}
              />
            </div>
          </div>
        </aside>

        <div className="flex-1 relative theme-bg flex flex-col min-h-0 overflow-hidden">
          <header className="flex justify-between items-center w-full px-8 h-20 theme-header backdrop-blur-xl border-b theme-border z-10">
            <div className="flex items-center gap-8">
              <span className="font-extrabold text-xl tracking-tight text-cyan-500">NovaRoute</span>
              {itineraries.length > 0 && (
                <span className="hidden md:inline-flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-full theme-accent-bg theme-accent border theme-border animate-fade-in motion-reduce:animate-none">
                  {tripDurationLabel} · {formatShortDate(new Date(startDate))} – {formatShortDate(endDate)}
                </span>
              )}
            </div>
          </header>

          <main id="main-content" className="flex-1 min-h-0 w-full relative" aria-label="Trip map">
            <div className="absolute inset-0">
              <Map
                center={location || { lat: 20, lon: 0 }}
                pois={pois}
                itineraries={itineraries}
                activeDay={activeDay}
                theme={theme}
                selectedPoiKey={selectedPoiKey}
                focusRequest={focusRequest}
                onMarkerClick={handleMarkerClick}
              />
            </div>
            <div className="absolute inset-y-0 left-0 w-12 theme-map-fade pointer-events-none z-[1]" aria-hidden="true" />
          </main>
        </div>

        {loading && <LoadingOverlay stage={stage} />}
      </div>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
    </>
  );
}
