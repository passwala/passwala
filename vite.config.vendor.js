import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  cacheDir: 'node_modules/.vite/vendor',
  plugins: [react()],
  server: {
    port: 3002,
    host: true,
  }
})
