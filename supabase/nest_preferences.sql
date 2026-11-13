-- Adds the nest_preferences table to a database created from an older schema.sql. Safe to run more than once.
-- (Same definition as the nest_preferences block in schema.sql.)

create table if not exists nest_preferences (
  user_id                 uuid primary key references fb_users(id) on delete cascade,
  raw_prompt              text not null,
  intent                  text not null check (intent in ('Home', 'Roommate', 'Both')),
  city                    text not null,
  preferred_neighborhoods text[] not null default '{}',
  start_date              date not null,
  end_date                date not null,
  budget_amount           numeric(10,2) not null check (budget_amount > 0),
  budget_basis            text not null check (budget_basis in ('person', 'home')),
  housing_type            text not null,
  furnished_requirement   boolean not null default false,
  roommate_count          integer check (roommate_count is null or roommate_count > 0),
  already_has_home        boolean,
  must_haves              text[] not null default '{}',
  preferences             text[] not null default '{}',
  source_ids              text[] not null default '{}',
  max_results             integer not null default 5 check (max_results between 1 and 20),
  cadence                 text not null default 'Manual' check (cadence in ('Manual', 'Daily', 'Weekly')),
  notifications_enabled   boolean not null default false,
  goal_json               jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (start_date <= end_date)
);
create index if not exists nest_preferences_city_idx on nest_preferences (city);
create index if not exists nest_preferences_dates_idx on nest_preferences (start_date, end_date);

-- Mock app: the anon key may read and write preferences (tighten when real auth is added).
alter table nest_preferences enable row level security;
drop policy if exists "public read nest preferences"   on nest_preferences;
drop policy if exists "public insert nest preferences" on nest_preferences;
drop policy if exists "public update nest preferences" on nest_preferences;
create policy "public read nest preferences"   on nest_preferences for select using (true);
create policy "public insert nest preferences" on nest_preferences for insert with check (true);
create policy "public update nest preferences" on nest_preferences for update using (true) with check (true);

-- Ask PostgREST to pick up the new table right away (otherwise "not found in the schema cache" can linger).
notify pgrst, 'reload schema';
