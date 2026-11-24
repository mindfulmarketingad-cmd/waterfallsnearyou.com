// Typical fall color stage for a state on a given date, from the begin / peak window in
// data/foliage-peaks.json. Dates are month-day strings; the year does not matter.
export const STAGES = {
  green: { label: 'Still green', color: '#7fb069' },
  turning: { label: 'Color building', color: '#e9c46a' },
  peak: { label: 'Typical peak', color: '#d9582b' },
  past: { label: 'Past peak', color: '#8c5a3c' },
  bare: { label: 'Mostly bare', color: '#b9b7b0' },
  none: { label: 'No published window', color: '#dfe3e1' },
};
export const SEASON_START = '09-01';
export const SEASON_END = '11-30';

const doy = (md) => {
  const [m, d] = md.split('-').map(Number);
  return Math.round((Date.UTC(2026, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000);
};
export const mdOf = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const dayOf = doy;
export const fromDay = (n) => {
  const d = new Date(Date.UTC(2026, 0, 1 + n));
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};
export const prettyDay = (md) => new Date(Date.UTC(2026, +md.slice(0, 2) - 1, +md.slice(3))).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

export function stageOn(win, md) {
  if (!win) return 'none';
  const d = doy(md);
  if (d < doy(win.begin)) return 'green';
  if (d < doy(win.peakStart)) return 'turning';
  if (d <= doy(win.peakEnd)) return 'peak';
  if (d <= doy(win.peakEnd) + 10) return 'past';
  return 'bare';
}
export const windowText = (win) => (win ? `${prettyDay(win.peakStart)} to ${prettyDay(win.peakEnd)}` : '');
