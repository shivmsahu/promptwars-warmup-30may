import { Map as MapIcon, Sun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';
import { interpretWeatherCode } from '../services/weather';
import { addDays, formatDayLabel } from '../utils/dates';

const ICON_MAP = { Sun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning };

export default function WeatherForecast({ weather, location, daysCount, startDate }) {
  if (!weather.length || !location) return null;

  const cityLabel = location.name.split(',')[0];

  return (
    <section className="glass-card p-4 rounded-xl animate-fade-in motion-reduce:animate-none" aria-labelledby="weather-heading">
      <div className="flex items-center gap-2 mb-3">
        <MapIcon className="w-4 h-4 theme-muted" aria-hidden="true" />
        <h2 id="weather-heading" className="font-bold text-[10px] uppercase tracking-wider theme-muted">
          Weather · {cityLabel}
        </h2>
      </div>
      <ul className="grid grid-cols-3 gap-2" role="list">
        {weather.slice(0, daysCount).map((w, i) => {
          const resolved = interpretWeatherCode(w.weatherCode);
          const Icon = ICON_MAP[resolved.icon] || Sun;
          const dayDate = addDays(new Date(startDate), i);

          return (
            <li key={w.date || i}>
              <article
                className="flex flex-col items-center p-2 rounded-lg theme-surface border theme-border min-w-[70px] hover:scale-105 transition-transform motion-reduce:transform-none"
                aria-label={`${formatDayLabel(dayDate)}: ${resolved.label}, high ${Math.round(w.maxTemp)} degrees, low ${Math.round(w.minTemp)} degrees`}
              >
                <span className="text-[9px] font-bold theme-muted uppercase mb-0.5">{formatDayLabel(dayDate)}</span>
                <Icon className="w-5 h-5 text-cyan-500 mb-1" aria-hidden="true" />
                <div className="text-[9px] theme-muted capitalize text-center mb-1 line-clamp-1">{resolved.label}</div>
                <div className="flex gap-1.5 text-xs font-bold">
                  <span>{Math.round(w.maxTemp)}°</span>
                  <span className="theme-muted font-normal">{Math.round(w.minTemp)}°</span>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
