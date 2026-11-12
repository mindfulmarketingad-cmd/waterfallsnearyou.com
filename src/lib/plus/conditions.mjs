import { buildReport } from './conditions-logic.mjs';
import { milesBetween, round1 } from './geo.mjs';

const UA = 'WaterfallsNearYou (contact@waterfallsnearyou.com)';

async function getJson(url, headers) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function fetchMeteo(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,snowfall_sum,temperature_2m_max,temperature_2m_min&past_days=7&forecast_days=3&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=UTC`;
  const json = await getJson(url, { accept: 'application/json', 'user-agent': UA });
  return json.daily || null;
}

export async function fetchWeather(lat, lng) {
  const point = await getJson(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`, {
    accept: 'application/geo+json',
    'user-agent': UA,
  });
  const forecastUrl = point.properties?.forecast;
  if (typeof forecastUrl !== 'string' || !forecastUrl.startsWith('https://api.weather.gov/')) return null;
  const [forecast, alerts] = await Promise.all([
    getJson(forecastUrl, { accept: 'application/geo+json', 'user-agent': UA }),
    getJson(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}`, { accept: 'application/geo+json', 'user-agent': UA }).catch(() => ({ features: [] })),
  ]);
  const period = forecast.properties?.periods?.[0];
  return {
    summary: period ? `${period.name}: ${period.shortForecast || ''}`.trim() : null,
    temperature: period?.temperature ?? null,
    temperatureUnit: period?.temperatureUnit || 'F',
    wind: period?.windSpeed ? `${period.windDirection || ''} ${period.windSpeed}`.trim() : null,
    alerts: (alerts.features || []).map((f) => ({
      id: f.properties?.id || f.id || null,
      event: f.properties?.event || '',
      headline: f.properties?.headline || '',
    })),
  };
}

export async function fetchGauges(lat, lng) {
  const bbox = [lng - 0.18, lat - 0.14, lng + 0.18, lat + 0.14].map((v) => v.toFixed(4)).join(',');
  const json = await getJson(
    `https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?f=json&bbox=${bbox}&parameter_code=00060&limit=40`,
    { accept: 'application/json', 'user-agent': UA },
  );
  const feats = (json.features || [])
    .filter((f) => f.geometry?.coordinates && f.properties?.value != null)
    .map((f) => {
      const [glng, glat] = f.geometry.coordinates;
      const id = String(f.properties.monitoring_location_id || '');
      return {
        id,
        miles: round1(milesBetween({ lat, lng }, { lat: glat, lng: glng })),
        value: Number(f.properties.value),
        time: f.properties.time || null,
        name: id,
        link: /^USGS-[\w-]+$/.test(id) ? `https://waterdata.usgs.gov/monitoring-location/${id}/` : null,
      };
    })
    .filter((g) => g.miles <= 10)
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 6);
  await Promise.all(feats.map(async (g) => {
    if (!/^USGS-[\w-]+$/.test(g.id)) return;
    try {
      const loc = await getJson(
        `https://api.waterdata.usgs.gov/ogcapi/v0/collections/monitoring-locations/items/${encodeURIComponent(g.id)}?f=json`,
        { accept: 'application/json', 'user-agent': UA },
      );
      g.name = loc.properties?.monitoring_location_name || g.id;
    } catch {
      /* keep the station id */
    }
  }));
  return feats;
}

export async function liveReport(listing) {
  const [meteo, weather, gauges] = await Promise.all([
    fetchMeteo(listing.lat, listing.lng).catch(() => null),
    fetchWeather(listing.lat, listing.lng).catch(() => null),
    fetchGauges(listing.lat, listing.lng).catch(() => []),
  ]);
  return buildReport({
    listing,
    meteo,
    weather,
    gauges,
    fetchedAt: new Date().toISOString(),
    today: new Date().toISOString().slice(0, 10),
  });
}
