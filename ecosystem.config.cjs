/**
 * Passwala PM2 Ecosystem Configuration
 * Runs all 4 Next.js portals and the Express backend concurrently in production.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'passwala-backend',
      script: 'server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    {
      name: 'passwala-buyer',
      cwd: './next-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3004'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '600M'
    },
    {
      name: 'passwala-vendor',
      cwd: './next-vendor',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3004'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '600M'
    },
    {
      name: 'passwala-rider',
      cwd: './next-rider',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3003',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3004'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    {
      name: 'passwala-admin',
      cwd: './next-admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3004'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '600M'
    }
  ]
};
