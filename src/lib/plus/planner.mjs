import { difficultyRank } from './flags.mjs';
import { estimatedDriveHours, milesBetween, round1 } from './geo.mjs';

const STATE_CODES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};
const CODE_TO_STATE = Object.fromEntries(Object.entries(STATE_CODES).map(([name, code]) => [code.toLowerCase(), name]));

function norm(s) {
  return String(s || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
}

function cityKey(l) {
  return `${norm(l.city)}|${l.stateCode}`;
}

function anchorsFrom(listings) {
  const map = new Map();
  for (const l of listings) {
    if (typeof l.cityLat !== 'number' || typeof l.cityLng !== 'number') continue;
    const key = cityKey(l);
    const row = map.get(key) || { city: l.city, state: l.state, stateCode: l.stateCode, lat: l.cityLat, lng: l.cityLng, n: 0 };
    row.n += 1;
    map.set(key, row);
  }
  return [...map.values()];
}

function stateAnchor(listings, stateName) {
  const inState = listings.filter((l) => norm(l.state) === norm(stateName));
  if (!inState.length) return null;
  const cities = anchorsFrom(inState).sort((a, b) => b.n - a.n || a.city.localeCompare(b.city));
  const top = cities[0];
  return {
    lat: top.lat,
    lng: top.lng,
    label: `${top.city}, ${top.stateCode}`,
    scope: top.state,
    note: `Base is ${top.city}, the ${top.state} town with the most waterfalls filed to it in this directory. Name a town if you want a different start.`,
  };
}

export function resolveArea(listings, query) {
  const q = norm(query);
  if (!q) return { error: 'Enter a town or state.' };
  if (STATE_CODES[q] || CODE_TO_STATE[q]) {
    const stateName = STATE_CODES[q] ? q : CODE_TO_STATE[q];
    const anchor = stateAnchor(listings, stateName);
    if (!anchor) return { error: `No waterfalls are filed under ${query}.` };
    return { anchor };
  }
  const comma = q.match(/^(.+?),\s*([a-z]{2}|[a-z ]+)$/);
  let cityName = q;
  let stateHint = null;
  if (comma) {
    cityName = comma[1].trim();
    const hint = comma[2].trim();
    stateHint = STATE_CODES[hint] ? hint : CODE_TO_STATE[hint] || (STATE_CODES[hint] ? hint : null);
    if (CODE_TO_STATE[hint]) stateHint = CODE_TO_STATE[hint];
    else if (STATE_CODES[hint]) stateHint = hint;
    else stateHint = hint;
  }
  const cities = anchorsFrom(listings).filter((c) => norm(c.city) === cityName && (!stateHint || norm(c.state) === stateHint || c.stateCode.toLowerCase() === stateHint));
  if (!cities.length) return { error: `No town named “${query}” is in the directory. Try “Bend, OR” or a state name.` };
  if (cities.length > 1) {
    return {
      choices: cities.sort((a, b) => b.n - a.n).slice(0, 8).map((c) => ({
        label: `${c.city}, ${c.stateCode}`,
        query: `${c.city}, ${c.stateCode}`,
        n: c.n,
      })),
    };
  }
  const c = cities[0];
  return {
    anchor: {
      lat: c.lat,
      lng: c.lng,
      label: `${c.city}, ${c.stateCode}`,
      scope: c.state,
      note: `Drive times are estimated from ${c.city}, not from a routed map.`,
    },
  };
}

function score(listing, crowds) {
  if (crowds === 'less') return (listing.reviews > 0 ? listing.reviews : 100000);
  const rating = listing.rating || 0;
  const reviews = listing.reviews || 0;
  return -(rating * Math.log10(reviews + 1));
}

function passes(listing, prefs) {
  if (prefs.swimming && !(listing.flags || '').split(' ').includes('swim')) return false;
  if (prefs.dogs && !(listing.flags || '').split(' ').includes('dogs')) return false;
  if (prefs.difficulty && prefs.difficulty !== 'any') {
    const rank = difficultyRank(listing.difficulty);
    if (!rank) return false;
    if (prefs.difficulty === 'easy' && rank !== 'easy') return false;
    if (prefs.difficulty === 'moderate' && rank === 'hard') return false;
  }
  if (prefs.crowds === 'less' && !(listing.flags || '').split(' ').includes('quiet')) return false;
  return true;
}

export function planTrip({ listings, anchor, days, prefs }) {
  const dayCount = Math.max(1, Math.min(10, Number(days) || 1));
  const maxHours = Math.max(0.5, Math.min(6, Number(prefs?.maxDriveHours) || 2));
  const notes = [
    anchor.note,
    'Drive time is a straight-line estimate (40 mph and a 1.35 road factor), not a navigation route. Check the map before you go.',
  ];
  if (prefs?.swimming) notes.push('Swimming is limited to waterfalls whose visit notes allow it. Untchecked falls are omitted.');
  if (prefs?.dogs) notes.push('Dogs is limited to waterfalls whose visit notes allow dogs. Untchecked falls are omitted.');
  if (prefs?.difficulty && prefs.difficulty !== 'any') notes.push('Difficulty uses the visit-note wording only. Falls without a difficulty note are omitted.');
  if (prefs?.crowds === 'less') notes.push('Less crowded means under 80 Google reviews. That is a proxy, not a live crowd count. Falls with no reviews are omitted.');

  const pool = [];
  let outside = 0;
  let filtered = 0;
  for (const listing of listings) {
    const miles = milesBetween(anchor, listing);
    const drive = estimatedDriveHours(miles);
    if (drive > maxHours) {
      outside += 1;
      continue;
    }
    if (!passes(listing, prefs || {})) {
      filtered += 1;
      continue;
    }
    pool.push({ ...listing, milesFromBase: miles, driveHours: drive });
  }
  pool.sort((a, b) => score(a, prefs?.crowds) - score(b, prefs?.crowds) || a.milesFromBase - b.milesFromBase || a.name.localeCompare(b.name));
  if (!pool.length) {
    return {
      anchor: { label: anchor.label, lat: anchor.lat, lng: anchor.lng },
      days: [],
      notes: [...notes, filtered ? `${filtered} waterfalls inside the drive limit did not match the filters.` : 'Nothing in the directory is inside that drive-time estimate.'],
    };
  }

  const used = new Set();
  const planned = [];
  for (let d = 0; d < dayCount; d++) {
    const seed = pool.find((l) => !used.has(l.url));
    if (!seed) break;
    used.add(seed.url);
    const near = pool
      .filter((l) => !used.has(l.url) && milesBetween(seed, l) <= 25)
      .sort((a, b) => milesBetween(seed, a) - milesBetween(seed, b));
    const stops = [seed];
    for (const n of near) {
      if (stops.length >= 3) break;
      stops.push(n);
      used.add(n.url);
    }
    planned.push({
      day: d + 1,
      stops: stops.map((s, i) => ({
        url: s.url,
        name: s.name,
        city: s.city,
        stateCode: s.stateCode,
        milesFromBase: round1(s.milesFromBase),
        driveHours: round1(s.driveHours),
        milesFromPrevious: i === 0 ? 0 : round1(milesBetween(stops[i - 1], s)),
        difficulty: s.difficulty || null,
        hike: s.hike || null,
        parking: s.parking || null,
        fees: s.fees || null,
        dogs: s.dogs || null,
        swimming: s.swimming || null,
      })),
    });
  }
  if (planned.length < dayCount) notes.push(`Only ${planned.length} day${planned.length === 1 ? '' : 's'} could be filled from waterfalls that match.`);
  notes.push(`${pool.length} waterfalls match. ${outside.toLocaleString('en-US')} are farther than the drive-time limit and were not used.`);
  return {
    anchor: { label: anchor.label, lat: anchor.lat, lng: anchor.lng },
    days: planned,
    notes,
  };
}

export function addDates(plan, start) {
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return plan;
  const [y, m, d] = start.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  return {
    ...plan,
    days: plan.days.map((day, i) => {
      const dt = new Date(base);
      dt.setUTCDate(base.getUTCDate() + i);
      return { ...day, date: dt.toISOString().slice(0, 10) };
    }),
  };
}
