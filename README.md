# Restock

Inventory and activity-log tracking for small shops, built with React (Vite) + Supabase.

## Stack

- **Frontend:** React + Vite
- **Database + Auth:** Supabase (Postgres, Row Level Security, email/password auth)
- **Hosting:** Vercel

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

## Database setup

Run these in the Supabase SQL Editor, in order:
1. `schema.sql` — core tables (shops, profiles, items, movements) + RLS
2. `migration_staff_invites.sql` — staff invite system

## Environment variables

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |

These also need to be set in Vercel's project settings (Environment Variables), since `.env.local` is never committed to git.

## Before going live with real customers

- [ ] Turn **"Confirm email"** back on in Supabase → Authentication → Providers → Email
- [ ] Set up a real SMTP provider (e.g. Resend, Postmark) in Supabase → Project Settings → Auth → SMTP Settings — the default email sender is rate-limited and not meant for production traffic
- [ ] In Supabase → Authentication → URL Configuration, set **Site URL** to your real deployed URL, and add it under **Redirect URLs** — otherwise confirmation/invite links will point back to `localhost`
