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
