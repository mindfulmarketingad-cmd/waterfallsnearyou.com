// Vercel Node function. The rest of the site stays static.
// POST { state } -> Stripe Checkout Session (payment mode, one shared Price).
import { handleMapCheckout } from '../../src/lib/map-checkout.mjs';

export default function handler(request) {
  return handleMapCheckout(request);
}
