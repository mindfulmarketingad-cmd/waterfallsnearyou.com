// Marker data for the /map hub and /map/[state] pages.
import { loadData } from './core.mjs';

export const MAP_YEAR = 2026;
export const point = (l) => ({
  n: l.name, u: l.url, la: +l.lat.toFixed(5), ln: +l.lng.toFixed(5),
  t: `${l.city.name}, ${l.stateCode}`,
  ...(l.os?.rating && l.os.reviews ? { r: l.os.rating, c: l.os.reviews } : {}),
});
export const mapUrl = (state) => (state ? `/map/${state.slug}` : '/map');
export function mapStates() {
  return [...loadData().states].sort((a, b) => a.name.localeCompare(b.name));
}
