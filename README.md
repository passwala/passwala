# Passwala - Smart Local Economy Platform 🏙️🌌

Passwala is a high-fidelity, community-driven marketplace designed for modern urban neighborhoods (Starting with Satellite, Ahmedabad). It connects neighbors with verified experts, daily essentials, and exclusive local deals through an AI-powered, premium Orange & White interface.

---

## 🚀 Getting Started

Follow these steps to download, install, and run the Passwala platform on your local machine.

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Git](https://git-scm.com/)
- [npm](https://www.npmjs.com/) (included with Node.js)

### 2. Clone the Repository
```bash
git clone https://github.com/passwala/passwala.git
cd passwala
```

### 3. Install Dependencies
Install all required frontend and backend packages:
```bash
npm install
```

### 4. Environment Configuration
Create a `.env` file in the root directory and add your Supabase & Firebase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Database Setup (Supabase)
To synchronize with the cloud architecture:
1. Go to your [Supabase Dashboard](https://supabase.com/).
2. Open the **SQL Editor**.
3. Copy and run the contents of `supabase_schema.sql` to initialize tables.
4. Copy and run the contents of `supabase_security_fix.sql` to apply the latest Row Level Security (RLS) policies.

---

## 🖥️ Running the Application

Passwala is highly modular and split into 4 independent micro-frontends.

### Run Everything at Once
The easiest way to start developing is to launch all portals simultaneously:
```bash
npm run dev:all
# or
npm run dev:headless # Runs all apps without force-opening browser tabs
```

### Run Individual Portals
You can run specific portals individually on their dedicated ports:
- **Customer Web Site** (`http://localhost:3000`): `npm run dev:web`
- **SuperAdmin Webapp** (`http://localhost:3001`): `npm run dev:webapp`
- **Vendor Portal** (`http://localhost:3002`): `npm run dev:vendor`
- **Rider Portal** (`http://localhost:3003`): `npm run dev:rider`

**Backend Service:** `npm run server`

---

## 🚀 Deployment (Render.com)

To deploy Passwala to production on Render, follow these settings:

### 1. Backend (Web Service) 🛠️
Connect your GitHub repo and use these settings in the Render Dashboard:
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run server`
- **Environment Variables**: Add your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### 2. Frontends (Static Sites) 🌐
Create separate **Static Sites** on Render for each portal, substituting the specific config file needed:
- **Build Command**: e.g., `npm run build` (Ensure `vite.config.js` directs to the correct build config for that site, or modify the build script)
- **Publish Directory**: `dist`
- **Environment Variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## 💎 Features & Tech Stack

- **Core**: React 19 + Vite (Fast Refreshes, Multi-App Config)
- **Styling**: Vanilla CSS (Premium Orange & White "Clean Elegant" Design)
- **Backend / DB**: Supabase (PostgreSQL + RLS) + Firebase Auth Integration
- **State App Suites**: 
   - **Customer Web:** Neighborhood product & service discovery native UI.
   - **Vendor Portal:** Real-time dashboard for merchants, seamless onboarding pipelines, and digital profile management.
   - **Rider Portal:** Navigation, earnings dashboard, and delivery flow optimizations for logistic partners.
   - **Admin Webapp:** Core administrative CRM, data review, and full ecosystem management.

---

## 🏙️ Neighborhood Context
Passwala is specifically optimized for localized contexts, currently featuring high-fidelity data and services for the **Satellite / Ahmedabad** region.

## 📄 License
Custom proprietary license - for community development use only.
