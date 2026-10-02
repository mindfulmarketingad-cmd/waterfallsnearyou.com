// Builds src/data/state-shapes.json: a small SVG outline per state from US Census boundaries
// (us-atlas, public domain). Each state gets its own equal-area projection fitted to a 100x100 box,
// then is simplified at that size (Douglas-Peucker), so small states keep their detail.
// Run: node scripts/make-state-shapes.mjs   (output is committed)
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoConicEqualArea, geoPath } from 'd3-geo';

const topo = JSON.parse(readFileSync(new URL('../node_modules/us-atlas/states-10m.json', import.meta.url)));
const states = feature(topo, topo.objects.states).features;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const SIZE = 100, PAD = 3, TOL = 0.35, MIN_AREA = 0.8;

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1e-9;
    const d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [a, b];
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
}
const area = (r) => Math.abs(r.reduce((s, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x * y2 - x2 * y; }, 0) / 2);

const out = {};
const KEEP = new Set(['American Samoa', 'Guam', 'Commonwealth of the Northern Mariana Islands', 'Puerto Rico', 'United States Virgin Islands']);
for (const f of states) {
  const name = f.properties.name;
  if (KEEP.has(name)) continue; // territories are not listed in the directory
  const proj = geoConicEqualArea();
  let fitTo = f;
  if (name === 'Alaska') {
    proj.rotate([152, 0]).parallels([55, 65]);
    fitTo = { type: 'MultiPoint', coordinates: [[-168, 52], [-130, 52], [-130, 71.5], [-168, 71.5], [-141, 72], [-141, 59]] };
  } else {
    const [[w, s], [e, n]] = geoPath().bounds(f);
    proj.rotate([-(w + e) / 2, 0]).parallels([s + (n - s) / 6, n - (n - s) / 6]);
  }
  proj.fitExtent([[PAD, PAD], [SIZE - PAD, SIZE - PAD]], fitTo);
  // Collect projected rings through a path context.
  const rings = [];
  let cur = null;
  geoPath(proj).context({
    moveTo(x, y) { cur = [[x, y]]; rings.push(cur); },
    lineTo(x, y) { cur.push([x, y]); },
    closePath() {},
    arc() {},
  })(f);
  const d = rings
    .map((r) => {
      // Douglas-Peucker on a closed ring: split at the farthest point from the start.
      let far = 0, fi = 0;
      r.forEach(([x, y], i) => { const dd = Math.hypot(x - r[0][0], y - r[0][1]); if (dd > far) { far = dd; fi = i; } });
      return [...dp(r.slice(0, fi + 1), TOL).slice(0, -1), ...dp([...r.slice(fi), r[0]], TOL).slice(0, -1)];
    })
    .filter((r) => r.length >= 3 && area(r) >= MIN_AREA && r.some(([x, y]) => x > -5 && x < SIZE + 5 && y > -5 && y < SIZE + 5))
    .map((r) => 'M' + r.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z')
    .join('');
  out[slug(name)] = d;
}
writeFileSync(new URL('../src/data/state-shapes.json', import.meta.url), JSON.stringify(out));
const sizes = Object.entries(out).map(([k, v]) => [k, v.length]).sort((a, b) => b[1] - a[1]);
console.log(Object.keys(out).length, 'shapes; total', sizes.reduce((s, [, n]) => s + n, 0), 'chars; largest', sizes.slice(0, 4), 'smallest', sizes.slice(-3));
