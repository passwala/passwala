import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isWeb = mode === 'web';
  const isWebapp = mode === 'webapp';
  const isVendor = mode === 'vendor';
  const isRider = mode === 'rider';
  const isAdmin = mode === 'admin';

  const port = isWeb ? 3000 : 
               isWebapp ? 3001 : 
               isVendor ? 3002 : 
               isRider ? 3003 : 
               isAdmin ? 3005 : 3000;

  const outDir = isWeb ? 'dist/web' : 
                 isWebapp ? 'dist/webapp' : 
                 isVendor ? 'dist/vendor' : 
                 isRider ? 'dist/rider' : 
                 isAdmin ? 'dist/admin' : 'dist';

  return {
    plugins: [react()],
    cacheDir: `node_modules/.vite/${mode || 'default'}`,
    server: {
      port,
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
    },
    build: {
      outDir,
      emptyOutDir: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
  }
})
