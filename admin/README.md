# Velocube Support Panel

Internal panel for the support team: dashboard, full ticket system with real
email replies, client account management, reports, activity log, canned
replies, team workload, and help guides. Lives at `/admin/` (later
admin.velocube.net).

## Features

- **Dashboard** — open/urgent/unassigned/overdue tickets, MRR, active clients,
  14-day ticket volume chart, live activity feed, upcoming renewals, storage
  alerts, pipeline value, quick actions.
- **Tickets** — status tabs, search, priority/assignee/source filters, SLA
  "waiting" chips (green under 8h, amber under 24h, red over), tags,
  urgent-first sorting.
- **Ticket workspace** — full thread, reply-to-client vs internal-note modes,
  canned reply insertion with `{name}`/`{agent}` personalization, per-message
  email delivery status (queued/sent/failed), one-click resolve/reopen,
  client context sidebar.
- **Email delivery** — replies are emailed to the client through a Supabase
  Edge Function backed by Resend (see setup below).
- **Accounts** — search + plan/status filters, create and edit clients,
  CSV export, per-account stats, services, tickets, and internal notes.
- **Reports** — MRR, lifetime revenue, resolution rate, 6-month revenue
  chart, top clients by value, workload breakdowns.
- **Activity** — a full audit feed of everything agents do.
- **Canned Replies** — create/edit/delete reusable responses by category.
- **Team** — per-agent open/resolved counts and the unassigned queue.
- **Settings** — connection status, email delivery test button, CSV/JSON
  exports, demo reset.
- Keyboard: press `/` anywhere to jump to search.

## Demo Mode (works with zero setup)

Empty the two values in `js/config.js` and the panel runs on built-in demo
data. Login: `demo@velocube.net` / `VeloDemo2026`. All changes persist in the
browser (localStorage); reset them in Settings.

## Going live with Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor -> New query**: run `supabase-setup.sql`, then run
   `supabase-upgrade.sql` (tables for agents, canned replies, activity, tags,
   internal notes, email tracking).
3. Create agent logins: **Authentication -> Users -> Add user**. Also add each
   agent to the `agents` table (Table Editor) so they appear in assignee
   dropdowns and on the Team page.
4. **Project Settings -> API**: copy the Project URL and anon public key into
   `admin/js/config.js`. The top-bar chip switches from Demo Mode to Live.

The anon key is safe to ship; Row Level Security protects the data — nothing
is readable or writable without a signed-in agent session.

## Real outbound email (Resend)

Replies save to the thread instantly and are marked **queued**. To actually
deliver them to the client's inbox:

1. Create a free account at [resend.com](https://resend.com) and add + verify
   the `velocube.net` domain (they give you DNS records to add).
2. Create an API key in Resend.
3. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from
   the repo root:

   ```
   supabase functions deploy send-ticket-email --project-ref YOUR_PROJECT_REF
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx --project-ref YOUR_PROJECT_REF
   supabase secrets set MAIL_FROM="Velocube Support <support@velocube.net>" --project-ref YOUR_PROJECT_REF
   ```

   (The function source is `admin/functions/send-ticket-email/index.ts`.)
4. In the panel: **Settings -> Test Email Function**. When it reports
   "Working", every reply an agent sends is emailed to the client and its
   badge flips from queued to **sent**.

Until the function is deployed, nothing breaks — replies simply stay queued,
and the "Open in Email App" button on each ticket is the manual path.

## What is still simulated

- **Quote form -> tickets**: the public site's quote form (Formspree) can
  later post to a Supabase Edge Function webhook that inserts a ticket with
  source `quote form`.
- **Inbound email -> tickets**: client replies to the support address land in
  the inbox, not the panel. (Possible later with Resend inbound webhooks.)

## Pointing admin.velocube.net at this

GitHub Pages allows one custom domain per repo. When ready, split `/admin/`
into its own repo (or host it anywhere static), add a `CNAME` file containing
`admin.velocube.net`, and create a CNAME DNS record for `admin` pointing to
`shama45haider.github.io`.
