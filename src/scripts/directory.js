// Client helpers shared by the homepage carousel and the search page.
let indexPromise;
export function loadIndex() {
  indexPromise ||= fetch('/search-index.json').then((r) => {
    if (!r.ok) throw new Error('index');
    return r.json();
  });
  return indexPromise;
}

export const norm = (s) => String(s).normalize('NFKD').replace(/[̀-ͯʻ']/g, '').toLowerCase();

export function miles(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

export const imageOf = (row) => row[7] || `/images/gen${row[1]}.webp`;

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

export function nearest(index, point, count = 12) {
  return index.l
    .map((row) => ({ row, d: miles(point, { lat: row[4], lng: row[5] }) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count);
}

export async function ipLocation() {
  try {
    const r = await fetch('/api/geo', { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    const j = await r.json();
    if (typeof j.lat !== 'number' || typeof j.lng !== 'number') return null;
    return j;
  } catch {
    return null;
  }
}

export function browserLocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precise: true }),
      (e) => reject(e),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
    );
  });
}

export const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
