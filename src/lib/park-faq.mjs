// Questions and answers for each national park guide, built from the park's own data. Used for the
// on-page FAQ and the FAQPage schema, so every answer matches the facts shown elsewhere on the page.
import { fmtNum } from './format.mjs';
import { stateLabel } from './park-title.mjs';

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const miles = (f) => `${Math.round(f.miles * 10) / 10} ${f.miles === 1 ? 'mile' : 'miles'}${f.distanceKind ? ` ${f.distanceKind.replace('-', ' ')}` : ''}`;
const a = (href, text) => `<a href="${href}">${text}</a>`;
const short = (name) => name.replace(/ National Park( and Preserve)?$/, '');

export function parkFaqs(park) {
  const falls = park.falls;
  const states = [...new Map(falls.map((f) => [f.stateSlug, { name: f.state }])).values()];
  const where = stateLabel(states);
  const out = [];

  out.push({
    q: `Are there waterfalls in ${park.name}?`,
    a: falls.length === 1
      ? `Yes. We cover one: ${a(falls[0].url, falls[0].name)}${falls[0].city ? `, near ${falls[0].city}` : ''}, in ${where}. The details on this page come from National Park Service pages, USGS records and our own trail and review data.`
      : `Yes. We cover ${falls.length} waterfalls in ${park.name} in ${where}: ${falls.slice(0, 8).map((f) => a(f.url, f.name)).join(', ')}${falls.length > 8 ? ` and ${falls.length - 8} more` : ''}. Each one has its own page with a map, directions and visitor ratings.`,
  });

  const walkable = falls.filter((f) => f.miles > 0).sort((x, y) => x.miles - y.miles);
  if (walkable.length >= 2) {
    out.push({
      q: `Which waterfall in ${short(park.name)} is the easiest to walk to?`,
      a: `${a(walkable[0].url, walkable[0].name)} has the shortest published walk, ${miles(walkable[0])}${walkable[0].difficulty ? `, and the park or our trail notes describe it as ${walkable[0].difficulty.toLowerCase().replace(/ \(nps.*$/, '')}` : ''}. ${walkable.length > 1 ? `The longest published walk is ${a(walkable[walkable.length - 1].url, walkable[walkable.length - 1].name)} at ${miles(walkable[walkable.length - 1])}.` : ''}`,
    });
  }

  const reviewed = falls.filter((f) => f.reviews > 0).sort((x, y) => y.reviews - x.reviews);
  if (reviewed.length >= 2) {
    out.push({
      q: `What is the most popular waterfall in ${short(park.name)}?`,
      a: `${a(reviewed[0].url, reviewed[0].name)} has the most visitor reviews, with ${fmtNum(reviewed[0].reviews)} on Google${reviewed[0].rating ? ` and an average of ${reviewed[0].rating.toFixed(1)} stars` : ''}.`,
    });
  }

  if (park.fees?.length) {
    const feeUrl = park.sources.find((s) => /fee/i.test(s.url))?.url || park.npsUrl;
    const rows = park.fees.slice(0, 2).map((r) => `${r.label}: ${r.text}`);
    out.push({
      q: `How much does it cost to visit ${park.name}?`,
      a: `${rows.join(' ')} Fees change, so confirm the current price on the <a href="${feeUrl}" rel="noopener" target="_blank">National Park Service fee page</a> before you go.`,
    });
  }

  out.push({
    q: `When is the best time to see waterfalls in ${park.name}?`,
    a: park.gauge
      ? `Water usually runs highest in ${park.gauge.peakMonth} and lowest in ${park.gauge.lowMonth} at the nearest USGS stream gauge (station ${park.gauge.site}), based on average daily flow from 2019 through 2024. That is one stream, so treat it as a guide to the season rather than a promise for a particular day. The flow chart and season notes are in the ${a('#best-time', 'best time section')}.`
      : `We don't have a stream-gauge record near these waterfalls, so we can't chart the high-water months. Check current conditions with the park before you plan a trip around the water.`,
  });

  const towns = park.analysis.towns;
  if (towns.length) {
    out.push({
      q: `What towns are near the ${short(park.name)} waterfalls?`,
      a: `In our directory the waterfalls are filed under ${towns.slice(0, 5).map((t) => a(t.url, `${t.name}, ${t.state}`)).join(', ')}${towns.length > 5 ? ' and others' : ''}. These are the nearest towns in our index and not necessarily the trailheads, so use each waterfall page for coordinates and directions.`,
    });
  }
  return out;
}
