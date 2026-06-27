alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "public read games"
  on public.games for select
  using (true);

create policy "public read scores"
  on public.scores for select
  using (true);

create policy "public insert scores"
  on public.scores for insert
  with check (true);
