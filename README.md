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
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Database Setup (Supabase)
To synchronize with the cloud architecture:
1. Go to your [Supabase Dashboard](https://supabase.com/).
2. Open the **SQL Editor**.
3. Copy the contents of `supabase_full_migration.sql` from this project.
4. Run the SQL to initialize tables (Services, Essentials, Bookings, etc.) and Seed Data.

### 6. Run the Application
You need to run **two separate processes** for full functionality:

#### Option A: One-Click Execution (If configured)
```bash
npm start
```

#### Option B: Manual Execution (Recommended)
**Terminal 1 (Frontend):**
```bash
npm run dev
```

**Terminal 2 (Server/AI Engine):**
```bash
npm run server
```

---

## 💎 Features & Tech Stack

- **Core**: React 18 + Vite (Fast Refreshes)
- **Styling**: Vanilla CSS (Premium Orange & White "Clean Elegant" Design)
- **Backend**: Supabase (PostgreSQL + RLS + Authentication)
- **AI Engine**: Seasonality-aware recommendations & smart assistant
- **Admin OS 2.0**: Real-time cloud-synced dashboard for inventory & order management

---

## 🏙️ Neighborhood Context
Passwala is specifically optimized for localized contexts, currently featuring high-fidelity data and services for the **Satellite / Ahmedabad** region.

## 📄 License
Custom proprietary license - for community development use only.
