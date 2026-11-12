import { requirePlus } from '../src/lib/plus/auth.mjs';
import { createList, deleteList, listsForUser } from '../src/lib/plus/lists.mjs';
import { assertSameOrigin, fail, json, readJson } from '../src/lib/plus/http.mjs';

export async function GET(request) {
  try {
    const user = await requirePlus(request);
    return json(await listsForUser(user.id));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requirePlus(request);
    const body = await readJson(request);
    if (body.remove && body.id) {
      await deleteList(user.id, body.id);
      return json({ ok: true });
    }
    const list = await createList(user.id, body.name);
    return json({ id: list.id, name: list.name });
  } catch (err) {
    return fail(err);
  }
}
