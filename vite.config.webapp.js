import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: 'node_modules/.vite/webapp',
  plugins: [react()],
  server: {
    port: 3011,
    host: '0.0.0.0',
    cors: true,
    strictPort: true,
    allowedHosts: true,
    open: process.env.HEADLESS !== 'true',
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true
      }
    }
  }
})
