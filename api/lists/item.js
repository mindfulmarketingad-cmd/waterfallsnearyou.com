import { requirePlus } from '../../src/lib/plus/auth.mjs';
import { addToList, removeFromList } from '../../src/lib/plus/lists.mjs';
import { assertSameOrigin, fail, json, readJson } from '../../src/lib/plus/http.mjs';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requirePlus(request);
    const body = await readJson(request);
    if (body.remove) {
      await removeFromList(user.id, body.listId, body.listing);
      return json({ ok: true });
    }
    const listing = await addToList(user.id, body.listId, body.listing, body.day ?? null);
    return json({ ok: true, url: listing.url });
  } catch (err) {
    return fail(err);
  }
}
