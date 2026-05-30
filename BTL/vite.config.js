import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

const root = import.meta.dirname;

// Plugin nho: chen partial HTML dung chung (header/footer/newsletter) luc build & dev.
// Cu phap trong HTML: <!-- @partial:header -->  -> noi dung src/partials/header.html
function htmlPartials() {
  const cache = {};
  const read = (name) =>
    (cache[name] ??= readFileSync(resolve(root, 'src/partials', `${name}.html`), 'utf8').trim());
  return {
    name: 'mot-html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<!--\s*@partial:([\w-]+)\s*-->/g, (_, name) => read(name));
      },
    },
  };
}

// Multi-page app: moi file *.html o thu muc goc la mot entry rieng.
const htmlEntries = Object.fromEntries(
  readdirSync(root)
    .filter((file) => file.endsWith('.html'))
    .map((file) => [file.replace(/\.html$/, ''), resolve(root, file)])
);

export default defineConfig({
  root,
  publicDir: 'public',
  plugins: [htmlPartials()],
  server: {
    port: 5173,
    // Khi dev, chuyen tiep moi request /api sang backend Express dang chay o cong 3000.
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: htmlEntries
    }
  }
});
