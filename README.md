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
# Frontend Variables
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend Variables (Required for Node.js server)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_ACCESS_CODE=your_secure_admin_password
```

### 5. Database Setup (Supabase)
To initialize your cloud database:
1. Go to your [Supabase Dashboard](https://supabase.com/).
2. Open the **SQL Editor** and create a **New Query**.
3. Copy and run the entire contents of `database/schema/supabase_schema.sql` to build the core tables and relationships.
4. Next, copy and run `database/schema/chat_and_payments_setup.sql` to add real-time chat threads, relational messages, and custom payment tracking fields to the orders table.
5. Finally, run `database/schema/service_areas_setup.sql` to initialize neighbor area validation tables and insert the pre-defined Ahmedabad societies.

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

## 📲 Testing on a Physical Mobile Phone (Same Wi-Fi Network with Firebase Auth)

If you load the app on your phone using your laptop's local IP (e.g. `http://192.168.120.160:3001`), **Firebase Authentication will fail** (you won't be able to login, receive OTPs, or sync Google).

This is a strict security restriction from Firebase:
1. Firebase Auth **only allows** authentication on secure domains listed in your Firebase Console.
2. Local IP addresses (like `192.168.x.x`) **cannot** be added to Firebase's Authorized Domains list.

Here are the **two official ways** to test and login successfully on a real phone:

### Method A: USB Port Forwarding (Recommended & Easiest)
This allows your phone's browser to access your app via `http://localhost:3001`. Since it uses the `localhost` domain, Firebase allows it to run perfectly without any configuration!

1. Connect your Android phone to your laptop using a USB cable.
2. Turn on **USB Debugging** on your phone (found in Settings > Developer Options).
3. Open Google Chrome on your **laptop** and navigate to: `chrome://inspect/#devices`
4. Click the **Port forwarding...** button on the page.
5. Add the following rules in the list:
   - Port: `3001` -> IP/Port: `localhost:3001` (Frontend app)
   - Port: `3004` -> IP/Port: `localhost:3004` (Backend API)
6. Check **"Enable port forwarding"** and click **Done**.
7. Now, open Google Chrome on your **phone** and go to:
   👉 **`http://localhost:3001`**
8. That's it! Your phone will load the app instantly, and Firebase Auth, Google Sync, and OTP logins will work 100% perfectly!

---

### Method B: HTTPS Tunnel (For Wireless Testing)
If you prefer testing without a USB cable, you can use a secure tunnel:

1. Create a secure HTTPS tunnel to your local frontend port:
   ```bash
   npx localtunnel --port 3001
   ```
2. Copy the generated HTTPS URL (e.g., `https://glowing-star.localtunnel.me`).
3. Open your [Firebase Console](https://console.firebase.google.com/).
4. Go to **Authentication** > **Settings** (tab) > **Authorized domains**.
5. Click **Add domain** and paste your tunnel domain (e.g., `glowing-star.localtunnel.me`).
6. Open that HTTPS URL on your phone's browser, and it will run and authenticate perfectly!

---

## 📱 Running Across Different Networks (e.g., Mobile Data)

If you are running the frontend/backend on your laptop and want to access it from a mobile device that is **not on the same Wi-Fi network** (for example, on mobile data or remote networks), follow these simple steps to tunnel your local servers securely to the internet.

### 1. Tunnel your Backend Server (Port 3004)
Run this command in a new terminal window to expose your local Express server to a public URL:
```bash
npx localtunnel --port 3004
```
This will give you a public URL like `https://funny-sheep-sing.localtunnel.me`.

### 2. Configure Frontend Environment Variables
In your `.env` file in the root directory, specify this public URL as the backend endpoint:
```env
# Point your frontends to your public backend tunnel
VITE_API_URL=https://funny-sheep-sing.localtunnel.me
```

### 3. Tunnel your Frontend App (e.g., Buyer Webapp on Port 3001)
To access the Buyer Webapp on your phone from a different network, run a second tunnel for the frontend port:
```bash
npx localtunnel --port 3001
```
Open the generated public URL (e.g., `https://green-lion-jump.localtunnel.me`) in your mobile web browser.

Now your mobile phone can load the app and communicate perfectly with your laptop's backend server, even when connected to completely different networks (such as 4G/5G mobile data)!

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

## ✨ Recent Technical Enhancements

The platform has recently undergone a major round of stabilization and feature expansions:

### 📦 Retail Inventory & Barcode Expansion
- **Multi-Format Barcodes**: Integrated native dropdown selectors in the vendor dashboard to support industry-standard barcode variations: `EAN-13`, `UPCA-2`, `UPC-A`, and `EAN-8`.
- **Database Schema Sync**: Bound the state directly to the Supabase database model, mapping inputs automatically to `barcode`, `barcode_type`, and `stock_quantity`.
- **State Preservation**: Guaranteed full catalog synchrony across local React states, browser storage, and PostgreSQL instances.

### 🛡️ Core Stabilization & Data Consistency
- **Vendor Payload Integrity**: Corrected the service/product creation handler (`handleAdd`) to provide mandatory backend columns (like `category_id`), eliminating relational schema anomalies.
- **Instant Admin Dashboard Sync**: Verified that newly inserted vendor items instantly populate across all micro-frontends (Vendor Dashboard, Buyer Storefront, and Admin Portal).

### 🚀 Smart Backend User Resolver & Storage Engine
- **Multi-Identifier Matching**: Refactored the `/api/users/:uid` middleware to support complex user lookup patterns:
  - Strict UUID & Firebase UID validation.
  - Smart phone number normalization (safely parsing variations with/without leading `+` or country prefix `+91`).
  - Seamless fallback checks matching user email accounts.
- **Profile Image Bucket Uplink**: Added a backend Base64 image parser that decodes client photos in real-time and uploads them directly to the Supabase `user_profiles` storage bucket, providing permanent public URLs.

### 🎨 Premium Orange & White UI Refinements
- **Unified Glassmorphism**: Standardized dark and light modal backdrops with smooth translucent gradients and premium orange accent lines.
- **Richer Micro-Interactions**: Polished the Customer web `CartDrawer` with reactive dynamic updates and physics-based checkout indicators.
- **Admin telemetry telemetry dashboard**: Revamped statistics, data sheets, and merchant control panels with sleek styling (`AdminPanel.css`).

---

## 🏙️ Neighborhood Context
Passwala is specifically optimized for localized contexts, currently featuring high-fidelity data and services for the **Satellite / Ahmedabad** region.

## 📄 License
Custom proprietary license - for community development use only.
