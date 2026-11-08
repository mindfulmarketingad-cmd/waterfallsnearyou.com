import { requirePlus } from '../../src/lib/plus/auth.mjs';
import { saveListing } from '../../src/lib/plus/lists.mjs';
import { assertSameOrigin, fail, json, readJson } from '../../src/lib/plus/http.mjs';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requirePlus(request);
    const body = await readJson(request);
    const listing = await saveListing(user.id, body.listing);
    return json({ ok: true, url: listing.url, name: listing.name });
  } catch (err) {
    return fail(err);
  }
}
