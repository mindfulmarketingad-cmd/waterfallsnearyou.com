// Every blog post (written guides + programmatic lists) as one feed for the blog hub.
import { getPosts } from './blog.mjs';
import { getStateLists, getCapitalLists, getSmallest, getRoadside, LISTS_PUBLISHED } from './bestof.mjs';
import { getGuides, GUIDES_PUBLISHED } from './guides.mjs';

export const PER_PAGE = 24;
const KIND_ORDER = { capital: 0, best: 1, 'must-see': 2, beautiful: 3, 'most-visited': 4, hiking: 5 };
const mins = (n) => Math.max(3, Math.round((n * 80 + 450) / 230));

let feed = null;
export function getFeed() {
  if (feed) return feed;
  const guides = getPosts().map((p) => ({ title: p.title, url: p.url, description: p.description, date: p.date, minutes: p.minutes, order: 0 }));
  const national = [getRoadside(), getSmallest()].map((p) => ({ title: p.title, url: p.url, description: p.description, date: LISTS_PUBLISHED, minutes: mins(p.items.length), order: -1 }));
  const lists = [...getCapitalLists(), ...getStateLists()]
    .sort((a, b) => a.state.name.localeCompare(b.state.name) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
    .map((p, i) => ({ title: p.title, url: p.url, description: p.description, date: LISTS_PUBLISHED, minutes: mins(p.items.length), order: i + 1 }));
  const wguides = getGuides().map((g, i) => ({ title: g.title, url: g.url, description: g.description, date: GUIDES_PUBLISHED, minutes: g.minutes, order: i + 1 }));
  feed = [...wguides, ...national, ...lists, ...guides].sort((a, b) => b.date - a.date || a.order - b.order);
  return feed;
}
export const pageCount = () => Math.ceil(getFeed().length / PER_PAGE);
export const pageUrl = (n) => (n <= 1 ? '/blog' : `/blog/page/${n}`);
