import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vite.dev/config/
export default defineConfig({
  cacheDir: 'node_modules/.vite/rider',
  plugins: [react()],
  server: {
    port: 3003,
    host: true,
    open: process.env.HEADLESS !== 'true'
  }
})
