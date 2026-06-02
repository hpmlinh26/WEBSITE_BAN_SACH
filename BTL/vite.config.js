import { defineConfig } from 'vite';
import { relative, resolve } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const root = import.meta.dirname;

const entryCss = {
  storefront: ['/src/css/tokens.css', '/src/css/style.css', '/src/css/auth-carousel.css', '/src/css/enhancements.css'],
  accounts: [
    '/src/css/tokens.css',
    '/src/css/style.css',
    '/src/css/auth-carousel.css',
    '/src/css/styles-cart.css',
    '/src/css/accounts.css',
    '/src/css/enhancements.css',
  ],
  admin: ['/src/css/tokens.css', '/src/css/admin.css', '/src/css/enhancements.css'],
  pay: ['/src/css/tokens.css', '/src/css/style.css', '/src/css/auth-carousel.css', '/src/css/pay.css', '/src/css/styles-cart.css', '/src/css/enhancements.css'],
  invoice: ['/src/css/tokens.css', '/src/css/enhancements.css'],
  'api-test': ['/src/css/tokens.css', '/src/css/enhancements.css'],
};

function injectEntryCss(html) {
  const cssFiles = Object.entries(entryCss).find(([entry]) => html.includes(`/src/js/entries/${entry}.js`))?.[1] || [];
  const links = cssFiles
    .filter((href) => !html.includes(`href="${href}"`))
    .map((href) => `  <link rel="stylesheet" href="${href}">`)
    .join('\n');

  return links ? html.replace('</head>', `${links}\n</head>`) : html;
}

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
        return injectEntryCss(html.replace(/<!--\s*@partial:([\w-]+)\s*-->/g, (_, name) => read(name)));
      },
    },
  };
}

function collectHtmlFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
  });
}

// Multi-page app: trang chu o root, cac trang con nam trong pages/.
const htmlFiles = [resolve(root, 'index.html'), ...collectHtmlFiles(resolve(root, 'pages'))];
const htmlEntries = Object.fromEntries(
  htmlFiles.map((file) => [relative(root, file).replace(/\\/g, '/').replace(/\.html$/, ''), file])
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
