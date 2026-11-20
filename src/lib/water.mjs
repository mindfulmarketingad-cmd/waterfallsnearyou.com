// Build the "Water conditions" view for one waterfall. Values come only from
// data/water-conditions.json (or a record passed in tests). No gaps are filled in.
// Live temperature is left out of structured data: a frozen schema.org Observation
// would keep describing a reading after the water had changed.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { timeZoneFor } from './timezone.mjs';
import { ecoliComparison, formatTemps, titleCaseStation, WATER_RULES } from './water-match.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let cache = null;

function loadAll() {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'data/water-conditions.json');
  cache = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { listings: {} };
  return cache;
}

function joinList(items) {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function formatDay(iso) {
  const [year, month, day] = String(iso || '').split('-').map(Number);
  if (!year || !month || !day) return iso;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function formatYearMonth(value) {
  const [year, month] = String(value || '').split('-');
  const name = MONTHS[Number(month) - 1];
  return name && year ? `${name} ${year}` : String(value || '');
}

export function distancePhrase(km) {
  if (!Number.isFinite(km)) return 'at an unknown distance';
  if (km < 0.1) return 'at the mapped falls';
  const miles = km * 0.621371;
  const mi = miles < 10 ? miles.toFixed(1) : String(Math.round(miles));
  const kmText = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return `${mi} mi (${kmText} km)`;
}

function alongPhrase(along) {
  if (along === 'upstream') return 'upstream';
  if (along === 'downstream') return 'downstream';
  if (along === 'same-reach') return 'along the same reach';
  return 'from';
}

function placeSentence(block, fallsName, fallsStream) {
  const station = titleCaseStation(block.siteName || block.waterName);
  const dist = distancePhrase(block.distanceKm);
  const along = alongPhrase(block.along);
  if (block.relationship === 'receiving-water') {
    const joined = fallsStream
      ? `${fallsStream} flows into ${block.waterName}`
      : `${block.waterName} is the first named stream downstream`;
    return `${station} is ${dist} ${along} of ${fallsName}, on ${block.waterName}. ${joined}. This station does not measure the water at the falls.`;
  }
  if (along === 'along the same reach') {
    const place = dist === 'at the mapped falls' ? 'at the mapped falls' : `${dist} from ${fallsName}`;
    return `${station} is ${place}, on ${block.waterName}.`;
  }
  return `${station} is ${dist} ${along} of ${fallsName} on ${block.waterName}.`;
}

function recentWhen(recent, timeZone) {
  if (!recent) return null;
  const provisional = recent.provisional ? ' USGS marks this value provisional.' : '';
  if (recent.kind === 'instantaneous' && recent.time) {
    const when = new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timeZone || 'UTC',
    }).format(new Date(recent.time));
    return `Instantaneous reading, ${when}.${provisional}`;
  }
  if (recent.kind === 'sample' && recent.date) return `One water sample on ${formatDay(recent.date)}, not a gauge series.${provisional}`;
  if (recent.date) return `Daily mean on ${formatDay(recent.date)}.${provisional}`;
  return null;
}

function temperatureView(listing, row, timeZone) {
  const block = row.temperature;
  if (!block) return null;
  const monthly = Object.entries(block.monthly || {})
    .map(([month, info]) => ({ month: Number(month), info }))
    .filter((item) => item.month >= 1 && item.month <= 12 && item.info && Number.isFinite(item.info.c) && item.info.years >= WATER_RULES.typicalYearsMin)
    .sort((a, b) => a.month - b.month)
    .map((item) => ({
      label: MONTH_SHORT[item.month - 1],
      text: formatTemps(item.info.c),
      years: item.info.years,
    }));
  const reading = block.recent && Number.isFinite(block.recent.celsius) ? formatTemps(block.recent.celsius) : null;
  if (!reading && !monthly.length) return null;
  const station = titleCaseStation(block.siteName);
  return {
    reading,
    when: recentWhen(block.recent, timeZone),
    monthly,
    caption: monthly.length
      ? `Typical month at ${station}, from USGS monthly means of daily water temperature (${formatYearMonth(block.begin)} through ${formatYearMonth(block.end)}). A month is listed only when at least three separate years have a mean. Months with a thinner record are omitted.`
      : null,
    detail: `${placeSentence(block, listing.name, row.fallsStream)} It was kept because the station is on that water, within ${WATER_RULES.networkKm} km along the NHDPlus mainstem.`,
    sourceUrl: block.url,
    sourceLabel: /^\d{7,15}$/.test(String(block.siteId || '').replace(/^USGS-/, ''))
      ? `USGS ${String(block.siteId).replace(/^USGS-/, '')}`
      : 'Monitoring site',
    live: block.live && block.recent?.kind === 'instantaneous' && block.recent.time
      ? { siteId: String(block.siteId).startsWith('USGS-') ? String(block.siteId) : `USGS-${block.siteId}`, time: block.recent.time, tz: timeZone }
      : null,
  };
}

function sampleText(sample, fallsName) {
  const station = titleCaseStation(sample.siteName);
  const when = formatDay(sample.date);
  const measured = sample.detected === false
    ? `was not detected${sample.unit ? ` (detection limit ${sample.value} ${sample.unit})` : ''}`
    : `was ${sample.value}${sample.unit ? ` ${sample.unit}` : ''}`;
  const where = sample.along === 'same-reach'
    ? `${distancePhrase(sample.distanceKm)} on ${sample.waterName}`
    : `${distancePhrase(sample.distanceKm)} ${alongPhrase(sample.along)} of ${fallsName} on ${sample.waterName}`;
  let text = `${sample.characteristic} ${measured} on ${when} at ${station}, ${where}.`;
  if (sample.characteristic === 'Escherichia coli' && sample.detected !== false) {
    const comparison = ecoliComparison(sample.value, sample.unit);
    if (comparison) {
      text += ` For scale, EPA's 2012 recreational criteria use a Beach Action Value of ${comparison.reference} cfu/100 mL for one freshwater sample. This result is ${comparison.relation} that value. It is one sample, not a swimming advisory for ${fallsName}.`;
    }
  }
  return text;
}

function qualityView(listing, row) {
  const quality = row.quality;
  if (!quality) return null;
  const attains = quality.attains?.status ? {
    text: attainsText(quality.attains, listing.name),
    url: quality.attains.url || null,
  } : null;
  const samples = (quality.samples || []).filter((sample) => sample?.characteristic && sample.date && sample.value != null && sample.value !== '').map((sample) => ({
    text: sampleText(sample, listing.name),
    url: sample.url || null,
    label: 'Water Quality Portal result',
  }));
  if (!attains && !samples.length) return null;
  return { attains, samples };
}

function attainsText(block, fallsName) {
  const causes = block.impaired && block.causes?.length ? `, for ${joinList(block.causes)}` : '';
  const category = block.category ? ` (category ${block.category})` : '';
  let text = `${block.organization}'s ${block.cycle} Integrated Report lists ${block.waterName} as ${block.status}${category}${causes}. The assessed line is ${distancePhrase(block.distanceKm)} from ${fallsName}.`;
  if (block.on303d) text += ' That segment is on the Clean Water Act section 303(d) list.';
  else if (block.impaired) text += ' That segment is listed as impaired and is not on the current 303(d) list.';
  text += ` The status applies to ${block.waterName} in that report, not as a swimming advisory for ${fallsName}.`;
  return text;
}

function noteFor(listing, row) {
  const waterName = row.temperature?.waterName || row.quality?.attains?.waterName || row.quality?.samples?.[0]?.waterName || row.fallsStream;
  const station = titleCaseStation(row.temperature?.siteName || row.quality?.samples?.[0]?.siteName || '');
  const subject = station || `${row.quality?.attains?.organization || 'This'} assessment of ${waterName}`;
  return `${subject} describes ${waterName}, not a pool at ${listing.name}. Weather and flow upstream change the water. This page is not a swimming advisory. Check ${listing.state || 'local'} health advisories before getting in.`;
}

export function waterView(listing, record) {
  const row = record !== undefined ? record : loadAll().listings?.[listing?.url];
  if (!row || !listing) return null;
  let timeZone = 'America/New_York';
  try { timeZone = timeZoneFor(listing); } catch { /* listing is missing fields in a fixture */ }
  const temperature = temperatureView(listing, row, timeZone);
  const quality = qualityView(listing, row);
  if (!temperature && !quality) return null;
  return {
    temperature,
    quality,
    note: noteFor(listing, row),
  };
}
