-- Run after creating your user in Authentication > Users (tick "Auto Confirm User").
-- Put your own email between the quotes.
insert into public.admins (user_id, email, role)
select id, email, 'owner' from auth.users where email = 'YOUR-EMAIL@example.com'
on conflict do nothing;
