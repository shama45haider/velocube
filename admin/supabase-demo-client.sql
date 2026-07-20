-- Velocube - Demo client for testing the client portal
-- Run this ONCE after creating the auth user in step 1.
-- Uses a fixed id (9001) so later inserts don't need lookups.

insert into clients (id, account_number, business, contact, email, phone, plan, monthly, term, storage_used, storage_limit, client_since, renewal_date, status, notes) values
(9001, 'VC-DEMO01', 'Demo Client Co', 'Jamie Demo', 'demo-client@velocube.net', '(555) 555-0100', 'Managed Hosting', 150, '12 months, 15% off', 2.1, 5, current_date, current_date + interval '11 months', 'active', 'Demo account for testing the client portal.')
on conflict (account_number) do nothing;

insert into services (client_id, name, type, price, status, progress, started, delivered) values
(9001, 'Business Website', 'project', 900, 'completed', 100, current_date - interval '60 days', current_date - interval '20 days'),
(9001, 'Managed Hosting', 'subscription', 150, 'active', null, current_date - interval '20 days', null);

insert into project_updates (client_id, title, body, kind, posted_by) values
(9001, 'Site is live', 'Your new site is live and indexed with Google. Let us know if you would like any changes.', 'milestone', 'Demo Team');

insert into documents (client_id, title, kind, body_md, requires_signature) values
(9001, 'Managed Hosting Agreement', 'agreement', 'This agreement covers Managed Hosting at $150 per month, including SSL, daily backups, and unlimited change requests.', true);

insert into tickets (id, client_id, subject, status, priority, source, assignee) values
('TK-DEMO1', 9001, 'Can we update our homepage photo?', 'open', 'normal', 'portal', 'Unassigned')
on conflict (id) do nothing;

insert into ticket_messages (ticket_id, author, direction, internal, body) values
('TK-DEMO1', 'Jamie Demo', 'inbound', false, 'Hi! Can we swap the homepage hero photo for a newer one? I will send the file over.');

-- ===================== Link the login you created in Step 1 =====================
-- Run this part AFTER you've created the auth user with this exact email.
-- No need to copy any UUID by hand - it looks it up for you.

update clients
set auth_user_id = (select id from auth.users where email = 'demo-client@velocube.net')
where account_number = 'VC-DEMO01';
