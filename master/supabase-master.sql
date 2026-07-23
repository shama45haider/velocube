-- Velocube Master Panel - database setup
-- Run this ONCE in the Supabase Dashboard -> SQL editor.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------
-- 1. Make the owner an agent.
--    RLS across the whole database is keyed on is_agent(), so this
--    single row gives hr@velocube.net full read/write access to all
--    business tables (clients, tickets, services, orders, etc.)
--    through the normal panel client.
-- ---------------------------------------------------------------
insert into agents (name, email, role, active)
values ('Velocube HQ', 'hr@velocube.net', 'Owner', true)
on conflict (email) do nothing;

-- ---------------------------------------------------------------
-- 2. is_master(): the single source of truth for "who is master".
--    Both the Master Panel frontend and the master-admin Edge
--    Function call this. To change the master account later, edit
--    the email in this one function.
-- ---------------------------------------------------------------
create or replace function is_master()
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'hr@velocube.net';
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

-- Done. Next step: deploy the master-admin Edge Function
-- (see master/README.md).
