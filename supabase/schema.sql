-- Mock Facebook app schema
-- Scope: only what the current Expo mock Facebook UI (App.js) needs.
-- Nest features (housing extraction, matching, discovery) are NOT here; add later.
-- Run in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- users
-- Standalone profile table (no auth dependency yet; can add auth_user_id later).
create table fb_users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  avatar_url    text,
  cover_url     text,
  location      text,                 -- "Seattle, Washington"
  birthday      date,
  created_at    timestamptz not null default now()
);

create table fb_friendships (
  user_id       uuid not null references fb_users(id) on delete cascade,
  friend_id     uuid not null references fb_users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index on fb_friendships (friend_id);

-- ---------------------------------------------------------------- groups
create table fb_groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  cover_url     text,
  privacy       text not null default 'public' check (privacy in ('public','private')),
  created_at    timestamptz not null default now()
);

create table fb_group_members (
  group_id      uuid not null references fb_groups(id) on delete cascade,
  user_id       uuid not null references fb_users(id) on delete cascade,
  role          text not null default 'member' check (role in ('member','admin')),
  pinned        boolean not null default false,   -- "pin" icon in Your groups
  joined_at     timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on fb_group_members (user_id);

-- ---------------------------------------------------------------- posts
-- A post by a user, optionally inside a group (group_id null = profile/home feed post).
create table fb_posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references fb_users(id) on delete cascade,
  group_id      uuid references fb_groups(id) on delete cascade,
  title         text,                 -- bold first line, e.g. "1-Bedroom Apartment Sublet..."
  body          text not null,
  share_count   integer not null default 0,
  created_at    timestamptz not null default now()
);
create index on fb_posts (group_id, created_at desc);
create index on fb_posts (author_id, created_at desc);
create index on fb_posts (created_at desc);

create table fb_post_images (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references fb_posts(id) on delete cascade,
  url           text not null,
  position      smallint not null default 0
);
create index on fb_post_images (post_id, position);

create table fb_comments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references fb_posts(id) on delete cascade,
  author_id     uuid not null references fb_users(id) on delete cascade,
  parent_id     uuid references fb_comments(id) on delete cascade,  -- replies
  body          text not null,
  created_at    timestamptz not null default now()
);
create index on fb_comments (post_id, created_at);

create table fb_reactions (
  post_id       uuid not null references fb_posts(id) on delete cascade,
  user_id       uuid not null references fb_users(id) on delete cascade,
  type          text not null default 'like'
                check (type in ('like','love','care','haha','wow','sad','angry')),
  created_at    timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Feed-ready counts so the UI doesn't compute them client-side.
create view fb_post_stats as
select p.id as post_id,
       (select count(*) from fb_reactions r where r.post_id = p.id) as reaction_count,
       (select count(*) from fb_comments  c where c.post_id = p.id) as comment_count,
       p.share_count
from fb_posts p;

-- ---------------------------------------------------------------- stories
create table fb_stories (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references fb_users(id) on delete cascade,
  image_url     text not null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '24 hours'
);
create index on fb_stories (created_at desc);

-- ---------------------------------------------------------------- reels
create table fb_reels (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references fb_users(id) on delete cascade,
  video_url     text,
  thumbnail_url text,
  location      text,
  caption       text,
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  share_count   integer not null default 0,
  save_count    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- marketplace
create table fb_marketplace_listings (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references fb_users(id) on delete cascade,
  title         text not null,
  description   text,
  price         numeric(10,2),        -- null/0 = free
  currency      text not null default 'USD',
  location      text,
  category      text,
  status        text not null default 'available' check (status in ('available','pending','sold')),
  created_at    timestamptz not null default now()
);
create index on fb_marketplace_listings (status, created_at desc);
create index on fb_marketplace_listings (category);

create table fb_marketplace_images (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references fb_marketplace_listings(id) on delete cascade,
  url           text not null,
  position      smallint not null default 0
);
create index on fb_marketplace_images (listing_id, position);

-- Marketplace inbox: one thread per (listing, buyer).
create table fb_marketplace_threads (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references fb_marketplace_listings(id) on delete cascade,
  buyer_id      uuid not null references fb_users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create table fb_marketplace_messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references fb_marketplace_threads(id) on delete cascade,
  sender_id     uuid not null references fb_users(id) on delete cascade,
  body          text not null,
  is_system     boolean not null default false,  -- "marked the listing as sold."
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index on fb_marketplace_messages (thread_id, created_at);

-- ---------------------------------------------------------------- notifications
create table fb_notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references fb_users(id) on delete cascade,  -- recipient
  actor_id      uuid references fb_users(id) on delete set null,          -- who caused it
  type          text not null default 'generic',  -- post, comment, group, system, ...
  message       text not null,
  post_id       uuid references fb_posts(id) on delete cascade,
  group_id      uuid references fb_groups(id) on delete cascade,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index on fb_notifications (user_id, created_at desc);

-- ---------------------------------------------------------------- nest preferences
-- The confirmed answers from the Nest intake flow. This is separate from the
-- Facebook mock profile so the app can evolve the intake without changing it.
create table nest_preferences (
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
  notifications_enabled  boolean not null default false,
  goal_json               jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (start_date <= end_date)
);
create index on nest_preferences (city);
create index on nest_preferences (start_date, end_date);

-- ---------------------------------------------------------------- RLS
-- Mock app: everything is publicly readable with the anon key.
-- Writes happen via the service role (seed script) for now.
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'fb\_%'
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop;
end $$;

alter table nest_preferences enable row level security;
create policy "public read nest preferences"
  on nest_preferences for select using (true);
create policy "public insert nest preferences"
  on nest_preferences for insert with check (true);
create policy "public update nest preferences"
  on nest_preferences for update using (true) with check (true);
