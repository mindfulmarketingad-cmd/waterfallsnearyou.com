// Shared map helper: MapLibre GL with free OpenFreeMap vector tiles (no API key, commercial use OK).
// Points: { n: name, u: url, la, ln, t: town label, r?: rating, c?: review count }.
const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const BASE = '/vendor/maplibre/';
let libPromise;

export function loadMapLibre() {
  if (!libPromise) {
    if (!document.querySelector('link[data-maplibre]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = `${BASE}maplibre-gl.css`;
      css.dataset.maplibre = '';
      document.head.append(css);
    }
    libPromise = import(/* @vite-ignore */ `${BASE}maplibre-gl.mjs`).then((m) => m.default || m);
  }
  return libPromise;
}

const toGeoJSON = (points, highlight) => ({
  type: 'FeatureCollection',
  features: points.map((p) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.ln, p.la] },
    properties: { n: p.n, u: p.u, t: p.t, r: p.r || 0, c: p.c || 0, h: highlight && p.u === highlight ? 1 : 0 },
  })),
});

function boundsOf(points) {
  let w = 180, s = 90, e = -180, n = -90;
  for (const p of points) { w = Math.min(w, p.ln); e = Math.max(e, p.ln); s = Math.min(s, p.la); n = Math.max(n, p.la); }
  return [[w, s], [e, n]];
}

function popupNode(props) {
  const box = document.createElement('div');
  box.className = 'wpop';
  const a = document.createElement('a');
  a.href = props.u;
  a.textContent = props.n;
  const meta = document.createElement('div');
  meta.textContent = `${props.t}${props.r ? ` · ${Number(props.r).toFixed(1)} stars (${Number(props.c).toLocaleString('en-US')} reviews)` : ''}`;
  const go = document.createElement('div');
  const link = document.createElement('a');
  link.href = props.u;
  link.textContent = 'View waterfall';
  go.append(link);
  box.append(a, meta, go);
  return box;
}

/**
 * Creates a map in `el`. Options: bounds [[w,s],[e,n]] | center [lng,lat] + zoom, highlight (url of
 * the featured waterfall), padding. Returns { map, setPoints(points, fit) }.
 */
export async function createWaterfallMap(el, points, opts = {}) {
  const maplibregl = await loadMapLibre();
  let map;
  try {
    map = new maplibregl.Map({
      container: el,
      style: STYLE,
      ...(opts.center ? { center: opts.center, zoom: opts.zoom ?? 12 } : { bounds: opts.bounds || boundsOf(points), fitBoundsOptions: { padding: opts.padding ?? 30, maxZoom: 12 } }),
      cooperativeGestures: true,
      attributionControl: { compact: true },
    });
  } catch (err) {
    el.textContent = 'The interactive map could not load in this browser.';
    el.classList.add('wmap-fallback');
    throw err;
  }
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
  el.wmap = map; // handy for debugging and automated checks
  let pending = toGeoJSON(points, opts.highlight);
  const ready = new Promise((resolve) => map.on('load', resolve));
  ready.then(() => {
    map.addSource('falls', { type: 'geojson', data: pending });
    map.addLayer({
      id: 'falls',
      type: 'circle',
      source: 'falls',
      paint: {
        'circle-radius': ['case', ['==', ['get', 'h'], 1], 9, ['>', ['get', 'r'], 0], 6, 5],
        'circle-color': ['case', ['==', ['get', 'h'], 1], '#b4432c', ['>', ['get', 'r'], 0], '#3f6f5a', '#9aa6a1'],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    });
    map.on('click', 'falls', (e) => {
      const f = e.features[0];
      new maplibregl.Popup({ offset: 10, maxWidth: '260px' }).setLngLat(f.geometry.coordinates).setDOMContent(popupNode(f.properties)).addTo(map);
    });
    map.on('mouseenter', 'falls', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'falls', () => { map.getCanvas().style.cursor = ''; });
  });
  return {
    map,
    async setPoints(next, fit = true) {
      pending = toGeoJSON(next, opts.highlight);
      await ready;
      map.getSource('falls').setData(pending);
      if (fit && next.length) map.fitBounds(boundsOf(next), { padding: opts.padding ?? 30, maxZoom: 12, duration: 0 });
    },
  };
}

// ---------- Trail maps ----------
// OpenFreeMap's vector tiles carry OpenStreetMap paths, footways and tracks (OpenMapTiles
// "transportation" layer, class path/track) plus parking from the "poi" layer. We highlight them
// and report whether any trail actually reaches the waterfall, so pages only claim a trail map
// when one exists in the data.
const TRAIL_CLASSES = ['path', 'track'];
const toRad = (d) => (d * Math.PI) / 180;
function meters(a, b) {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
const coordsOf = (g) => (g.type === 'LineString' ? g.coordinates : g.type === 'MultiLineString' ? g.coordinates.flat() : g.type === 'Point' ? [g.coordinates] : []);
const once = (map, ev) => new Promise((r) => map.once(ev, r));

/**
 * Highlights trails around `center` ([lng, lat]) on a map made by createWaterfallMap. Resolves to
 * { names: string[], parking: number } when a trail passes within `reach` meters of the falls, or
 * null when none does (the map is then returned to `fallbackZoom`).
 */
export async function showTrails(api, center, { reach = 300, radius = 1500, fallbackZoom = 12 } = {}) {
  const { map } = api;
  if (!map.loaded()) await once(map, 'load');
  const src = Object.entries(map.getStyle().sources).find(([, s]) => s.type === 'vector')?.[0];
  if (!src) return null;
  map.jumpTo({ center, zoom: 14.5 });
  await once(map, 'idle');
  const isTrail = ['in', ['get', 'class'], ['literal', TRAIL_CLASSES]];
  const near = (f, r) => coordsOf(f.geometry).some((c) => meters(c, center) <= r);
  const lines = map.querySourceFeatures(src, { sourceLayer: 'transportation', filter: isTrail }).filter((f) => near(f, radius));
  if (!lines.some((f) => near(f, reach))) {
    map.jumpTo({ center, zoom: fallbackZoom });
    return null;
  }
  const names = [...new Set(map.querySourceFeatures(src, { sourceLayer: 'transportation_name', filter: isTrail })
    .filter((f) => near(f, radius)).map((f) => f.properties.name).filter(Boolean))].sort();
  const parking = [];
  for (const f of map.querySourceFeatures(src, { sourceLayer: 'poi', filter: ['==', ['get', 'class'], 'parking'] })) {
    const c = coordsOf(f.geometry)[0];
    if (c && meters(c, center) <= radius && !parking.some((p) => meters(p, c) < 60)) parking.push(c);
  }
  const before = map.getLayer('falls') ? 'falls' : undefined;
  map.addLayer({
    id: 'trails-casing', type: 'line', source: src, 'source-layer': 'transportation', filter: isTrail,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 7] },
  }, before);
  map.addLayer({
    id: 'trails', type: 'line', source: src, 'source-layer': 'transportation', filter: isTrail,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#e0782b', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.6, 16, 4.5] },
  }, before);
  if (parking.length) {
    map.addSource('parking', { type: 'geojson', data: { type: 'FeatureCollection', features: parking.map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: {} })) } });
    map.addLayer({ id: 'parking', type: 'circle', source: 'parking', paint: { 'circle-radius': 6, 'circle-color': '#2b6cb0', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } }, before);
  }
  // Frame the trails near the falls.
  let w = center[0], e = center[0], s = center[1], n = center[1];
  for (const f of lines) for (const c of coordsOf(f.geometry)) {
    if (meters(c, center) > radius) continue;
    w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]);
  }
  for (const c of parking) { w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); }
  map.fitBounds([[w, s], [e, n]], { padding: 40, maxZoom: 16, duration: 0 });
  return { names, parking: parking.length };
}
