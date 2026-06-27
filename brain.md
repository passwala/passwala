# 🧠 Passwala App Brain System Architecture

This document serves as the central brain and architectural blueprint of **Passwala**. It outlines the project structure, language distribution, database layers, and core functional modules across the codebase.

---

## 🌐 1. Technologies & Languages Used

Passwala is built using a modern full-stack JavaScript architecture:

*   **Frontend Language:** `JavaScript (ES6+)` / `JSX` (React 18)
*   **Backend Language:** `JavaScript (Node.js)` / `Express.js`
*   **Styling:** `Vanilla CSS3` (custom modern sheets with glassmorphism) & `TailwindCSS`
*   **Database:** `SQL` (PostgreSQL hosted via Supabase)
*   **Build System:** `Vite` (Ultra-fast bundler)

---

## 📂 2. Project Directory Structure

```
Passwalaa/
├── coming-soon/              # Teaser / launch page assets and node server
├── database/                 # SQL database setup and migrations
│   └── schema/               # Core table configurations & constraints
├── public/                   # Static assets (images, icons, service worker)
├── server/                   # Node.js Express Backend
│   ├── config/               # DB and Third-party Service configurations
│   ├── controllers/          # Business logic handlers for endpoints
│   ├── routes/               # API endpoint routing declarations
│   ├── utils/                # Backend utilities (e.g. notifications)
│   └── index.js              # Express app entry point & server runner
├── src/                      # React Frontend Source Code
│   ├── assets/               # Local UI images and icons
│   ├── context/              # Global React states (Cart, Notifications, Search)
│   ├── hooks/                # Reusable custom React hooks
│   ├── rider/                # Rider portal micro-frontend
│   ├── vendor/               # Vendor / merchant portal micro-frontend
│   ├── web/                  # Landing page & marketing micro-frontend
│   ├── webapp/               # Buyer Web Application
│   │   ├── buyer/            # Hubs: Neighborhood, Tickets, Rides, Events, Chat
│   │   ├── components/       # Shared UI components
│   │   ├── profile_pages/    # Wallet, support, addresses, app settings
│   │   └── ...               # Core wizard, auth, dev tools, and layout modules
│   ├── App.jsx               # Root client-side router & orchestration
│   ├── main.jsx              # DOM mounting and provider entry point
│   ├── supabase.js           # Supabase client initializer
│   └── firebase.js           # Firebase app & push notification config
├── vite.config.js            # Build configuration, proxy rules, and optimization
└── package.json              # Client scripts & dependency tree
```

---

## ⚙️ 3. Core Modules & Key Functions

### 🟢 A. React Frontend (`src/`)

#### 1. Root Router & State Control (`src/App.jsx`)
*   **`AppContent`**: The core layout controller. Integrates theme providers, auth status listeners, and active micro-frontend tabs.
*   **`showOnboarding` State**: Initializes to `false` by default to avoid blocking users, but listens to `?onboarding=true` or `?force_onboarding=true` query parameters to reset and launch the onboarding flow on-demand.
*   **Global Real-time Subscriptions**: Listens to PostgreSQL row updates on the Supabase `orders` table via real-time channels and dispatches push notifications.

#### 2. AI & Gen-Z Assistants (`src/webapp/`)
*   **`AIAssistant.jsx`**: An AI assistant that interacts with buyers, answers local inquiries, and suggests local vendors.
*   **`OnboardingWizard.jsx`**: A gamified, Gen-Z themed onboarding flow with premium glassmorphic cards and warm orange-red glowing blobs.
    *   *Functions:*
        *   `handleSkip()`: Saves current progress, sets `passwala_onboarding_done = true` in `localStorage`, cancels active text-to-speech instances, and redirects to the home screen instantly.
        *   `handleContinue()`: Validates choices, moves to the next card, or writes preferences to localStorage on completion.
        *   `speak(text)`: Translates text steps into high-fidelity voice announcements using the browser's native Synthesis API.

#### 3. Buyer Features (`src/webapp/buyer/`)
*   **`NeighborhoodHub.jsx`**: Local neighborhood home dashboard containing quick services, tickets, events, and community feeds.
*   **`CityTicketBooking.jsx`**: Real-time ticket scanner and local ride booking widget.
*   **`AIChatWidget.jsx`**: Floating mini chat UI that leverages semantic matching to help users search local inventory.

---

### 🔵 B. Express Backend (`server/`)

#### 1. Entry point & Middleware (`server/index.js`)
*   Configures CORS, injects environment variables using `dotenv`, registers routes, and boots up the HTTP listener on port `3004`.

#### 2. Controllers & Handlers (`server/controllers/`)
*   **`fcmToken` sync controller**: Updates user push notification tokens securely inside both Supabase and Firebase.
*   **`platformSettings` controller**: Fetches and saves platform configurations like platform-wide maintenance mode.

---

## 🗄️ 4. Database Layer (PostgreSQL via Supabase)

All core business entities are modeled inside Supabase PostgreSQL schemas:

1.  **`supabase_schema.sql`**: Configures the underlying data structure for `users`, `vendors`, `items`, `orders`, and `transactions`.
2.  **`chat_and_payments_setup.sql`**: Configures real-time messaging tables (`threads`, `messages`) and records online payment statuses.
3.  **`service_areas_setup.sql`**: Restricts deliveries and service hubs to verified geo-fenced boundaries (societies in Ahmedabad, Gujarat).
