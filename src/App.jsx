import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { geocodeCity } from './services/geocoding';
import { fetchPOIs } from './services/poi';
import { getRoutingMatrix, getRoutePolyline } from './services/routing';
import { getWeatherForecast, interpretWeatherCode } from './services/weather';
import { clusterPOIs } from './engine/clustering';
import Map from './components/Map';
import { getCategoryEmoji, getCategoryLabel } from './utils/categoryEmoji';
import { getGoogleMapsUrl } from './utils/mapsLink';
import {
  todayISO,
  formatShortDate,
  formatDayLabel,
  formatTripDuration,
  getTripEndDate,
  addDays,
} from './utils/dates';
import {
  MapPin, Calendar, Compass, Sun, Moon, Loader2, Map as MapIcon,
  CloudRain, Cloud, CloudSnow, CloudFog, CloudLightning, Shield, Settings, ExternalLink,
} from 'lucide-react';

const ICON_MAP = { Sun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning };

const DAY_COLORS = [
  { bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-500/40', ring: 'ring-violet-500/50', hex: '#8b5cf6' },
  { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500/40', ring: 'ring-cyan-500/50', hex: '#06b6d4' },
  { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500/40', ring: 'ring-pink-500/50', hex: '#ec4899' },
  { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500/40', ring: 'ring-emerald-500/50', hex: '#10b981' },
  { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500/40', ring: 'ring-amber-500/50', hex: '#f59e0b' },
];

export default function App() {
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('idle');

  const [radarKey, setRadarKey] = useState(() => localStorage.getItem('radar_key') || '');
  const [orsKey, setOrsKey] = useState(() => localStorage.getItem('ors_key') || '');
  const [showSettings, setShowSettings] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [daysCount, setDaysCount] = useState(3);
  const [radiusKm, setRadiusKm] = useState(5);
  const [startDate, setStartDate] = useState(todayISO());

  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState([]);
  const [pois, setPois] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [activeDay, setActiveDay] = useState(null);
  const [selectedPoiKey, setSelectedPoiKey] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);

  const [totalTime, setTotalTime] = useState(0);

  const cardRefs = useRef({});
  const itineraryScrollRef = useRef(null);

  const endDate = useMemo(() => getTripEndDate(startDate, daysCount), [startDate, daysCount]);
  const tripDurationLabel = formatTripDuration(daysCount);

  const poiMeta = useMemo(() => {
    const meta = {};
    let globalIndex = 0;
    itineraries.forEach((dayPOIs, dayIdx) => {
      dayPOIs.forEach((poi) => {
        globalIndex += 1;
        meta[`${dayIdx}-${poi.id}`] = { globalIndex, dayIdx, poi };
      });
    });
    return meta;
  }, [itineraries]);

  useEffect(() => {
    localStorage.setItem('radar_key', radarKey);
  }, [radarKey]);

  useEffect(() => {
    localStorage.setItem('ors_key', orsKey);
  }, [orsKey]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handlePoiSelect = useCallback((key) => {
    if (selectedPoiKey === key) {
      setSelectedPoiKey(null);
      return;
    }

    const meta = poiMeta[key];
    if (!meta) return;

    setSelectedPoiKey(key);
    setActiveDay(meta.dayIdx);
  }, [poiMeta, selectedPoiKey]);

  const handleMarkerClick = useCallback(({ key, dayIdx }) => {
    if (selectedPoiKey === key) {
      setSelectedPoiKey(null);
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
    }

    setTimeout(() => {
      cardRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [poiMeta, selectedPoiKey]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setError(null);
    setItineraries([]);
    setPois([]);
    setActiveDay(null);
    setSelectedPoiKey(null);
    setFocusRequest(null);
    setTotalTime(0);
    cardRefs.current = {};

    try {
      setStage('Geocoding Destination');
      const loc = await geocodeCity(destination, radarKey);
      if (!loc) throw new Error('Could not find destination. Try a different city.');
      setLocation(loc);

      setStage('Fetching Local Weather');
      const weatherData = await getWeatherForecast(loc.lat, loc.lon);
      setWeather(weatherData);

      setStage('Discovering Local Gems');
      const topPois = await fetchPOIs(loc.lat, loc.lon, radiusKm * 1000, 15);
      if (topPois.length === 0) throw new Error('No points of interest found in this area. Try increasing search radius.');

      setPois(topPois);

      setStage('Calculating Route Matrix');
      const matrix = await getRoutingMatrix(topPois, orsKey);

      setStage('Optimizing Daily Itinerary');
      const dailyItinerary = clusterPOIs(topPois, matrix, daysCount, weatherData);

      setStage('Generating Precision Paths');
      const routingPromises = dailyItinerary.map(async (dayPOIs, index) => {
        if (dayPOIs.length > 1) {
          try {
            dayPOIs.routeGeometry = await getRoutePolyline(dayPOIs, orsKey);
          } catch (routeErr) {
            console.error(`Route generation failed for day ${index + 1}:`, routeErr);
            dayPOIs.routeGeometry = null;
          }
        } else {
          dayPOIs.routeGeometry = null;
        }
        return dayPOIs;
      });

      const structuredItineraries = await Promise.all(routingPromises);
      setItineraries(structuredItineraries);

      let cumTime = 0;
      structuredItineraries.forEach((day) => {
        for (let i = 0; i < day.length - 1; i++) {
          const fromIdx = topPois.findIndex((p) => p.id === day[i].id);
          const toIdx = topPois.findIndex((p) => p.id === day[i + 1].id);
          if (fromIdx !== -1 && toIdx !== -1) {
            cumTime += matrix[fromIdx][toIdx] || 0;
          }
        }
      });
      setTotalTime(Math.round(cumTime / 60));

      setStage('done');
    } catch (err) {
      setError(err.message || 'An error occurred during planning.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div className="flex h-screen w-full theme-bg theme-text overflow-hidden font-sans selection:bg-primary/30 transition-colors duration-500">

      <aside className="w-80 flex-shrink-0 flex flex-col theme-sidebar backdrop-blur-3xl border-r theme-border z-10 relative overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-[150%] h-[350px] bg-gradient-to-br from-violet-500/10 via-cyan-400/5 to-transparent blur-[120px] pointer-events-none rounded-full animate-pulse-slow" />

        <div className="p-6 relative z-10 border-b theme-border flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight theme-accent flex items-center gap-2">
              <Compass className="w-6 h-6 animate-spin-slow" />
              Traveler Pro
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-wider theme-muted mt-1">Premium Planner</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border theme-border theme-surface hover:theme-accent transition-all hover:scale-105 active:scale-95"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${showSettings ? 'theme-accent-bg theme-accent border-violet-400/50' : 'theme-surface theme-border theme-muted hover:theme-accent'}`}
              title="API Developer Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={itineraryScrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative z-10 py-6 space-y-6">

          {showSettings && (
            <div className="mx-6 p-4 rounded-xl glass-card space-y-3 animate-slide-down">
              <div className="flex items-center gap-1.5 text-xs font-semibold theme-muted uppercase tracking-wider mb-1">
                <Shield className="w-3.5 h-3.5 theme-accent" />
                API Configuration
              </div>
              <div>
                <label className="block text-[11px] theme-muted mb-1">Radar.io API Key</label>
                <input type="password" placeholder="prj_live_pk_..." className="w-full glass-input rounded-lg px-3 py-1.5 text-xs" value={radarKey} onChange={(e) => setRadarKey(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] theme-muted mb-1">OpenRouteService API Key</label>
                <input type="password" placeholder="5b3ce35b..." className="w-full glass-input rounded-lg px-3 py-1.5 text-xs" value={orsKey} onChange={(e) => setOrsKey(e.target.value)} />
              </div>
              <p className="text-[10px] theme-muted/60 leading-normal">Leave keys blank to use zero-config public endpoints.</p>
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-4 px-6">
            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider theme-muted mb-2">Destination</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Where to? (e.g., Paris, New Delhi)"
                  className="w-full glass-input rounded-xl py-3 px-4 pr-11 text-sm transition-all focus:scale-[1.01]"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
                <MapPin className="absolute right-3.5 top-3.5 w-4 h-4 theme-muted" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider theme-muted mb-2">Start Date</label>
              <input
                type="date"
                min={todayISO()}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-4 text-sm transition-all focus:scale-[1.01]"
              />
              <div className="mt-2 flex items-center justify-between gap-2 animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg theme-accent-bg theme-accent border theme-border">
                  {tripDurationLabel}
                </span>
                <span className="text-[10px] theme-muted text-right leading-tight">
                  {formatShortDate(new Date(startDate))} → {formatShortDate(endDate)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider theme-muted flex items-center gap-1 mb-1.5">
                  Days: <span className="font-bold theme-accent">{daysCount}</span>
                </label>
                <input type="range" min="1" max="5" className="w-full h-1.5 theme-range accent-violet-400 cursor-pointer" value={daysCount} onChange={(e) => setDaysCount(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider theme-muted flex items-center gap-1 mb-1.5">
                  Radius: <span className="font-bold text-cyan-500">{radiusKm} km</span>
                </label>
                <input type="range" min="2" max="15" className="w-full h-1.5 theme-range accent-cyan-400 cursor-pointer" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary rounded-xl py-3 font-extrabold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            >
              Plan My Itinerary
            </button>
          </form>

          {error && (
            <div className="mx-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs animate-slide-down">
              ⚠️ {error}
            </div>
          )}

          <div className="px-6 space-y-6">
            {itineraries.length > 0 && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div className="glass-card p-3.5 rounded-xl hover:scale-[1.02] transition-transform">
                  <p className="text-[10px] uppercase font-bold tracking-wider theme-muted">Travel Time</p>
                  <p className="text-base font-extrabold theme-accent mt-0.5">{totalTime} mins</p>
                </div>
                <div className="glass-card p-3.5 rounded-xl hover:scale-[1.02] transition-transform">
                  <p className="text-[10px] uppercase font-bold tracking-wider theme-muted">Total Stops</p>
                  <p className="text-base font-extrabold theme-accent mt-0.5">{pois.length}</p>
                </div>
              </div>
            )}

            {weather.length > 0 && location && (
              <div className="glass-card p-4 rounded-xl animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <MapIcon className="w-4 h-4 theme-muted" />
                  <h2 className="font-bold text-[10px] uppercase tracking-wider theme-muted">Weather · {location.name.split(',')[0]}</h2>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {weather.slice(0, daysCount).map((w, i) => {
                    const resolved = interpretWeatherCode(w.weatherCode);
                    const Icon = ICON_MAP[resolved.icon] || Sun;
                    const dayDate = addDays(new Date(startDate), i);
                    return (
                      <div key={i} className="flex flex-col items-center p-2 rounded-lg theme-surface border theme-border min-w-[70px] hover:scale-105 transition-transform">
                        <span className="text-[9px] font-bold theme-muted uppercase mb-0.5">{formatDayLabel(dayDate)}</span>
                        <Icon className="w-5 h-5 text-cyan-500 mb-1" />
                        <div className="text-[9px] theme-muted capitalize text-center mb-1 line-clamp-1">{resolved.label}</div>
                        <div className="flex gap-1.5 text-xs font-bold">
                          <span>{Math.round(w.maxTemp)}°</span>
                          <span className="theme-muted font-normal">{Math.round(w.minTemp)}°</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {itineraries.length > 0 && (
              <div className="space-y-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider theme-muted flex items-center gap-2">
                    <Calendar className="w-4 h-4 theme-accent" />
                    Itinerary
                  </h2>
                  <button
                    type="button"
                    onClick={() => { setActiveDay(null); setSelectedPoiKey(null); }}
                    className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg border transition-all hover:scale-105 ${activeDay === null ? 'theme-accent-bg theme-accent border-violet-400/30' : 'theme-surface theme-border theme-muted hover:theme-accent'}`}
                  >
                    View All
                  </button>
                </div>

                {itineraries.map((dayPOIs, dayIdx) => {
                  const dayColor = DAY_COLORS[dayIdx % DAY_COLORS.length];
                  const dayDate = addDays(new Date(startDate), dayIdx);
                  const isDayFocused = activeDay === dayIdx;

                  return (
                    <div
                      key={dayIdx}
                      className={`relative rounded-xl p-4 transition-all duration-300 border animate-fade-in ${isDayFocused ? 'theme-card-active shadow-lg scale-[1.01]' : 'glass-card hover:scale-[1.01]'}`}
                    >
                      <div
                        className="flex items-center gap-3 mb-4 cursor-pointer"
                        onClick={() => setActiveDay(activeDay === dayIdx ? null : dayIdx)}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-lg ${dayColor.bg} animate-bounce-subtle`}>
                          D{dayIdx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-bold">Day {dayIdx + 1} · {formatDayLabel(dayDate)}</h3>
                          <p className="text-[9px] theme-muted">Weather-optimized · {dayPOIs.length} stops</p>
                        </div>
                      </div>

                      <div className={`relative border-l-2 ${dayColor.border} pl-4 ml-4 space-y-3`}>
                        {dayPOIs.map((poi) => {
                          const key = `${dayIdx}-${poi.id}`;
                          const meta = poiMeta[key];
                          const stopNum = meta?.globalIndex ?? '?';
                          const isSelected = selectedPoiKey === key;
                          const emoji = getCategoryEmoji(poi.category);

                          return (
                            <div
                              key={key}
                              ref={(el) => { cardRefs.current[key] = el; }}
                              className={`relative group cursor-pointer transition-all duration-300 ${isSelected ? 'animate-pulse-ring' : ''}`}
                              onClick={() => handlePoiSelect(key)}
                            >
                              <div className={`absolute -left-[25px] top-3 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-md transition-all duration-300 ${dayColor.bg} ${isSelected ? 'scale-125 ring-2 ' + dayColor.ring : 'group-hover:scale-110'}`}>
                                {stopNum}
                              </div>

                              <div className={`p-3 rounded-xl border transition-all duration-300 space-y-1.5 ${isSelected ? `theme-card-selected ${dayColor.border} shadow-lg scale-[1.02]` : 'theme-surface theme-border group-hover:border-violet-400/30 group-hover:shadow-md group-hover:-translate-y-0.5'}`}>
                                <div className="flex items-start gap-2">
                                  <span className="text-xl shrink-0 animate-wiggle">{emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className={`text-xs font-bold leading-snug transition-colors ${isSelected ? dayColor.text : 'group-hover:theme-accent'}`}>
                                        {poi.name}
                                      </h4>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {poi.website && (
                                          <a href={poi.website} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="theme-muted hover:theme-accent" title="Visit website">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                        <a href={getGoogleMapsUrl(poi)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="theme-muted hover:text-cyan-500" title="Open in Google Maps">
                                          <MapPin className="w-3.5 h-3.5" />
                                        </a>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full border capitalize ${dayColor.border} ${dayColor.text} theme-surface`}>
                                        {emoji} {getCategoryLabel(poi.category)}
                                      </span>
                                      <span className="text-[9px] px-2 py-0.5 rounded-full border theme-border theme-muted theme-surface">
                                        Stop #{stopNum}
                                      </span>
                                      {poi.openingHours && poi.openingHours !== 'Varies' && (
                                        <span className="text-[9px] px-2 py-0.5 rounded-full border theme-border theme-muted theme-surface">
                                          🕒 {poi.openingHours}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 relative theme-bg flex flex-col min-h-0 overflow-hidden">
        <header className="flex justify-between items-center w-full px-8 h-20 theme-header backdrop-blur-xl border-b theme-border z-10">
          <div className="flex items-center gap-8">
            <span className="font-extrabold text-xl tracking-tight text-cyan-500">NovaRoute</span>
            {itineraries.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-full theme-accent-bg theme-accent border theme-border animate-fade-in">
                {tripDurationLabel} · {formatShortDate(new Date(startDate))} – {formatShortDate(endDate)}
              </span>
            )}
          </div>
          {/* <div className="flex items-center gap-4">
            <button type="button" onClick={toggleTheme} className="p-2 rounded-full theme-surface border theme-border hover:scale-110 transition-all" title="Toggle theme">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-violet-500" />}
            </button>
          </div> */}
        </header>

        <div className="flex-1 min-h-0 w-full relative">
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
          <div className="absolute inset-y-0 left-0 w-12 theme-map-fade pointer-events-none z-[1]" />
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="glass-card rounded-2xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl border theme-border min-w-[260px]">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
              <Loader2 className="w-12 h-12 animate-spin theme-accent relative" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold theme-accent">Planning your trip</p>
              <p className="text-xs theme-muted capitalize">{stage}...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
