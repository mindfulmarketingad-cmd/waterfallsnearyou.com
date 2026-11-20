import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  WATER_RULES, aggregateMonthly, attainsMatches, causeList, chooseStream, downstreamMeters,
  ecoliComparison, formatTemps, pathMetrics, siteMatchesStream, streamHint,
} from '../src/lib/water-match.mjs';
import { waterView } from '../src/lib/water.mjs';

const line = (name, meters, extra = {}) => ({ name, meters, fcode: 46006, streamOrder: 3, ...extra });

test('stream hints come from the falls name or an explicit gazetteer phrase', () => {
  assert.equal(streamHint('Cedar Creek Falls', ''), 'Cedar Creek');
  assert.equal(streamHint('Falls of the Little River', ''), 'Little River');
  assert.equal(streamHint('Multnomah Falls', 'On Multnomah Creek; has an upper and lower falls.'), 'Multnomah Creek');
  assert.equal(streamHint('Multnomah Falls', ''), null);
  assert.equal(streamHint('North Fork Falls', ''), null);
  assert.equal(streamHint('Little Niagara Falls', '1/4 mi NE of Cave Island Falls on Travertine Creek'), 'Travertine Creek');
  assert.equal(streamHint('Mary Pamela Falls', '85 ft. tall; located along an unnamed tributary of the Sultan River, 0.95 mi. S of Echo Lake'), null);
  assert.equal(streamHint('Georgia Falls', 'On the S side of the Tennessee River below Wilson Dam, where water from Wilson Lake seeps through bedrock'), null);
  assert.equal(streamHint('Spirit Falls', 'E of the mouth of Alex Creek and 12.9 km SW of Oakridge.'), null);
});

test('a named flowline within 400 m is the stream, and a confluence without a hint is not guessed', () => {
  assert.equal(chooseStream([line('Multnomah Creek', 120), line(null, 30)], null).name, 'Multnomah Creek');
  assert.equal(chooseStream([line('Multnomah Creek', 90), line('Wahkeena Creek', 110)], null), null);
  assert.equal(chooseStream([line('Multnomah Creek', 80), line('Wahkeena Creek', 280)], null).name, 'Multnomah Creek');
  assert.equal(chooseStream([line('Bridalveil Creek', 700), line('Meadow Brook', 250)], 'Bridalveil Creek').name, 'Bridalveil Creek');
  assert.equal(chooseStream([line('Bridalveil Creek', 900), line('Meadow Brook', 40)], 'Bridalveil Creek').name, 'Meadow Brook');
  assert.equal(chooseStream([line(null, 140, { fcode: 46003 })], null).name, null);
  assert.equal(chooseStream([line(null, 260)], null), null);
  assert.equal(chooseStream([line('Mill Ditch', 50, { fcode: 33600 })], null), null);
  assert.equal(chooseStream([
    line('Cumberland River', 3, { streamOrder: 7, fcode: 55800 }),
    line('Falls Branch', 119, { streamOrder: 2, fcode: 55800 }),
  ], null).name, 'Cumberland River');
});

test('station names have to be that stream, not a fork, lake, bank, or plant', () => {
  assert.equal(siteMatchesStream('MERCED R A HAPPY ISLES BRIDGE NR YOSEMITE CA', 'Merced River'), true);
  assert.equal(siteMatchesStream('MULTNOMAH C NR DODSON, OR', 'Multnomah Creek'), true);
  assert.equal(siteMatchesStream('S F SHENANDOAH RIVER NEAR LYNNWOOD, VA', 'South Fork Shenandoah River'), true);
  assert.equal(siteMatchesStream('NORTH FORK MULTNOMAH CREEK NEAR DODSON, OR', 'Multnomah Creek'), false);
  assert.equal(siteMatchesStream('MULTNOMAH FALLS LODGE, INFLUENT', 'Multnomah Creek'), false);
  assert.equal(siteMatchesStream('BENSON LAKE (MULTNOMAH COUNTY) OREG.', 'Multnomah Creek'), false);
  assert.equal(siteMatchesStream('COLUMBIA RIVER AT WARRENDALE, OR', 'Multnomah Creek'), false);
  assert.equal(siteMatchesStream('COLUMBIA RIVER, LEFT BANK, NEAR DODSON, OR', 'Columbia River'), false);
  assert.equal(siteMatchesStream('SPRING CREEK NEAR TOWN', 'Spring Creek'), true);
  assert.equal(siteMatchesStream('ROCK C BLW DAM', 'Rock Creek'), true);
});

test('ATTAINS watershed rollups and compound names are not the falls stream', () => {
  assert.equal(attainsMatches('Multnomah Creek', 'Multnomah Creek'), true);
  assert.equal(attainsMatches('Multnomah Cr', 'Multnomah Creek'), true);
  assert.equal(attainsMatches('HUC12 Name: Bridal Veil Creek-Columbia River', 'Multnomah Creek'), false);
  assert.equal(attainsMatches('Bridal Veil Creek-Columbia River', 'Bridal Veil Creek'), false);
  assert.equal(attainsMatches('Columbia River', 'Multnomah Creek'), false);
  assert.equal(attainsMatches('Multnomah Creek near Dodson', 'Multnomah Creek'), true);
  assert.equal(attainsMatches('Merced River (Mariposa and Madera Counties)', 'Merced River'), true);
  assert.equal(attainsMatches('Taughannock Creek, Lower, and tribs', 'Taughannock Creek'), true);
  assert.equal(attainsMatches('Rock Creek and Boulder Creek', 'Rock Creek'), false);
  assert.deepEqual(causeList({ temperature: 'Cause', pathogens: 'N', mercury: 'Cause', overallstatus: 'Not Supporting' }), ['mercury', 'temperature']);
  assert.deepEqual(causeList({ temperature: 'N', fish_consumption_advisory: 'Y' }), ['a fish-consumption advisory']);
});

test('monthly averages use one USGS series and leave thin months out', () => {
  const rows = [];
  for (const year of [2018, 2019, 2020, 2021]) {
    rows.push({ tsId: 'new', year, month: 5, value: 10 + (year - 2018) });
    if (year < 2020) rows.push({ tsId: 'new', year, month: 6, value: 99 });
  }
  for (const year of [2001, 2002, 2003]) rows.push({ tsId: 'old', year, month: 5, value: 1 });
  const agg = aggregateMonthly(rows);
  assert.equal(agg.tsId, 'new');
  assert.equal(agg.months['5'].years, 4);
  assert.equal(agg.months['5'].c, 11.5);
  assert.equal(agg.months['6'], undefined);
  assert.equal(agg.months['1'], undefined);
  assert.equal(WATER_RULES.typicalYearsMin, 3);
});

test('distance along a flowline is measured, not interpolated between gauges', () => {
  const metrics = pathMetrics(45, -122, [[[-122.01, 45], [-121.99, 45]]]);
  assert.ok(metrics.meters < 1, metrics.meters);
  assert.ok(Math.abs(metrics.fraction - 0.5) < 0.02, metrics.fraction);
  const downstream = downstreamMeters(metrics, 1);
  assert.ok(Math.abs(downstream - metrics.lengthM / 2) < 2);
  assert.equal(formatTemps(0), '32.0°F (0.0°C)');
  assert.equal(formatTemps(10), '50.0°F (10.0°C)');
  assert.deepEqual(ecoliComparison('180', 'MPN/100 mL'), { value: 180, reference: 235, relation: 'below' });
  assert.deepEqual(ecoliComparison(410, 'cfu/100ml').relation, 'above');
  assert.equal(ecoliComparison(10, 'mg/L'), null);
  assert.equal(ecoliComparison('<10', 'MPN/100 mL'), null);
});

test('page copy names the station and does not call the water safe to swim', () => {
  const view = waterView({
    url: '/example',
    name: 'Example Falls',
    state: 'Oregon',
    lat: 45.5,
    lng: -122.1,
  }, {
    fallsStream: 'Example Creek',
    temperature: {
      relationship: 'same-stream',
      waterName: 'Example Creek',
      siteId: '12345678',
      siteName: 'EXAMPLE CREEK NEAR TOWN, OR',
      url: 'https://waterdata.usgs.gov/monitoring-location/USGS-12345678/',
      distanceKm: 2.4,
      along: 'downstream',
      recent: { celsius: 8, kind: 'daily-mean', date: '2026-11-01', provisional: false },
      monthly: { 5: { c: 11.5, years: 9 } },
      begin: '2014-05',
      end: '2024-05',
      live: false,
    },
    quality: {
      attains: {
        relationship: 'same-stream',
        waterName: 'Example Creek',
        organization: 'Oregon',
        cycle: 2024,
        status: 'Not Supporting',
        category: '5',
        impaired: true,
        on303d: true,
        causes: ['temperature', 'pathogens'],
        url: 'https://mywaterway.epa.gov/waterbody-report/example',
        distanceKm: 0.05,
      },
      samples: [{
        characteristic: 'Escherichia coli',
        value: '420',
        unit: 'MPN/100 mL',
        date: '2024-08-14',
        siteName: 'Example Creek at the bridge',
        url: 'https://www.waterqualitydata.us/provider/NWIS/USGS-OR/USGS-12345678/',
        distanceKm: 2.4,
        along: 'downstream',
        waterName: 'Example Creek',
        relationship: 'same-stream',
      }],
    },
  });
  const text = JSON.stringify(view);
  assert.match(text, /Example Falls/);
  assert.match(text, /Example Creek/);
  assert.match(text, /46\.4°F \(8\.0°C\)/);
  assert.match(text, /above that value/);
  assert.equal(/safe to swim|safe for swimming|safe to wade/i.test(text), false);
  const receiving = waterView({ url: '/example', name: 'Example Falls', state: 'Oregon' }, {
    fallsStream: 'Example Creek',
    temperature: {
      relationship: 'receiving-water',
      waterName: 'Big River',
      siteId: '87654321',
      siteName: 'BIG RIVER AT MOUTH, OR',
      url: 'https://waterdata.usgs.gov/monitoring-location/USGS-87654321/',
      distanceKm: 4,
      along: 'downstream',
      recent: null,
      monthly: { 1: { c: 4, years: 6 } },
      begin: '2010-01',
      end: '2020-12',
      live: false,
    },
    quality: null,
  });
  assert.match(receiving.temperature.detail, /Big River/);
  assert.match(receiving.temperature.detail, /Example Creek flows into/);
  assert.notEqual(view.note, receiving.note);
});

test('committed water records stay inside the matching rules', () => {
  const raw = JSON.parse(readFileSync('data/water-conditions.json', 'utf8'));
  assert.equal(raw.meta.threshold.networkKm, 12);
  assert.equal(raw.meta.threshold.straightLineKm, 12);
  const banned = /safe to swim|safe for swimming|safe to wade/i;
  assert.equal(banned.test(JSON.stringify(raw)), false);
  for (const [url, row] of Object.entries(raw.listings)) {
    assert.match(url, /^\//);
    for (const block of [row.temperature, row.quality?.attains].filter(Boolean)) {
      assert.ok(block.distanceKm <= 12, url);
      assert.ok(block.waterName, url);
      assert.ok(block.url, url);
    }
    for (const sample of row.quality?.samples || []) {
      assert.ok(sample.distanceKm <= 12, url);
      assert.match(sample.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(sample.value !== '' && sample.value != null, url);
    }
    const months = row.temperature?.monthly || {};
    for (const month of Object.values(months)) {
      assert.ok(month.years >= 3, url);
      assert.equal(Number.isFinite(month.c), true, url);
    }
    if (row.temperature?.recent) assert.equal(Number.isFinite(row.temperature.recent.celsius), true, url);
  }
});

test('source files do not tell visitors the water is safe to swim', () => {
  const banned = /safe to swim|safe for swimming|safe to wade/i;
  for (const file of ['src/lib/water.mjs', 'src/lib/water-match.mjs', 'src/components/WaterConditions.astro']) {
    assert.equal(banned.test(readFileSync(file, 'utf8')), false, file);
  }
});
