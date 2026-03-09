# Rostar — Context for Building the App

This document provides the context needed to continue building the Rostar full-stack application. Use it as the single source of truth for product intent, current implementation, and planned changes.

---

## 1. Project Overview

**Rostar Live** is a boutique live music agency that helps venues create a comprehensive live music schedule with talented artists. The system is an all-in-one platform for:

- **Streamlined booking** — Venues get gig slots; artists get offers; Rostar assigns and manages.
- **Synced calendars** — Master (Rostar), venue, and artist calendars stay in sync; no manual calendar updates.
- **Close relationships** — Chat between Rostar, venues, and artists.
- **Streamlined invoicing** — Self-billing agreements, auto-generated invoices, and payments.

The app has **three portals**:

| Portal | Users | Purpose |
|--------|--------|---------|
| **Client (Venue)** | Venue managers | View venue gig calendar, request artists, approve gigs, view/invoice payments, access artist promo assets. |
| **Artist** | Musicians | View gig calendar (offered vs confirmed), set unavailability, respond to availability/offers, view payments, manage profile & promo assets. |
| **Business Hub (Rostar)** | Rostar staff | Master calendar, create gig slots, request availability, send offers, assign artists, invoicing, manage venues/artists, chat. |

---

## 2. Architecture Overview

### Backend (`rostar-backend`)

- **Stack:** Node.js, TypeScript, Express, Prisma ORM, PostgreSQL (Docker).
- **Prisma:** Centralized client (see `src/prisma.ts`); adapter used for connection.
- **Runs on:** `http://localhost:3001`
- **CORS:** Allowed origin `http://localhost:5173`

### Frontend (`rostar-frontend`)

- **Stack:** React, TypeScript, Vite, React Router, fetch-based API layer.
- **Runs on:** `http://localhost:5173`
- **API base:** Backend at `http://localhost:3001`

### Database

- **PostgreSQL** in Docker container: `rostar-postgres`
- Connection via `DATABASE_URL` (e.g. in `.env`)

---

## 3. App Brief Summary (from Rostar Live App Brief PDF)

### Account Creation

- Rostar **invites** artists and venues; account is created with their name and a **unique link** to finish signup.
- All parties sign **self-billing agreement** and **T&C's** on signup.
- **Venue profile:** One photo, manager name, full address, phone, email, brief bio.
- **Artist profile:** Three photos, one video, full address, phone, email, bank details, brief bio.
- Accounts must be **approved by Rostar** before completed. Pending accounts live in "more" section of Business Hub.
- Optional: Business Hub users with **reduced permissions** (e.g. by city, limited financials).

### Bookings Process (Core Flow)

1. **Rostar creates a default event** called "Live Music" with **fees pre-agreed with venue** (sum of Rostar cut + artist fee). Event appears on master and venue calendar in **blue/grey**. Venue sees only **event (venue) fee**, not artist fee.
2. **Repeating slots:** Rostar can create **repeating slots at the same time every week** when a venue has live music on the same night each week.
3. **Availability request:** From the event listing, Rostar requests artist availability. Artists are **filtered by those who have played at that venue most**. Request appears to artist as **pop-up tick/cross**; valid **12 hours**. Request shows date, time (daytime/afternoon/evening), and **first half of venue postcode**.
4. **Artist responses:** Those who tick appear in a **dropdown under "send offer"** on the event. **Venue-requested artists highlighted gold.** If an artist ticks for a date, they appear on the list for **all available events that day in their city** until they get a confirmed gig or set unavailability (avoids duplicate notifications for same date).
5. **Offer:** Rostar selects one artist and sends **booking request** (pop-up tick/cross with T&C's). Once artist accepts, event is **assigned** and appears on their calendar.
6. **After confirm:** Pub name = event name on artist calendar; artist name = event name on Rostar/venue calendar; description = artist short bio. Artist sees time, set length, artist fee, location, address, contact, gig notes. Venue sees artist (link to profile/assets), contact, venue fee. Both can chat with Rostar about the event. Rostar sees date, venue fee, artist fee, Rostar cut, names, and can open profiles/chats.

### Invoicing

- Artists sign **self-billing agreement**; software auto-creates invoices on their behalf.
- **Morning after** (and each day until response) the venue's **last gig of the week**, venue gets notification to **confirm the week's gigs were fulfilled** (tick/cross + T&C's).
- On confirmation: **venue invoice** auto-generated, 14-day payment terms (from Monday after gig week); **artist invoice** (artist → Rostar) auto-generated, 18-day terms (artist paid three Fridays after gig week).
- Ideal: link to accountancy software and bank API for automatic payment scheduling.

### Visuals & UX

- **Colours:** Rostar Red `#a10000`, Dark Red `#840000`, Black `#000000`, White `#ffffff`, Gold trim `#fdbc00`.
- Neutral, slightly textured background; **Rostar Stars** for bullet points; **icons over lots of text**.
- **Calendar:** TimeTree-style; month / week / list. **List view:** Business Hub list shows **unbooked gigs only**; unbooked (blue/grey) appear **above** booked when both on same day. Notify directors when unbooked gig is a week away.
- **Artist calendar:** Offered = blue/grey, confirmed = Rostar Red; event title = venue (pub) name.
- **Venue calendar:** Event title = artist name when confirmed; empty slot shows time and venue fee; venue can request artists (tick-list of those who've played there before).

---

## 4. Current Backend Implementation

### Database Models (Prisma)

- **Artist:** `id` (UUID), `name` (unique), `createdAt`, `updatedAt`; relation `bookings`.
- **Venue:** `id` (UUID), `name`, `postcode`, `createdAt`, `updatedAt`; unique `(name, postcode)`; relation `bookings`.
- **Booking:** `id`, `artistId`, `venueId`, `dateTime`, `status` (enum: PENDING, CONFIRMED, CANCELLED), `notes`, timestamps. Relations to Artist and Venue. Indexes on `artistId`, `venueId`, `dateTime`.  
  - Prevents double-booking: same artist or same venue at same `dateTime` (enforced at DB/application level).

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check; returns `{ ok, db }`. |
| GET | `/artists` | List artists (ordered by name). |
| GET | `/venues` | List venues (ordered by postcode, name). |
| GET | `/bookings` | List bookings with nested `artist` and `venue`. |
| POST | `/artists` | Create artist; body `{ name }`; 409 if name exists. |
| POST | `/venues` | Create venue; body `{ name, postcode }`; 409 if (name, postcode) exists. |
| POST | `/bookings/by-name` | Create booking by names; body `{ artistName, venueName, postcode, dateTime, notes }`; 404 if artist/venue not found; 409 on double-booking. |

---

## 5. Current Frontend Implementation

- **Routes:** `/` (health), `/artists`, `/venues`, `/bookings`, `/bookings/new`, `/calendar`.
- **Features:** Fetch and display backend data; booking creation form; 409 conflict handling; calendar month grid driven by **bookings**.
- **API:** Centralized fetch (e.g. `src/api/http.ts`) pointing at backend.

---

## 6. Current Architectural Limitation

Gigs are modelled **only as Bookings**. So:

- A gig **only exists once an artist is assigned**.
- Venues **cannot** create "Live Music" slots in advance.
- **Recurring weekly** gig slots are not supported.
- Calendar **cannot** show unbooked events/slots.

This does **not** match the intended product: venue-owned **slots** that exist first, then get assigned to artists.

---

## 7. Next Major Change: Event (Gig Slot) Model

Introduce a core **Event** model representing **venue-owned live music slots** that exist **before** an artist is assigned and may later become confirmed gigs.

### Design Principles

- Events exist **independently** of artists.
- **Artist assignment is optional** (nullable).
- Calendar will be driven by **Events** (not only Bookings).
- Bookings may later be **deprecated or merged** into Events.

### Planned Event Fields

| Field | Type | Notes |
|-------|------|--------|
| id | UUID | PK |
| venueId | UUID | FK to Venue; required |
| artistId | UUID? | FK to Artist; null = unbooked |
| startDateTime | DateTime | Slot start |
| endDateTime | DateTime | Slot end (or could use duration; TBD) |
| status | Enum | UNBOOKED, OFFERED, CONFIRMED |
| venueFee | Decimal? | Fee visible to venue |
| artistFee | Decimal? | Fee for artist |
| rostarCut | Decimal? | Rostar's cut |
| notes | String? | Gig notes, equipment, etc. |
| createdAt, updatedAt | DateTime | Timestamps |

### Planned API Additions

- **GET /events** — List events (with filters: venueId, artistId, status, date range).
- **POST /events** — Create one or more events; support **optional weekly recurrence** (e.g. same time each week for N weeks or until a date).

Future: assign artist to event; transition status UNBOOKED → OFFERED → CONFIRMED; replace Booking-based scheduling with Event-based.

### Decisions to Align On (When Implementing)

- **start + end** vs **start + duration** for slot length.
- **Fees:** Required in v1 or nullable; type (e.g. `Decimal` for money).
- **Status:** Add CANCELLED or handle via soft-delete/hide?
- **Recurrence:** Only "N weekly occurrences" / "until end date" vs full pattern (e.g. "every Tuesday for 12 weeks").
- **Booking vs Event:** Event-only as source of truth vs keep Booking and link; migration path for existing Bookings.
- **Conflicts:** Venue-only (one event per venue per time) vs also artist conflicts for CONFIRMED events.
- **Calendar refactor:** Data source from bookings → events; optional filter (e.g. include unbooked); show both during transition if needed.

---

## 8. Development Environment

### Database (Docker)

- Postgres container: **rostar-postgres**
- Ensure container is running before starting backend.

### Backend

```bash
cd rostar-backend
npm install
npm run dev
```

- API: `http://localhost:3001`
- Prisma: `schema.prisma` and migrations in `prisma/`. Seed: `prisma/seed.ts`.

### Frontend

```bash
cd rostar-frontend
npm install
npm run dev
```

- App: `http://localhost:5173`

---

## 9. Long-Term Direction

- **Event-driven scheduling:** Events as primary; recurring gig slots; clear status lifecycle.
- **Event-based calendar** as primary UI (all three portals).
- **Availability requests** (12h, tick/cross) and **offers** (one artist, accept/decline) on top of Events.
- **Invoicing:** Self-billing, venue confirmation, auto invoices, payment terms as per brief.
- **Chat:** Per-entity chats linked to Business Hub; optional event-specific threading.
- **Auth & roles:** Invite-only signup; venue vs artist vs Rostar; optional restricted Business Hub users.
- **Potential deprecation** of standalone Booking model once Event covers confirmed gigs.

---

## 10. Repo Layout

- **RostarInfra** — Monorepo root; this context file is also copied into each app repo.
- **rostar-backend** — Express + Prisma API; `README_CONTEXT.md` here for backend-focused work.
- **rostar-frontend** — React + Vite app; `README_CONTEXT.md` here for frontend-focused work.

Use **README_CONTEXT.md** in the repo you're working in as the shared context for continuing to build the app.
