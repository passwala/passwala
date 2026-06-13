# Passwala — Database Schema Files

Run these files **in order** in Supabase SQL Editor.

---

## 📁 `schema/` — Run in this order

| File | Side | What it creates |
|---|---|---|
| `01_users_buyers.sql` | 🟢 **Buyer** | `users`, `addresses`, `wallet_transactions`, `notifications`, `service_areas`, `carts`, `orders`, `order_items`, `invoices`, `payments`, `chats` |
| `02a_vendor_shop.sql` | 🟠 **Vendor — Shop** | `vendors`, `stores`, `product_categories`, `products`, `inventory`, `deals` + stock triggers |
| `02b_vendor_event_organizer.sql` | 🟡 **Vendor — Event** | `events`, `event_ticket_tiers` (with `booking_open`/`booking_close`), `event_bookings` |
| `02c_vendor_professional.sql` | 🔵 **Vendor — Professional** | `service_categories`, `service_providers`, `services`, `service_bookings` |
| `03_riders.sql` | 🔴 **Rider** | `riders`, `rider_locations`, `rider_earnings`, `delivery_tracking` + realtime |
| `05_city_rides.sql` | 🟣 **City Rides** | `city_routes`, `city_vehicles`, `ticket_bookings` |
| `07_community.sql` | 💬 **Community** | `posts` |

---

## 📁 `migrations/` — Run when upgrading existing DB

| File | What it does |
|---|---|
| `add_booking_open_close.sql` | Adds `booking_open` / `booking_close` to `event_ticket_tiers` |

---

## ⚡ Quick Migration (if DB already exists)

Paste this in Supabase SQL Editor once:

```sql
ALTER TABLE public.event_ticket_tiers
    ADD COLUMN IF NOT EXISTS booking_open  TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS booking_close TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.event_ticket_tiers
    DROP COLUMN IF EXISTS booking_open_time,
    DROP COLUMN IF EXISTS booking_close_time;

NOTIFY pgrst, 'reload schema';
```

---

## 🗂️ Vendor Types (3 kinds)

| Type | File | Role in `users` table |
|---|---|---|
| Retail / Shop | `02a_vendor_shop.sql` | `VENDOR` |
| Event Organizer | `02b_vendor_event_organizer.sql` | `VENDOR` |
| Professional / Tradesperson | `02c_vendor_professional.sql` | `SERVICE_PROVIDER` |
