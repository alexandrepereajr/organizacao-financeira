create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  card_id uuid references public.cards (id) on delete set null,
  description text not null,
  total_amount numeric(12,2) not null check (total_amount > 0),
  purchase_date date not null,
  installments_count smallint not null default 1 check (installments_count between 1 and 120),
  first_installment_month date not null check (extract(day from first_installment_month) = 1),
  notes text,
  created_at timestamptz not null default now()
);

create index purchases_owner_idx on public.purchases (owner_id);

-- Divisão da compra: contact_id nulo = o próprio dono da compra
create table public.purchase_shares (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0)
);

create index purchase_shares_purchase_idx on public.purchase_shares (purchase_id);
create unique index purchase_shares_owner_unique
  on public.purchase_shares (purchase_id) where contact_id is null;
create unique index purchase_shares_contact_unique
  on public.purchase_shares (purchase_id, contact_id) where contact_id is not null;

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  number smallint not null check (number >= 1),
  amount numeric(12,2) not null check (amount >= 0),
  reference_month date not null check (extract(day from reference_month) = 1),
  unique (purchase_id, number)
);

create index installments_month_idx on public.installments (reference_month);

-- Quem pode ver uma compra: o dono ou alguém com conta citado nela.
-- Usa security definer para evitar recursão entre as políticas.
create or replace function public.can_view_purchase(p_purchase_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.purchases p
      where p.id = p_purchase_id and p.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.purchase_shares s
      join public.contacts c on c.id = s.contact_id
      where s.purchase_id = p_purchase_id
        and c.linked_user_id = (select auth.uid())
    );
$$;

revoke execute on function public.can_view_purchase(uuid) from public, anon;
grant execute on function public.can_view_purchase(uuid) to authenticated;

alter table public.purchases enable row level security;
alter table public.purchase_shares enable row level security;
alter table public.installments enable row level security;

create policy "purchases_select" on public.purchases
for select to authenticated using (public.can_view_purchase(id));

create policy "purchases_delete_owner" on public.purchases
for delete to authenticated using (owner_id = (select auth.uid()));

create policy "purchase_shares_select" on public.purchase_shares
for select to authenticated using (public.can_view_purchase(purchase_id));

create policy "installments_select" on public.installments
for select to authenticated using (public.can_view_purchase(purchase_id));

-- Quem foi citado numa compra consegue ver o perfil de quem a criou
create policy "profiles_select_purchase_owner" on public.profiles
for select to authenticated
using (
  exists (
    select 1 from public.purchases p
    where p.owner_id = profiles.id and public.can_view_purchase(p.id)
  )
);