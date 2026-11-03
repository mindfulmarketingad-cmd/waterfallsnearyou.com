// Hand-checked trip-planning facts (data/trip-facts.json), keyed by waterfall page URL.
// Fields are optional; a missing field means we could not verify it, not that the answer is "no".
import { readFileSync } from 'node:fs';
import path from 'node:path';

let data = null;
function all() {
  if (data) return data;
  const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'data/trip-facts.json'), 'utf8'));
  delete raw._about;
  data = raw;
  return data;
}
export const tripFacts = (url) => all()[url] || null;
export const tripFactUrls = () => Object.keys(all());

export const TRIP_FIELDS = [
  ['hike', 'Trail and distance'],
  ['elevationGain', 'Elevation gain'],
  ['difficulty', 'Difficulty'],
  ['parking', 'Parking'],
  ['fees', 'Fees and permits'],
  ['dogs', 'Dogs'],
  ['swimming', 'Swimming'],
  ['accessibility', 'Accessibility'],
  ['bestSeason', 'Best time to go'],
];
export const tripRows = (f) => TRIP_FIELDS.filter(([k]) => f?.[k]).map(([k, label]) => ({ key: k, label, value: f[k] }));
