import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  }
});
