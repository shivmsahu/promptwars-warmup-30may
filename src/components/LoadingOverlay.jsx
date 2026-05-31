import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({ stage }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="loading-title"
      aria-describedby="loading-stage"
    >
      <div className="glass-card rounded-2xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl border theme-border min-w-[260px]">
        <div className="relative" aria-hidden="true">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping motion-reduce:animate-none" />
          <Loader2 className="w-12 h-12 animate-spin motion-reduce:animate-none theme-accent relative" />
        </div>
        <div className="text-center space-y-1">
          <p id="loading-title" className="text-sm font-bold theme-accent">
            Planning your trip
          </p>
          <p id="loading-stage" className="text-xs theme-muted capitalize" aria-live="polite">
            {stage}...
          </p>
        </div>
      </div>
    </div>
  );
}
