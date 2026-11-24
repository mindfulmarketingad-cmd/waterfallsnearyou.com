// Every page on the site that is about one state, gathered from the same data the pages are built
// from, so a state page can link to all of them and nothing is hand-listed.
import { getFoliagePages } from './foliage.mjs';
import { getCityHubs } from './cityhubs.mjs';
import { fishPages, fishHref, fishLabel } from './fish.mjs';
import { getPosts } from './blog.mjs';
import { findCitiesFor } from './find.mjs';

const strip = (h) => h.replace(/<[^>]+>/g, ' ');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function stateRelated(state, { skip = new Set() } = {}) {
  const out = [];
  const add = (group, label, url, note = '') => {
    if (!url || skip.has(url) || out.some((o) => o.url === url)) return;
    out.push({ group, label, url, note });
  };
  const fol = getFoliagePages().find((p) => p.slug === state.slug);
  if (fol) add('Maps and seasons', `${state.name} fall foliage map`, fol.url, 'When color arrives and which falls to pair with it');
  add('Maps and seasons', `${state.name} waterfall map`, `/map/${state.slug}`, 'Every waterfall on one map, with a printable PDF');
  for (const h of getCityHubs().filter((x) => x.st === state.code)) add('Day trips from cities', `Waterfalls near ${h.name}`, h.url, `${h.picks.length} waterfalls within a day trip`);
  const name = new RegExp(`\\b${esc(state.name)}\\b`, 'g');
  for (const sp of fishPages().filter((s) => s.page && (s.states || []).includes(state.code))) add('Fish at waterfalls', `${fishLabel(sp)} near ${state.name} waterfalls`, fishHref(sp), 'Where GBIF records place this species at our waterfalls');
  for (const p of getPosts()) {
    const hits = (strip(p.html).match(name) || []).length + (name.test(p.title) ? 3 : 0);
    name.lastIndex = 0;
    if (hits >= 2) add('Articles that mention ' + state.name, p.title, p.url);
  }
  return out;
}
