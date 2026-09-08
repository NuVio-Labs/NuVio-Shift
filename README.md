# NuVio Shift

**Schichten. Einfach geplant.**

NuVio Shift is a lightweight, mobile-first web app for scheduling Saturday shifts in small teams — built to replace a paper schedule with something just as simple to use, but digital.

## Features

- **Authentication & roles** — Supabase Auth with three roles per company: `admin`, `scheduler`, `employee`. No public signup; accounts are created by an admin invite.
- **Multi-tenant** — Each company's employees, shifts, and settings are isolated at the database level via Postgres Row Level Security.
- **Onboarding by invite link** — An admin generates a one-time, expiring invite link (with a chosen role) from **Onboarding**; the invitee registers through it and is added straight to the right company.
- **Schedule** — Fixed Saturday shift model (Früh 08:00–14:00, Spät 14:00–20:00). Schedulers assign, change, and remove employees; employees see their own upcoming shifts; admins get a read-only view plus monthly totals and planned hours.
- **PWA & push notifications** — Installable on mobile, with Web Push notifying employees when a shift is assigned, changed, or removed.
- **Settings** — Self-service profile (name, phone, weekly target hours) with an admin-managed hourly wage shown read-only to its owner; push notification preferences live in the same place.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)-style components on top of [Base UI](https://base-ui.com)
- [Supabase](https://supabase.com) — Auth, Postgres, Row Level Security
- Web Push (VAPID) for notifications

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL/keys and VAPID keys (generate with `npx web-push generate-vapid-keys`).

3. Apply the database migrations to your Supabase project (via the [Supabase CLI](https://supabase.com/docs/guides/local-development) or the SQL editor):

   ```bash
   supabase db push
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Roles

| Role | Can |
|---|---|
| `admin` | View the full schedule, manage employees and their hourly wage, generate onboarding invites |
| `scheduler` | Assign/change/remove shift assignments |
| `employee` | View their own upcoming shifts and profile |

## Project structure

```
src/
├── app/            Routes (App Router)
├── components/     UI components, grouped by feature
├── lib/            Business logic, Supabase clients, server actions
└── types/          Shared domain types
supabase/
└── migrations/     Database schema, in order
```
