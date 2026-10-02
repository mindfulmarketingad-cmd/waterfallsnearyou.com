import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://waterfallsnearyou.com',
  trailingSlash: 'never',
  build: { format: 'directory', inlineStylesheets: 'auto', concurrency: 4 },
  compressHTML: true,
  devToolbar: { enabled: false },
});
