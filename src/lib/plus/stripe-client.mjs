import Stripe from 'stripe';
import { randomBytes } from 'node:crypto';
import { HttpError } from './http.mjs';

let client;

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, 'Stripe is not configured.');
  if (!client) client = new Stripe(key, { apiVersion: '2026-10-28.endive' });
  return client;
}

export function integrationIdentifier() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const bytes = randomBytes(8);
  let suffix = '';
  for (let i = 0; i < 8; i++) suffix += alphabet[bytes[i] % 26];
  return `waterfalls_plus_${suffix}`;
}

export function priceIdFor(interval) {
  if (interval === 'month') {
    const id = process.env.STRIPE_PRICE_ID_MONTHLY;
    if (!id) throw new HttpError(400, 'Monthly billing is not configured.');
    return id;
  }
  const id = process.env.STRIPE_PRICE_ID;
  if (!id) throw new HttpError(503, 'STRIPE_PRICE_ID is not configured.');
  return id;
}
