// Build data/water-conditions.json for published waterfall pages.
//
// Sources, all free and keyless:
//   Stream name: the USGS gazetteer when it says the falls is on a named creek or river,
//     or the waterfall name when that name is the watercourse ("Cedar Creek Falls").
//     "Tributary of", "side of", and "mouth of" do not count. The National Map flowline
//     service was not queried; it was timing out, and a downstream trace had treated a
//     parallel creek as the receiving water.
//   Same-stream link: USGS NLDI mainstem navigation, upstream (UM) and downstream (DM).
//   Water temperature: USGS NWIS parameter 00010. Monthly figures are the mean of USGS
//     monthly means of approved daily values, for one time series, and only for months
//     with at least three years. A current reading is an instantaneous value from the
//     last 48 hours; otherwise the newest daily mean from the last 120 days.
//   Samples: Water Quality Portal results (USGS, EPA, and states) from the last 10 years.
//   Assessment: EPA ATTAINS assessment lines within 1 km, published through How's My Waterway.
//
// Matching: 12 km along the NHDPlus mainstem and no more than 12 km in a straight line.
// The monitoring site's name has to be that same stream. A different fork, a lake, a
// bank well, or a treatment plant is not a match. Receiving water is not filled in
// here, because that requires a flowline trace and the trace had followed a parallel
// creek. State beach feeds are not used: EPA BEACON is coastal and does not name the
// inland stream at a waterfall.
//
// Run: node scripts/fetch-water.mjs
//      node scripts/fetch-water.mjs --url /oregon/cascade-locks/multnomah-falls --out /tmp/water.json
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { loadData } from '../src/lib/core.mjs';
import { publishedListing } from '../src/lib/publish.mjs';
import {
  WATER_RULES, aggregateMonthly, attainsMatches, causeList, haversineKm,
  pathMetrics, siteMatchesStream, streamHint, withinStraightLine,
} from '../src/lib/water-match.mjs';

const UA = 'WaterfallsNearYou/1.0 (https://www.waterfallsnearyou.com/contact)';
const NHD = 'https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer/3/query';
const ATTAINS = 'https://gispub.epa.gov/arcgis/rest/services/OW/ATTAINS_Assessment/MapServer/1/query';
const NLDI = 'https://api.water.usgs.gov/nldi/linked-data';
const CACHE = path.join(process.cwd(), '.cache/water/v1');
const CHARACTERISTICS = ['Escherichia coli', 'Enterococcus', 'Fecal Coliform', 'Dissolved oxygen (DO)', 'pH', 'Turbidity', 'Temperature, water'];
const SAMPLE_PRIORITY = ['Escherichia coli', 'Enterococcus', 'Fecal Coliform', 'Dissolved oxygen (DO)', 'pH', 'Turbidity'];

const args = process.argv.slice(2);
const only = new Set(flag('--url').split(',').map((item) => item.trim()).filter(Boolean));
const outPath = path.resolve(flag('--out') || 'data/water-conditions.json');
const concurrency = Number(flag('--concurrency') || 4);

function flag(name) {
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] || '') : '';
}

mkdirSync(CACHE, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_HTTP = 4;
let httpActive = 0;
const httpWait = [];
async function withHttp(fn) {
  if (httpActive >= MAX_HTTP) await new Promise((resolve) => httpWait.push(resolve));
  else httpActive += 1;
  try { return await fn(); }
  finally {
    const next = httpWait.shift();
    if (next) next();
    else httpActive -= 1;
  }
}

function cacheFile(url) {
  return path.join(CACHE, `${createHash('sha1').update(url).digest('hex')}.json`);
}

async function request(url, kind = 'json') {
  const file = cacheFile(url);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  return withHttp(() => requestNetwork(url, kind, file));
}

async function requestNetwork(url, kind, file) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: kind === 'json' ? 'application/json,text/plain,*/*' : 'text/plain,*/*' },
        signal: AbortSignal.timeout(40000),
        redirect: 'follow',
      });
      if (response.status === 404) {
        writeFileSync(file, 'null');
        return null;
      }
      if (response.status === 429 || response.status >= 500) {
        last = new Error(`${response.status}`);
        await sleep(1500 * (attempt + 1));
        continue;
      }
      const text = await response.text();
      if (!response.ok) {
        last = new Error(`${response.status} ${text.slice(0, 140)}`);
        await sleep(800 * (attempt + 1));
        continue;
      }
      if (text.length > 12_000_000) throw new Error('response too large');
      const value = kind === 'json' ? JSON.parse(text) : text;
      if (value && typeof value === 'object' && value.error) throw new Error(JSON.stringify(value.error).slice(0, 180));
      writeFileSync(file, JSON.stringify(value));
      return value;
    } catch (error) {
      last = error;
      await sleep(700 * (attempt + 1));
    }
  }
  throw last || new Error(url);
}

async function pool(items, limit, worker) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  }
  const width = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: width }, run));
}

function envelope(lat, lng, meters) {
  const dLat = meters / 110540;
  const dLng = meters / (111320 * Math.cos((lat * Math.PI) / 180));
  return JSON.stringify({
    xmin: lng - dLng, ymin: lat - dLat, xmax: lng + dLng, ymax: lat + dLat,
    spatialReference: { wkid: 4326 },
  });
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function ageDays(iso) {
  const then = Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(then)) return Infinity;
  return (Date.now() - then) / 86400000;
}

async function nhdNear(lat, lng, meters = 500) {
  const params = new URLSearchParams({
    geometry: envelope(lat, lng, meters),
    maxAllowableOffset: '0.00008',
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'gnis_name,fcode,lengthkm,streamorde,nhdplusid,hydroseq,dnhydroseq,vpuid,flowdir',
    returnGeometry: 'true',
    resultRecordCount: '80',
    f: 'json',
  });
  const data = await request(`${NHD}?${params}`);
  return (data?.features || []).map((feature) => {
    const metrics = pathMetrics(lat, lng, feature.geometry?.paths || []);
    if (!metrics) return null;
    const attrs = feature.attributes || {};
    return {
      name: attrs.gnis_name,
      fcode: attrs.fcode,
      streamOrder: attrs.streamorde || 0,
      meters: metrics.meters,
      nhdplusid: attrs.nhdplusid,
      hydroseq: attrs.hydroseq,
      dnhydroseq: attrs.dnhydroseq,
      vpuid: attrs.vpuid,
      flowdir: attrs.flowdir,
      lengthkm: attrs.lengthkm,
      downstreamM: Number(attrs.flowdir) === 1 ? metrics.lengthM * (1 - metrics.fraction) : metrics.lengthM,
      snapLat: metrics.snapLat,
      snapLng: metrics.snapLng,
    };
  }).filter(Boolean);
}

async function nhdDownstream(vpuid, hydroseq) {
  if (!/^[A-Za-z0-9_-]+$/.test(String(vpuid || '')) || !Number.isFinite(Number(hydroseq))) return null;
  const params = new URLSearchParams({
    where: `hydroseq=${Number(hydroseq)} AND vpuid='${vpuid}'`,
    outFields: 'gnis_name,lengthkm,hydroseq,dnhydroseq,vpuid,streamorde',
    returnGeometry: 'false',
    f: 'json',
  });
  const data = await request(`${NHD}?${params}`);
  return data?.features?.[0]?.attributes || null;
}

async function receivingWater(start, fallsStream) {
  let hydro = start.dnhydroseq;
  let walked = (Number(start.downstreamM) || 0) / 1000;
  const seen = new Set([String(start.hydroseq)]);
  const floor = Number(start.streamOrder) || 1;
  for (let step = 0; step < 30 && hydro && walked <= WATER_RULES.networkKm; step++) {
    const key = String(hydro);
    if (seen.has(key)) break;
    seen.add(key);
    const next = await nhdDownstream(start.vpuid, hydro);
    if (!next) break;
    const named = String(next.gnis_name || '').trim();
    const length = Number(next.lengthkm) || 0;
    const different = named && (!fallsStream || !sameName(named, fallsStream));
    const larger = Number(next.streamorde) > floor;
    // Receiving water is the next named channel of higher stream order, not a same-size side creek.
    if (different && larger && length >= 0.2) return { name: named, km: round(walked, 2) };
    if (different && larger && next.dnhydroseq) {
      const peek = await nhdDownstream(start.vpuid, next.dnhydroseq);
      const peekName = String(peek?.gnis_name || '').trim();
      if (peekName && sameName(peekName, named) && Number(peek.streamorde) > floor) return { name: named, km: round(walked, 2) };
    }
    walked += length;
    hydro = next.dnhydroseq;
  }
  return null;
}

function sameName(a, b) {
  return siteMatchesStream(a, b) || siteMatchesStream(b, a);
}

async function nldiComid(lat, lng) {
  try {
    const data = await request(`${NLDI}/comid/position?f=json&coords=${encodeURIComponent(`POINT(${lng} ${lat})`)}`);
    return data?.features?.[0]?.properties?.comid || null;
  } catch { return null; }
}

async function nldiSites(comid, mode, source) {
  let data;
  try { data = await request(`${NLDI}/comid/${encodeURIComponent(comid)}/navigation/${mode}/${source}?f=json&distance=${WATER_RULES.networkKm}`); }
  catch { return []; }
  return (data?.features || []).map((feature) => {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    const props = feature.properties || {};
    return {
      id: String(props.identifier || ''),
      name: props.name || '',
      lat: coords[1],
      lng: coords[0],
      comid: props.comid,
      uri: props.uri || '',
      source,
      along: mode === 'UM' ? 'upstream' : 'downstream',
    };
  }).filter((site) => site?.id && site.name);
}

function mergeSites(upstream, downstream) {
  const byId = new Map();
  for (const site of [...upstream, ...downstream]) {
    const current = byId.get(site.id);
    if (!current) byId.set(site.id, site);
    else if (current.along !== site.along) current.along = 'same-reach';
  }
  return [...byId.values()];
}

function located(site, falls, waterName, relationship) {
  const distanceKm = haversineKm(falls, site);
  if (!withinStraightLine(distanceKm)) return null;
  if (!siteMatchesStream(site.name, waterName)) return null;
  return { ...site, distanceKm: round(distanceKm, 2), waterName, relationship };
}

function usgsNumber(id) {
  const match = String(id).match(/^(?:USGS-)?(\d{7,15})$/);
  return match ? match[1] : null;
}

function parseRdb(text) {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
  if (lines.length < 3) return [];
  const header = lines[0].split('\t');
  return lines.slice(2).map((line) => {
    const parts = line.split('\t');
    const row = {};
    header.forEach((key, index) => { row[key] = (parts[index] || '').trim(); });
    return row;
  });
}

async function monthlyBySite(siteIds) {
  const out = new Map();
  const chunks = [];
  for (let i = 0; i < siteIds.length; i += 8) chunks.push(siteIds.slice(i, i + 8));
  await pool(chunks, 3, async (ids) => {
    const params = new URLSearchParams({
      format: 'rdb', sites: ids.join(','), parameterCd: '00010', statReportType: 'monthly', statTypeCd: 'mean',
    });
    let text;
    try { text = await request(`https://waterservices.usgs.gov/nwis/stat/?${params}`, 'text'); }
    catch (error) {
      if (ids.length === 1) return;
      for (const id of ids) {
        const one = await monthlyBySite([id]);
        for (const [key, value] of one) out.set(key, value);
      }
      return;
    }
    const grouped = new Map();
    for (const row of parseRdb(text)) {
      if (row.parameter_cd && row.parameter_cd !== '00010') continue;
      const site = row.site_no;
      if (!grouped.has(site)) grouped.set(site, []);
      grouped.get(site).push({ tsId: row.ts_id, year: row.year_nu, month: row.month_nu, value: row.mean_va });
    }
    for (const [site, rows] of grouped) {
      const agg = aggregateMonthly(rows);
      if (agg && Object.keys(agg.months).length) out.set(site, agg);
    }
  });
  return out;
}

function seriesLatest(series) {
  let best = null;
  for (const item of series || []) {
    const values = item.values?.[0]?.value || [];
    for (const value of values) {
      const celsius = Number(value.value);
      const date = String(value.dateTime || '').slice(0, 10);
      if (!Number.isFinite(celsius) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!best || date > best.date) {
        best = {
          celsius: round(celsius, 3),
          date,
          provisional: (value.qualifiers || []).includes('P'),
        };
      }
    }
  }
  return best;
}

async function dailyBySite(siteIds) {
  const out = new Map();
  const start = isoDaysAgo(WATER_RULES.recentDays);
  const chunks = [];
  for (let i = 0; i < siteIds.length; i += 8) chunks.push(siteIds.slice(i, i + 8));
  await pool(chunks, 3, async (ids) => {
    const params = new URLSearchParams({
      format: 'json', sites: ids.join(','), parameterCd: '00010', statCd: '00003', startDT: start,
    });
    let data;
    try { data = await request(`https://waterservices.usgs.gov/nwis/dv/?${params}`); }
    catch {
      if (ids.length === 1) return;
      for (const id of ids) {
        const one = await dailyBySite([id]);
        for (const [key, value] of one) out.set(key, value);
      }
      return;
    }
    const grouped = new Map();
    for (const series of data?.value?.timeSeries || []) {
      const site = series.sourceInfo?.siteCode?.[0]?.value;
      if (!site) continue;
      if (!grouped.has(site)) grouped.set(site, []);
      grouped.get(site).push(series);
    }
    for (const [site, series] of grouped) {
      const latest = seriesLatest(series);
      if (latest && ageDays(latest.date) <= WATER_RULES.recentDays && ageDays(latest.date) >= -2) {
        out.set(site, { ...latest, kind: 'daily-mean', time: null });
      }
    }
  });
  return out;
}

async function instantBySite(siteIds) {
  const out = new Map();
  await pool(siteIds, 6, async (site) => {
    const params = new URLSearchParams({
      f: 'json', monitoring_location_id: `USGS-${site}`, parameter_code: '00010', limit: '20',
    });
    let data;
    try { data = await request(`https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?${params}`); }
    catch { return; }
    const readings = (data?.features || [])
      .map((feature) => feature.properties)
      .filter((props) => props && String(props.parameter_code) === '00010' && String(props.statistic_id) === '00011' && props.time);
    readings.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
    const latest = readings[0];
    if (!latest) return;
    const celsius = Number(latest.value);
    const time = Date.parse(latest.time);
    if (!Number.isFinite(celsius) || !Number.isFinite(time)) return;
    const hours = (Date.now() - time) / 3600000;
    if (hours < -2 || hours > WATER_RULES.currentHours) return;
    const unit = String(latest.unit_of_measure || 'degC').toLowerCase();
    if (unit && !/degc|°c|^c$/.test(unit.replace(/\s+/g, ''))) return;
    out.set(site, {
      celsius: round(celsius, 3),
      time: new Date(time).toISOString(),
      date: new Date(time).toISOString().slice(0, 10),
      kind: 'instantaneous',
      provisional: String(latest.qualifier || '').toUpperCase() === 'P',
    });
  });
  return out;
}

function asCelsius(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const compact = String(unit || '').toLowerCase().replace(/\s+/g, '');
  if (/^(degc|°c|c)$/.test(compact)) return number;
  if (/^(degf|°f|f)$/.test(compact)) return (number - 32) * 5 / 9;
  return null;
}

async function samplesFor(site) {
  const siteid = usgsNumber(site.id) ? `USGS-${usgsNumber(site.id)}` : site.id;
  const start = isoDaysAgo(WATER_RULES.sampleYears * 365.25);
  const [year, month, day] = start.split('-');
  const params = new URLSearchParams({
    siteid,
    characteristicName: CHARACTERISTICS.join(';'),
    startDateLo: `${month}-${day}-${year}`,
    mimeType: 'csv',
    zip: 'no',
    sorted: 'no',
  });
  let text;
  try { text = await request(`https://www.waterqualitydata.us/data/Result/search?${params}`, 'text'); }
  catch { return []; }
  if (!text || !text.includes('CharacteristicName')) return [];
  let rows = [];
  try { rows = parse(text, { columns: true, relax_quotes: true, skip_empty_lines: true }); }
  catch { return []; }
  const latest = new Map();
  for (const row of rows) {
    const media = row.ActivityMediaName || '';
    if (media && !/water/i.test(media)) continue;
    const characteristic = row.CharacteristicName;
    if (!CHARACTERISTICS.includes(characteristic)) continue;
    const date = String(row.ActivityStartDate || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || ageDays(date) > WATER_RULES.sampleYears * 365.25 || ageDays(date) < -2) continue;
    const raw = row.ResultMeasureValue;
    const reportedUnit = row['ResultMeasure/MeasureUnitCode'] || '';
    const unit = /^(none|null|na|n\/a|-)$/i.test(String(reportedUnit).trim()) ? '' : reportedUnit;
    const detection = row.ResultDetectionConditionText || '';
    let value = raw;
    let detected = true;
    if (raw == null || String(raw).trim() === '') {
      if (!/not detected|below|non-detect/i.test(detection)) continue;
      detected = false;
      value = row['DetectionQuantitationLimitMeasure/MeasureValue'] || detection;
    }
    const current = latest.get(characteristic);
    if (!current || date > current.date || (date === current.date && detected && !current.detected)) {
      latest.set(characteristic, {
        characteristic, value: String(value).trim(), unit, date, detected,
        siteName: site.name, url: site.uri || (usgsNumber(site.id) ? `https://waterdata.usgs.gov/monitoring-location/USGS-${usgsNumber(site.id)}/` : ''),
        distanceKm: site.distanceKm, along: site.along, waterName: site.waterName, relationship: site.relationship,
      });
    }
  }
  return [...latest.values()];
}

async function attainsFor(lat, lng, streamName) {
  const params = new URLSearchParams({
    geometry: envelope(lat, lng, WATER_RULES.attainsMeters),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'true',
    maxAllowableOffset: '0.0001',
    resultRecordCount: '40',
    f: 'json',
  });
  const data = await request(`${ATTAINS}?${params}`);
  let best = null;
  for (const feature of data?.features || []) {
    const attrs = feature.attributes || {};
    if (String(attrs.isassessed || '').toUpperCase() !== 'Y') continue;
    const status = String(attrs.overallstatus || '').trim();
    if (!status || /not assessed/i.test(status)) continue;
    if (!attainsMatches(attrs.assessmentunitname, streamName)) continue;
    const metrics = pathMetrics(lat, lng, feature.geometry?.paths || []);
    if (!metrics || metrics.meters > WATER_RULES.attainsMeters) continue;
    const cycle = Number(attrs.reportingcycle) || null;
    if (best && (metrics.meters > best.meters || (metrics.meters === best.meters && cycle <= best.cycle))) continue;
    const impaired = String(attrs.isimpaired || '').toUpperCase() === 'Y' || /not supporting/i.test(status);
    const url = attrs.waterbodyreportlink || (
      attrs.organizationid && attrs.assessmentunitidentifier && cycle
        ? `https://mywaterway.epa.gov/waterbody-report/${attrs.organizationid}/${attrs.assessmentunitidentifier}/${cycle}`
        : ''
    );
    if (!url) continue;
    best = {
      meters: metrics.meters,
      relationship: 'same-stream',
      waterName: streamName,
      auId: attrs.assessmentunitidentifier,
      auName: attrs.assessmentunitname,
      organization: attrs.organizationname,
      cycle,
      status,
      category: attrs.ircategory ? String(attrs.ircategory) : '',
      impaired,
      on303d: String(attrs.on303dlist || '').toUpperCase() === 'Y',
      causes: impaired ? causeList(attrs) : [],
      url,
      distanceKm: round(metrics.meters / 1000, 2),
    };
  }
  if (!best) return null;
  delete best.meters;
  return best;
}

function temperatureFrom(site, monthly, recent) {
  if (!monthly && !recent) return null;
  const number = usgsNumber(site.id);
  return {
    source: 'usgs',
    relationship: site.relationship,
    waterName: site.waterName,
    siteId: number || site.id,
    siteName: site.name,
    url: `https://waterdata.usgs.gov/monitoring-location/USGS-${number || site.id}/`,
    distanceKm: site.distanceKm,
    along: site.along,
    recent: recent || null,
    monthly: monthly?.months || null,
    begin: monthly?.begin || null,
    end: monthly?.end || null,
    live: recent?.kind === 'instantaneous',
  };
}

function chooseSamples(rows, hasGaugeTemperature) {
  const byName = new Map();
  for (const row of rows) {
    const current = byName.get(row.characteristic);
    if (!current || row.date > current.date || (row.date === current.date && row.distanceKm < current.distanceKm)) byName.set(row.characteristic, row);
  }
  const picked = [];
  for (const name of SAMPLE_PRIORITY) if (byName.has(name)) picked.push(byName.get(name));
  const temperature = byName.get('Temperature, water');
  let promoted = null;
  if (!hasGaugeTemperature && temperature && ageDays(temperature.date) <= WATER_RULES.recentDays) {
    const celsius = asCelsius(temperature.value, temperature.unit);
    if (celsius != null && temperature.detected !== false) {
      promoted = {
        source: 'wqp',
        relationship: temperature.relationship,
        waterName: temperature.waterName,
        siteId: '',
        siteName: temperature.siteName,
        url: temperature.url,
        distanceKm: temperature.distanceKm,
        along: temperature.along,
        recent: { celsius: round(celsius, 3), kind: 'sample', date: temperature.date, time: null, provisional: false },
        monthly: null,
        begin: null,
        end: null,
        live: false,
      };
    }
  }
  if (!promoted && temperature) picked.push(temperature);
  return { samples: picked.slice(0, 4), promoted };
}

const { listings } = loadData();
const falls = listings.filter(publishedListing).filter((item) => !only.size || only.has(item.url));
console.log(`Published falls in this run: ${falls.length}`);

const prepared = [];
let lookupErrors = 0;
await pool(falls, concurrency, async (fallsItem, index) => {
  try {
    // The stream name is taken from the USGS gazetteer ("on Rock Creek") or from the
    // falls name when the name itself is the creek ("Cedar Creek Falls"). NLDI then
    // keeps only gauges on that water. A nationwide flowline query was not used: the
    // National Map flowline service was timing out, and a downstream trace had labeled
    // a parallel creek as the receiving water.
    const hint = streamHint(fallsItem.name, fallsItem.gnisDescription);
    const choice = hint ? {
      name: hint,
      feature: { snapLat: fallsItem.lat, snapLng: fallsItem.lng, streamOrder: 0, dnhydroseq: null, hydroseq: null, vpuid: null },
    } : null;
    let comid = null;
    let sites = [];
    let wqp = [];
    if (choice?.feature) {
      comid = await nldiComid(choice.feature.snapLat, choice.feature.snapLng);
      if (comid) {
        const [upNwis, downNwis, upWqp, downWqp] = await Promise.all([
          nldiSites(comid, 'UM', 'nwissite'),
          nldiSites(comid, 'DM', 'nwissite'),
          nldiSites(comid, 'UM', 'WQP'),
          nldiSites(comid, 'DM', 'WQP'),
        ]);
        sites = mergeSites(upNwis, downNwis);
        wqp = mergeSites(upWqp, downWqp);
      }
    }
    let receiving = null;
    const streamName = choice?.name || null;
    const needReceiving = (sourceSites) => !sourceSites.some((site) => streamName && siteMatchesStream(site.name, streamName) && withinStraightLine(haversineKm(fallsItem, site)));
    const hasNetworkSites = sites.length + wqp.length > 0;
    if (choice?.feature && hasNetworkSites && (streamName == null || needReceiving(sites) || needReceiving(wqp))) {
      const downstreamOther = sites.concat(wqp).some((site) => site.along === 'downstream' && !(streamName && siteMatchesStream(site.name, streamName)));
      if (streamName == null || downstreamOther) receiving = await receivingWater(choice.feature, streamName);
    }
    const matchGroup = (sourceSites, waterName, relationship) => sourceSites
      .map((site) => located(site, fallsItem, waterName, relationship))
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    const usgsSame = streamName ? matchGroup(sites, streamName, 'same-stream') : [];
    const wqpSame = streamName ? matchGroup(wqp, streamName, 'same-stream') : [];
    const usgsRecv = !usgsSame.length && receiving ? matchGroup(sites.filter((site) => site.along === 'downstream'), receiving.name, 'receiving-water') : [];
    const wqpRecv = !wqpSame.length && receiving ? matchGroup(wqp.filter((site) => site.along === 'downstream'), receiving.name, 'receiving-water') : [];
    const chosenUsgs = (usgsSame.length ? usgsSame : usgsRecv).slice(0, 4);
    const chosenWqp = (wqpSame.length ? wqpSame : wqpRecv).slice(0, 3);
    if (only.size) {
      console.log(JSON.stringify({
        url: fallsItem.url,
        stream: streamName,
        receiving: receiving?.name || null,
        comid,
        nwis: sites.map((site) => site.name).slice(0, 8),
        usgs: chosenUsgs.map((site) => `${site.relationship} ${site.distanceKm} ${site.name}`),
        wqp: chosenWqp.map((site) => `${site.relationship} ${site.distanceKm} ${site.name}`),
      }));
    }
    prepared.push({
      url: fallsItem.url,
      name: fallsItem.name,
      state: fallsItem.state,
      lat: fallsItem.lat,
      lng: fallsItem.lng,
      fallsStream: streamName,
      usgs: chosenUsgs,
      wqp: chosenWqp,
      attainsStream: streamName,
    });
  } catch (error) {
    lookupErrors += 1;
    if (lookupErrors <= 8) console.error('lookup failed', fallsItem.url, error.message);
  }
  if (prepared.length % 25 === 0) console.log(`located ${prepared.length}/${falls.length}, errors ${lookupErrors}`);
});

const usgsIds = [...new Set(prepared.flatMap((item) => item.usgs.map((site) => usgsNumber(site.id)).filter(Boolean)))];
console.log(`USGS candidate sites: ${usgsIds.length}. Fetching temperature.`);
const [monthly, daily, instant] = await Promise.all([
  monthlyBySite(usgsIds),
  dailyBySite(usgsIds),
  instantBySite(usgsIds),
]);

const sampleSites = [];
const seenSamples = new Set();
for (const item of prepared) {
  for (const site of item.wqp) {
    if (seenSamples.has(site.id)) continue;
    seenSamples.add(site.id);
    sampleSites.push(site);
  }
}
console.log(`Water Quality Portal sites: ${sampleSites.length}`);
const sampleRows = new Map();
await pool(sampleSites, 3, async (site) => {
  sampleRows.set(site.id, await samplesFor(site));
});

console.log('ATTAINS assessments');
await pool(prepared, concurrency, async (item) => {
  if (!item.attainsStream) return;
  try { item.attains = await attainsFor(item.lat, item.lng, item.attainsStream); }
  catch (error) {
    lookupErrors += 1;
    if (lookupErrors <= 12) console.error('attains failed', item.url, error.message);
  }
});

const output = {};
for (const item of prepared) {
  let temperature = null;
  for (const site of item.usgs) {
    const number = usgsNumber(site.id);
    if (!number) continue;
    const recent = instant.get(number) || daily.get(number) || null;
    const months = monthly.get(number) || null;
    temperature = temperatureFrom(site, months, recent);
    if (temperature) break;
  }
  const gathered = item.wqp.flatMap((site) => (sampleRows.get(site.id) || []).map((row) => ({ ...row, siteName: site.name, url: row.url || site.uri, distanceKm: site.distanceKm, along: site.along, waterName: site.waterName, relationship: site.relationship })));
  const { samples, promoted } = chooseSamples(gathered, Boolean(temperature));
  if (!temperature && promoted) temperature = promoted;
  const quality = (item.attains || samples.length) ? { attains: item.attains || null, samples } : null;
  if (!temperature && !quality) continue;
  output[item.url] = { fallsStream: item.fallsStream, temperature, quality };
}

const records = Object.values(output);
const counts = {
  published: falls.length,
  temperature: records.filter((row) => row.temperature).length,
  quality: records.filter((row) => row.quality).length,
  both: records.filter((row) => row.temperature && row.quality).length,
  attains: records.filter((row) => row.quality?.attains).length,
  samples: records.filter((row) => row.quality?.samples?.length).length,
  sameStreamTemperature: records.filter((row) => row.temperature?.relationship === 'same-stream').length,
  receivingTemperature: records.filter((row) => row.temperature?.relationship === 'receiving-water').length,
  lookupErrors,
};
const example = (test) => Object.entries(output).find(([, row]) => test(row))?.[0] || null;
const examples = [
  example((row) => row.temperature?.recent && row.temperature?.monthly),
  example((row) => row.quality?.attains?.causes?.length),
  example((row) => row.quality?.samples?.some((sample) => sample.characteristic === 'Escherichia coli')),
].filter(Boolean);

const file = {
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    publishedListings: listings.filter(publishedListing).length,
    threshold: WATER_RULES,
    sources: {
      stream: 'USGS gazetteer phrase or the waterfall name when it names the creek or river. Confirmed by USGS NLDI mainstem navigation, not by borrowing a nearby gauge.',
      network: `USGS NLDI mainstem UM and DM, ${WATER_RULES.networkKm} km`,
      temperature: 'USGS NWIS parameter 00010: instantaneous values newer than 48 hours, otherwise a daily mean from the last 120 days, plus monthly means of approved daily values for months with at least 3 years',
      samples: 'Water Quality Portal results from the last 10 years (USGS, EPA, and state agencies)',
      assessment: 'EPA ATTAINS assessment lines within 1 km of the falls, name-matched to the stream, linked to How\'s My Waterway',
      notUsed: 'Coastal beach and state swim-advisory feeds. They do not identify the named inland stream at a waterfall.',
    },
    counts,
    examples,
  },
  listings: Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b))),
};
writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
console.log(JSON.stringify(counts, null, 2));
console.log('examples', examples.join(' '));
console.log('wrote', outPath);
if (falls.length > 20 && lookupErrors > falls.length * 0.25) {
  console.error(`Too many lookup errors (${lookupErrors}/${falls.length})`);
  process.exit(1);
}
