# Velocube Support Panel

Internal panel for support agents: look up client accounts, work tickets, reply to clients, and follow help guides. Lives at `/admin/` (later admin.velocube.net).

## Demo Mode (works right now)

With no configuration, the panel runs on built-in demo data.

- URL: `/admin/`
- Login: `demo@velocube.net` / `VeloDemo2026`
- Replies, ticket changes, new tickets, and notes persist in the browser (localStorage). Clear site data to reset the demo.

## Going live with Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project: **SQL Editor -> New query**, paste the contents of `supabase-setup.sql`, and run it. This creates the tables, security rules, and starter data.
3. Create agent accounts: **Authentication -> Users -> Add user** (email + password). Only people with dashboard access can do this, which is how "only admins create accounts" is enforced until the admin panel exists.
4. Get your keys: **Project Settings -> API**. Copy the **Project URL** and the **anon public** key.
5. Paste both into `admin/js/config.js` and deploy. The panel switches from Demo Mode to Live automatically (the chip in the top bar confirms it).

The anon key is safe to ship in front-end code. Row Level Security (set up by the SQL script) is what protects the data: nothing is readable or writable without a signed-in agent session.

## What is still simulated

- **Outbound email**: replies are saved to the ticket thread and marked as queued. Actually delivering them needs a Supabase Edge Function plus an email API (for example Resend). The "Open in Email App" button on each ticket works today as a manual path.
- **Quote form -> tickets**: the public site's quote form (Formspree) can later post to a Supabase Edge Function webhook that inserts a ticket with source `quote form`.
- **Admin dashboard**: creating agents and clients from a UI comes later; both are done in the Supabase Dashboard for now.

## Pointing admin.velocube.net at this

GitHub Pages allows one custom domain per repo. When ready, split `/admin/` into its own repo (or host it anywhere static), add a `CNAME` file containing `admin.velocube.net`, and create a CNAME DNS record for `admin` pointing to `shama45haider.github.io`.
