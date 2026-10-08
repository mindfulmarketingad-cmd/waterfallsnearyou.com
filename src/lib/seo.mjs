// Title and meta helpers for listing pages. Searches for a specific waterfall are phrased
// "[name] [state]", "[name] [county] county [state]" or "[name] on [island]", so titles lead
// with the full state and county names rather than the GeoNames town and a state abbreviation.
import { loadData } from './core.mjs';

const MAX = 60;
let keyCount = null;
const key = (l) => `${l.name}|${l.county || ''}|${l.state}`;

export function listingTitle(l) {
  if (!keyCount) {
    keyCount = {};
    for (const x of loadData().listings) keyCount[key(x)] = (keyCount[key(x)] || 0) + 1;
  }
  const unique = keyCount[key(l)] === 1;
  const sameTown = l.city.assigned.some((x) => x !== l && x.name === l.name);
  const options = unique
    ? [
        l.county && `${l.name}, ${l.county} County, ${l.state} | Map & Directions`,
        l.county && `${l.name}, ${l.county} County, ${l.state}`,
        `${l.name}, ${l.state} | Map & Directions`,
        `${l.name}, ${l.state}`,
      ]
    : sameTown
      ? [`${l.name}, ${l.cityMiles.toFixed(1)} mi ${l.cityDirection || 'from'} of ${l.city.name}, ${l.stateCode}`.replace(' from of ', ' from ')]
      : [
          `${l.name} near ${l.city.name}, ${l.state} | Directions`,
          `${l.name} near ${l.city.name}, ${l.state}`,
          `${l.name} near ${l.city.name}, ${l.stateCode}`,
        ];
  const list = options.filter(Boolean);
  return list.find((t) => t.length <= MAX) || list[list.length - 1];
}
