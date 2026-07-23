-- Velocube Master Panel - database setup
-- Run this in the Supabase Dashboard -> SQL editor.
-- Safe to re-run: every statement is idempotent.
--
-- Master account: ceo@velocube.net

-- ---------------------------------------------------------------
-- 1. Make the owner an agent.
--    RLS across the whole database is keyed on is_agent(), so this
--    single row gives ceo@velocube.net full read/write access to
--    all business tables (clients, tickets, services, orders, etc.)
--    through the normal panel client.
--
--    Retire any owner row left over from an earlier version of this
--    script (hr@velocube.net, master@velocube.net) so old emails no
--    longer count as agents.
-- ---------------------------------------------------------------
insert into agents (name, email, role, active)
values ('Velocube HQ', 'ceo@velocube.net', 'Owner', true)
on conflict (email) do update set active = true, role = 'Owner';

update agents set active = false
where lower(email) in ('hr@velocube.net', 'master@velocube.net');

-- ---------------------------------------------------------------
-- 2. is_master(): the single source of truth for "who is master".
--    Both the Master Panel frontend and the master-admin Edge
--    Function call this. To change the master account later, edit
--    the email in this one function (and MASTER_EMAIL in the Edge
--    Function).
-- ---------------------------------------------------------------
create or replace function is_master()
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'ceo@velocube.net';
$$;

grant execute on function is_master() to authenticated;

-- ---------------------------------------------------------------
-- 3. Fix the client link constraint.
--    clients.auth_user_id currently references auth.users with no
--    ON DELETE action, so deleting a login that is linked to a
--    client would fail. ON DELETE SET NULL means: deleting the
--    login simply unlinks it, the client record stays intact.
-- ---------------------------------------------------------------
alter table clients drop constraint if exists clients_auth_user_id_fkey;
alter table clients
  add constraint clients_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users (id) on delete set null;

-- Done. Make sure the master-admin Edge Function is redeployed with
-- MASTER_EMAIL = "ceo@velocube.net" (see master/README.md).
