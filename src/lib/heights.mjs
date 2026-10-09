// Waterfall heights. Two sources, both real records:
//  1. data/heights.json from Wikidata (CC0), matched exactly on the USGS GNIS feature ID (P590),
//     written by scripts/fetch-heights.mjs.
//  2. A height stated in the USGS gazetteer text or the Google listing description.
// Waterfalls with neither show no height.
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

/** { feet, source, url? } or null */
export function heightOf(l) {
  const w = l.gnisId && wikidata()[l.gnisId];
  if (w) return { feet: w.feet, source: 'Wikidata', url: `https://www.wikidata.org/wiki/${w.qid}` };
  const s = statedHeight(l);
  if (s) return { feet: s.feet, source: s.source === 'Google listing' ? 'Google listing' : 'USGS' };
  return null;
}

// Heights quoted from descriptive text are often approximate ("approx.", "more than"), so say so.
export const fmtHeight = (h) => `${h.source === 'Wikidata' ? '' : 'about '}${Math.round(h.feet).toLocaleString('en-US')} ft`;
