# Passwala Portals - Production Deployment Guide

This document provides deployment instructions for all 4 Next.js TypeScript portals:
- **Buyer Portal** (`next-frontend`)
- **Vendor Portal** (`next-vendor`)
- **Rider Portal** (`next-rider`)
- **SuperAdmin Portal** (`next-admin`)

---

## 1. Quick Build Verification

All four applications have been verified to compile and generate production bundles with **0 errors**.

You can build all four portals at once from the root directory:
```bash
npm run build:next:all
```

Or individually:
```bash
# Buyer Portal (Port 3001)
npm run build:frontend:next

# Vendor Portal (Port 3002)
npm run build:vendor:next

# Rider Portal (Port 3003)
npm run build:rider:next

# SuperAdmin Portal (Port 3005)
npm run build:admin:next
```

---

## 2. Environment Variables Checklist

Ensure these variables are set in your hosting provider (Vercel, Cloud Run, VPS `.env.production`):

### A. Buyer App (`next-frontend/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.passwala.com
PORT=3001
```

### B. Vendor Portal (`next-vendor/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.passwala.com
PORT=3002
```

### C. Rider Portal (`next-rider/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.passwala.com
PORT=3003
```

### D. SuperAdmin Portal (`next-admin/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.passwala.com
PORT=3005
```

---

## 3. Deployment Methods

### Option A: Vercel (Recommended for Next.js)

Deploy each portal as an independent project from the same repository:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New Project**.
2. Select the `passwala` repository.
3. Configure the **Root Directory** for each application:
   - Project 1 (`passwala.com`): Set Root Directory to `next-frontend`
   - Project 2 (`vendor.passwala.com`): Set Root Directory to `next-vendor`
   - Project 3 (`rider.passwala.com`): Set Root Directory to `next-rider`
   - Project 4 (`admin.passwala.com`): Set Root Directory to `next-admin`
4. Add the respective environment variables and click **Deploy**.

---

### Option B: PM2 on a VPS / Cloud VM (Ubuntu / Debian / EC2)

1. Clone repository and install dependencies:
   ```bash
   git clone https://github.com/passwala/passwala.git
   cd passwala
   npm install
   cd next-frontend && npm install && cd ..
   cd next-vendor && npm install && cd ..
   cd next-rider && npm install && cd ..
   cd next-admin && npm install && cd ..
   ```

2. Build all portals:
   ```bash
   npm run build:next:all
   ```

3. Start all services using PM2:
   ```bash
   npm install -g pm2
   pm2 start "npm run start:frontend:next" --name "buyer-portal"
   pm2 start "npm run start:vendor:next" --name "vendor-portal"
   pm2 start "npm run start:rider:next" --name "rider-portal"
   pm2 start "npm run start:admin:next" --name "admin-portal"
   pm2 start "npm run server" --name "express-backend"
   pm2 save
   pm2 startup
   ```

---

### Option C: Docker / Google Cloud Run

To containerize any portal, use a standard standalone Dockerfile:

```dockerfile
FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```
