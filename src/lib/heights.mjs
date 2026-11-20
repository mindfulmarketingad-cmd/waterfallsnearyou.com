// Waterfall heights. Three sources, each a recorded figure:
//  1. data/heights.json from Wikidata (CC0), matched exactly on the USGS GNIS feature ID (P590),
//     written by scripts/fetch-heights.mjs.
//  2. A height stated in the USGS gazetteer text or the Google listing description.
//  3. data/cited-heights.json: a height stated on an agency page or a Cataloged
//     World Waterfall Database entry, used only when the first two are absent.
// Waterfalls with none of these show no height.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { statedHeight } from './bestof.mjs';

let wiki = null;
function wikidata() {
  if (wiki) return wiki;
  const file = path.join(process.cwd(), 'data/heights.json');
  wiki = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).byGnis || {} : {};
  return wiki;
}

let cited = null;
function citedHeights() {
  if (cited) return cited;
  const file = path.join(process.cwd(), 'data/cited-heights.json');
  const raw = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  delete raw._about;
  cited = raw;
  return cited;
}

/** { feet, source, url?, exact? } or null */
export function heightOf(l) {
  const w = l.gnisId && wikidata()[l.gnisId];
  if (w) return { feet: w.feet, source: 'Wikidata', url: `https://www.wikidata.org/wiki/${w.qid}` };
  const s = statedHeight(l);
  if (s) return { feet: s.feet, source: s.source === 'Google listing' ? 'Google listing' : 'USGS' };
  const c = l.url && citedHeights()[l.url];
  if (c && c.feet > 0 && c.source && c.url) return { feet: c.feet, source: c.source, url: c.url, exact: c.exact !== false };
  return null;
}

// Heights quoted from descriptive text are often approximate ("approx.", "more than"), so say so.
// A cited figure is exact unless the source page itself qualifies it.
export const fmtHeight = (h) => `${h.exact || h.source === 'Wikidata' ? '' : 'about '}${Math.round(h.feet).toLocaleString('en-US')} ft`;
