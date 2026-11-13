-- Nest AI layer. Run once in the Supabase SQL editor (after schema.sql).
-- Derived data: everything here is produced by Muse from fb_posts and can be rebuilt.

-- Which posts Muse has already analyzed. Makes ingestion incremental and idempotent.
create table if not exists nest_ingested_posts (
  post_id      uuid primary key references fb_posts(id) on delete cascade,
  category     text not null,
  confidence   real,
  provider     text not null check (provider in ('muse','mock')),
  duplicate_of uuid references fb_posts(id) on delete set null,
  needs_review boolean not null default false,
  analysis     jsonb not null,            -- full validated Muse output
  analyzed_at  timestamptz not null default now()
);
create index if not exists nest_ingested_category on nest_ingested_posts (category);

-- Structured housing listings extracted from posts. `listing` is the exact shape the app consumes.
create table if not exists nest_listings (
  post_id       uuid primary key references fb_posts(id) on delete cascade,
  city          text,
  neighborhood  text,
  monthly_rent  integer not null,
  rent_basis    text,
  source_id     text,
  available_from date,
  available_to   date,
  listing       jsonb not null,
  created_at    timestamptz not null default now()
);
create index if not exists nest_listings_city on nest_listings (city);
create index if not exists nest_listings_hood on nest_listings (neighborhood);
create index if not exists nest_listings_rent on nest_listings (monthly_rent);
create index if not exists nest_listings_dates on nest_listings (available_from, available_to);

-- People who posted that they are looking for roommates.
create table if not exists nest_roommates (
  post_id       uuid primary key references fb_posts(id) on delete cascade,
  author_id     uuid references fb_users(id) on delete cascade,
  budget        integer,
  city          text,
  source_id     text,
  profile       jsonb not null,
  created_at    timestamptz not null default now()
);
create index if not exists nest_roommates_author on nest_roommates (author_id);

-- Everything users type into Nest + what Muse understood. Feeds Local Discovery recommendations
-- (interests, neighborhoods, budgets, timing patterns). Private: no public read policy.
create table if not exists nest_user_queries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references fb_users(id) on delete set null,
  kind          text not null check (kind in ('interpret','search')),
  raw_query     text not null,
  goal          jsonb,                    -- structured goal Muse produced / the user confirmed
  interpreted_via text,                   -- 'muse' | 'fallback'
  missing       text,                     -- follow-up question Muse asked, if any
  home_count    integer,
  roommate_count integer,
  created_at    timestamptz not null default now()
);
create index if not exists nest_queries_user on nest_user_queries (user_id, created_at desc);
create index if not exists nest_queries_created on nest_user_queries (created_at desc);

-- RLS: derived listing data is readable like the posts it came from; writes use the service role.
alter table nest_ingested_posts enable row level security;
alter table nest_listings       enable row level security;
alter table nest_roommates      enable row level security;
alter table nest_user_queries   enable row level security;  -- service role only
drop policy if exists "public read" on nest_listings;
drop policy if exists "public read" on nest_roommates;
create policy "public read" on nest_listings  for select using (true);
create policy "public read" on nest_roommates for select using (true);

-- Realtime: lets the Nest server hear new posts instantly and ingest them (no webhook / public URL needed).
do $$ begin
  alter publication supabase_realtime add table fb_posts;
exception when duplicate_object then null;
end $$;
