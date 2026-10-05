// Data for the compact state listing cards: filterable features, the "Perfect for" line and a
// one-sentence summary, all derived from that waterfall's own data.
import { tagMatches } from './insights.mjs';
import { fmtNum, listJoin, nearText } from './format.mjs';

export const FEATURES = {
  top: 'Rated 4.5+',
  swim: 'Swimming hole',
  easy: 'Easy access',
  family: 'Family friendly',
  dogs: 'Dog friendly',
  hike: 'Waterfall hike',
  photos: 'Photo spot',
  history: 'Recorded history',
};
const HIKE = /hik|trail|trek|loop/i;
const isPlss = (s) => /^Located in sec/i.test(s || '');

export function features(l) {
  const f = [];
  const tags = l.os?.reviewTags || [];
  if (l.os?.rating >= 4.5 && l.os.reviews >= 10) f.push('top');
  for (const k of ['swim', 'easy', 'family', 'dogs']) if (l.os && tagMatches(l, k)) f.push(k);
  if ([...tags, l.os?.description || ''].some((t) => HIKE.test(t))) f.push('hike');
  if ((l.os?.photosCount || 0) >= 100) f.push('photos');
  if (l.gnisHistory || l.variants?.length || (l.gnisDescription && !isPlss(l.gnisDescription))) f.push('history');
  return f;
}

export function perfectFor(l, feats) {
  const has = (k) => feats.includes(k);
  if (has('swim')) return 'Perfect for a hot summer day by the water.';
  if (has('family')) return 'Perfect for families with kids.';
  if (has('easy')) return 'Perfect for a quick stop with little walking.';
  if (has('dogs')) return 'Perfect for a walk with your dog.';
  if (has('hike')) return 'Perfect for a waterfall hike.';
  if (has('photos')) return 'Perfect for photographers.';
  if ((l.nearby || []).filter((n) => n.miles <= 5).length >= 3) return 'Perfect for a day of waterfall hopping.';
  if (has('history')) return 'Perfect for history and map buffs.';
  if (!l.os?.reviews) return 'Perfect for exploring a lesser-known named waterfall.';
  return `Perfect for a scenic stop near ${l.city.name}.`;
}

function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function cardSummary(l, rank) {
  const where = l.cityMiles < 0.5 ? `in ${l.city.name}` : `near ${l.city.name}`;
  if (l.os?.rating && l.os.reviews) {
    const rated = `rated ${l.os.rating.toFixed(1)} out of 5 from ${fmtNum(l.os.reviews)} review${l.os.reviews === 1 ? '' : 's'}`;
    const lead = rank === 1
      ? `${l.name} ${where} takes the top spot, ${rated}.`
      : rank <= 3
        ? `${l.name}, ${where}, is next up, ${rated}.`
        : [
            `${l.name} ${where} is another strong option, ${rated}.`,
            `${l.name} ${where} rounds out this stretch of the list, ${rated}.`,
            `Head to ${l.name} ${where}, ${rated}.`,
            `${l.name} ${where} is worth the drive, ${rated}.`,
          ][hash(l.url) % 4];
    const tags = (l.os.reviewTags || []).slice(0, 3);
    return tags.length ? `${lead} Visitors come here for ${listJoin(tags)}.` : lead;
  }
  const base = `${l.name} is a named waterfall ${nearText(l)}.`;
  if (l.gnisDescription && !isPlss(l.gnisDescription)) return `${base} USGS notes: ${l.gnisDescription.replace(/\s+/g, ' ')}`;
  if (l.topoMap) return `${base} It appears on the USGS ${l.topoMap} topographic map.`;
  return base;
}
