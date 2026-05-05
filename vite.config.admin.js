import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  cacheDir: 'node_modules/.vite_admin', // Isolated cache
  server: {
    port: 3005,
    host: true,
  },
  build: {
    outDir: 'dist/admin',
    emptyOutDir: true
  }
});
