---
name: Support System
description: Architecture of the support ticket system and contact settings storage.
---

## Storage
- WhatsApp number and Telegram link stored in `settingsTable` (existing table) under keys `whatsapp_number` and `telegram_link`.
- Default values hardcoded in `support.ts`: `01768177772` / `https://t.me/ayman990`.
- New DB tables: `support_tickets` and `ticket_replies` (with FK cascade on delete).

## API Routes (all in artifacts/api-server/src/routes/support.ts)
- `GET /support-settings` — public, returns whatsapp_number + telegram_link
- `PUT /admin/support-settings` — admin only
- `POST /support/tickets` — requireAuth
- `GET /support/tickets` — requireAuth, returns user's own tickets
- `GET /support/tickets/:id` — requireAuth, returns ticket + replies
- `POST /support/tickets/:id/replies` — requireAuth (user reply)
- `GET /admin/support/tickets` — admin, all tickets with user info + reply count
- `GET /admin/support/tickets/:id` — admin, single ticket detail
- `POST /admin/support/tickets/:id/replies` — admin reply → also creates notification for user
- `PUT /admin/support/tickets/:id/status` — admin, updates status → notification on resolved/closed
- `DELETE /admin/support/tickets/:id` — admin, cascades to replies

## Frontend Pages
- `/support` — SupportPage (public): WhatsApp/Telegram buttons + ticket form for logged-in users
- `/my-tickets` — MyTicketsPage (UserRoute): ticket list + detail/reply view
- Admin panel: new "support" tab → SupportAdminTab with Tickets/Settings sub-views

## Contact Info Flow
Footer.tsx and contact.tsx both call `GET /api/support-settings` on mount, fall back to hardcoded defaults on failure. WhatsApp link format: `https://wa.me/88{number_without_leading_zero}`.

**Why:** Keeping contact info in the shared settingsTable avoids a dedicated table for just two values, and reuses the existing upsert pattern from payment settings.
