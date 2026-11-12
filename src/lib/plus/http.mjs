export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(body, { status = 200, cookies = [], headers = {} } = {}) {
  const out = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex',
    ...headers,
  });
  for (const cookie of cookies) out.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers: out });
}

export function html(body, { status = 200, cookies = [] } = {}) {
  const out = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex',
  });
  for (const cookie of cookies) out.append('set-cookie', cookie);
  return new Response(body, { status, headers: out });
}

export function fail(err) {
  const status = err?.status || err?.statusCode || 500;
  if (status >= 500) console.error(err?.message || err);
  const message = status >= 500 ? 'Something went wrong.' : err.message || 'Request failed.';
  return json({ error: message }, { status });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Expected JSON.');
  }
}

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export function assertSameOrigin(request) {
  if (!sameOrigin(request)) throw new HttpError(403, 'Cross-site request blocked.');
}

export function cookieHeader(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('=') || '');
  }
  return '';
}

export function serializeCookie(name, value, { maxAge, httpOnly = true, secure = false } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function requestIsSecure(request) {
  const proto = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '');
  return proto === 'https';
}

export function safeNext(value) {
  if (typeof value !== 'string') return '/account';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('://')) return '/account';
  if (value.length > 300) return '/account';
  return value;
}

export function canonicalOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://www.waterfallsnearyou.com';
}

export function redirect(location, cookies = []) {
  const headers = new Headers({ location, 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(null, { status: 302, headers });
}
