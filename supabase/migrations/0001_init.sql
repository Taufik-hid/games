-- HER DAY ARCADE — initial schema (additive, reversible)

create table if not exists content_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('demo','production')),
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  content_set_id uuid not null references content_sets(id),
  status text not null default 'lobby' check (status in ('lobby','playing','paused','finished')),
  version bigint not null default 0,
  game_order text[] not null default '{}',
  host_passcode_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours'
);

create table if not exists room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  role text not null check (role in ('host','player')),
  token_hash text unique not null,
  display_name text not null,
  last_seen_at timestamptz not null default now(),
  connected boolean not null default false,
  unique (room_id, role)
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  content_set_id uuid not null references content_sets(id) on delete cascade,
  slug text not null,
  title text not null,
  config jsonb not null default '{}',
  unique (content_set_id, slug)
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  type text not null,
  "order" int not null,
  prompt text not null,
  options jsonb,
  answer_key text,          -- server only, never sent to client
  hints jsonb not null default '[]',
  personal_response text,
  media_id uuid,
  personal boolean not null default false
);

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  content_set_id uuid not null references content_sets(id) on delete cascade,
  kind text not null check (kind in ('image','audio','video')),
  storage_path text not null,
  mime text not null,
  size bigint not null,
  alt text,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  content_set_id uuid not null references content_sets(id) on delete cascade,
  slug text not null,
  unlock_rule text not null,   -- game slug yang membuka reward
  title text not null,
  body jsonb not null default '{}',
  media_id uuid,
  unique (content_set_id, slug)
);

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  game_id uuid not null references games(id),
  status text not null default 'locked' check (status in ('locked','available','in_progress','completed')),
  started_at timestamptz,
  completed_at timestamptz,
  score int not null default 0,
  unique (room_id, game_id)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid not null references game_sessions(id) on delete cascade,
  item_id uuid not null,
  answer text,
  is_correct boolean,
  points_awarded int not null default 0,
  hints_used int not null default 0,
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique (game_session_id, item_id)
);

create table if not exists points_ledger (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  game_id uuid not null references games(id),
  item_id uuid,
  points int not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (room_id, game_id, item_id)
);

create table if not exists reward_unlocks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  reward_id uuid not null references rewards(id),
  unlocked_at timestamptz not null default now(),
  unique (room_id, reward_id)
);

create table if not exists events (
  id bigint generated always as identity primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_rooms_code on rooms(code);
create index if not exists idx_members_token on room_members(token_hash);
create index if not exists idx_events_room on events(room_id, id);

-- RLS: deny-by-default (no policies created; service role only used server-side)
alter table content_sets enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table games enable row level security;
alter table questions enable row level security;
alter table media enable row level security;
alter table rewards enable row level security;
alter table game_sessions enable row level security;
alter table submissions enable row level security;
alter table points_ledger enable row level security;
alter table reward_unlocks enable row level security;
alter table events enable row level security;
