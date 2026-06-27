create table public.games (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        unique not null,
  name        text        not null,
  description text        not null,
  image_url   text,
  route       text        not null
);

create table public.scores (
  id          uuid        primary key default gen_random_uuid(),
  player_name text        not null,
  game_slug   text        not null references public.games(slug),
  score       integer     not null,
  created_at  timestamptz not null default now()
);
