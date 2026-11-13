-- Nest roommate tables (provisional: align columns with the teammate's "list yourself" form).
-- Separate from the mock-Facebook fb_* tables. Run in the Supabase SQL editor.

create table roommate_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references fb_users(id) on delete cascade,

  -- where this profile came from
  source            text not null check (source in ('post', 'self')),   -- built from a group post, or listed in Nest
  source_post_id    uuid references fb_posts(id) on delete set null,    -- preserved original post
  source_group_id   uuid references fb_groups(id) on delete set null,
  original_text     text,                                               -- copy of the post text at extraction time

  -- what they want
  seeking           text not null check (seeking in ('needs_room', 'has_room')),
  city              text,
  areas             text[] not null default '{}',
  budget_amount     integer,
  budget_basis      text not null default 'unknown' check (budget_basis in ('person', 'home', 'unknown')),
  move_in           date,
  move_out          date,
  -- from the Nest intake form (src/nest/IntentSetup.js); null when built from a post that didn't say
  roommate_count    smallint check (roommate_count between 1 and 3),   -- "how many roommates / people can move in"
  housing_type      text check (housing_type in ('room', 'entire-home', 'either')),
  furnished         boolean,
  prefers_quiet     boolean,                                           -- the only lifestyle toggle on the form today

  -- about them (only what they said; 'unknown' means they did not say)
  occupation_or_school text,
  cleanliness       text not null default 'unknown' check (cleanliness in ('very_tidy', 'tidy', 'relaxed', 'unknown')),
  sleep_schedule    text not null default 'unknown' check (sleep_schedule in ('early', 'night', 'flexible', 'unknown')),
  smoking           text not null default 'unknown' check (smoking in ('smoker', 'non_smoker', 'unknown')),
  pets              text not null default 'unknown' check (pets in ('has_pets', 'ok_with_pets', 'no_pets', 'unknown')),
  social_style      text not null default 'unknown' check (social_style in ('quiet', 'balanced', 'social', 'unknown')),
  other_traits      text[] not null default '{}',
  evidence          text[] not null default '{}',                       -- quotes from the post backing the fields above

  extracted_by      text not null default 'user' check (extracted_by in ('muse', 'mock', 'user')),
  opted_in          boolean not null default true,                      -- visible to matching
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- one profile per post (re-running extraction updates instead of duplicating)
create unique index roommate_profiles_post_uidx on roommate_profiles (source_post_id) where source_post_id is not null;
create index on roommate_profiles (seeking) where opted_in;
create index on roommate_profiles (city);
create index on roommate_profiles using gin (areas);

-- Connection requests between two profiles. Nothing is shared until the other side accepts.
create table roommate_connections (
  id                uuid primary key default gen_random_uuid(),
  requester_id      uuid not null references roommate_profiles(id) on delete cascade,
  recipient_id      uuid not null references roommate_profiles(id) on delete cascade,
  status            text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  message           text,
  created_at        timestamptz not null default now(),
  unique (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);
create index on roommate_connections (recipient_id, status);

-- RLS: mock app. Public read of opted-in profiles; writes open for demo (tighten when auth lands).
alter table roommate_profiles    enable row level security;
alter table roommate_connections enable row level security;
create policy "read opted-in profiles" on roommate_profiles for select using (opted_in);
create policy "demo write profiles"    on roommate_profiles for insert with check (true);
create policy "demo update profiles"   on roommate_profiles for update using (true) with check (true);
create policy "read connections"       on roommate_connections for select using (true);
create policy "demo write connections" on roommate_connections for insert with check (true);
create policy "demo update connections" on roommate_connections for update using (true) with check (true);
