// Vercel Node function. Confirms the Checkout Session is paid, then redirects
// to a five-minute signed URL for the private Blob PDF. The PDF is not streamed.
//
// Storage: private Vercel Blob at map-books/<slug>.pdf (override with
// MAP_BOOK_BLOB_PATHS). Access uses issueSignedToken + presignUrl from
// @vercel/blob, operation "get", access "private".
import { handleMapDownload } from '../../src/lib/map-checkout.mjs';

export default function handler(request) {
  return handleMapDownload(request);
}
