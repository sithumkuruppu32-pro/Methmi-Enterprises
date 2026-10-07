create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  duration text not null default '',
  pickup_time text not null default '',
  description text not null default '',
  highlights text[] not null default '{}',
  included text[] not null default '{}',
  starting_price text not null default '',
  image text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('Car', 'Van', 'SUV', 'Bus')),
  seats integer not null,
  ac boolean not null default true,
  luggage_capacity text not null default '',
  description text not null default '',
  image text not null default '',
  sample_prices jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  whatsapp_number text not null,
  country text not null,
  flight_number text,
  arrival_date date not null,
  arrival_time text not null,
  pickup_location text not null,
  drop_location text not null,
  vehicle_type text not null,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'closed')),
  email_sent boolean not null default false,
  source_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

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
