# Passwalaa — Database Schema

## 📁 Files & Run Order

Run each file **in order** in the Supabase SQL Editor. All files are **safe to re-run** (idempotent).

| # | File | Tables |
|---|------|--------|
| 1 | `01_users_buyers.sql` | `users`, `service_areas`, `addresses`, `wallet_transactions`, `notifications`, `carts`, `orders`, `order_items`, `invoices`, `payments`, `chats`, `chat_messages`, `posts`, `reports`, `ai_recommendations` |
| 2a | `02a_vendor_shop.sql` | `vendors`, `stores`, `product_categories`, `products`, `inventory`, `deals` + **stock triggers** |
| 2b | `02b_vendor_event_organizer.sql` | `events`, `event_ticket_tiers`, `event_bookings`, `event_organizer_requests` |
| 2c | `02c_vendor_professional.sql` | `service_categories`, `service_providers`, `services`, `service_bookings` |
| 3 | `03_riders.sql` | `riders`, `rider_locations`, `rider_earnings`, `delivery_tracking` |
| 5 | `05_city_rides.sql` | `city_routes`, `city_vehicles`, `ticket_bookings` |
| 7 | `07_promo_codes.sql` | `promo_codes`, `promo_redemptions`, `increment_promo_usage()` RPC |
| 8 | `08_order_ratings.sql` | `order_ratings` + **auto-update store rating trigger** |

## ⚡ Quick Run (all at once)
Use `PASSWALA_COMPLETE_SCHEMA.sql` in the `/database` root for a single-shot full install.

## 🏗️ Key Design Decisions

| Decision | Reason |
|---|---|
| RLS enabled on all tables with `USING (true)` | Access control enforced in Express backend, not Supabase |
| `uuid_generate_v4()` everywhere | Globally unique IDs, no sequential guessing |
| Triggers for stock and rating | Derived data stays consistent without app-layer logic |
| `promo_redemptions` table | Prevents one user from reusing a promo code (per_user_limit) |
| `approval_status` on events | Admin must approve events before they go public |
| `checked_in` + `checked_in_at` on event_bookings | QR scan at venue marks attendance idempotently |

## 📬 Support
passwalaoffcial@gmail.com
