-- Valor real da fatura fechada de cada cartão em cada mês
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  reference_month date not null check (extract(day from reference_month) = 1),
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (card_id, reference_month)
);

alter table public.invoices enable row level security;

create policy "invoices_owner_all" on public.invoices
for all to authenticated
using (exists (
  select 1 from public.cards c
  where c.id = invoices.card_id and c.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.cards c
  where c.id = invoices.card_id and c.owner_id = (select auth.uid())
));