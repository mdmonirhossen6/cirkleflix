import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // during `npm run dev:web`, API calls go to the local Node server
    proxy: { '/api': 'http://localhost:4000' },
  },
});
