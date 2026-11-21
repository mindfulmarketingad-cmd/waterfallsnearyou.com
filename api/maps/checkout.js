// Vercel Node.js function. Export the Web fetch handler so the runtime passes a
// Fetch Request. The Stripe SDK stays on Node; this file does not use the Edge runtime.
// A Node IncomingMessage (plain headers, path-only url) is adapted in handleMapCheckout.
import { handleMapCheckout } from '../../src/lib/map-checkout.mjs';

export default {
  async fetch(request) {
    try {
      return await handleMapCheckout(request);
    } catch (err) {
      console.error('map checkout crashed', err?.name || 'error');
      return Response.json({ error: 'Checkout is unavailable right now.' }, {
        status: 500,
        headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
      });
    }
  },
};
