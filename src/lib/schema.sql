-- Supabase-backed fitness app schema.
-- Run this in the Supabase SQL editor, then deploy supabase/functions/ai-coach
-- with the ANTHROPIC_API_KEY secret set on the project.

create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text unique not null,
  display_name text not null,
  actual_age integer check (actual_age is null or actual_age between 16 and 80),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_json jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.body_metrics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_lbs numeric,
  body_fat_pct numeric,
  visceral_fat numeric,
  muscle_mass_lbs numeric,
  bmr numeric,
  metabolic_age numeric,
  waist_inches numeric,
  neck_inches numeric,
  raw_data jsonb not null default '{}',
  imported_at timestamptz not null default now(),
  unique(user_id, date)
);

create table if not exists public.workout_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  exercise_name text not null,
  set_number integer,
  weight_lbs numeric,
  reps integer,
  rpe integer,
  raw_data jsonb not null default '{}',
  logged_at timestamptz not null default now()
);

create table if not exists public.nutrition_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_name text,
  kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  raw_data jsonb not null default '{}',
  logged_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.app_state enable row level security;
alter table public.body_metrics enable row level security;
alter table public.workout_logs enable row level security;
alter table public.nutrition_logs enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles
  for select to authenticated
  using (private.is_admin());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "app_state_select_own" on public.app_state;
drop policy if exists "app_state_select_admin" on public.app_state;
drop policy if exists "app_state_insert_own" on public.app_state;
drop policy if exists "app_state_update_own" on public.app_state;
drop policy if exists "app_state_delete_own" on public.app_state;
create policy "app_state_select_own" on public.app_state
  for select to authenticated
  using (auth.uid() = user_id);
create policy "app_state_select_admin" on public.app_state
  for select to authenticated
  using (private.is_admin());
create policy "app_state_insert_own" on public.app_state
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy "app_state_update_own" on public.app_state
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "app_state_delete_own" on public.app_state
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "body_metrics_all_own" on public.body_metrics;
drop policy if exists "body_metrics_select_admin" on public.body_metrics;
create policy "body_metrics_all_own" on public.body_metrics
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "body_metrics_select_admin" on public.body_metrics
  for select to authenticated
  using (private.is_admin());

drop policy if exists "workout_logs_all_own" on public.workout_logs;
drop policy if exists "workout_logs_select_admin" on public.workout_logs;
create policy "workout_logs_all_own" on public.workout_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "workout_logs_select_admin" on public.workout_logs
  for select to authenticated
  using (private.is_admin());

drop policy if exists "nutrition_logs_all_own" on public.nutrition_logs;
drop policy if exists "nutrition_logs_select_admin" on public.nutrition_logs;
create policy "nutrition_logs_all_own" on public.nutrition_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "nutrition_logs_select_admin" on public.nutrition_logs
  for select to authenticated
  using (private.is_admin());

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'));
  if base_username = '' then
    base_username := 'user';
  end if;

  insert into public.profiles (id, email, username, display_name, actual_age)
  values (
    new.id,
    new.email,
    base_username,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), new.email),
    nullif(new.raw_user_meta_data->>'actual_age', '')::integer
  )
  on conflict (id) do nothing;

  insert into public.app_state (user_id, state_json)
  values (new.id, '{}')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function private.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id := old.id;
  new.email := old.email;
  new.is_admin := old.is_admin;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute procedure private.protect_profile_fields();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.app_state to authenticated;
grant select, insert, update, delete on public.body_metrics to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.nutrition_logs to authenticated;
