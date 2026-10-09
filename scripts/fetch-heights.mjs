// Pulls waterfall heights from Wikidata (CC0) for every item that has a USGS GNIS feature ID (P590)
// and a height (P2048), and writes data/heights.json keyed by GNIS ID. Run manually:
//   node scripts/fetch-heights.mjs
// Needs network access to query.wikidata.org. Only GNIS IDs that exist in our listings are kept.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadData } from '../src/lib/core.mjs';

const QUERY = `SELECT ?item ?gnis ?m WHERE {
  ?item wdt:P590 ?gnis ;
        p:P2048/psn:P2048/wikibase:quantityAmount ?m .
}`;
const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(QUERY)}`, {
  headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'WaterfallsNearYou/1.0 (https://www.waterfallsnearyou.com/contact)' },
});
if (!res.ok) throw new Error(`Wikidata query failed: ${res.status} ${await res.text()}`);
const rows = (await res.json()).results.bindings;
const ours = new Set(loadData().listings.map((l) => String(l.gnisId)));
const byGnis = {};
for (const r of rows) {
  const gnis = String(Number(r.gnis.value)); // GNIS IDs sometimes carry leading zeros
  if (!ours.has(gnis)) continue;
  const feet = Number(r.m.value) * 3.28084; // psn: values are normalized to meters
  if (!(feet > 0 && feet < 4000)) continue;
  const qid = r.item.value.split('/').pop();
  // Several height statements: keep the largest (total height), as waterfall databases do.
  if (!byGnis[gnis] || feet > byGnis[gnis].feet) byGnis[gnis] = { feet: Math.round(feet), qid };
}
const out = { source: 'Wikidata (CC0), property P2048 matched on GNIS ID P590', fetched: new Date().toISOString().slice(0, 10), byGnis };
writeFileSync(path.join(process.cwd(), 'data/heights.json'), JSON.stringify(out));
console.log(`Saved heights for ${Object.keys(byGnis).length} of our waterfalls (from ${rows.length} Wikidata rows).`);
