// Plus planner flags. A flag is set only when existing listing data supports it.
// Missing notes are not treated as "no".

export function yesSwim(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase().trim();
  if (/^(no|not)\b/.test(t)) return false;
  if (/\b(do not|don't|prohibited|not permitted|no swimming)\b/.test(t)) return false;
  if (/\b(swimming allowed|swim allowed|you can swim|swimming hole|wading allowed)\b/.test(t)) return true;
  if (/\byes\b/.test(t) && /swim/.test(t)) return true;
  return false;
}

export function yesDogs(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase().trim();
  if (/^no\b/.test(t) || /no pets|no dogs|not allowed|service animals only/.test(t)) {
    if (/allowed on leash|dogs allowed|pets allowed|leashed dogs allowed/.test(t)) return true;
    return false;
  }
  if (/allowed on leash|dogs allowed|pets allowed|leashed dogs allowed/.test(t)) return true;
  if (/\ballowed\b/.test(t) && /\b(dog|dogs|pet|pets|leash)\b/.test(t)) return true;
  return false;
}

export function yesAccess(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();
  const cleaned = t
    .replace(/not wheelchair(?: or stroller)?[- ]accessible/g, '')
    .replace(/no wheelchair(?: or stroller)?[- ]accessible/g, '')
    .replace(/not stroller(?: or wheelchair)?[- ]accessible/g, '')
    .replace(/no stroller[- ]accessible/g, '');
  if (/wheelchair[- ]accessible|accessible by wheelchair|stroller[- ]friendly|stroller accessible/.test(cleaned)) return true;
  if (/accessible parking/.test(t)) return true;
  if (/paved (path|walk|trail|walkway)/.test(t) && /accessible/.test(cleaned)) return true;
  return false;
}

export function difficultyRank(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.toLowerCase();
  const easy = /\beasy\b/.test(t);
  const moderate = /\bmoderate\b/.test(t);
  const hard = /\b(strenuous|difficult|hard)\b/.test(t);
  if (easy && hard) return 'mixed';
  if (hard && !easy) return 'hard';
  if (moderate && !easy) return 'moderate';
  if (easy) return 'easy';
  if (moderate) return 'moderate';
  return null;
}

/** @param {any} listing directory listing @param {any} trip tripFacts() or null */
export function plusFlagList(listing, trip) {
  const flags = [];
  if (yesSwim(trip?.swimming)) flags.push('swim');
  if (yesDogs(trip?.dogs)) flags.push('dogs');
  if (yesAccess(trip?.accessibility)) flags.push('access');
  if ((listing?.os?.photosCount || listing?.photos || 0) >= 100) flags.push('photo');
  const reviews = listing?.os?.reviews ?? listing?.reviews ?? 0;
  if (reviews > 0 && reviews < 80) flags.push('quiet');
  return flags;
}

export const PLUS_FILTERS = [
  { value: 'swim', label: 'Swimming', hint: 'Verified visit notes that allow swimming. Missing notes are left out, not treated as a no.' },
  { value: 'dogs', label: 'Dogs allowed', hint: 'Verified visit notes that allow dogs. Missing notes are left out.' },
  { value: 'access', label: 'Stroller or wheelchair', hint: 'Visit notes that mention a wheelchair-accessible view, stroller access, or an accessible paved path.' },
  { value: 'photo', label: 'Photography', hint: 'Listings with 100 or more visitor photos in the source data.' },
  { value: 'quiet', label: 'Less crowded', hint: 'Under 80 Google reviews. Falls with no reviews are left out, because that is missing data, not a crowd count.' },
];
