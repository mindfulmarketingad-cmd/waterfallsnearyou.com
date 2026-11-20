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

function stripeClient(env, injected) {
  if (injected) return injected;
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
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
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const env = deps.env || process.env;
  const catalog = deps.catalog || loadMapBooks();
  const parsed = await readState(request);
  const asJson = parsed.json !== false;
  if (parsed.error) return fail(asJson, parsed.status || 400, parsed.error);

  const decision = bookForCheckout(typeof parsed.state === 'string' ? parsed.state : '', catalog);
  if (!decision.ok) return fail(asJson, decision.status, decision.error);

  const priceId = env.STRIPE_MAP_PRICE_ID || '';
  if (!env.STRIPE_SECRET_KEY || !PRICE_ID.test(priceId)) {
    console.error('map checkout is not configured');
    return fail(asJson, 500, 'Checkout is unavailable right now.');
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
  if (request.method !== 'GET' && request.method !== 'HEAD') return html(405, 'Method not allowed', 'Use the download link from the thank-you page.');
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id') || '';
  if (!SESSION_ID.test(sessionId)) return html(400, 'Download link', 'This page needs the checkout session from Stripe.');

  const env = deps.env || process.env;
  const catalog = deps.catalog || loadMapBooks();
  const stripe = stripeClient(env, deps.stripe);
  if (!stripe) {
    console.error('map download is not configured');
    return html(500, 'Download unavailable', 'The download is unavailable right now.');
  }

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
