import { MapPin } from 'lucide-react';
import { todayISO, formatShortDate, formatTripDuration, getTripEndDate } from '../utils/dates';
import { RADIUS_KM_MIN, RADIUS_KM_MAX } from '../constants/tripLimits';

export default function SearchForm({
  destination,
  startDate,
  daysCount,
  radiusKm,
  loading,
  endDate,
  onDestinationChange,
  onStartDateChange,
  onDaysCountChange,
  onRadiusKmChange,
  onSubmit,
}) {
  const tripDurationLabel = formatTripDuration(daysCount);

  return (
    <form onSubmit={onSubmit} className="space-y-4 px-6" aria-label="Trip search">
      <div>
        <label htmlFor="destination" className="block text-[11px] uppercase font-bold tracking-wider theme-muted mb-2">
          Destination
        </label>
        <div className="relative">
          <input
            id="destination"
            name="destination"
            type="text"
            required
            autoComplete="address-level2"
            placeholder="Where to? (e.g., Paris, New Delhi)"
            className="w-full glass-input rounded-xl py-3 px-4 pr-11 text-sm transition-all focus:scale-[1.01] motion-reduce:transform-none"
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            aria-describedby="destination-hint"
          />
          <MapPin className="absolute right-3.5 top-3.5 w-4 h-4 theme-muted pointer-events-none" aria-hidden="true" />
        </div>
        <p id="destination-hint" className="sr-only">
          Enter a city or region to plan your itinerary.
        </p>
      </div>

      <div>
        <label htmlFor="start-date" className="block text-[11px] uppercase font-bold tracking-wider theme-muted mb-2">
          Start Date
        </label>
        <input
          id="start-date"
          name="startDate"
          type="date"
          min={todayISO()}
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-full glass-input rounded-xl py-2.5 px-4 text-sm transition-all focus:scale-[1.01] motion-reduce:transform-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2 animate-fade-in motion-reduce:animate-none">
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
          <label htmlFor="days-count" className="text-[10px] uppercase font-bold tracking-wider theme-muted flex items-center gap-1 mb-1.5">
            Days: <span className="font-bold theme-accent">{daysCount}</span>
          </label>
          <input
            id="days-count"
            name="daysCount"
            type="range"
            min="1"
            max="5"
            className="w-full h-1.5 theme-range accent-violet-400 cursor-pointer"
            value={daysCount}
            onChange={(e) => onDaysCountChange(Number(e.target.value))}
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={daysCount}
            aria-valuetext={`${daysCount} days`}
          />
        </div>
        <div>
          <label htmlFor="radius-km" className="text-[10px] uppercase font-bold tracking-wider theme-muted flex items-center gap-1 mb-1.5">
            Radius: <span className="font-bold text-cyan-500">{radiusKm} km</span>
          </label>
          <input
            id="radius-km"
            name="radiusKm"
            type="range"
            min={String(RADIUS_KM_MIN)}
            max={String(RADIUS_KM_MAX)}
            className="w-full h-1.5 theme-range accent-cyan-400 cursor-pointer"
            value={radiusKm}
            onChange={(e) => onRadiusKmChange(Number(e.target.value))}
            aria-valuemin={RADIUS_KM_MIN}
            aria-valuemax={RADIUS_KM_MAX}
            aria-valuenow={radiusKm}
            aria-valuetext={`${radiusKm} kilometers`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="w-full btn-primary rounded-xl py-3 font-extrabold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      >
        Plan My Itinerary
      </button>
    </form>
  );
}
