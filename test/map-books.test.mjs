import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadData } from '../src/lib/core.mjs';
import { isIndexable } from '../src/lib/indexing.mjs';
import {
  DOWNLOAD_WINDOW_MS,
  assessDownload,
  blobPathname,
  bookBySlug,
  bookForCheckout,
  checkoutParams,
  isPrivateBlobUrl,
  loadMapBooks,
  previewPublicPath,
  publicOrigin,
} from '../src/lib/map-books.mjs';
import { handleMapCheckout, handleMapDownload } from '../src/lib/map-checkout.mjs';
import checkoutApi from '../api/maps/checkout.js';
import downloadApi from '../api/maps/download.js';

const PRICE = 'price_1MapBookTest123';
const ENV = { STRIPE_SECRET_KEY: 'sk_test_example', STRIPE_MAP_PRICE_ID: PRICE };
const PAID_ID = 'cs_test_paid12345678';
const NOW = 1_700_000_000_000;

function paidSession(overrides = {}) {
  return {
    id: PAID_ID,
    payment_status: 'paid',
    status: 'complete',
    mode: 'payment',
    created: Math.floor(NOW / 1000),
    metadata: { state: 'oregon' },
    ...overrides,
  };
}

function mockStripe(session) {
  const calls = { create: [], retrieve: [] };
  return {
    calls,
    checkout: {
      sessions: {
        async create(params) {
          calls.create.push(params);
          return { id: PAID_ID, url: `https://checkout.stripe.com/c/pay/${PAID_ID}` };
        },
        async retrieve(id) {
          calls.retrieve.push(id);
          if (typeof session === 'function') return session(id);
          if (session instanceof Error) throw session;
          return session;
        },
      },
    },
  };
}

function checkoutRequest(state, { json = true, host = 'www.waterfallsnearyou.com' } = {}) {
  if (json) {
    return new Request(`https://${host}/api/maps/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-host': host },
      body: JSON.stringify({ state }),
    });
  }
  return new Request(`https://${host}/api/maps/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-host': host },
    body: new URLSearchParams({ state }),
  });
}

function downloadRequest(sessionId = PAID_ID) {
  const query = sessionId == null ? '' : `?session_id=${encodeURIComponent(sessionId)}`;
  return new Request(`https://www.waterfallsnearyou.com/api/maps/download${query}`);
}

test('the catalog ships Oregon only, with the stated book contents', () => {
  const books = loadMapBooks();
  assert.deepEqual(books.map((book) => book.slug), ['oregon']);
  const oregon = bookBySlug('oregon');
  assert.equal(oregon.available, true);
  assert.equal(oregon.name, 'Oregon');
  assert.equal(oregon.pages, 15);
  assert.equal(oregon.falls, 68);
  assert.equal(oregon.areaMaps, 9);
  assert.equal(oregon.featuredPage, 'Silver Falls');
  assert.equal(oregon.sizeMB, 13.2);
  assert.equal(loadData().states.some((state) => state.slug === 'oregon'), true);
  assert.equal(bookBySlug('washington'), null);
  assert.equal(previewPublicPath('oregon'), '/images/maps/oregon-preview.webp');
  assert.equal(previewPublicPath('../secrets'), null);
});

test('checkout rejects slugs that are not an available map book', () => {
  assert.equal(bookForCheckout('oregon').ok, true);
  for (const slug of ['washington', 'Oregon', 'oregon.pdf', '../oregon', 'oregon/../../etc', '', 'district-of-columbia']) {
    const result = bookForCheckout(slug);
    assert.equal(result.ok, false, slug);
    assert.notEqual(result.status, 200, slug);
  }
  assert.equal(bookForCheckout('not a slug').status, 400);
  assert.equal(bookForCheckout('washington').status, 404);
  const hidden = bookForCheckout('oregon', [{ ...bookBySlug('oregon'), available: false }]);
  assert.equal(hidden.ok, false);
  assert.equal(hidden.status, 404);
});

test('checkout session params bill the shared price and do not turn tax on', () => {
  const params = checkoutParams({ book: bookBySlug('oregon'), origin: 'https://www.waterfallsnearyou.com', priceId: PRICE });
  assert.equal(params.mode, 'payment');
  assert.deepEqual(params.metadata, { state: 'oregon' });
  assert.deepEqual(params.line_items, [{ price: PRICE, quantity: 1 }]);
  assert.equal(params.automatic_tax.enabled, false);
  assert.equal(params.customer_creation, 'always');
  assert.equal(params.success_url, 'https://www.waterfallsnearyou.com/maps/thank-you?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(params.cancel_url, 'https://www.waterfallsnearyou.com/states/oregon#map-book');
  assert.equal('customer' in params, false);
  assert.equal('customer_email' in params, false);
});

test('a forwarded host cannot steer the Stripe return URLs', () => {
  const spoofed = new Request('https://waterfallsnearyou.vercel.app/api/maps/checkout', {
    headers: { 'x-forwarded-host': 'evil.example' },
  });
  assert.equal(publicOrigin(spoofed), 'https://waterfallsnearyou.vercel.app');
  const production = new Request('https://waterfallsnearyou-abc.vercel.app/api/maps/checkout', {
    headers: { 'x-forwarded-host': 'www.waterfallsnearyou.com' },
  });
  assert.equal(publicOrigin(production), 'https://www.waterfallsnearyou.com');
  const local = new Request('http://localhost:4321/api/maps/checkout');
  assert.equal(publicOrigin(local), 'http://localhost:4321');
});

test('Stripe is not called for a slug that is not for sale', async () => {
  const stripe = mockStripe(paidSession());
  const missing = await handleMapCheckout(checkoutRequest('washington'), { stripe, env: ENV });
  assert.equal(missing.status, 404);
  assert.equal(stripe.calls.create.length, 0);
  const weird = await handleMapCheckout(checkoutRequest('../oregon'), { stripe, env: ENV });
  assert.equal(weird.status, 400);
  assert.equal(stripe.calls.create.length, 0);
  const unconfigured = await handleMapCheckout(checkoutRequest('oregon'), { stripe, env: {} });
  assert.equal(unconfigured.status, 500);
  assert.match((await unconfigured.json()).error, /STRIPE_SECRET_KEY/);
  assert.equal(stripe.calls.create.length, 0);
});

test('a valid state opens a Stripe Checkout session and a form post redirects there', async () => {
  const stripe = mockStripe(paidSession());
  const json = await handleMapCheckout(checkoutRequest('oregon'), { stripe, env: ENV });
  assert.equal(json.status, 200);
  const body = await json.json();
  assert.equal(body.url, `https://checkout.stripe.com/c/pay/${PAID_ID}`);
  const params = stripe.calls.create[0];
  assert.equal(params.mode, 'payment');
  assert.deepEqual(params.metadata, { state: 'oregon' });
  assert.equal(params.automatic_tax.enabled, false);
  assert.equal(params.line_items[0].price, PRICE);
  assert.match(params.success_url, /\{CHECKOUT_SESSION_ID\}$/);
  assert.match(params.cancel_url, /\/states\/oregon#map-book$/);

  const formStripe = mockStripe(paidSession());
  const form = await handleMapCheckout(checkoutRequest('oregon', { json: false }), { stripe: formStripe, env: ENV });
  assert.equal(form.status, 303);
  assert.equal(form.headers.get('location'), `https://checkout.stripe.com/c/pay/${PAID_ID}`);
  assert.equal(formStripe.calls.create[0].metadata.state, 'oregon');
});

test('download allows a paid session for 7 days and refuses anything else', () => {
  assert.equal(assessDownload(paidSession(), { now: NOW }).ok, true);
  const edge = assessDownload(paidSession({ created: Math.floor(NOW / 1000) - DOWNLOAD_WINDOW_MS / 1000 }), { now: NOW });
  assert.equal(edge.ok, true);
  const expired = assessDownload(paidSession({ created: Math.floor(NOW / 1000) - DOWNLOAD_WINDOW_MS / 1000 - 1 }), { now: NOW });
  assert.equal(expired.ok, false);
  assert.match(expired.error, /7 days/);
  for (const session of [
    paidSession({ payment_status: 'unpaid', status: 'open' }),
    paidSession({ payment_status: 'no_payment_required' }),
    paidSession({ mode: 'subscription' }),
    paidSession({ status: 'expired', payment_status: 'unpaid' }),
    paidSession({ metadata: {} }),
    paidSession({ metadata: { state: '../oregon' } }),
    paidSession({ metadata: { state: 'washington' } }),
    null,
  ]) {
    assert.equal(assessDownload(session, { now: NOW }).ok, false);
  }
  const later = assessDownload(paidSession(), {
    now: NOW,
    catalog: [{ ...bookBySlug('oregon'), available: false }],
  });
  assert.equal(later.ok, true);
  assert.equal(later.book.slug, 'oregon');
});

test('the download route redirects only after Stripe says the session is paid', async () => {
  const signed = 'https://store123.private.blob.vercel-storage.com/map-books/oregon.pdf?vercel-blob-signature=abc';
  const presignCalls = [];
  const presign = async ({ pathname }) => {
    presignCalls.push(pathname);
    return signed;
  };

  const unpaid = mockStripe(paidSession({ payment_status: 'unpaid', status: 'open' }));
  const denied = await handleMapDownload(downloadRequest(), { stripe: unpaid, env: ENV, presign, now: NOW });
  assert.equal(denied.status, 403);
  assert.equal(presignCalls.length, 0);
  assert.equal(unpaid.calls.retrieve[0], PAID_ID);
  assert.equal((await denied.text()).includes('blob.vercel-storage.com'), false);

  const paid = mockStripe(paidSession());
  const ok = await handleMapDownload(downloadRequest(), { stripe: paid, env: ENV, presign, now: NOW });
  assert.equal(ok.status, 302);
  assert.equal(await ok.text(), '');
  assert.equal(presignCalls[0], 'map-books/oregon.pdf');
  assert.equal(ok.headers.get('location'), `${signed}&download=1`);
  assert.equal(ok.headers.get('referrer-policy'), 'no-referrer');
  assert.match(ok.headers.get('cache-control'), /no-store/);

  const old = mockStripe(paidSession({ created: Math.floor(NOW / 1000) - DOWNLOAD_WINDOW_MS / 1000 - 5 }));
  const stale = await handleMapDownload(downloadRequest(), { stripe: old, env: ENV, presign, now: NOW });
  assert.equal(stale.status, 403);
  assert.equal(presignCalls.length, 1);

  const missing = new Error('nope');
  missing.statusCode = 404;
  missing.code = 'resource_missing';
  const lost = await handleMapDownload(downloadRequest(), { stripe: mockStripe(missing), env: ENV, presign, now: NOW });
  assert.equal(lost.status, 404);

  const ignored = mockStripe(paidSession());
  const bare = await handleMapDownload(downloadRequest('nope'), { stripe: ignored, env: ENV, presign, now: NOW });
  assert.equal(bare.status, 400);
  assert.equal(ignored.calls.retrieve.length, 0);
});

function nodeRequest({ method, url, headers = {}, body }) {
  return { method, url, headers, body };
}

test('Vercel Node invocation gets a Web Request and does not turn bad input into a 500', async () => {
  const checkoutFetch = checkoutApi.fetch || checkoutApi.default?.fetch;
  const downloadFetch = downloadApi.fetch || downloadApi.default?.fetch;
  assert.equal(typeof checkoutFetch, 'function');
  assert.equal(typeof downloadFetch, 'function');
  const nodeCheckout = nodeRequest({
    method: 'POST',
    url: '/api/maps/checkout',
    headers: { host: 'www.waterfallsnearyou.com', 'content-type': 'application/json', 'x-forwarded-proto': 'https' },
    body: JSON.stringify({ state: 'not-a-book' }),
  });
  assert.equal(typeof nodeCheckout.headers.get, 'undefined');
  assert.throws(() => new URL(nodeCheckout.url), TypeError);

  const unknown = await checkoutFetch(nodeCheckout);
  assert.equal(unknown.status, 404);

  const invalid = await checkoutFetch(nodeRequest({
    method: 'POST',
    url: '/api/maps/checkout',
    headers: { host: 'www.waterfallsnearyou.com', 'content-type': 'application/json' },
    body: '{',
  }));
  assert.equal(invalid.status, 400);

  const missingSession = await downloadFetch(nodeRequest({
    method: 'GET',
    url: '/api/maps/download',
    headers: { host: 'www.waterfallsnearyou.com', 'x-forwarded-proto': 'https' },
  }));
  assert.equal(missingSession.status, 400);

  const savedKey = process.env.STRIPE_SECRET_KEY;
  const savedPrice = process.env.STRIPE_MAP_PRICE_ID;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_MAP_PRICE_ID;
  try {
    const checkout = await checkoutFetch(nodeRequest({
      method: 'POST',
      url: '/api/maps/checkout',
      headers: { host: 'www.waterfallsnearyou.com', 'content-type': 'application/json', 'x-forwarded-host': 'www.waterfallsnearyou.com', 'x-forwarded-proto': 'https' },
      body: JSON.stringify({ state: 'oregon' }),
    }));
    assert.equal(checkout.status, 500);
    assert.match((await checkout.json()).error, /STRIPE_SECRET_KEY/);

    const download = await downloadFetch(nodeRequest({
      method: 'GET',
      url: `/api/maps/download?session_id=${PAID_ID}`,
      headers: { host: 'www.waterfallsnearyou.com' },
    }));
    assert.equal(download.status, 500);
    assert.match((await download.json()).error, /STRIPE_SECRET_KEY/);
  } finally {
    if (savedKey == null) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = savedKey;
    if (savedPrice == null) delete process.env.STRIPE_MAP_PRICE_ID;
    else process.env.STRIPE_MAP_PRICE_ID = savedPrice;
  }

  const unpaid = mockStripe(paidSession({ payment_status: 'unpaid', status: 'open' }));
  const denied = await handleMapDownload(nodeRequest({
    method: 'GET',
    url: `/api/maps/download?session_id=${PAID_ID}`,
    headers: { host: 'www.waterfallsnearyou.com', 'x-forwarded-proto': 'https' },
  }), { stripe: unpaid, env: ENV, presign: async () => { throw new Error('should not sign'); }, now: NOW });
  assert.equal(denied.status, 403);
  assert.equal(unpaid.calls.retrieve[0], PAID_ID);
});

test('a signed URL has to be a private map-book blob, and path overrides stay under map-books/', () => {
  assert.equal(isPrivateBlobUrl('https://store.private.blob.vercel-storage.com/map-books/oregon.pdf?download=1'), true);
  assert.equal(isPrivateBlobUrl('https://store.public.blob.vercel-storage.com/map-books/oregon.pdf'), false);
  assert.equal(isPrivateBlobUrl('https://evil.example/map-books/oregon.pdf'), false);
  assert.equal(isPrivateBlobUrl('http://store.private.blob.vercel-storage.com/map-books/oregon.pdf'), false);
  assert.equal(isPrivateBlobUrl('https://user:pass@store.private.blob.vercel-storage.com/map-books/oregon.pdf'), false);
  assert.equal(blobPathname('oregon', {}), 'map-books/oregon.pdf');
  assert.equal(blobPathname('oregon', { MAP_BOOK_BLOB_PATHS: '{"oregon":"map-books/oregon-copy.pdf"}' }), 'map-books/oregon-copy.pdf');
  assert.throws(() => blobPathname('oregon', { MAP_BOOK_BLOB_PATHS: '{"oregon":"https://evil.example/oregon.pdf"}' }));
  assert.throws(() => blobPathname('oregon', { MAP_BOOK_BLOB_PATHS: '{"oregon":"../secret.pdf"}' }));
  assert.throws(() => blobPathname('../oregon', {}));
});

test('the state page offers the book beside the map, and the thank-you page is not indexed', () => {
  const statePage = readFileSync('src/pages/states/[state].astro', 'utf8');
  const mapAt = statePage.indexOf('<StateWaterfallMap');
  const offerAt = statePage.indexOf('<MapBookOffer');
  assert.ok(mapAt > 0 && offerAt > mapAt);
  assert.match(statePage, /mapBook\?\.available && <MapBookOffer/);
  const thanks = readFileSync('src/pages/maps/thank-you.astro', 'utf8');
  assert.match(thanks, /noindex/);
  assert.match(thanks, /analytics=\{false\}/);
  assert.match(readFileSync('src/pages/robots.txt.ts', 'utf8'), /Disallow: \/maps\/thank-you/);
  assert.equal(isIndexable('/maps'), true);
  assert.equal(isIndexable('/maps/thank-you'), false);
  assert.equal(isIndexable('/states/oregon'), true);
  assert.equal(isIndexable('/'), true);
  const offer = readFileSync('src/components/MapBookOffer.astro', 'utf8');
  assert.match(offer, /Download the \$\{book\.name\} Waterfall Map Book/);
  assert.match(offer, />Download<\/button>/);
  assert.match(offer, /\{book\.pages\} pages and covers \{book\.falls\} falls/);
  assert.match(offer, /trail-scale area/);
  assert.match(offer, /trails, trailheads, parking, terrain and contours/);
  assert.match(offer, /ready to use offline/);
  assert.match(offer, /index with heights, hikes and GPS/);
  assert.match(offer, /previewPublicPath/);
  const listing = readFileSync('src/pages/[state]/[city]/[listing].astro', 'utf8');
  const mapHeading = listing.indexOf('id="map"');
  const ctaAt = listing.indexOf('<MapBookListingCta');
  assert.ok(mapHeading > 0 && ctaAt > mapHeading);
  const cta = readFileSync('src/components/MapBookListingCta.astro', 'utf8');
  assert.match(cta, /book\?\.available/);
  assert.match(cta, />Download map PDF<\/button>/);
  assert.match(cta, /book\.falls - 1/);
  assert.match(cta, /detailed trail maps/);
  assert.match(cta, /Printable/);
  assert.match(cta, /action="\/api\/maps\/checkout"/);
  for (const file of [offer, cta, readFileSync('src/pages/maps/index.astro', 'utf8'), readFileSync('src/pages/maps/thank-you.astro', 'utf8')]) {
    assert.equal(file.includes('2.99'), false);
    assert.equal(file.includes('MAP_BOOK_PRICE'), false);
    assert.doesNotMatch(file, /\$\d/);
  }
});
