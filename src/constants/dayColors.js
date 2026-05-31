export const DAY_COLORS = [
  { bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-500/40', ring: 'ring-violet-500/50', hex: '#8b5cf6' },
  { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500/40', ring: 'ring-cyan-500/50', hex: '#06b6d4' },
  { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500/40', ring: 'ring-pink-500/50', hex: '#ec4899' },
  { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500/40', ring: 'ring-emerald-500/50', hex: '#10b981' },
  { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500/40', ring: 'ring-amber-500/50', hex: '#f59e0b' },
];

export const DAY_HEX_COLORS = DAY_COLORS.map((c) => c.hex);

export const TILE_URLS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};
