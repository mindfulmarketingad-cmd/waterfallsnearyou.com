import { issueMagicLink } from '../../src/lib/plus/auth.mjs';
import { sendMagicLink } from '../../src/lib/plus/email.mjs';
import { assertSameOrigin, fail, json, readJson, safeNext } from '../../src/lib/plus/http.mjs';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return json({ error: 'Enter a valid email.' }, { status: 400 });
    }
    const { token } = await issueMagicLink(email, safeNext(body.next));
    await sendMagicLink({ email, token });
    return json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
