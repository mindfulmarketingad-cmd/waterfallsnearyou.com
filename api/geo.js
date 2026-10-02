// Vercel Edge Function: returns the visitor's approximate location from Vercel's IP geolocation headers.
// Used only to personalize the "Waterfalls Near You" carousel; nothing is stored or logged.
export const config = { runtime: 'edge' };

export default function handler(request) {
  const h = request.headers;
  const lat = parseFloat(h.get('x-vercel-ip-latitude'));
  const lng = parseFloat(h.get('x-vercel-ip-longitude'));
  const country = h.get('x-vercel-ip-country') || '';
  const body = Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng, city: decodeURIComponent(h.get('x-vercel-ip-city') || ''), region: h.get('x-vercel-ip-country-region') || '', country }
    : { error: 'unavailable' };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
