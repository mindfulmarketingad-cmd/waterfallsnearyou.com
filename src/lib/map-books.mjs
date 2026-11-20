// Catalog of paid, printable state map books. Public facts only: no blob URLs,
// no tokens. PDFs live in a private Vercel Blob store and are reached through
// api/maps/download.js after Stripe confirms payment.
import { existsSync } from 'node:fs';
import path from 'node:path';
import catalog from '../data/map-books.json' with { type: 'json' };

export const MAP_BOOK_PRICE_CENTS = 299;
export const MAP_BOOK_PRICE_LABEL = '$2.99';
export const DOWNLOAD_WINDOW_DAYS = 7;
export const DOWNLOAD_WINDOW_MS = DOWNLOAD_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PATHNAME = /^map-books\/[a-z0-9]+(?:-[a-z0-9]+)*\.pdf$/;

function fail(slug, message) {
  throw new Error(`map-books.json${slug ? ` (${slug})` : ''}: ${message}`);
}

function validateBook(book) {
  if (!book || typeof book !== 'object') fail('', 'each book must be an object');
  const slug = book.slug;
  if (typeof slug !== 'string' || !SLUG.test(slug)) fail(String(slug), 'slug must be lowercase words separated by hyphens');
  if (typeof book.name !== 'string' || book.name.length < 2 || book.name.length > 60 || /[<>&]/.test(book.name)) {
    fail(slug, 'name is missing or has unexpected characters');
  }
  for (const key of ['pages', 'falls', 'areaMaps']) {
    if (!Number.isInteger(book[key]) || book[key] < 1) fail(slug, `${key} must be a positive integer`);
  }
  if (book.sizeMB != null && (typeof book.sizeMB !== 'number' || !Number.isFinite(book.sizeMB) || book.sizeMB <= 0 || book.sizeMB > 100)) {
    fail(slug, 'sizeMB must be null or a positive number of megabytes');
  }
  if (typeof book.available !== 'boolean') fail(slug, 'available must be true or false');
  if (book.featuredPage != null && (typeof book.featuredPage !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 .'-]{0,80}$/.test(book.featuredPage))) {
    fail(slug, 'featuredPage has unexpected characters');
  }
  return Object.freeze({
    slug,
    name: book.name,
    pages: book.pages,
    falls: book.falls,
    areaMaps: book.areaMaps,
    featuredPage: book.featuredPage || null,
    sizeMB: book.sizeMB ?? null,
    available: book.available,
  });
}

function validate(raw) {
  if (!raw || !Array.isArray(raw.books)) fail('', 'needs a books array');
  const books = raw.books.map(validateBook);
  const slugs = new Set(books.map((b) => b.slug));
  if (slugs.size !== books.length) fail('', 'duplicate slug');
  return Object.freeze(books);
}

const books = validate(catalog);

export function loadMapBooks() {
  return books;
}

export function availableMapBooks() {
  return books.filter((book) => book.available);
}

export function bookBySlug(slug) {
  return books.find((book) => book.slug === slug) || null;
}

// Sale gate. Unknown and unavailable slugs are rejected before Stripe is called.
export function bookForCheckout(state, list = books) {
  if (typeof state !== 'string' || !SLUG.test(state)) {
    return { ok: false, status: 400, error: 'Choose a state map book.' };
  }
  const book = list.find((item) => item.slug === state);
  if (!book || book.available !== true) {
    return { ok: false, status: 404, error: 'That map book is not for sale.' };
  }
  return { ok: true, book };
}

// A paid Checkout Session can be downloaded again for 7 days, even if the book
// is later marked unavailable. The slug still has to be one we know.
export function assessDownload(session, { now = Date.now(), catalog: list = books, windowMs = DOWNLOAD_WINDOW_MS } = {}) {
  if (!session || session.payment_status !== 'paid' || session.mode !== 'payment' || session.status !== 'complete') {
    return { ok: false, status: 403, error: 'Payment is not complete.' };
  }
  const slug = session.metadata?.state;
  if (typeof slug !== 'string' || !SLUG.test(slug)) {
    return { ok: false, status: 403, error: 'This payment does not include a map book.' };
  }
  const book = list.find((item) => item.slug === slug);
  if (!book) return { ok: false, status: 404, error: 'That map book is not on file.' };
  const created = Number(session.created);
  if (!Number.isFinite(created)) return { ok: false, status: 403, error: 'Payment is not complete.' };
  const createdMs = created * 1000;
  if (now + 60_000 < createdMs || now - createdMs > windowMs) {
    return { ok: false, status: 403, error: 'This download link has expired. It works for 7 days after checkout.' };
  }
  return { ok: true, book };
}

// Private-blob pathname. Predictable on purpose: the store is not public, and
// the download route only redirects to a short-lived signed URL.
export function blobPathname(slug, env = process.env) {
  if (typeof slug !== 'string' || !SLUG.test(slug)) throw new Error('Invalid map book slug');
  const raw = env?.MAP_BOOK_BLOB_PATHS;
  if (raw == null || raw === '') return `map-books/${slug}.pdf`;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('MAP_BOOK_BLOB_PATHS is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('MAP_BOOK_BLOB_PATHS must be an object');
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, slug)) return `map-books/${slug}.pdf`;
  const pathname = parsed[slug];
  if (typeof pathname !== 'string' || !PATHNAME.test(pathname)) {
    throw new Error('MAP_BOOK_BLOB_PATHS has an invalid pathname');
  }
  return pathname;
}

export function formatSizeMB(sizeMB) {
  if (typeof sizeMB !== 'number' || !Number.isFinite(sizeMB) || sizeMB <= 0) return null;
  const rounded = Math.round(sizeMB * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `About ${text} MB`;
}

// public/images/maps/<slug>-preview.webp is optional. Missing files are not an error.
export function previewPublicPath(slug) {
  if (typeof slug !== 'string' || !SLUG.test(slug)) return null;
  const filename = `${slug}-preview.webp`;
  const abs = path.join(process.cwd(), 'public', 'images', 'maps', filename);
  return existsSync(abs) ? `/images/maps/${filename}` : null;
}

export function checkoutParams({ book, origin, priceId }) {
  return {
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { state: book.slug },
    success_url: `${origin}/maps/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/states/${book.slug}#map-book`,
    automatic_tax: { enabled: false },
    // No Customer is attached, so Stripe Checkout asks for an email and keeps it for the receipt.
    customer_creation: 'always',
  };
}

const PRODUCTION_HOSTS = new Set(['www.waterfallsnearyou.com', 'waterfallsnearyou.com']);

function hostParts(value) {
  if (!value || typeof value !== 'string') return null;
  const raw = value.split(',')[0].trim().toLowerCase();
  if (!raw || raw.includes('/') || raw.includes('@')) return null;
  const hostname = raw.replace(/:\d+$/, '');
  const port = raw.slice(hostname.length);
  if (!/^[a-z0-9.-]+$/.test(hostname)) return null;
  if (port && !/^:\d{1,5}$/.test(port)) return null;
  return { hostname, port };
}

function trustedOrigin(parts, proto) {
  if (!parts) return null;
  const { hostname, port } = parts;
  if (PRODUCTION_HOSTS.has(hostname)) return `https://${hostname}`;
  const local = hostname === 'localhost' || hostname === '127.0.0.1';
  const preview = hostname.endsWith('.vercel.app') && hostname.length > '.vercel.app'.length;
  if (!local && !preview) return null;
  const scheme = local && proto === 'http' ? 'http' : 'https';
  return `${scheme}://${hostname}${local ? port : ''}`;
}

// Prefer the public site host. Ignore a forwarded host that is not ours, so
// success_url and cancel_url cannot be pointed at another site.
export function publicOrigin(request) {
  const url = new URL(request.url);
  const forwarded = trustedOrigin(hostParts(request.headers.get('x-forwarded-host')), 'https');
  if (forwarded === 'https://www.waterfallsnearyou.com' || forwarded === 'https://waterfallsnearyou.com') return forwarded;
  const fromUrl = trustedOrigin(hostParts(url.host), url.protocol.replace(':', ''));
  if (fromUrl) return fromUrl;
  const fromHost = trustedOrigin(hostParts(request.headers.get('host')), url.protocol.replace(':', ''));
  if (fromHost) return fromHost;
  return 'https://www.waterfallsnearyou.com';
}

export function isPrivateBlobUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  if (!url.hostname.endsWith('.private.blob.vercel-storage.com')) return false;
  if (!url.pathname.startsWith('/map-books/') || !url.pathname.endsWith('.pdf') || url.pathname.includes('..')) return false;
  return true;
}
