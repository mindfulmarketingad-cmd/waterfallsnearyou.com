import { refreshCookies, requirePlus } from '../src/lib/plus/auth.mjs';
import { listingByUrl } from '../src/lib/plus/catalog.mjs';
import { reportFor } from '../src/lib/plus/jobs.mjs';
import { fail, HttpError, json } from '../src/lib/plus/http.mjs';

export async function GET(request) {
  try {
    const user = await requirePlus(request);
    const url = new URL(request.url).searchParams.get('listing') || '';
    const listing = listingByUrl(url);
    if (!listing) throw new HttpError(404, 'That waterfall is not in the directory.');
    const report = await reportFor(listing);
    return json(report, { cookies: await refreshCookies(request, user) });
  } catch (err) {
    return fail(err);
  }
}
