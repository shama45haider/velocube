# Velocube Client Portal

The client-facing counterpart to the staff panel in `admin/`. A Velocube
customer signs in here to track their project, message the team, preview their
staging site, request add-ons, manage hosting, and review documents.

Lives at `/portal/`. Linked from the "Client Login" item in the nav on every
page of velocube.net.

## How it relates to the staff panel

Both panels talk to the **same Supabase project and the same tables**. That is
deliberate: when a client sends a message it lands in the staff panel's ticket
thread, and when staff post a project update the client sees it. Two separate
projects would mean two disconnected databases.

What keeps clients apart from each other — and from staff-only data — is
row-level security, not separate databases. See below.

## Setup

Run the SQL files in this order in the Supabase SQL Editor:

1. `admin/supabase-clean-setup.sql` — base tables
2. `admin/supabase-v3.sql` — agents, canned replies, guides
3. **`admin/supabase-portal.sql`** — the portal's tables **and the security
   re-scoping** described below

Then paste your Project URL and anon key into `portal/js/config.js` (same
values as `admin/js/config.js`).

### ⚠️ Why supabase-portal.sql is not optional

Before it runs, every policy is `to authenticated using (true)`. That was fine
while only staff had logins. The moment a client can authenticate against the
same project, that policy would let them read **every other client's**
accounts, tickets, messages, and the internal notes staff write about them.

`supabase-portal.sql` fixes this by:

- adding `clients.auth_user_id` to link a login to exactly one client record
- adding `is_agent()` and `my_client_id()` helper functions
- rewriting every policy as `using (is_agent() or <owned-by-me>)`
- restricting `ticket_messages` so clients never see rows with `internal = true`
- exposing client details through a `client_self` view that omits `clients.notes`

Do not create a client login until that file has run.

## Onboarding a client (two steps)

1. **Supabase Dashboard → Authentication → Users → Add user** with the client's
   email and a temporary password.
2. **Table Editor → clients →** find their row and set `auth_user_id` to the
   UUID of the user you just created.

Until step 2 is done, that login sees an "Almost there — your login isn't
linked yet" screen rather than anyone else's data. That is the intended safe
default for a brand-new auth user.

## What each view does

| View | What the client can do |
| --- | --- |
| **Home** | Project health, phase tracker, notification hub of things needing their action, latest team updates, staging preview, news board |
| **My Project** | Overall progress, every deliverable with status and progress, full update history filterable by milestone/progress/blocker |
| **Messages** | Ticket threads shared with the staff panel. Reply inline or start a new request. Internal staff notes are never visible |
| **Live Preview** | Their staging site in a responsive frame with desktop/tablet/mobile toggles |
| **Documents** | Read agreements and invoices, and sign what needs signing |
| **Add-ons** | Browse extras and request them (prices mirror `pricing.html`) |
| **Hosting** | Plan, rate, renewal, storage gauge, request a change. Clients without a plan see a comparison upsell instead |
| **Account** | Their details and a password change |

## What is simulated

Two things are deliberately not real, and both say so in the UI:

- **E-signing.** The signing modal shows a persistent notice: *"Demo signing —
  this is a product demonstration and does not create a legally binding
  signature."* It records the typed or drawn signature, the name, and a
  timestamp, but there is no certificate, audit trail, or identity
  verification. For binding execution, route through DocuSign or similar.
- **Add-on purchases.** Requesting an add-on writes a row with status
  `requested` and notifies the team. **No payment is taken and no card is
  stored.** A rep confirms scope and invoices separately. Plan changes work the
  same way — billing is never altered automatically.

Also not built yet: file uploads/downloads on documents (the body text is
rendered from the database, not from stored PDFs).

## Architecture

Same shape as `admin/`, so the two stay easy to maintain together:

- `index.html` — shell with login, unlinked, and app screens
- `js/config.js` — Supabase credentials
- `js/api.js` — `VeloClientAPI`, client-scoped calls only
- `js/app.js` — hash router and all eight views
- `css/portal.css` — light/airy theme matching velocube.net (Clash Display
  headings, Switzer UI, Boska serif accents)

Every API call has an error path. A failed action shows a toast with the real
message; a failed page load shows a "This page could not load" card with a
Try Again button, and other pages keep working. This was the top bug in the
staff panel build, so it is handled by default here.

## Verification checklist

Before trusting this with real clients, confirm cross-tenant isolation
directly:

1. Link two different client rows to two different auth users.
2. Sign in as client A and, in the browser console, run
   `supabase.from('tickets').select()` and the same for `clients`,
   `ticket_messages`, `documents`, `addon_orders`.
3. Every one must return **only** client A's rows.
4. Confirm no row with `internal = true` ever appears.
5. Confirm the staff panel still has full access after the policy rewrite.
