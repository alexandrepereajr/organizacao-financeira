create table public.cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index cards_owner_idx on public.cards (owner_id);

alter table public.cards enable row level security;

create policy "cards_owner_all"
on public.cards for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));