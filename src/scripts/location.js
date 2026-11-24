// Shared visitor-location helper. Uses the browser's Geolocation and Permissions APIs only: the
// position stays in this page's memory and is never sent to a server. Pages subscribe with
// onLocation() and are told whenever the position or the permission changes.
//   status: 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported' | 'error'
let loc = null;
let status = 'unknown';
const subs = new Set();
const emit = () => subs.forEach((fn) => fn({ loc, status }));

export const getLocation = () => loc;
export const hasGeolocation = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

export function onLocation(fn) {
  subs.add(fn);
  if (loc || status !== 'unknown') fn({ loc, status });
  return () => subs.delete(fn);
}

export function requestLocation() {
  return new Promise((resolve) => {
    if (!hasGeolocation()) { status = 'unsupported'; emit(); resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        status = 'granted';
        emit();
        resolve(loc);
      },
      (err) => {
        loc = null;
        status = err.code === 1 ? 'denied' : 'error';
        emit();
        resolve(null);
      },
      { timeout: 12000, maximumAge: 600000 },
    );
  });
}

let watching = false;
// Runs once per page: when the visitor has already allowed location for this site, use it without
// a prompt, and follow later permission changes (allowed, blocked or reset in browser settings).
export async function autoLocate() {
  if (watching) return;
  watching = true;
  if (!hasGeolocation()) { status = 'unsupported'; emit(); return; }
  if (!navigator.permissions?.query) return;
  try {
    const perm = await navigator.permissions.query({ name: 'geolocation' });
    const sync = () => {
      if (perm.state === 'granted') requestLocation();
      else { loc = null; status = perm.state; emit(); }
    };
    perm.onchange = sync;
    sync();
  } catch { /* unsupported: the visitor can still press the location button */ }
}

export const miles = (a, b) => {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
};
export const fmtMiles = (d) => `${d < 10 ? d.toFixed(1) : Math.round(d).toLocaleString('en-US')} mi`;
