const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const SEASONS = {
  winter: [11, 0, 1],
  spring: [2, 3, 4],
  summer: [5, 6, 7],
  fall: [8, 9, 10],
  autumn: [8, 9, 10],
};

export function seasonWindow(text, date = new Date()) {
  if (!text) return { known: false, now: false, note: 'No verified season window is on file for this waterfall.' };
  const t = text.toLowerCase();
  const month = date.getUTCMonth();
  if (/year-round|year round|any season|all year/.test(t)) {
    return { known: true, now: true, note: 'The visit notes describe this as a year-round visit. That is not a live flow reading.' };
  }
  const mentioned = MONTHS.filter((name) => t.includes(name));
  if (mentioned.length) {
    const now = mentioned.includes(MONTHS[month]);
    return { known: true, now, note: now ? 'This month is named in the visit notes.' : 'This month is not named in the visit notes.' };
  }
  const hits = Object.entries(SEASONS).filter(([name]) => t.includes(name));
  if (!hits.length) return { known: false, now: false, note: 'The season note does not name a month or season this page can match. It is shown as written.' };
  const now = hits.some(([, months]) => months.includes(month));
  return { known: true, now, note: now ? 'The current season is named in the visit notes.' : 'The current season is not the one named in the visit notes.' };
}

const GENERIC = new Set(['falls', 'fall', 'waterfall', 'waterfalls', 'creek', 'river', 'brook', 'fork', 'north', 'south', 'east', 'west', 'upper', 'lower', 'middle', 'little', 'big', 'lake', 'park', 'state', 'near', 'branch', 'stream', 'cascade', 'cascades', 'national', 'forest', 'county']);

export function nameTokens(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 4 && !GENERIC.has(t));
}

export function matchGauge(listingName, gauges) {
  const tokens = nameTokens(listingName);
  const ranked = (gauges || [])
    .filter((g) => g && Number.isFinite(g.miles) && g.miles <= 10 && g.value != null && Number.isFinite(Number(g.value)))
    .sort((a, b) => a.miles - b.miles);
  const hit = tokens.length
    ? ranked.find((g) => {
        const gt = new Set(nameTokens(g.name));
        return tokens.some((t) => gt.has(t));
      })
    : null;
  if (hit) {
    return {
      matched: true,
      id: hit.id,
      name: hit.name,
      miles: hit.miles,
      value: Number(hit.value),
      unit: hit.unit || 'ft³/s',
      time: hit.time || null,
      link: hit.link || null,
      reason: 'The gauge name shares a distinctive word with this waterfall, and the gauge is within 10 miles. It can still be upstream or downstream of the falls.',
    };
  }
  if (!ranked.length) {
    return { matched: false, nearby: 0, reason: 'No active USGS discharge gauge with a reading was found within about 10 miles.' };
  }
  return {
    matched: false,
    nearby: ranked.length,
    closestMiles: ranked[0].miles,
    reason: tokens.length
      ? 'USGS gauges report within 10 miles, but none share a distinctive part of this waterfall’s name, so their readings are not shown as this fall’s flow.'
      : 'This waterfall’s name has no distinctive word to match against a gauge, so nearby readings are not shown as its flow.',
  };
}

const CAUTION_RE = /flood|flash flood|winter|ice|blizzard|high wind|wind advisory|severe thunderstorm|tornado|hurricane|tropical|dense fog|snow|freeze|frost|hydrologic/i;

export function cautionAlerts(alerts) {
  return (alerts || []).filter((a) => a && CAUTION_RE.test(`${a.event || ''} ${a.headline || ''}`));
}

function num(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

export function summarizeMeteo(daily, todayIso) {
  if (!daily?.time?.length) return null;
  const precip = daily.precipitation_sum || [];
  const snow = daily.snowfall_sum || [];
  const tmax = daily.temperature_2m_max || [];
  const tmin = daily.temperature_2m_min || [];
  const days = daily.time.map((date, i) => ({
    date,
    precip: num(precip[i]),
    snow: num(snow[i]),
    max: num(tmax[i]),
    min: num(tmin[i]),
    past: date < todayIso,
  }));
  const past = days.filter((d) => d.past);
  const last2 = past.slice(-2);
  const last7 = past.slice(-7);
  const sum = (rows, key) => rows.reduce((s, d) => s + (d[key] || 0), 0);
  const window = days.filter((d) => d.date >= todayIso || past.slice(-3).some((p) => p.date === d.date));
  const crossing = window.find((d) => d.min != null && d.max != null && d.min <= 32 && d.max >= 33);
  const snowSum = sum(last7, 'snow');
  const warm = [...past.slice(-3), ...days.filter((d) => d.date >= todayIso).slice(0, 3)].some((d) => d.max != null && d.max >= 35);
  return {
    last48in: Math.round(sum(last2, 'precip') * 100) / 100,
    last7in: Math.round(sum(last7, 'precip') * 100) / 100,
    snow7cm: Math.round(snowSum * 10) / 10,
    snowmelt: snowSum >= 1 && warm,
    freezeCrossing: crossing ? crossing.date : null,
    ice: window.some((d) => d.min != null && d.min <= 32),
    days: days.map((d) => ({ date: d.date, precip: d.precip, snow: d.snow, max: d.max, min: d.min })),
  };
}

export function buildReport({ listing, meteo, weather, gauges, fetchedAt, today }) {
  const todayIso = today || new Date().toISOString().slice(0, 10);
  const seasonText = listing.bestSeason || null;
  const season = seasonWindow(seasonText, new Date(`${todayIso}T12:00:00Z`));
  const rain = meteo ? summarizeMeteo(meteo, todayIso) : null;
  const gauge = matchGauge(listing.name, gauges);
  const alerts = cautionAlerts(weather?.alerts);
  const cautions = [];
  if (rain?.ice) cautions.push({ kind: 'ice', text: 'Temperatures at or below freezing are in the recent record or short forecast for these coordinates. Ice, slick rock, and frozen spray are possible. Confirm locally before you go.' });
  if (rain?.freezeCrossing) cautions.push({ kind: 'freeze_thaw', text: `Temperatures around these coordinates cross the freezing point on ${rain.freezeCrossing}. A freeze and thaw can change spray, trail ice, and flow.` });
  if ((rain?.last48in || 0) >= 1.5) cautions.push({ kind: 'high_water', text: `About ${rain.last48in} inches of precipitation fell in the last two days near these coordinates. That can raise water levels. It is not a measurement at the falls.` });
  for (const alert of alerts) {
    cautions.push({ kind: 'weather', text: `${alert.event || 'Weather alert'}${alert.headline ? `: ${alert.headline}` : ''}` });
  }
  return {
    url: listing.url,
    name: listing.name,
    fetchedAt: fetchedAt || new Date().toISOString(),
    season: seasonText ? { text: seasonText, ...season } : { text: null, ...season },
    precip: rain
      ? {
          last48in: rain.last48in,
          last7in: rain.last7in,
          note: 'Totals are for these coordinates from the Open-Meteo model, not a rain gauge at the falls.',
        }
      : null,
    snowmelt: rain
      ? {
          likely: rain.snowmelt,
          snow7cm: rain.snow7cm,
          note: rain.snowmelt
            ? `About ${rain.snow7cm} cm of snow is on record near these coordinates over the last week, and daytime temperatures have been above freezing, which can add meltwater. This is area weather, not a measurement at the falls.`
            : rain.snow7cm > 0
              ? `About ${rain.snow7cm} cm of snow is on record near these coordinates, but daytime temperatures have not been warm enough for this page to call it a melt signal.`
              : 'No snowfall is on record for the last week near these coordinates.',
        }
      : null,
    weather: weather
      ? {
          summary: weather.summary || null,
          temperature: weather.temperature ?? null,
          temperatureUnit: weather.temperatureUnit || 'F',
          wind: weather.wind || null,
          alerts: alerts.map((a) => ({ id: a.id || null, event: a.event || 'Alert', headline: a.headline || '' })),
        }
      : null,
    cautions,
    gauge,
    sources: [
      'Open-Meteo (recent precipitation, snow, and temperature at these coordinates)',
      'National Weather Service (forecast snapshot and active alerts)',
      'USGS Water Data API (discharge gauges)',
      seasonText ? 'Visit notes published on this site' : null,
    ].filter(Boolean),
  };
}

export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function alertSignals(report, date = new Date()) {
  const signals = [];
  if (report.season?.known && report.season.now && ((report.precip?.last48in || 0) >= 0.5 || report.snowmelt?.likely)) {
    const why = [];
    if ((report.precip?.last48in || 0) >= 0.5) why.push(`about ${report.precip.last48in} inches of precipitation in the last two days nearby`);
    if (report.snowmelt?.likely) why.push('a snowmelt signal in the nearby temperature and snowfall record');
    signals.push({
      kind: 'peak_flow',
      fingerprint: isoWeek(date),
      summary: `${report.name} is in the season named in its visit notes, and nearby weather shows ${why.join(' and ')}. That suggests a stronger flow window. It is not a measurement of the falls.`,
    });
  }
  const freeze = (report.cautions || []).find((c) => c.kind === 'freeze_thaw');
  if (freeze) {
    signals.push({
      kind: 'freeze_thaw',
      fingerprint: freeze.text,
      summary: freeze.text,
    });
  }
  const alerts = report.weather?.alerts || [];
  if (alerts.length) {
    signals.push({
      kind: 'weather_caution',
      fingerprint: alerts.map((a) => a.id || a.event).sort().join('|'),
      summary: alerts.map((a) => a.headline || a.event).join(' '),
    });
  }
  const seen = new Set();
  return signals.filter((s) => {
    const key = `${s.kind}:${s.fingerprint}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
