import { useMemo, useState } from 'react';
import { Link2, Check, Copy } from 'lucide-react';
import { buildShareUrl } from '../utils/tripShare';
import { copyTextToClipboard } from '../utils/clipboard';

export default function ShareTripPanel({
  destination,
  startDate,
  daysCount,
  radiusKm,
  baseUrl,
  onAnnounce,
}) {
  const canShare = Boolean(destination.trim());
  const shareUrl = useMemo(() => {
    if (!canShare) return '';
    return buildShareUrl(
      { destination, startDate, daysCount, radiusKm, autoRun: true },
      baseUrl
    );
  }, [canShare, destination, startDate, daysCount, radiusKm, baseUrl]);

  const [copied, setCopied] = useState(false);

  if (!canShare) {
    return null;
  }

  const handleCopy = async () => {
    if (!shareUrl) return;

    try {
      await copyTextToClipboard(shareUrl);
      setCopied(true);
      onAnnounce?.('Share link copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onAnnounce?.('Could not copy automatically. Select the link and copy it manually.');
    }
  };

  return (
    <section
      className="mx-6 p-4 rounded-xl glass-card space-y-3 animate-fade-in motion-reduce:animate-none"
      aria-labelledby="share-trip-heading"
    >
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 theme-accent" aria-hidden="true" />
        <h2 id="share-trip-heading" className="text-xs font-bold uppercase tracking-wider theme-muted">
          Share this trip
        </h2>
      </div>

      <p id="share-trip-description" className="text-[10px] theme-muted leading-normal">
        Anyone with this link will see your destination, dates, and trip settings. The itinerary plans automatically when they open it.
      </p>

      <label htmlFor="share-trip-url" className="sr-only">
        Shareable trip link
      </label>
      <input
        id="share-trip-url"
        readOnly
        value={shareUrl}
        aria-readonly="true"
        aria-describedby="share-trip-description"
        className="w-full glass-input rounded-lg px-3 py-2 text-[11px] font-mono truncate"
        onFocus={(e) => e.target.select()}
      />

      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Share link copied' : 'Copy share link to clipboard'}
        className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider border theme-border theme-surface hover:theme-accent transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" aria-hidden="true" />
            Copy share link
          </>
        )}
      </button>
    </section>
  );
}
