import { requirePlus } from '../src/lib/plus/auth.mjs';
import { packetBlocks, textPdf } from '../src/lib/plus/pdf.mjs';
import { packetForList, packetForListing } from '../src/lib/plus/packet.mjs';
import { fail, HttpError } from '../src/lib/plus/http.mjs';

export async function GET(request) {
  try {
    const user = await requirePlus(request);
    const params = new URL(request.url).searchParams;
    const packet = params.get('list')
      ? await packetForList(user.id, params.get('list'))
      : params.get('listing')
        ? packetForListing(params.get('listing'))
        : null;
    if (!packet) throw new HttpError(400, 'Choose a waterfall or a list.');
    const pdf = textPdf(packet.title, packetBlocks(packet));
    return new Response(pdf, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="waterfall-packet.pdf"`,
        'cache-control': 'private, no-store',
        'x-robots-tag': 'noindex',
      },
    });
  } catch (err) {
    return fail(err);
  }
}
