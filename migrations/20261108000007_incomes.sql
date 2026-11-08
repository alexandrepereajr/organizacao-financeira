create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  reference_month date not null check (extract(day from reference_month) = 1),
  created_at timestamptz not null default now()
);

create index incomes_owner_month_idx on public.incomes (owner_id, reference_month);

alter table public.incomes enable row level security;

create policy "incomes_owner_all" on public.incomes
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));