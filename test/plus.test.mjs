import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yesAccess, yesDogs, yesSwim, difficultyRank, plusFlagList } from '../src/lib/plus/flags.mjs';
import { matchGauge, seasonWindow, buildReport, alertSignals } from '../src/lib/plus/conditions-logic.mjs';
import { isEntitled, subscriptionPatch } from '../src/lib/plus/entitlement.mjs';
import { planTrip, resolveArea } from '../src/lib/plus/planner.mjs';
import { packetBlocks, textPdf } from '../src/lib/plus/pdf.mjs';
import { safeNext } from '../src/lib/plus/http.mjs';

test('verified flags do not treat missing or negative notes as yes', () => {
  assert.equal(yesSwim('No; do not enter Multnomah Creek, which has spawning fish'), false);
  assert.equal(yesSwim(''), false);
  assert.equal(yesSwim('Swimming allowed below the falls in summer'), true);
  assert.equal(yesDogs('Allowed on leash, including the trail to the top; not inside the lodge'), true);
  assert.equal(yesDogs('No pets in the cave (trained service animals only)'), false);
  assert.equal(yesAccess('Upper viewing area is wheelchair accessible; the lower-falls trail is not'), true);
  assert.equal(yesAccess('The cave is not wheelchair or stroller accessible; the overlook and restrooms are'), false);
  assert.equal(yesAccess('Paved path with slight inclines from the lot to the lower viewing area; accessible parking at both lots'), true);
  assert.equal(difficultyRank('Easy to the lower viewpoint; strenuous, steep and uneven to the top'), 'mixed');
  const flags = plusFlagList({ os: { photosCount: 120, reviews: 40 }, reviews: 40, photos: 120 }, {
    swimming: 'No',
    dogs: 'Allowed on leash',
    accessibility: 'Upper viewing area is wheelchair accessible',
  });
  assert.deepEqual(flags.sort(), ['access', 'dogs', 'photo', 'quiet']);
});

test('gauge match requires a shared distinctive name', () => {
  const gauges = [
    { id: 'USGS-1', name: 'SANDY RIVER BELOW BULL RUN', miles: 3, value: 800 },
    { id: 'USGS-2', name: 'MULTNOMAH CREEK NEAR MULTNOMAH FALLS, OR', miles: 0.4, value: 42, time: '2026-11-08T12:00:00Z' },
  ];
  const hit = matchGauge('Multnomah Falls', gauges);
  assert.equal(hit.matched, true);
  assert.equal(hit.id, 'USGS-2');
  const miss = matchGauge('Latourell Falls', gauges);
  assert.equal(miss.matched, false);
  assert.match(miss.reason, /not shown/);
  const unnamed = matchGauge('Falls', [{ id: 'USGS-3', name: 'FALLS CREEK', miles: 0.2, value: 5 }]);
  assert.equal(unnamed.matched, false);
});

test('season window and alert signals stay inside the data', () => {
  const winter = seasonWindow('Winter and spring, when flow is highest', new Date('2026-01-15T12:00:00Z'));
  assert.equal(winter.now, true);
  const summer = seasonWindow('Winter and spring, when flow is highest', new Date('2026-07-15T12:00:00Z'));
  assert.equal(summer.now, false);
  const report = buildReport({
    listing: { url: '/oregon/cascade-locks/multnomah-falls', name: 'Multnomah Falls', bestSeason: 'Winter and spring' },
    today: '2026-03-10',
    fetchedAt: '2026-03-10T12:00:00Z',
    meteo: {
      time: ['2026-03-08', '2026-03-09', '2026-03-10'],
      precipitation_sum: [0.8, 0.4, 0],
      snowfall_sum: [0, 0, 0],
      temperature_2m_max: [48, 50, 52],
      temperature_2m_min: [36, 37, 38],
    },
    weather: { summary: 'Tuesday: Rain', temperature: 48, temperatureUnit: 'F', alerts: [] },
    gauges: [],
  });
  assert.equal(report.gauge.matched, false);
  assert.ok(report.precip.last48in >= 0.5);
  const signals = alertSignals(report, new Date('2026-03-10T12:00:00Z'));
  assert.equal(signals.some((s) => s.kind === 'peak_flow'), true);
  const again = alertSignals(report, new Date('2026-03-10T12:00:00Z'));
  assert.equal(again[0].fingerprint, signals[0].fingerprint);
});

test('entitlement follows subscription status and complimentary access', () => {
  assert.equal(isEntitled(null), false);
  assert.equal(isEntitled({ subscription_status: 'active', complimentary: false, billing_hold: false }), true);
  assert.equal(isEntitled({ subscription_status: 'trialing', complimentary: false, billing_hold: false }), true);
  assert.equal(isEntitled({ subscription_status: 'past_due', complimentary: false, billing_hold: true }), false);
  assert.equal(isEntitled({ subscription_status: 'canceled', complimentary: false, billing_hold: false }), false);
  assert.equal(isEntitled({ subscription_status: 'canceled', complimentary: true, billing_hold: true }), true);
  const patch = subscriptionPatch({
    id: 'sub_123',
    status: 'trialing',
    customer: 'cus_123',
    trial_end: 1_800_000_000,
    cancel_at_period_end: false,
    items: { data: [{ current_period_end: 1_800_086_400, price: { id: 'price_annual', recurring: { interval: 'year' } } }] },
  });
  assert.equal(patch.subscription_status, 'trialing');
  assert.equal(patch.plan_interval, 'year');
  assert.equal(patch.trial_consumed, true);
  assert.ok(patch.current_period_end);
});

test('planner uses directory fields and does not invent stops', () => {
  const listings = [
    { url: '/or/bend/a', name: 'A Falls', lat: 44.06, lng: -121.31, city: 'Bend', cityLat: 44.06, cityLng: -121.31, state: 'Oregon', stateCode: 'OR', reviews: 10, rating: 4.5, flags: 'swim quiet', difficulty: 'Easy', hike: '0.5 mile' },
    { url: '/or/bend/b', name: 'B Falls', lat: 44.1, lng: -121.3, city: 'Bend', cityLat: 44.06, cityLng: -121.31, state: 'Oregon', stateCode: 'OR', reviews: 400, rating: 4.8, flags: 'photo', difficulty: 'Strenuous', hike: null },
    { url: '/wa/seattle/c', name: 'C Falls', lat: 47.6, lng: -122.3, city: 'Seattle', cityLat: 47.6, cityLng: -122.3, state: 'Washington', stateCode: 'WA', reviews: 20, rating: 4, flags: 'quiet', difficulty: 'Easy' },
  ];
  const area = resolveArea(listings, 'Bend, OR');
  assert.equal(area.anchor.label, 'Bend, OR');
  const plan = planTrip({
    listings,
    anchor: area.anchor,
    days: 2,
    prefs: { maxDriveHours: 2, difficulty: 'easy', swimming: true, crowds: 'less' },
  });
  assert.equal(plan.days.length, 1);
  assert.equal(plan.days[0].stops[0].url, '/or/bend/a');
  assert.equal(plan.days[0].stops.some((s) => s.url === '/or/bend/b'), false);
  const ambiguous = resolveArea(listings, 'Bend');
  assert.equal(ambiguous.anchor.label, 'Bend, OR');
});

test('pdf packet is a real file and keeps only supplied notes', () => {
  const blocks = packetBlocks({
    title: 'Sample Falls day packet',
    notes: ['Notes already published.'],
    places: [{ name: 'Sample Falls', where: 'Bend, OR', coords: '44.00000, -121.00000', notes: ['Parking: lot'], nearby: [] }],
  });
  const pdf = textPdf('Sample Falls day packet', blocks);
  assert.ok(pdf.subarray(0, 5).toString() === '%PDF-');
  assert.ok(pdf.includes(Buffer.from('Sample Falls')));
  assert.ok(pdf.includes(Buffer.from('%%EOF')));
  const joined = blocks.map((b) => b.text).join('\n');
  assert.equal(joined.includes('invented'), false);
});

test('redirect targets stay on this site', () => {
  assert.equal(safeNext('/account'), '/account');
  assert.equal(safeNext('https://evil.example/phish'), '/account');
  assert.equal(safeNext('//evil.example'), '/account');
});

test('indexing rules are unchanged and Plus marketing is the new public page', () => {
  const src = readFileSync(new URL('../src/lib/indexing.mjs', import.meta.url), 'utf8');
  assert.match(src, /MIN_REVIEWS = 25/);
  assert.match(src, /MIN_USGS_TEXT = 200/);
  assert.equal(src.includes('/account'), false);
  assert.equal(src.includes('plus'), false);
  const core = readFileSync(new URL('../src/lib/core.mjs', import.meta.url), 'utf8');
  assert.match(core, /'\/plus'/);
});
