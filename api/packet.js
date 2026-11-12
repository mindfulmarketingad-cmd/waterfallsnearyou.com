import { requirePlus } from '../src/lib/plus/auth.mjs';
import { packetForList, packetForListing } from '../src/lib/plus/packet.mjs';
import { fail, HttpError, json } from '../src/lib/plus/http.mjs';

export async function GET(request) {
  try {
    const user = await requirePlus(request);
    const params = new URL(request.url).searchParams;
    const listing = params.get('listing');
    const listId = params.get('list');
    if (listing) return json(packetForListing(listing));
    if (listId) return json(await packetForList(user.id, listId));
    throw new HttpError(400, 'Choose a waterfall or a list.');
  } catch (err) {
    return fail(err);
  }
}
