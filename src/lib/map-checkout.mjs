// Stripe Checkout for one state map book, and the paid-session gate in front of
// the private PDF. Storage is a private Vercel Blob object. This module never
// reads the file body: it signs a URL for five minutes and the route redirects.
import Stripe from 'stripe';
import { getDownloadUrl, issueSignedToken, presignUrl } from '@vercel/blob';
import {
  assessDownload,
  blobPathname,
  bookForCheckout,
  checkoutParams,
  isPrivateBlobUrl,
  loadMapBooks,
  publicOrigin,
} from './map-books.mjs';

const STRIPE_API_VERSION = '2026-11-18.endive';
const PRICE_ID = /^price_[A-Za-z0-9]+$/;
const SESSION_ID = /^cs_(?:test|live)_[A-Za-z0-9]{8,200}$/;
const PRESIGN_MS = 5 * 60 * 1000;
const DELEGATION_MS = 60 * 60 * 1000;
const delegationCache = new Map();

const MISSING_STRIPE_KEY = 'STRIPE_SECRET_KEY is not configured';

function stripeClient(env, injected) {
  if (injected) return injected;
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
}

function isWebRequest(input) {
  if (!input) return false;
  if (typeof Request !== 'undefined' && input instanceof Request) return true;
  return typeof input.headers?.get === 'function' && typeof input.url === 'string' && /^https?:\/\//.test(input.url);
}

function headerEntries(headers) {
  if (!headers) return [];
  if (typeof headers.entries === 'function') return [...headers.entries()];
  return Object.entries(headers);
}

function firstHeader(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || '').split(',')[0].trim();
}

async function readNodeBody(input) {
  const body = input?.body;
  if (typeof body === 'string' || body instanceof Uint8Array) return body;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(body)) return body;
  if (body && typeof body === 'object' && typeof body.pipe !== 'function' && typeof body.getReader !== 'function' && typeof body[Symbol.asyncIterator] !== 'function') {
    return JSON.stringify(body);
  }
  const stream = body && (typeof body[Symbol.asyncIterator] === 'function' || typeof body.getReader === 'function')
    ? body
    : body == null && input && typeof input[Symbol.asyncIterator] === 'function'
      ? input
      : null;
  if (!stream) return undefined;
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk);
    total += buf.length;
    if (total > 2000) {
      const err = new Error('Request is too large.');
      err.status = 413;
      throw err;
    }
    chunks.push(buf);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

// Vercel's Node.js function passes an IncomingMessage: headers are a plain object
// and url is a path. The Web fetch export passes a Request. Either becomes a Request.
export async function toWebRequest(input) {
  if (isWebRequest(input)) return input;
  const headers = new Headers();
  for (const [key, value] of headerEntries(input?.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.map(String).join(', ') : String(value));
  }
  const proto = firstHeader(headers.get('x-forwarded-proto')) || 'https';
  const host = firstHeader(headers.get('x-forwarded-host')) || headers.get('host') || 'www.waterfallsnearyou.com';
  let path = typeof input?.url === 'string' && input.url ? input.url : '/';
  if (!/^https?:\/\//.test(path)) {
    if (!path.startsWith('/')) path = `/${path}`;
    path = `${proto}://${host}${path}`;
  }
  const method = input?.method || 'GET';
  const init = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    const body = await readNodeBody(input);
    if (body != null) init.body = body;
  }
  return new Request(path, init);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function html(status, title, message) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)} | WaterfallsNearYou</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui,sans-serif;padding:2rem;max-width:40rem;line-height:1.5"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="/maps">Map books</a> · <a href="/">WaterfallsNearYou</a></p></body></html>`;
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function fail(asJson, status, message) {
  return asJson ? json(status, { error: message }) : html(status, 'Map book', message);
}

async function readState(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(length) && length > 2000) return { error: 'Request is too large.', status: 413 };
  const type = request.headers.get('content-type') || '';
  try {
    if (type.includes('application/json')) {
      const payload = await request.json();
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { error: 'Choose a state map book.', status: 400, json: true };
      }
      return { state: payload.state, json: true };
    }
    if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
      const form = await request.formData();
      return { state: form.get('state'), json: false };
    }
  } catch {
    return { error: 'Choose a state map book.', status: 400, json: type.includes('application/json') };
  }
  return { error: 'Choose a state map book.', status: 415, json: true };
}

export async function handleMapCheckout(request, deps = {}) {
  try {
    request = await toWebRequest(request);
  } catch (err) {
    return json(err?.status || 400, { error: err?.status === 413 ? 'Request is too large.' : 'Choose a state map book.' });
  }
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const env = deps.env || process.env;
  const catalog = deps.catalog || loadMapBooks();
  const parsed = await readState(request);
  const asJson = parsed.json !== false;
  if (parsed.error) return fail(asJson, parsed.status || 400, parsed.error);

  const decision = bookForCheckout(typeof parsed.state === 'string' ? parsed.state : '', catalog);
  if (!decision.ok) return fail(asJson, decision.status, decision.error);

  if (!env.STRIPE_SECRET_KEY) return json(500, { error: MISSING_STRIPE_KEY });
  const priceId = env.STRIPE_MAP_PRICE_ID || '';
  if (!PRICE_ID.test(priceId)) {
    console.error('map checkout price is not configured');
    return json(500, { error: 'Checkout is unavailable right now.' });
  }
  const stripe = stripeClient(env, deps.stripe);
  const origin = deps.origin || publicOrigin(request);
  try {
    const session = await stripe.checkout.sessions.create(checkoutParams({ book: decision.book, origin, priceId }));
    if (!session?.url || !/^https:\/\/checkout\.stripe\.com\//.test(session.url)) {
      console.error('map checkout returned an unexpected url');
      return fail(asJson, 502, 'Checkout is unavailable right now.');
    }
    if (asJson) return json(200, { url: session.url });
    return new Response(null, {
      status: 303,
      headers: {
        Location: session.url,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (err) {
    console.error('map checkout failed', err?.type || err?.code || 'error');
    return fail(asJson, 502, 'Checkout is unavailable right now.');
  }
}

export async function presignPrivatePdf({ pathname, env = process.env, now = Date.now() }) {
  let issued = delegationCache.get(pathname);
  if (!issued || issued.validUntil < now + PRESIGN_MS + 60_000) {
    issued = await issueSignedToken({
      pathname,
      operations: ['get'],
      validUntil: now + DELEGATION_MS,
      ...(env.BLOB_READ_WRITE_TOKEN ? { token: env.BLOB_READ_WRITE_TOKEN } : {}),
    });
    delegationCache.set(pathname, issued);
  }
  const { presignedUrl } = await presignUrl(
    { clientSigningToken: issued.clientSigningToken, delegationToken: issued.delegationToken },
    { operation: 'get', pathname, access: 'private', validUntil: now + PRESIGN_MS },
  );
  return getDownloadUrl(presignedUrl);
}

export async function handleMapDownload(request, deps = {}) {
  try {
    request = await toWebRequest(request);
  } catch (err) {
    return html(err?.status || 400, 'Download link', err?.status === 413 ? 'Request is too large.' : 'This page needs the checkout session from Stripe.');
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return html(405, 'Method not allowed', 'Use the download link from the thank-you page.');
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return html(400, 'Download link', 'This page needs the checkout session from Stripe.');
  }
  const sessionId = url.searchParams.get('session_id') || '';
  if (!SESSION_ID.test(sessionId)) return html(400, 'Download link', 'This page needs the checkout session from Stripe.');

  const env = deps.env || process.env;
  const catalog = deps.catalog || loadMapBooks();
  if (!env.STRIPE_SECRET_KEY && !deps.stripe) return json(500, { error: MISSING_STRIPE_KEY });
  const stripe = stripeClient(env, deps.stripe);
  if (!stripe) return json(500, { error: MISSING_STRIPE_KEY });

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    const missing = err?.statusCode === 404 || err?.code === 'resource_missing';
    if (!missing) console.error('map download lookup failed', err?.type || err?.code || 'error');
    return html(missing ? 404 : 502, 'Download link', missing ? 'We could not find that checkout.' : 'The download is unavailable right now.');
  }

  const decision = assessDownload(session, { catalog, now: deps.now });
  if (!decision.ok) return html(decision.status, 'Download link', decision.error);

  let pathname;
  try {
    pathname = blobPathname(decision.book.slug, env);
  } catch {
    console.error('map download path rejected');
    return html(500, 'Download unavailable', 'The download is unavailable right now.');
  }

  try {
    const presign = deps.presign || presignPrivatePdf;
    const signed = getDownloadUrl(await presign({ pathname, env, now: deps.now }));
    if (!isPrivateBlobUrl(signed)) {
      console.error('map download signer returned an unexpected url');
      return html(502, 'Download unavailable', 'The file is not available right now.');
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: signed,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (err) {
    console.error('map download signing failed', err?.name || 'error');
    return html(502, 'Download unavailable', 'The file is not available right now. The thank-you page will keep working for 7 days after checkout.');
  }
}
