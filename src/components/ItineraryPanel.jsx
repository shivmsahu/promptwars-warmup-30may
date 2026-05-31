import { Calendar, ExternalLink, MapPin } from 'lucide-react';
import { DAY_COLORS } from '../constants/dayColors';
import { getCategoryEmoji, getCategoryLabel } from '../utils/categoryEmoji';
import { getGoogleMapsUrl } from '../utils/mapsLink';
import { addDays, formatDayLabel } from '../utils/dates';

function PoiCard({
  poi,
  dayIdx,
  dayColor,
  stopNum,
  isSelected,
  cardRef,
  onSelect,
}) {
  const key = `${dayIdx}-${poi.id}`;
  const emoji = getCategoryEmoji(poi.category);

  return (
    <li className="relative list-none">
      <button
        type="button"
        ref={cardRef}
        id={`poi-card-${key}`}
        className={`relative group w-full text-left cursor-pointer transition-all duration-300 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${isSelected ? 'animate-pulse-ring motion-reduce:animate-none' : ''}`}
        onClick={() => onSelect(key)}
        aria-pressed={isSelected}
        aria-label={`Stop ${stopNum}: ${poi.name}, ${getCategoryLabel(poi.category)}${isSelected ? ', selected' : ''}`}
      >
        <span
          className={`absolute -left-[25px] top-3 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-md transition-all duration-300 ${dayColor.bg} ${isSelected ? 'scale-125 ring-2 ' + dayColor.ring : 'group-hover:scale-110 motion-reduce:transform-none'}`}
          aria-hidden="true"
        >
          {stopNum}
        </span>

        <div className={`p-3 rounded-xl border transition-all duration-300 space-y-1.5 ${isSelected ? `theme-card-selected ${dayColor.border} shadow-lg scale-[1.02] motion-reduce:transform-none` : 'theme-surface theme-border group-hover:border-violet-400/30 group-hover:shadow-md group-hover:-translate-y-0.5 motion-reduce:transform-none'}`}>
          <div className="flex items-start gap-2">
            <span className="text-xl shrink-0 animate-wiggle motion-reduce:animate-none" aria-hidden="true">{emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className={`text-xs font-bold leading-snug transition-colors ${isSelected ? dayColor.text : 'group-hover:theme-accent'}`}>
                  {poi.name}
                </h4>
                <div className="flex items-center gap-1.5 shrink-0">
                  {poi.website && (
                    <a
                      href={poi.website}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="theme-muted hover:theme-accent p-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
                      aria-label={`Visit website for ${poi.name}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                  <a
                    href={getGoogleMapsUrl(poi)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="theme-muted hover:text-cyan-500 p-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                    aria-label={`Open ${poi.name} in Google Maps`}
                  >
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className={`text-[9px] px-2 py-0.5 rounded-full border capitalize ${dayColor.border} ${dayColor.text} theme-surface`}>
                  <span aria-hidden="true">{emoji} </span>
                  {getCategoryLabel(poi.category)}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full border theme-border theme-muted theme-surface">
                  Stop #{stopNum}
                </span>
                {poi.openingHours && poi.openingHours !== 'Varies' && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full border theme-border theme-muted theme-surface">
                    Hours: {poi.openingHours}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

export default function ItineraryPanel({
  itineraries,
  pois,
  totalTime,
  startDate,
  activeDay,
  selectedPoiKey,
  poiMeta,
  cardRefs,
  onActiveDayChange,
  onPoiSelect,
  onViewAllDays,
}) {
  if (!itineraries.length) return null;

  return (
    <section className="space-y-4 animate-slide-up motion-reduce:animate-none" aria-labelledby="itinerary-heading">
      <div className="grid grid-cols-2 gap-3 animate-fade-in motion-reduce:animate-none mb-4" aria-label="Trip summary">
        <div className="glass-card p-3.5 rounded-xl hover:scale-[1.02] transition-transform motion-reduce:transform-none">
          <p className="text-[10px] uppercase font-bold tracking-wider theme-muted">Travel Time</p>
          <p className="text-base font-extrabold theme-accent mt-0.5">{totalTime} mins</p>
        </div>
        <div className="glass-card p-3.5 rounded-xl hover:scale-[1.02] transition-transform motion-reduce:transform-none">
          <p className="text-[10px] uppercase font-bold tracking-wider theme-muted">Total Stops</p>
          <p className="text-base font-extrabold theme-accent mt-0.5">{pois.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 id="itinerary-heading" className="text-sm font-bold uppercase tracking-wider theme-muted flex items-center gap-2">
          <Calendar className="w-4 h-4 theme-accent" aria-hidden="true" />
          Itinerary
        </h2>
        <button
          type="button"
          onClick={onViewAllDays}
          aria-pressed={activeDay === null}
          className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg border transition-all hover:scale-105 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ${activeDay === null ? 'theme-accent-bg theme-accent border-violet-400/30' : 'theme-surface theme-border theme-muted hover:theme-accent'}`}
        >
          View All Days
        </button>
      </div>

      {itineraries.map((dayPOIs, dayIdx) => {
        const dayColor = DAY_COLORS[dayIdx % DAY_COLORS.length];
        const dayDate = addDays(new Date(startDate), dayIdx);
        const isDayFocused = activeDay === dayIdx;
        const dayHeadingId = `day-heading-${dayIdx}`;

        return (
          <article
            key={dayIdx}
            className={`relative rounded-xl p-4 transition-all duration-300 border animate-fade-in motion-reduce:animate-none ${isDayFocused ? 'theme-card-active shadow-lg scale-[1.01] motion-reduce:transform-none' : 'glass-card hover:scale-[1.01] motion-reduce:transform-none'}`}
            aria-labelledby={dayHeadingId}
          >
            <button
              type="button"
              id={dayHeadingId}
              className="flex items-center gap-3 mb-4 w-full text-left rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
              onClick={() => onActiveDayChange(activeDay === dayIdx ? null : dayIdx)}
              aria-pressed={isDayFocused}
              aria-label={`Day ${dayIdx + 1}, ${formatDayLabel(dayDate)}, ${dayPOIs.length} stops${isDayFocused ? ', focused on map' : ''}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-lg ${dayColor.bg} animate-bounce-subtle motion-reduce:animate-none`} aria-hidden="true">
                D{dayIdx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold">Day {dayIdx + 1} · {formatDayLabel(dayDate)}</h3>
                <p className="text-[9px] theme-muted">Weather-optimized · {dayPOIs.length} stops</p>
              </div>
            </button>

            <ul
              id={`day-stops-${dayIdx}`}
              className={`relative border-l-2 ${dayColor.border} pl-4 ml-4 space-y-3`}
              role="list"
              aria-label={`Stops for day ${dayIdx + 1}`}
            >
                {dayPOIs.map((poi) => {
                  const key = `${dayIdx}-${poi.id}`;
                  const meta = poiMeta[key];
                  const stopNum = meta?.globalIndex ?? '?';
                  const isSelected = selectedPoiKey === key;

                  return (
                    <PoiCard
                      key={key}
                      poi={poi}
                      dayIdx={dayIdx}
                      dayColor={dayColor}
                      stopNum={stopNum}
                      isSelected={isSelected}
                      cardRef={(el) => { cardRefs.current[key] = el; }}
                      onSelect={onPoiSelect}
                    />
                  );
                })}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
