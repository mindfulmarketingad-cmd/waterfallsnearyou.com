import { requirePlus } from '../../src/lib/plus/auth.mjs';
import { shareList, sharedList } from '../../src/lib/plus/lists.mjs';
import { assertSameOrigin, canonicalOrigin, fail, json, readJson } from '../../src/lib/plus/http.mjs';

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token') || '';
    return json(await sharedList(token));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requirePlus(request);
    const body = await readJson(request);
    const token = await shareList(user.id, body.listId);
    const origin = new URL(request.url).origin || canonicalOrigin();
    return json({ token, url: `${origin}/plus/share?token=${encodeURIComponent(token)}` });
  } catch (err) {
    return fail(err);
  }
}
