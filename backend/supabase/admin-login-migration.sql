-- Existing projects: run this after the original backend/schema.sql.

-- Admin email allow-list. Passwords are stored only by Supabase Authentication.
create table if not exists public.admins (
  email text primary key check (email = lower(trim(email))),
  created_at timestamptz not null default now()
);

-- This Express backend accesses tables with its server-only service-role key.
-- Browsers must use the API; there are intentionally no direct-client policies.
alter table public.admins enable row level security;
alter table public.tours enable row level security;
alter table public.vehicles enable row level security;
alter table public.booking_enquiries enable row level security;
alter table public.app_meta enable row level security;
revoke all on public.admins from anon, authenticated;
grant select, insert, update, delete on public.admins to service_role;

-- Public image downloads are allowed. Uploads use the protected backend API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
