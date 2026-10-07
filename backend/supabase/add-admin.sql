-- FIRST: create this account in Supabase Authentication > Users > Add user.
-- Replace the sample with the same account email. Use lowercase.
insert into public.admins (email)
values (lower(trim('YOUR_ADMIN_EMAIL@example.com')))
on conflict (email) do nothing;

-- To revoke admin access immediately, run:
-- delete from public.admins where email = lower(trim('YOUR_ADMIN_EMAIL@example.com'));
