import React, { useState, useEffect } from 'react';
import { geocodeCity } from './services/geocoding';
import { fetchPOIs } from './services/poi';
import { getRoutingMatrix } from './services/routing';
import { getWeatherForecast, interpretWeatherCode } from './services/weather';
import { clusterPOIs } from './engine/clustering';
import Map from './components/Map';
import { getRoutePolyline } from './services/routing';
import { MapPin, Calendar, Compass, Sun, Loader2, Navigation, Map as MapIcon, CloudRain, Cloud, CloudSnow, CloudFog, CloudLightning, Shield, Settings, Sliders, ExternalLink, Clock, Route } from 'lucide-react';

const ICON_MAP = {
  Sun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning
};

export default function App() {
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('idle'); // idle, geocoding, weather, POIs, routing, done

  // API Keys state (persisted to localStorage)
  const [radarKey, setRadarKey] = useState(() => localStorage.getItem('radar_key') || '');
  const [orsKey, setOrsKey] = useState(() => localStorage.getItem('ors_key') || '');
  const [showSettings, setShowSettings] = useState(false);

  // Custom planning parameters
  const [daysCount, setDaysCount] = useState(3);
  const [radiusKm, setRadiusKm] = useState(5);

  // Result state
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState([]);
  const [pois, setPois] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [activeDay, setActiveDay] = useState(null);

  // Metrics
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    localStorage.setItem('radar_key', radarKey);
  }, [radarKey]);

  useEffect(() => {
    localStorage.setItem('ors_key', orsKey);
  }, [orsKey]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setError(null);
    setItineraries([]);
    setPois([]);
    setActiveDay(null);
    setTotalDistance(0);
    setTotalTime(0);

    try {
      setStage('Geocoding Destination');
      const loc = await geocodeCity(destination, radarKey);
      if (!loc) throw new Error('Could not find destination. Try a different city.');
      setLocation(loc);

      setStage('Fetching Local Weather');
      const weatherData = await getWeatherForecast(loc.lat, loc.lon);
      setWeather(weatherData);

      setStage('Discovering Local Gems');
      const rawPois = await fetchPOIs(loc.lat, loc.lon, radiusKm * 1000);
      if (rawPois.length === 0) throw new Error('No points of interest found in this area. Try increasing search radius.');
      
      // Limit to top 15 for optimal clustering & POC limits
      const topPois = rawPois.slice(0, 15);
      setPois(topPois);

      setStage('Calculating Route Matrix');
      const matrix = await getRoutingMatrix(topPois, orsKey);

      setStage('Optimizing Daily Itinerary');
      const dailyItinerary = clusterPOIs(topPois, matrix, daysCount, weatherData);

      setStage('Generating Precision Paths');
      // For each day, calculate actual polyline routes
      const routingPromises = dailyItinerary.map(async (dayPOIs, index) => {
        if (dayPOIs.length > 1) {
          try {
            const polyline = await getRoutePolyline(dayPOIs, orsKey);
            // Append route to the array object
            dayPOIs.routeGeometry = polyline;
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

      // Estimate total duration
      let cumTime = 0;
      structuredItineraries.forEach(day => {
        for (let i = 0; i < day.length - 1; i++) {
          const fromIdx = topPois.findIndex(p => p.id === day[i].id);
          const toIdx = topPois.findIndex(p => p.id === day[i+1].id);
          if (fromIdx !== -1 && toIdx !== -1) {
            cumTime += matrix[fromIdx][toIdx] || 0;
          }
        }
      });
      setTotalTime(Math.round(cumTime / 60)); // convert to minutes

      setStage('done');
    } catch (err) {
      setError(err.message || 'An error occurred during planning.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0b1326] text-[#dae2fd] overflow-hidden font-sans selection:bg-[#d0bcff]/30">
      
      {/* Sidebar UI */}
      <aside className="w-80 flex-shrink-0 flex flex-col bg-[#0b1326]/50 backdrop-blur-3xl border-r border-white/10 z-10 relative overflow-hidden">
        {/* Modern ambient glow backdrop */}
        <div className="absolute top-0 -left-1/4 w-[150%] h-[350px] bg-gradient-to-br from-[#8b5cf6]/10 via-[#4cd7f6]/5 to-transparent blur-[120px] pointer-events-none rounded-full" />
        
        {/* Brand Header */}
        <div className="p-6 relative z-10 border-b border-white/5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#d0bcff] flex items-center gap-2">
              <Compass className="w-6 h-6 text-[#d0bcff] animate-spin-slow" />
              Traveler Pro
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#cbc3d7]/70 mt-1">Premium Planner</p>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border transition-all ${showSettings ? 'bg-[#d0bcff]/20 border-[#d0bcff]/50 text-[#d0bcff]' : 'bg-white/5 border-white/10 text-[#cbc3d7] hover:text-white hover:bg-white/10'}`}
            title="API Developer Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 py-6 space-y-6">
          {/* Settings Drawer */}
          {showSettings && (
            <div className="mx-6 p-4 rounded-xl glass-card space-y-3 animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#cbc3d7] uppercase tracking-wider mb-1">
                <Shield className="w-3.5 h-3.5 text-[#d0bcff]" />
                API Configuration
              </div>
              <div>
                <label className="block text-[11px] text-[#cbc3d7]/70 mb-1">Radar.io API Key</label>
                <input
                  type="password"
                  placeholder="prj_live_pk_..."
                  className="w-full glass-input rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#d0bcff] transition-all"
                  value={radarKey}
                  onChange={(e) => setRadarKey(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#cbc3d7]/70 mb-1">OpenRouteService API Key</label>
                <input
                  type="password"
                  placeholder="5b3ce35b..."
                  className="w-full glass-input rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#d0bcff] transition-all"
                  value={orsKey}
                  onChange={(e) => setOrsKey(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-[#cbc3d7]/40 leading-normal">
                Leave keys blank to automatically use zero-config public endpoint services.
              </p>
            </div>
          )}

          {/* Form controls */}
          <form onSubmit={handleSearch} className="space-y-4 px-6">
            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-[#cbc3d7]/80 mb-2">Destination</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Where to? (e.g., Paris, New Delhi)"
                  className="w-full glass-input rounded-xl py-3 px-4 pr-11 text-sm placeholder-[#cbc3d7]/40 focus:outline-none focus:border-[#d0bcff] transition-all"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
                <MapPin className="absolute right-3.5 top-3.5 w-4 h-4 text-[#cbc3d7]/60" />
              </div>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#cbc3d7] flex items-center gap-1">
                    Days: <span className="font-bold text-[#d0bcff]">{daysCount}</span>
                  </label>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  className="w-full h-1 bg-[#2d3449] rounded-lg appearance-none cursor-pointer accent-[#d0bcff]"
                  value={daysCount}
                  onChange={(e) => setDaysCount(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#cbc3d7] flex items-center gap-1">
                    Radius: <span className="font-bold text-[#4cd7f6]">{radiusKm} km</span>
                  </label>
                </div>
                <input
                  type="range"
                  min="2"
                  max="15"
                  className="w-full h-1 bg-[#2d3449] rounded-lg appearance-none cursor-pointer accent-[#4cd7f6]"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#d0bcff] hover:bg-[#a078ff] text-[#3c0091] rounded-xl py-3 font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(208,188,255,0.2)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#3c0091]" /> 
                  <span className="capitalize">{stage}...</span>
                </>
              ) : 'Plan My Itinerary'}
            </button>
          </form>

          {error && (
            <div className="mx-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs animate-in fade-in slide-in-from-top-2">
              ⚠️ {error}
            </div>
          )}

          {/* Sidebar Modules wrapper */}
          <div className="px-6 space-y-6">
            {/* Quick Metrics */}
            {itineraries.length > 0 && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                <div className="glass-card p-3.5 rounded-xl">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#cbc3d7]/60">Travel Time</p>
                  <p className="text-base font-extrabold text-[#d0bcff] mt-0.5">{totalTime} mins</p>
                </div>
                <div className="glass-card p-3.5 rounded-xl">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#cbc3d7]/60">Total Stops</p>
                  <p className="text-base font-extrabold text-[#d0bcff] mt-0.5">{pois.length}</p>
                </div>
              </div>
            )}

            {/* Weather Widget */}
            {weather.length > 0 && location && (
              <div className="glass-card p-4 rounded-xl animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <MapIcon className="w-4 h-4 text-[#cbc3d7]" />
                  <h2 className="font-bold text-[10px] uppercase tracking-wider text-[#cbc3d7]/80">Weather for {location.name.split(',')[0]}</h2>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {weather.slice(0, 3).map((w, i) => {
                    const resolved = interpretWeatherCode(w.weatherCode);
                    const Icon = ICON_MAP[resolved.icon] || Sun;
                    const date = new Date(w.date);
                    const isToday = i === 0;
                    return (
                      <div key={i} className="flex flex-col items-center p-2 rounded-lg bg-[#0b1326]/50 border border-white/5 min-w-[70px]">
                        <span className="text-[9px] font-bold text-[#cbc3d7]/60 uppercase mb-1">{isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <Icon className="w-5 h-5 text-[#4cd7f6] mb-1" />
                        <div className="text-[9px] text-[#cbc3d7]/50 capitalize text-center mb-1 line-clamp-1">{resolved.label}</div>
                        <div className="flex gap-1.5 text-xs font-bold">
                          <span className="text-[#dae2fd]">{Math.round(w.maxTemp)}°</span>
                          <span className="text-[#cbc3d7]/50 font-normal">{Math.round(w.minTemp)}°</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Itinerary Listings */}
            {itineraries.length > 0 && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#cbc3d7]/80 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#d0bcff]" />
                    Itinerary
                  </h2>
                  <button 
                    onClick={() => setActiveDay(null)}
                    className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg border transition-all ${activeDay === null ? 'bg-[#d0bcff]/20 border-[#d0bcff]/30 text-[#d0bcff]' : 'bg-white/5 border-white/10 text-[#cbc3d7] hover:text-white'}`}
                  >
                    View All
                  </button>
                </div>

                {itineraries.map((dayPOIs, dayIdx) => (
                  <div 
                    key={dayIdx} 
                    className={`relative rounded-xl p-4 transition-all duration-300 cursor-pointer border ${activeDay === dayIdx ? 'bg-[#171f33] border-[#d0bcff]/30 shadow-lg' : 'glass-card hover:bg-white/5'}`}
                    onClick={() => setActiveDay(activeDay === dayIdx ? null : dayIdx)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs bg-[#d0bcff]/10 text-[#d0bcff] border border-[#d0bcff]/20">
                        D{dayIdx + 1}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#dae2fd]">Day {dayIdx + 1} Plan</h3>
                        <p className="text-[9px] text-[#cbc3d7]/50">Weather-Optimized Path</p>
                      </div>
                      <span className="text-[10px] text-[#cbc3d7] ml-auto font-medium">{dayPOIs.length} stops</span>
                    </div>

                    <div className="relative border-l border-white/10 pl-4 ml-3.5 space-y-4">
                      {dayPOIs.map((poi, idx) => (
                        <div key={idx} className="relative group">
                          {/* Bullet */}
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#171f33] bg-[#cbc3d7] group-hover:bg-[#d0bcff] transition-colors" />
                          
                          <div className="p-3 rounded-lg bg-[#0b1326]/30 border border-white/5 group-hover:border-[#d0bcff]/20 transition-all space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-[#dae2fd] group-hover:text-[#d0bcff] transition-colors leading-snug">{poi.name}</h4>
                              {poi.website && (
                                <a 
                                  href={poi.website} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[#cbc3d7]/40 hover:text-[#d0bcff] shrink-0"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 text-[9px] text-[#cbc3d7]/60 capitalize mt-1">
                              <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-[#4cd7f6]">{poi.category}</span>
                              {poi.openingHours && poi.openingHours !== 'Varies' && (
                                <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5 flex items-center gap-0.5 text-[#cbc3d7]">
                                  🕒 {poi.openingHours}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Map Area */}
      <div className="flex-1 relative bg-[#0b1326] flex flex-col min-h-0 overflow-hidden">
        {/* Floating Top Nav Header */}
        <header className="flex justify-between items-center w-full px-8 h-20 bg-[#0b1326]/30 backdrop-blur-xl border-b border-white/5 z-10">
          <div className="flex items-center gap-8">
            <span className="font-extrabold text-xl tracking-tight text-[#4cd7f6]">NovaRoute</span>
            <nav className="hidden md:flex items-center gap-6">
              <a className="text-[#d0bcff] font-bold border-b-2 border-[#d0bcff] pb-1 text-xs uppercase tracking-wider" href="#">Dashboard</a>
              <a className="text-[#cbc3d7]/70 hover:text-[#d0bcff] transition-colors text-xs uppercase tracking-wider" href="#">Map View</a>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-[#cbc3d7]/70">
              <Sun className="w-5 h-5 cursor-pointer hover:text-[#d0bcff] transition-colors" />
              <Compass className="w-5 h-5 cursor-pointer hover:text-[#d0bcff] transition-colors animate-spin-slow" />
            </div>
            <button className="bg-[#03b5d3] text-[#003640] px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider hover:scale-[0.98] transition-transform shadow-[0_0_15px_rgba(76,215,246,0.2)]">
              Luminous
            </button>
          </div>
        </header>

        {/* Map Container */}
        <div className="flex-1 min-h-0 w-full relative">
          <div className="absolute inset-0">
            <Map center={location || { lat: 20, lon: 0 }} pois={pois} itineraries={itineraries} activeDay={activeDay} />
          </div>
          {/* Map Overlay Gradients for sleek glass fade */}
          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#0b1326] to-transparent pointer-events-none z-[1]" />
        </div>
      </div>
    </div>
  );
}

