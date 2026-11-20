// Vercel Node.js function. Export the Web fetch handler so the runtime passes a
// Fetch Request. Signing the private Blob URL stays on Node.
// A Node IncomingMessage (plain headers, path-only url) is adapted in handleMapDownload.
import { handleMapDownload } from '../../src/lib/map-checkout.mjs';

export default {
  async fetch(request) {
    try {
      return await handleMapDownload(request);
    } catch (err) {
      console.error('map download crashed', err?.name || 'error');
      return Response.json({ error: 'The download is unavailable right now.' }, {
        status: 500,
        headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
      });
    }
  },
};
