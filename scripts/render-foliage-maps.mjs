// Renders self-hosted fall foliage maps for /fall-foliage and /fall-foliage/[state].
//
// Timing layer: USA National Phenology Network, Land Surface Phenology 2001–2017,
// "Mid Green-down Median". Each cell is the median day of year (2001–2017) when
// satellite greenness last fell to half its annual peak. USA-NPN describes that
// day as a metric of autumn leaf-color change. The grid is the contiguous
// United States only (NAD83, about 0.022 degrees). Citation and CC BY terms:
// https://www.usanpn.org/data/maps/land_surface_phenology
//
// Cells earlier than September 1 (day 244 of a non-leap year) are drawn tan.
// That cutoff is meteorological autumn. Earlier greendown in this layer is
// mostly grass, crop, and drought senescence, and it is not given a fall-color
// week. No peak date is invented: a week band is a seven-day group of the
// median day the grid actually stores.
//
// Outlines: U.S. Census Bureau cartographic boundaries, public domain, via the
// us-atlas states-10m composite.
//
// Alaska (and Hawaii on the national map) are outline-only because the grid
// does not cover them. Run: node scripts/render-foliage-maps.mjs
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { geoAlbersUsa, geoConicEqualArea, geoPath } from 'd3-geo';
import sharp from 'sharp';
import { states as foliageStates } from '../src/content/foliage/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'data/cache/usanpn-midgdown-median-2001-2017.tif');
const OUT_DIR = path.join(ROOT, 'public/images/foliage-maps');
const JSON_PATH = path.join(ROOT, 'src/data/foliage-maps.json');
const WIDTHS = [640, 1200, 1600];
const SOURCE_URL = 'https://geoserver.usanpn.org/geoserver/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId=inca__midgdown_median_nad83_02deg&format=image/tiff';
const PAGE_URL = 'https://www.usanpn.org/data/maps/land_surface_phenology';
const CENSUS_URL = 'https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const ACCESSED = 'November 20, 2026';
const AUTUMN_START = 244; // September 1 in a non-leap year
const PAPER = [246, 243, 236];
const TAN = [228, 214, 196];
const OUTSIDE = [208, 214, 210];
const INK = [36, 48, 56];
const PALETTE = [
  '#6e1d3c', '#8a2340', '#a82e32', '#c44728', '#dc5e1c', '#ee7a16',
  '#f3961c', '#f0b02a', '#e6c43e', '#d4cd58', '#b8c86a', '#93be72',
  '#6aad7a', '#4d9880', '#3d7f86', '#366878', '#305668', '#2a4554', '#243844',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

function doyParts(doy) {
  const dt = new Date(Date.UTC(2021, 0, doy));
  return { month: MONTHS[dt.getUTCMonth()], day: dt.getUTCDate() };
}

function bandIndex(doy) {
  if (doy >= 366) return 18;
  return Math.floor((doy - AUTUMN_START) / 7);
}

function bandLabel(index) {
  if (index === 18) return 'After Dec 31';
  const start = AUTUMN_START + index * 7;
  const end = Math.min(start + 6, 365);
  const a = doyParts(start);
  const b = doyParts(end);
  if (a.month === b.month) return `${a.month} ${a.day}–${b.day}`;
  return `${a.month} ${a.day}–${b.month} ${b.day}`;
}

function bandRange(index) {
  if (index === 18) return { startDoy: 366, endDoy: 400 };
  const start = AUTUMN_START + index * 7;
  return { startDoy: start, endDoy: Math.min(start + 6, 365) };
}

function hexRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function esc(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function assertCalendar() {
  const sept = doyParts(244);
  const oct = doyParts(274);
  if (sept.month !== 'Sept' || sept.day !== 1) throw new Error(`Day 244 resolved to ${sept.month} ${sept.day}`);
  if (oct.month !== 'Oct' || oct.day !== 1) throw new Error(`Day 274 resolved to ${oct.month} ${oct.day}`);
}

async function loadGrid() {
  if (!existsSync(CACHE)) {
    mkdirSync(path.dirname(CACHE), { recursive: true });
    console.log('Downloading USA-NPN mid-greendown median…');
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`USA-NPN download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1_000_000) throw new Error(`USA-NPN file is unexpectedly small (${buf.length} bytes)`);
    writeFileSync(CACHE, buf);
  }
  return decodeGrid(readFileSync(CACHE));
}

function decodeGrid(buf) {
  if (buf.toString('ascii', 0, 2) !== 'MM') throw new Error('Expected a big-endian TIFF from USA-NPN');
  const ifd = buf.readUInt32BE(4);
  const n = buf.readUInt16BE(ifd);
  const tags = new Map();
  for (let i = 0; i < n; i++) {
    const p = ifd + 2 + i * 12;
    tags.set(buf.readUInt16BE(p), {
      typ: buf.readUInt16BE(p + 2),
      count: buf.readUInt32BE(p + 4),
      valueOffset: p + 8,
      val: buf.readUInt32BE(p + 8),
    });
  }
  const sizeOf = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 11: 4, 12: 8 };
  const ptr = (t) => (sizeOf[t.typ] * t.count <= 4 ? t.valueOffset : t.val);
  const num = (tag, reader) => {
    const t = tags.get(tag);
    if (!t) return null;
    const base = ptr(t);
    const out = [];
    const step = sizeOf[t.typ];
    for (let i = 0; i < t.count; i++) out.push(reader(base + i * step));
    return out;
  };
  const shorts = (tag) => num(tag, (o) => buf.readUInt16BE(o));
  const longs = (tag) => num(tag, (o) => buf.readUInt32BE(o));
  const doubles = (tag) => num(tag, (o) => buf.readDoubleBE(o));
  const width = shorts(256)[0];
  const height = shorts(257)[0];
  const sampleFormat = shorts(339)?.[0];
  if (sampleFormat !== 3) throw new Error(`Expected float samples, got format ${sampleFormat}`);
  const tileW = shorts(322)[0];
  const tileH = shorts(323)[0];
  const offsets = longs(324);
  const counts = longs(325);
  const matrix = doubles(34264);
  if (!matrix || matrix.length < 8) throw new Error('GeoTIFF is missing its transformation matrix');
  const scaleX = matrix[0];
  const lon0 = matrix[3];
  const scaleY = matrix[5];
  const lat0 = matrix[7];
  if (!(scaleX > 0) || !(scaleY < 0)) throw new Error(`Unexpected grid scale ${scaleX}, ${scaleY}`);
  const tilesAcross = Math.ceil(width / tileW);
  const grid = new Float32Array(width * height);
  grid.fill(Number.NaN);
  for (let t = 0; t < offsets.length; t++) {
    const tx = t % tilesAcross;
    const ty = Math.floor(t / tilesAcross);
    const bytes = counts[t];
    const off = offsets[t];
    if (bytes !== tileW * tileH * 4) throw new Error(`Unexpected tile ${t} byte count ${bytes}`);
    for (let r = 0; r < tileH; r++) {
      const y = ty * tileH + r;
      if (y >= height) break;
      for (let c = 0; c < tileW; c++) {
        const x = tx * tileW + c;
        if (x >= width) continue;
        grid[y * width + x] = buf.readFloatBE(off + (r * tileW + c) * 4);
      }
    }
  }
  console.log(`Grid ${width}×${height}, ${scaleX.toFixed(5)}°, origin ${lon0.toFixed(3)}, ${lat0.toFixed(3)}`);
  return { grid, width, height, scaleX, scaleY, lon0, lat0 };
}

function classify(gridInfo, lon, lat) {
  const { grid, width, height, scaleX, scaleY, lon0, lat0 } = gridInfo;
  const col = (lon - lon0) / scaleX - 0.5;
  const row = (lat - lat0) / scaleY - 0.5;
  const c = Math.round(col);
  const r = Math.round(row);
  if (c < 0 || r < 0 || c >= width || r >= height) return { kind: 'outside' };
  const v = grid[r * width + c];
  if (!Number.isFinite(v) || v <= -1000 || v < AUTUMN_START || v > 450) return { kind: 'tan' };
  const band = bandIndex(v);
  if (band < 0 || band >= PALETTE.length) return { kind: 'tan' };
  return { kind: 'band', band };
}

function projectRings(proj, geometry) {
  const rings = [];
  let cur = null;
  geoPath(proj).context({
    moveTo(x, y) { cur = [[x, y]]; rings.push(cur); },
    lineTo(x, y) { cur.push([x, y]); },
    closePath() {},
    arc() {},
  })({ type: 'Feature', geometry, properties: {} });
  return rings
    .map((ring) => {
      if (ring.length < 3) return null;
      const [x, y] = ring[0];
      const last = ring[ring.length - 1];
      if (last[0] !== x || last[1] !== y) ring.push([x, y]);
      return ring;
    })
    .filter(Boolean);
}

function fillMask(rings, w, h, yMax) {
  const mask = new Uint8Array(w * h);
  const limit = Math.min(h, yMax);
  for (let y = 0; y < limit; y++) {
    const yy = y + 0.5;
    const xs = [];
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        let x1 = ring[i][0];
        let y1 = ring[i][1];
        let x2 = ring[i + 1][0];
        let y2 = ring[i + 1][1];
        if (y1 === y2) continue;
        if (y1 > y2) { const sx = x1; x1 = x2; x2 = sx; const sy = y1; y1 = y2; y2 = sy; }
        if (yy < y1 || yy >= y2) continue;
        xs.push(x1 + ((yy - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      let x0 = Math.ceil(xs[i]);
      let x1 = Math.floor(xs[i + 1]);
      if (x0 < 0) x0 = 0;
      if (x1 >= w) x1 = w - 1;
      for (let x = x0; x <= x1; x++) mask[y * w + x] = 1;
    }
  }
  return mask;
}

function strokeRings(buf, w, h, rings, radius, yMax) {
  const r2 = radius * radius;
  const ri = Math.ceil(radius);
  const limit = Math.min(h, yMax);
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const x1 = ring[i][0];
      const y1 = ring[i][1];
      const x2 = ring[i + 1][0];
      const y2 = ring[i + 1][1];
      const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
      for (let s = 0; s <= steps; s++) {
        const x = x1 + ((x2 - x1) * s) / steps;
        const y = y1 + ((y2 - y1) * s) / steps;
        const xLo = Math.max(0, Math.floor(x - ri));
        const xHi = Math.min(w - 1, Math.ceil(x + ri));
        const yLo = Math.max(0, Math.floor(y - ri));
        const yHi = Math.min(limit - 1, Math.ceil(y + ri));
        for (let yy = yLo; yy <= yHi; yy++) {
          for (let xx = xLo; xx <= xHi; xx++) {
            const dx = xx + 0.5 - x;
            const dy = yy + 0.5 - y;
            if (dx * dx + dy * dy <= r2) {
              const p = (yy * w + xx) * 4;
              buf[p] = INK[0]; buf[p + 1] = INK[1]; buf[p + 2] = INK[2]; buf[p + 3] = 255;
            }
          }
        }
      }
    }
  }
}

function paint(buf, w, color, x, y) {
  const p = (y * w + x) * 4;
  buf[p] = color[0]; buf[p + 1] = color[1]; buf[p + 2] = color[2]; buf[p + 3] = 255;
}

function projectionFor(feat, extent) {
  const name = feat.properties.name;
  // Albers USA already places Alaska and Hawaii without splitting them on the antimeridian.
  if (name === 'United States' || name === 'Alaska') {
    const proj = geoAlbersUsa();
    proj.fitExtent(extent, feat);
    return proj;
  }
  const proj = geoConicEqualArea();
  const [[west, south], [east, north]] = geoPath().bounds(feat);
  proj.rotate([-(west + east) / 2, 0]).parallels([south + (north - south) / 6, north - (north - south) / 6]);
  proj.fitExtent(extent, feat);
  return proj;
}

function cleanRings(rings, w, yMax) {
  const maxEdge = Math.max(90, w * 0.42);
  const kept = [];
  for (const ring of rings) {
    let jump = false;
    let area2 = 0;
    let seen = 0;
    let inView = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const dx = ring[i + 1][0] - ring[i][0];
      const dy = ring[i + 1][1] - ring[i][1];
      if (dx * dx + dy * dy > maxEdge * maxEdge) jump = true;
      area2 += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
      seen++;
      const x = ring[i][0];
      const y = ring[i][1];
      if (x >= -12 && x <= w + 12 && y >= -12 && y <= yMax + 12) inView++;
    }
    if (jump || seen < 3) continue;
    if (Math.abs(area2) / 2 < 2.5) continue;
    if (inView / seen < 0.5) continue;
    kept.push(ring);
  }
  return kept.length ? kept : rings;
}

function layout(width, extraLegendLines) {
  const height = Math.round(width * 630 / 1200);
  const titleSize = Math.max(15, Math.round(width * 0.023));
  const labelSize = Math.max(12, Math.round(width * 0.0155));
  const noteSize = Math.max(11, Math.round(width * 0.0135));
  const pad = Math.max(16, Math.round(width * 0.028));
  const legendH = Math.round(titleSize + labelSize + noteSize * (2 + extraLegendLines) + width * 0.046);
  return { width, height, titleSize, labelSize, noteSize, pad, legendH };
}

function drawBar(buf, w, x, y, barW, barH, items) {
  for (let i = 0; i < items.length; i++) {
    const x0 = Math.round(x + (barW * i) / items.length);
    const x1 = Math.round(x + (barW * (i + 1)) / items.length);
    const rgb = hexRgb(items[i].color);
    for (let yy = y; yy < y + barH; yy++) {
      for (let xx = x0; xx < x1; xx++) paint(buf, w, rgb, xx, yy);
    }
  }
  for (let xx = x; xx < x + barW; xx++) {
    paint(buf, w, INK, xx, y);
    paint(buf, w, INK, xx, y + barH - 1);
  }
  for (let yy = y; yy < y + barH; yy++) {
    paint(buf, w, INK, x, yy);
    paint(buf, w, INK, x + barW - 1, yy);
  }
}

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && next.length > maxChars) { lines.push(cur); cur = word; }
    else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function legendSvg(box, spec) {
  const { width, height, titleSize, labelSize, noteSize, pad, legendH } = box;
  const top = height - legendH;
  const parts = [];
  parts.push(`<text x="${pad}" y="${top + titleSize}" font-family="Inter, Liberation Sans, sans-serif" font-size="${titleSize}" font-weight="650" fill="#243038">${esc(spec.title)}</text>`);
  parts.push(`<text x="${width - pad}" y="${top + titleSize}" text-anchor="end" font-family="Inter, Liberation Sans, sans-serif" font-size="${labelSize}" fill="#3a3f44">${esc(spec.kicker)}</text>`);
  if (spec.mode === 'bands') {
    const barY = top + titleSize + Math.round(labelSize * 0.55);
    const barH = Math.max(12, Math.round(box.width * 0.018));
    const labels = spec.labelIndexes;
    const barW = width - pad * 2;
    for (const i of labels) {
      const item = spec.legend[i];
      const cx = pad + (barW * (i + 0.5)) / spec.legend.length;
      const anchor = i === 0 ? 'start' : i === spec.legend.length - 1 ? 'end' : 'middle';
      const x = i === 0 ? pad : i === spec.legend.length - 1 ? width - pad : cx;
      parts.push(`<text x="${x.toFixed(1)}" y="${barY + barH + labelSize + 2}" text-anchor="${anchor}" font-family="Inter, Liberation Sans, sans-serif" font-size="${labelSize}" fill="#243038">${esc(item.label)}</text>`);
    }
    let noteY = barY + barH + labelSize + noteSize + 8;
    parts.push(`<text x="${pad}" y="${noteY}" font-family="Inter, Liberation Sans, sans-serif" font-size="${noteSize}" fill="#4d5359">${esc(spec.note)}</text>`);
    noteY += noteSize + 6;
    let chipX = pad;
    for (const chip of spec.chips) {
      parts.push(`<rect x="${chipX}" y="${noteY - noteSize + 3}" width="${noteSize}" height="${noteSize}" rx="2" fill="${chip.color}" stroke="#243038" stroke-width="1"/>`);
      chipX += noteSize + 6;
      parts.push(`<text x="${chipX}" y="${noteY}" font-family="Inter, Liberation Sans, sans-serif" font-size="${noteSize}" fill="#4d5359">${esc(chip.label)}</text>`);
      chipX += chip.label.length * noteSize * 0.56 + 16;
    }
  } else {
    let y = top + titleSize + noteSize + 8;
    for (const line of spec.lines) {
      parts.push(`<text x="${pad}" y="${y}" font-family="Inter, Liberation Sans, sans-serif" font-size="${noteSize}" fill="#243038">${esc(line)}</text>`);
      y += noteSize + 4;
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${parts.join('\n  ')}
</svg>`;
}

function renderFeature(feat, gridInfo, box, mode) {
  const { width, height, pad, legendH } = box;
  const buf = Buffer.alloc(width * height * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = PAPER[0]; buf[i + 1] = PAPER[1]; buf[i + 2] = PAPER[2]; buf[i + 3] = 255;
  }
  const yMax = height - legendH;
  const extent = [[pad, pad], [width - pad, yMax - Math.round(pad * 0.4)]];
  const proj = projectionFor(feat, extent);
  const geometries = feat.geometry.type === 'GeometryCollection'
    ? feat.geometry.geometries
    : [feat.geometry];
  const counts = { inside: 0, tan: 0, outside: 0, bands: new Map() };
  const pieces = geometries.map((geometry) => ({ geometry, rings: cleanRings(projectRings(proj, geometry), width, yMax) }));
  for (const piece of pieces) {
    const mask = fillMask(piece.rings, width, height, yMax);
    for (let y = 0; y < yMax; y++) {
      for (let x = 0; x < width; x++) {
        if (!mask[y * width + x]) continue;
        counts.inside++;
        if (mode === 'outline') {
          paint(buf, width, OUTSIDE, x, y);
          counts.outside++;
          continue;
        }
        const ll = proj.invert([x + 0.5, y + 0.5]);
        if (!ll) { paint(buf, width, OUTSIDE, x, y); counts.outside++; continue; }
        const cell = classify(gridInfo, ll[0], ll[1]);
        if (cell.kind === 'band') {
          paint(buf, width, hexRgb(PALETTE[cell.band]), x, y);
          counts.bands.set(cell.band, (counts.bands.get(cell.band) || 0) + 1);
        } else if (cell.kind === 'outside') {
          paint(buf, width, OUTSIDE, x, y);
          counts.outside++;
        } else {
          paint(buf, width, TAN, x, y);
          counts.tan++;
        }
      }
    }
  }
  const radius = feat.properties.name === 'United States' ? Math.max(0.9, width / 980) : Math.max(1.35, width / 560);
  for (const piece of pieces) strokeRings(buf, width, height, piece.rings, radius, yMax);
  return { buf, counts };
}

function labelIndexes(n) {
  if (n <= 1) return [0];
  if (n === 2) return [0, 1];
  if (n <= 6) return [...Array(n).keys()];
  const mid = Math.floor((n - 1) / 2);
  const idxs = new Set([0, mid, n - 1]);
  if (n >= 8) { idxs.add(Math.floor((n - 1) / 4)); idxs.add(Math.floor((3 * (n - 1)) / 4)); }
  return [...idxs].sort((a, b) => a - b);
}

function sentenceWindow(indexLine) {
  return indexLine.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
}

function legendIndexes(bands, autumn) {
  const min = Math.max(12, autumn * 0.005);
  let indexes = [...bands.entries()].filter(([, n]) => n >= min).map(([index]) => index).sort((a, b) => a - b);
  if (!indexes.length && bands.size) indexes = [[...bands.entries()].sort((a, b) => b[1] - a[1])[0][0]];
  return indexes;
}

function buildCopy(name, mode, legend, counts, indexLine, scope, omittedShare = 0) {
  const range = legend.length === 0 ? '' : legend.length === 1 ? legend[0].label : `${legend[0].label} through ${legend[legend.length - 1].label}`;
  const tanShare = counts.inside ? counts.tan / counts.inside : 0;
  const outsideShare = counts.inside ? counts.outside / counts.inside : 0;
  if (mode === 'outline') {
    const why = scope === 'state'
      ? `The USA National Phenology Network mid-greendown grid covers the contiguous United States and has no cells in ${name}, so peak-week bands are not drawn.`
      : 'Peak-week bands are not drawn.';
    const windowText = indexLine ? ` The regional window already stated on this page: ${sentenceWindow(indexLine)}.` : '';
    return {
      caption: `Outline only. ${why}${windowText}`,
      alt: `Outline map of ${name}. Peak-week color bands are not shown because the 2001–2017 mid-greendown grid does not cover it.`,
    };
  }
  const tanSentence = tanShare > 0.01
    ? ' Cells before September 1, and cells with no reading, are left tan and are not given a fall-color week.'
    : '';
  const outsideSentence = outsideShare > 0.01
    ? ' Gray land is outside that grid, so it is an outline rather than a week band.'
    : '';
  const omittedSentence = omittedShare > 0.005
    ? ' Weeks with fewer than 0.5 percent of the colored cells stay on the map in their own color and are left off the legend.'
    : '';
  const place = scope === 'country' ? 'the United States' : name;
  const caption = `Color bands on this map of ${place} are seven-day groups of the median mid-greendown day for 2001–2017, from the USA National Phenology Network. Mid-greendown is the day satellite greenness last fell halfway from its annual peak, which that network uses as a metric of autumn leaf-color change. The legend lists ${range}.${tanSentence}${outsideSentence}${omittedSentence} This is not a ranger forecast for this year.`;
  const alt = `Map of ${name} colored by median mid-greendown week, 2001 to 2017, from the USA National Phenology Network. The legend runs from ${range}. Darker red is an earlier week and gold to olive is later.${tanShare > 0.01 ? ' Tan areas are not assigned a fall-color week.' : ''}${outsideShare > 0.01 ? ' Gray areas are outside the data grid.' : ''}`;
  return { caption, alt };
}

function collectRings(geometry) {
  const rings = [];
  const pull = (coords) => {
    if (!coords?.length) return;
    if (typeof coords[0][0] === 'number') rings.push(coords);
    else coords.forEach(pull);
  };
  pull(geometry.coordinates);
  return rings;
}

function gridStats(feat, gridInfo) {
  // Count autumn cells on the source grid itself, so the legend does not depend
  // on the hero image size.
  const bounds = geoPath().bounds(feat);
  const [[west, south], [east, north]] = bounds;
  const { scaleX, scaleY, lon0, lat0, width, height } = gridInfo;
  const col0 = Math.max(0, Math.floor((west - lon0) / scaleX - 1));
  const col1 = Math.min(width - 1, Math.ceil((east - lon0) / scaleX + 1));
  const row0 = Math.max(0, Math.floor((north - lat0) / scaleY - 1));
  const row1 = Math.min(height - 1, Math.ceil((south - lat0) / scaleY + 1));
  const rings = collectRings(feat.geometry);
  let inside = 0;
  let autumn = 0;
  const bands = new Map();
  for (let r = row0; r <= row1; r += 1) {
    const lat = lat0 + scaleY * (r + 0.5);
    const ys = [];
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        let x1 = a[0]; let y1 = a[1]; let x2 = b[0]; let y2 = b[1];
        if (y1 === y2) continue;
        if (y1 > y2) { const sx = x1; x1 = x2; x2 = sx; const sy = y1; y1 = y2; y2 = sy; }
        if (lat < y1 || lat >= y2) continue;
        ys.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    ys.sort((a, b) => a - b);
    const spans = [];
    for (let i = 0; i + 1 < ys.length; i += 2) spans.push([ys[i], ys[i + 1]]);
    if (!spans.length) continue;
    for (let c = col0; c <= col1; c++) {
      const lon = lon0 + scaleX * (c + 0.5);
      if (!spans.some(([a, b]) => lon >= a && lon <= b)) continue;
      inside++;
      const cell = classify(gridInfo, lon, lat);
      if (cell.kind === 'band') {
        autumn++;
        bands.set(cell.band, (bands.get(cell.band) || 0) + 1);
      }
    }
  }
  return { inside, autumn, bands };
}

async function writeSizes(slug, feat, gridInfo, copy, legend) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const width of WIDTHS) {
    const extra = copy.mode === 'outline' ? Math.max(2, copy.lines.length) : 1;
    const box = layout(width, extra);
    if (copy.mode === 'outline') {
      // Recompute lines to the width so the regional window fits the image.
      const chars = Math.max(28, Math.floor((width - box.pad * 2) / (box.noteSize * 0.56)));
      copy.lines = wrapText(copy.outlineText, chars);
      const box2 = layout(width, Math.max(2, copy.lines.length));
      const { buf } = renderFeature(feat, gridInfo, box2, 'outline');
      const svg = legendSvg(box2, {
        mode: 'outline',
        title: copy.title,
        kicker: 'Outline only',
        lines: ['Peak-week bands are not drawn.', ...copy.lines],
      });
      await sharp(buf, { raw: { width: box2.width, height: box2.height, channels: 4 } })
        .composite([{ input: Buffer.from(svg) }])
        .webp({ quality: 78, effort: 4 })
        .toFile(path.join(OUT_DIR, `${slug}-${width}.webp`));
    } else {
      const { buf, counts } = renderFeature(feat, gridInfo, box, 'bands');
      const barY = box.height - box.legendH + box.titleSize + Math.round(box.labelSize * 0.55);
      const barH = Math.max(12, Math.round(width * 0.018));
      drawBar(buf, width, box.pad, barY, width - box.pad * 2, barH, legend);
      const chips = [];
      if (counts.tan > counts.inside * 0.01) chips.push({ color: '#e4d6c4', label: 'Before Sept 1, or no reading' });
      if (counts.outside > counts.inside * 0.01) chips.push({ color: '#d0d6d2', label: 'Outside the data grid' });
      const svg = legendSvg(box, {
        mode: 'bands',
        title: copy.title,
        kicker: 'Median mid-greendown, 2001–2017',
        legend,
        labelIndexes: labelIndexes(legend.length),
        note: 'Not a forecast for this year.',
        chips,
      });
      await sharp(buf, { raw: { width: box.width, height: box.height, channels: 4 } })
        .composite([{ input: Buffer.from(svg) }])
        .webp({ quality: 78, effort: 4 })
        .toFile(path.join(OUT_DIR, `${slug}-${width}.webp`));
      if (width === 1200) copy.sample = counts;
    }
  }
}

function recordFor(slug, name, copy, legend) {
  return {
    slug,
    name,
    mode: copy.mode,
    alt: copy.alt,
    caption: copy.caption,
    credit: 'USA National Phenology Network',
    license: 'CC BY',
    licenseUrl: LICENSE_URL,
    sourceUrl: PAGE_URL,
    sourceTitle: 'USA National Phenology Network, Land Surface Phenology 2001–2017',
    outlineCredit: 'U.S. Census Bureau',
    outlineSourceUrl: CENSUS_URL,
    outlineSourceTitle: 'U.S. Census Bureau cartographic boundary files',
    accessed: ACCESSED,
    width: 1200,
    height: 630,
    src: `/images/foliage-maps/${slug}-1200.webp`,
    variants: WIDTHS,
    legend,
    autumnCells: copy.autumnCells,
    landCells: copy.landCells,
  };
}

const topo = JSON.parse(readFileSync(path.join(ROOT, 'node_modules/us-atlas/states-10m.json'), 'utf8'));
const allFeatures = feature(topo, topo.objects.states).features.filter((f) => !/samoa|guam|mariana|puerto rico|virgin islands/i.test(f.properties.name));
const byName = new Map(allFeatures.map((f) => [f.properties.name, f]));
const foliageBySlug = new Map(foliageStates.map((s) => [s.slug, s]));

assertCalendar();
const gridInfo = await loadGrid();
const only = new Set(process.argv.slice(2));
const records = {};
let bandStates = 0;
let outlineStates = 0;

for (const page of foliageStates) {
  if (only.size && !only.has(page.slug)) continue;
  const feat = byName.get(page.name);
  if (!feat) throw new Error(`No Census outline for ${page.name}`);
  const stats = gridStats(feat, gridInfo);
  const mode = stats.autumn > 0 ? 'bands' : 'outline';
  const indexes = legendIndexes(stats.bands, stats.autumn);
  const legend = indexes.map((index) => ({
    label: bandLabel(index),
    color: PALETTE[index],
    ...bandRange(index),
  }));
  const listedCells = indexes.reduce((sum, index) => sum + (stats.bands.get(index) || 0), 0);
  const omittedShare = stats.autumn ? (stats.autumn - listedCells) / stats.autumn : 0;
  const copy = {
    mode,
    title: page.name,
    autumnCells: stats.autumn,
    landCells: stats.inside,
    omittedShare,
    chips: [],
    lines: [],
    outlineText: `Regional window already on this page: ${sentenceWindow(page.indexLine)}.`,
    ...buildCopy(page.name, mode, legend, { inside: Math.max(stats.inside, 1), tan: mode === 'outline' ? 0 : Math.max(0, stats.inside - stats.autumn), outside: 0 }, page.indexLine, 'state', omittedShare),
  };
  // The caption's tan/gray sentences are refined from the 1200px render below.
  await writeSizes(page.slug, feat, gridInfo, copy, legend);
  if (mode === 'bands' && copy.sample) {
    const refined = buildCopy(page.name, 'bands', legend, copy.sample, page.indexLine, 'state', copy.omittedShare);
    copy.caption = refined.caption;
    copy.alt = refined.alt;
  }
  records[page.slug] = recordFor(page.slug, page.name, copy, mode === 'bands' ? legend : []);
  if (mode === 'bands') bandStates++;
  else outlineStates++;
  console.log(`${page.slug.padEnd(18)} ${mode.padEnd(8)} autumn cells ${stats.autumn}/${stats.inside} bands ${legend.length}`);
}

if (!only.size || only.has('united-states')) {
  const features = allFeatures;
  const country = {
    type: 'Feature',
    properties: { name: 'United States' },
    geometry: { type: 'GeometryCollection', geometries: features.map((f) => f.geometry) },
  };
  // Legend from the union of state bands already computed when all states were
  // rendered. When filtering, recompute from the grid across the lower 48.
  const bandSet = new Map();
  let tan = 0;
  let outside = 0;
  let inside = 0;
  for (const feat of features) {
    const stats = gridStats(feat, gridInfo);
    inside += stats.inside;
    if (stats.autumn === 0) outside += stats.inside;
    else {
      tan += stats.inside - stats.autumn;
      for (const [band, n] of stats.bands) bandSet.set(band, (bandSet.get(band) || 0) + n);
    }
  }
  const autumnCells = [...bandSet.values()].reduce((s, n) => s + n, 0);
  const indexes = legendIndexes(bandSet, autumnCells);
  const legend = indexes.map((index) => ({
    label: bandLabel(index),
    color: PALETTE[index],
    ...bandRange(index),
  }));
  const listedCells = indexes.reduce((sum, index) => sum + (bandSet.get(index) || 0), 0);
  const omittedShare = autumnCells ? (autumnCells - listedCells) / autumnCells : 0;
  const counts = { inside: Math.max(inside, 1), tan, outside, bands: bandSet };
  const copy = {
    mode: 'bands',
    title: 'United States',
    autumnCells,
    landCells: inside,
    omittedShare,
    chips: [],
    ...buildCopy('the United States', 'bands', legend, counts, null, 'country', omittedShare),
  };
  await writeSizes('united-states', country, gridInfo, copy, legend);
  if (copy.sample) {
    const refined = buildCopy('the United States', 'bands', legend, copy.sample, null, 'country', copy.omittedShare);
    copy.caption = refined.caption;
    copy.alt = refined.alt;
  }
  records['united-states'] = recordFor('united-states', 'the United States', copy, legend);
  console.log(`united-states     bands    legend ${legend.length}`);
}

if (only.size) {
  const prev = existsSync(JSON_PATH) ? JSON.parse(readFileSync(JSON_PATH, 'utf8')) : {};
  Object.assign(prev, records);
  writeFileSync(JSON_PATH, `${JSON.stringify(prev, null, 2)}\n`);
} else {
  writeFileSync(JSON_PATH, `${JSON.stringify(records, null, 2)}\n`);
}
console.log(`Done. State pages with bands: ${bandStates}. Outline-only: ${outlineStates}.`);
