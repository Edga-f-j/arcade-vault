-- ===== ARCADE VAULT · esquema Prod (replica de Dev) =====
-- Pega y ejecuta este script completo en el SQL Editor de PRODUCCIÓN.
-- Es idempotente: se puede re-ejecutar sin romper nada.
-- Migra: tablas, RLS + políticas, funciones/triggers, hardening y seed de juegos.
-- NO migra scores ni profiles (datos de prueba de Dev). Prod arranca limpio.

-- 1) Tablas
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  image_url text,
  route text not null
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (char_length(username) <= 10),
  created_at timestamptz not null default now()
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  game_slug text not null references public.games(slug),
  score integer not null,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id)
);

-- 2) RLS habilitado
alter table public.games    enable row level security;
alter table public.profiles enable row level security;
alter table public.scores   enable row level security;

-- 3) Políticas (drop+create para idempotencia)
drop policy if exists "public read" on public.games;
create policy "public read" on public.games for select using (true);

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles for select using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "public read scores" on public.scores;
create policy "public read scores" on public.scores for select using (true);
drop policy if exists "authenticated insert own scores" on public.scores;
create policy "authenticated insert own scores" on public.scores
  for insert to authenticated with check (auth.uid() = user_id);

-- 4) Función + trigger de creación de perfil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  derived_username text;
begin
  derived_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(split_part(coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ), ' ', 1)), ''),
    left(split_part(new.email, '@', 1), 10)
  );
  insert into public.profiles (id, username)
  values (new.id, left(regexp_replace(upper(derived_username), '[^A-Z0-9_]', '', 'g'), 10));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Event trigger: RLS automático en tablas nuevas de public
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare cmd record;
begin
  for cmd in
    select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
    if cmd.schema_name = 'public' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
      exception when others then
        raise log 'rls_auto_enable: failed on %', cmd.object_identity;
      end;
    end if;
  end loop;
end;
$$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls on ddl_command_end execute function public.rls_auto_enable();

-- 6) Hardening: revocar EXECUTE de las funciones SECURITY DEFINER
revoke execute on function public.handle_new_user()  from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()  from public, anon, authenticated;

-- 7) Seed del catálogo (5 juegos). on conflict = re-ejecutable
insert into public.games (slug, name, description, image_url, route) values
  ('arkanoid','Arkanoid','El clásico arcade de paleta y pelota. Rompe todos los bloques de cada nivel sin dejar caer la pelota. ¿Puedes completar los 5 niveles?','/games/arkanoid/arkanoid.png','/games/arkanoid'),
  ('asteroids','Asteroids','Destruye asteroides y sobrevive el mayor tiempo posible.',null,'/games/asteroids'),
  ('frogger','FROGGER','Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.',null,'/games/frogger'),
  ('snake','Snake','El clásico juego de la serpiente. Come frutas para crecer y subir de nivel — pero no choques con las paredes ni contigo mismo.','/games/snake/snake.png','/games/snake'),
  ('tetris','Tetris','El clásico puzzle de bloques que caen. Encaja tetrominos, completa líneas y sube de nivel antes de que el tablero se llene.','/games/tetris.png','/games/tetris')
on conflict (slug) do update
  set name=excluded.name, description=excluded.description,
      image_url=excluded.image_url, route=excluded.route;
