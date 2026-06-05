import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: '0.0.0.0',
  },
});
