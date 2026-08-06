-- ============================================================
-- TTIC Staff Portal — Database Schema
-- Technical Training Institute, Chumey
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- --------------------------------------------------------
-- 0. Clean slate — drop anything left from previous attempts
-- --------------------------------------------------------
drop table if exists public.attendance_records cascade;
drop table if exists public.staff_users cascade;
drop type if exists public.staff_role cascade;

-- --------------------------------------------------------
-- 1. Role enum
-- --------------------------------------------------------
create type public.staff_role as enum ('staff', 'principal');

-- --------------------------------------------------------
-- 2. staff_users — profile row, linked to Supabase Auth
--    (password itself lives in auth.users, not here)
-- --------------------------------------------------------
create table public.staff_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name  text not null,
  email      text not null unique,
  role       public.staff_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------
-- 3. attendance_records
-- --------------------------------------------------------
create table public.attendance_records (
  id         uuid primary key default gen_random_uuid(),
  staff_id   uuid not null references public.staff_users(id) on delete cascade,
  date       date not null default current_date,
  check_in   timestamptz,
  check_out  timestamptz,
  status     text default 'present',
  created_at timestamptz not null default now(),
  unique (staff_id, date)
);

-- --------------------------------------------------------
-- 4. Keep updated_at fresh
-- --------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_staff_users_updated_at
before update on public.staff_users
for each row execute function public.set_updated_at();

-- --------------------------------------------------------
-- 5. Row Level Security
-- --------------------------------------------------------
alter table public.staff_users enable row level security;
alter table public.attendance_records enable row level security;

create or replace function public.is_principal()
returns boolean as $$
  select exists (
    select 1 from public.staff_users su
    where su.id = auth.uid() and su.role = 'principal'
  );
$$ language sql security definer;

-- staff_users policies
create policy "Users can view their own profile"
on public.staff_users for select
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.staff_users for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.staff_users for update
using (auth.uid() = id);

create policy "Principals can view all staff"
on public.staff_users for select
using (public.is_principal());

-- attendance_records policies
create policy "Staff can view own attendance"
on public.attendance_records for select
using (auth.uid() = staff_id);

create policy "Staff can insert own attendance"
on public.attendance_records for insert
with check (auth.uid() = staff_id);

create policy "Staff can update own attendance"
on public.attendance_records for update
using (auth.uid() = staff_id);

create policy "Principals can view all attendance"
on public.attendance_records for select
using (public.is_principal());

-- --------------------------------------------------------
-- 6. Force PostgREST to pick up the new tables immediately
-- --------------------------------------------------------
notify pgrst, 'reload schema';
