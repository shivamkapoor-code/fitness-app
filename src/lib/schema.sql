-- Profiles table (PIN auth, max 10 users)
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  pin_hash text not null,
  display_name text,
  actual_age integer default 30,
  is_admin boolean default false,
  created_at timestamptz default now(),
  last_active timestamptz default now()
);

-- Body metrics
create table if not exists public.body_metrics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  weight_lbs numeric,
  body_fat_pct numeric,
  visceral_fat numeric,
  muscle_mass_lbs numeric,
  bmr numeric,
  metabolic_age numeric,
  waist_inches numeric,
  neck_inches numeric,
  raw_data jsonb default '{}',
  imported_at timestamptz default now(),
  unique(user_id, date)
);

-- Workout logs
create table if not exists public.workout_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  exercise_name text not null,
  set_number integer,
  weight_lbs numeric,
  reps integer,
  rpe integer,
  raw_data jsonb default '{}',
  logged_at timestamptz default now()
);

-- Nutrition logs
create table if not exists public.nutrition_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  meal_name text,
  kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  raw_data jsonb default '{}',
  logged_at timestamptz default now()
);

-- App state (inflammation, supplements, queue, stiffness)
create table if not exists public.app_state (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  state_json jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Disable RLS for prototype (enable per-user policies later)
alter table public.profiles disable row level security;
alter table public.body_metrics disable row level security;
alter table public.workout_logs disable row level security;
alter table public.nutrition_logs disable row level security;
alter table public.app_state disable row level security;
