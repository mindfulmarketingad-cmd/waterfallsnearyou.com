// 301s for directory URLs we no longer build: thin waterfall and town pages, empty /partners
// stubs, templated "guide before visiting" posts, and near-duplicate /find city lists.
// vercel.json rewrites only the paths that are not real files, so published pages are untouched.
import map from '../data/thin-redirects.json' with { type: 'json' };

export const config = { runtime: 'edge' };

const clean = (path) => {
  const p = `/${String(path || '').replace(/^\/+/, '')}`.replace(/\/+$/, '');
  return p === '/' ? '' : p;
};

export default function handler(request) {
  const url = new URL(request.url);
  const parts = ['a', 'b', 'c', 'd'].map((k) => url.searchParams.get(k)).filter((v) => v && !v.includes('/'));
  const fromQuery = url.searchParams.get('path');
  const path = clean(fromQuery || parts.join('/'));
  const dest = path && map[path];
  if (!dest || dest.split('#')[0] === path) {
    return new Response(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Page not found | WaterfallsNearYou</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui,sans-serif;padding:2rem"><h1>Page not found</h1><p><a href="/">WaterfallsNearYou</a> · <a href="/states">Browse by state</a> · <a href="/search">Search</a></p></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } },
    );
  }
  const location = new URL(dest, url.origin);
  return new Response(null, {
    status: 301,
    headers: {
      Location: `${location.pathname}${location.search}${location.hash}`,
      'Cache-Control': 'public, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
