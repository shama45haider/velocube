# Velocube Master Control

Owner-only console at `velocube.net/master/`. Signs in exclusively as
**master@velocube.net** and controls everything: every Supabase auth account
(create, reset password, ban, delete, link to a client), every customer
record, tickets, team, orders, documents, announcements, and the audit log.

Any other account that signs in sees a lockout screen and is signed out —
enforced client-side by the `is_master()` database check and server-side
inside the `master-admin` Edge Function, which is the only place the
service_role key is used.

## One-time setup (in this order)

### 1. Run the SQL

Supabase Dashboard → SQL Editor → paste and run
[`supabase-master.sql`](supabase-master.sql). Safe to re-run. It:

- adds master@velocube.net to `agents` (grants full data access through RLS)
- creates `is_master()` — the single place the master email is defined
- fixes `clients.auth_user_id` so deleting a login unlinks the client
  instead of erroring

### 2. Deploy the Edge Function

Supabase Dashboard → Edge Functions → **Deploy a new function** →
name it exactly `master-admin` → paste
[`functions/master-admin/index.ts`](functions/master-admin/index.ts) →
keep **Verify JWT** ON → Deploy.

No secrets to configure — the function uses the automatically injected
`SUPABASE_SERVICE_ROLE_KEY`.

### 3. Confirm

Open `velocube.net/master/`, sign in as master@velocube.net, go to
**Settings → Check control link**. It should answer
`OK — v1 answering as master@velocube.net`.

## Sandbox mode

Open `master/?demo=1` to run the whole UI against built-in fake data —
nothing touches Supabase. A "SANDBOX" chip shows in the command bar.

## Notes

- Resetting a password shows a one-time temporary password to copy and
  hand to the person. Check "sign them out everywhere" to also kill
  their existing sessions.
- Banning blocks sign-in on every panel immediately; unban lifts it.
- Deleting a login never deletes the client record — it just removes
  portal access.
- Every master action is written to the shared `activity` table
  (kinds prefixed `master_`), visible here and in the support panel.
- To change which email is master: edit `is_master()` in the SQL editor
  AND the `MASTER_EMAIL` constant at the top of the Edge Function.
