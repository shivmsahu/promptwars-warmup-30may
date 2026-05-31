import { Shield } from 'lucide-react';

export default function SettingsPanel({ radarKey, orsKey, onRadarKeyChange, onOrsKeyChange }) {
  return (
    <section
      id="settings-panel"
      className="mx-6 p-4 rounded-xl glass-card space-y-3 animate-slide-down"
      aria-labelledby="settings-heading"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold theme-muted uppercase tracking-wider mb-1">
        <Shield className="w-3.5 h-3.5 theme-accent" aria-hidden="true" />
        <h2 id="settings-heading">API Configuration</h2>
      </div>
      <div>
        <label htmlFor="radar-key" className="block text-[11px] theme-muted mb-1">
          Radar.io API Key
        </label>
        <input
          id="radar-key"
          type="password"
          autoComplete="off"
          placeholder="prj_live_pk_..."
          className="w-full glass-input rounded-lg px-3 py-1.5 text-xs"
          value={radarKey}
          onChange={(e) => onRadarKeyChange(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="ors-key" className="block text-[11px] theme-muted mb-1">
          OpenRouteService API Key
        </label>
        <input
          id="ors-key"
          type="password"
          autoComplete="off"
          placeholder="5b3ce35b..."
          className="w-full glass-input rounded-lg px-3 py-1.5 text-xs"
          value={orsKey}
          onChange={(e) => onOrsKeyChange(e.target.value)}
        />
      </div>
      <p className="text-[10px] theme-muted/60 leading-normal">
        Leave keys blank to use zero-config public endpoints.
      </p>
    </section>
  );
}
