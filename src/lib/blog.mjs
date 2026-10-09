import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { marked } from 'marked';

const DIR = path.join(process.cwd(), 'src/content/blog');
let posts = null;

const slugId = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function getPosts() {
  if (posts) return posts;
  posts = readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(path.join(DIR, file), 'utf8');
      const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
      const data = YAML.parse(m[1]);
      const body = m[2];
      const headings = [];
      const renderer = new marked.Renderer();
      renderer.heading = function ({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const id = slugId(text);
        if (depth === 2) headings.push({ id, text: text.replace(/<[^>]+>/g, '') });
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      };
      renderer.link = function ({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        return `<a href="${href}"${title ? ` title="${title}"` : ''}${external ? ' rel="noopener" target="_blank"' : ''}>${text}</a>`;
      };
      const html = marked.parse(body, { renderer, gfm: true });
      const words = body.split(/\s+/).filter(Boolean).length;
      const links = [...new Set([...body.matchAll(/\]\((\/[^)#\s]*)/g)].map((m) => m[1].replace(/\/$/, '')))];
      const slug = file.replace(/\.md$/, '');
      const date = data.pubDate instanceof Date ? data.pubDate : new Date(data.pubDate);
      return {
        slug,
        url: `/blog/${slug}`,
        title: data.title,
        description: data.description,
        category: data.category,
        imageAlt: data.imageAlt,
        faqs: data.faqs || [],
        date,
        updated: data.updatedDate ? new Date(data.updatedDate) : date,
        html,
        links,
        headings,
        words,
        minutes: Math.max(1, Math.round(words / 230)),
      };
    })
    .sort((a, b) => b.date - a.date);
  return posts;
}

/** Editorial articles that link to `url` in their body, so the target page can link back. */
export const postsLinkingTo = (url) => getPosts().filter((p) => p.links.includes(url));
