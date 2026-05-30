import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const root = import.meta.dirname;

// Multi-page app: moi file *.html o thu muc goc la mot entry rieng.
const htmlEntries = Object.fromEntries(
  readdirSync(root)
    .filter((file) => file.endsWith('.html'))
    .map((file) => [file.replace(/\.html$/, ''), resolve(root, file)])
);

export default defineConfig({
  root,
  publicDir: 'public',
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
