-- Ep.16 diary schema.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Every table holds rows for one signed-in person, keyed by user_id.
-- Row Level Security (RLS) means a person can only ever read or change their own rows.
-- Only the "authenticated" role gets table access; signed-out visitors ("anon") get none.

-- ---------- diary entries: one row per person per drama ----------
create table public.diary_entries (
  user_id          uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  show_id          integer     not null,                      -- TMDB TV id
  -- A copy of the drama's basics, so the diary and Wrapped work without calling TMDB.
  title            text        not null check (char_length(title) between 1 and 300),
  poster_path      text,
  first_air_date   date,
  genre_ids        integer[]   not null default '{}',
  total_episodes   integer     check (total_episodes is null or total_episodes > 0),
  -- The person's own log.
  status           text        not null check (status in ('watched', 'watching', 'want')),
  rating           numeric(2, 1) check (rating is null or (rating between 0.5 and 5 and rating * 2 = floor(rating * 2))),
  note             text        not null default '' check (char_length(note) <= 5000),
  logged_on        date        not null default current_date,  -- finished / started / added, depending on status
  episodes_watched integer     not null default 0 check (episodes_watched >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, show_id)
);

create index diary_entries_user_updated on public.diary_entries (user_id, updated_at desc);

-- ---------- rewatches: many per diary entry ----------
create table public.rewatches (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null default auth.uid(),
  show_id    integer     not null,
  watched_on date        not null default current_date,
  rating     numeric(2, 1) check (rating is null or (rating between 0.5 and 5 and rating * 2 = floor(rating * 2))),
  note       text        not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (user_id, show_id) references public.diary_entries (user_id, show_id) on delete cascade
);

create index rewatches_entry on public.rewatches (user_id, show_id);

-- ---------- favorite actors ----------
create table public.favorite_actors (
  user_id      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  person_id    integer     not null,                          -- TMDB person id
  name         text        not null check (char_length(name) between 1 and 200),
  profile_path text,
  created_at   timestamptz not null default now(),
  primary key (user_id, person_id)
);

-- ---------- keep updated_at current ----------
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger diary_entries_updated_at
  before update on public.diary_entries
  for each row execute function public.set_updated_at();

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ---------- privacy: row level security ----------
alter table public.diary_entries   enable row level security;
alter table public.rewatches       enable row level security;
alter table public.favorite_actors enable row level security;

-- One policy per table covering select/insert/update/delete: only your own rows.
-- (select auth.uid()) is evaluated once per query instead of once per row.
create policy "Own diary entries" on public.diary_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own rewatches" on public.rewatches
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own favorite actors" on public.favorite_actors
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Table access for signed-in users only (RLS above still limits them to their own rows).
revoke all on public.diary_entries, public.rewatches, public.favorite_actors from anon, authenticated;
grant select, insert, update, delete on public.diary_entries, public.rewatches, public.favorite_actors to authenticated;

-- ---------- account deletion (required by the App Store) ----------
-- Deleting the auth user cascades to every row above.
create function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
