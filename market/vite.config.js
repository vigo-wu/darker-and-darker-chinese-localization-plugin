import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ command }) => ({
  root: rootDir,
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@locales': path.resolve(rootDir, '../src/locales'),
      '@shared': path.resolve(rootDir, '../src/shared'),
    },
  },
  build: {
    outDir: path.resolve(rootDir, '../src/market'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(rootDir, 'index.html'),
    },
  },
  server: {
    port: 3011,
    proxy: {
      '/api': {
        target: 'https://api.darkerdb.com',
        changeOrigin: true,
        rewrite: (proxyPath) => proxyPath.replace(/^\/api/, ''),
      },
    },
  },
}));
