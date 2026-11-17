-- Categorias, por dono, separadas para compras e entradas
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('purchase', 'income')),
  name text not null check (char_length(name) between 2 and 40),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index categories_owner_kind_name_unique
  on public.categories (owner_id, kind, lower(name));

alter table public.categories enable row level security;

create policy "categories_owner_all" on public.categories
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- Conjunto inicial de categorias
create or replace function public.seed_default_categories(p_owner uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categories (owner_id, kind, name)
  select p_owner, v.kind, v.name
  from (values
    ('purchase', 'Alimentação'), ('purchase', 'Moradia'), ('purchase', 'Transporte'),
    ('purchase', 'Saúde'), ('purchase', 'Educação'), ('purchase', 'Lazer'),
    ('purchase', 'Compras'), ('purchase', 'Assinaturas'), ('purchase', 'Outros'),
    ('income', 'Salário'), ('income', 'Freelance'), ('income', 'Rendimentos'),
    ('income', 'Outros')
  ) as v(kind, name)
  on conflict do nothing;
$$;

revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;

-- Contas novas já nascem com as categorias iniciais
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_type text := case
    when new.raw_user_meta_data ->> 'account_type' = 'shared' then 'shared'
    else 'normal'
  end;
begin
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  insert into public.profiles (id, display_name, username, account_type)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    v_username,
    v_type
  );

  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

-- Perfis que já existam também recebem as categorias iniciais
select public.seed_default_categories(id) from public.profiles;

-- Categoria opcional em compras e entradas
alter table public.purchases
  add column category_id uuid references public.categories (id) on delete set null;

alter table public.incomes
  add column category_id uuid references public.categories (id) on delete set null;

-- A categoria de uma entrada precisa ser do mesmo dono e do tipo entrada
create or replace function public.check_income_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.owner_id = new.owner_id and c.kind = 'income'
  ) then
    raise exception 'Categoria inválida para a entrada';
  end if;
  return new;
end;
$$;

create trigger incomes_check_category
before insert or update of category_id on public.incomes
for each row execute function public.check_income_category();

-- create_purchase com categoria (substitui a versão anterior)
drop function if exists public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text, boolean);

create or replace function public.create_purchase(
  p_description text,
  p_total_amount numeric,
  p_purchase_date date,
  p_installments_count integer,
  p_first_installment_month date,
  p_card_id uuid,
  p_shares jsonb,
  p_notes text default null,
  p_is_recurring boolean default false,
  p_category_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_recurring boolean := coalesce(p_is_recurring, false);
  v_purchase_id uuid;
  v_cents bigint;
  v_base bigint;
  v_rem bigint;
  v_shares_sum numeric;
  i integer;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if v_recurring and p_installments_count <> 1 then
    raise exception 'Compra recorrente não tem parcelas';
  end if;

  if p_card_id is not null and not exists (
    select 1 from public.cards where id = p_card_id and owner_id = v_uid
  ) then
    raise exception 'Cartão inválido';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories
    where id = p_category_id and owner_id = v_uid and kind = 'purchase'
  ) then
    raise exception 'Categoria inválida';
  end if;

  if p_shares is null or jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'Informe ao menos uma divisão da compra';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_shares) as x(contact_id uuid, amount numeric)
    where x.contact_id is not null
      and not exists (
        select 1 from public.contacts c
        where c.id = x.contact_id and c.owner_id = v_uid
      )
  ) then
    raise exception 'Contato inválido na divisão';
  end if;

  select coalesce(sum(x.amount), 0)
  into v_shares_sum
  from jsonb_to_recordset(p_shares) as x(contact_id uuid, amount numeric);

  if v_shares_sum <> p_total_amount then
    raise exception 'A soma das divisões (%) difere do total (%)', v_shares_sum, p_total_amount;
  end if;

  insert into public.purchases (
    owner_id, card_id, description, total_amount, purchase_date,
    installments_count, first_installment_month, notes, is_recurring, category_id
  )
  values (
    v_uid, p_card_id, p_description, p_total_amount, p_purchase_date,
    p_installments_count, p_first_installment_month, p_notes, v_recurring, p_category_id
  )
  returning id into v_purchase_id;

  insert into public.purchase_shares (purchase_id, contact_id, amount)
  select v_purchase_id, x.contact_id, x.amount
  from jsonb_to_recordset(p_shares) as x(contact_id uuid, amount numeric);

  if not v_recurring then
    v_cents := round(p_total_amount * 100)::bigint;
    v_base := v_cents / p_installments_count;
    v_rem := v_cents - v_base * p_installments_count;

    for i in 1..p_installments_count loop
      insert into public.installments (purchase_id, number, amount, reference_month)
      values (
        v_purchase_id,
        i,
        (v_base + case when i <= v_rem then 1 else 0 end)::numeric / 100,
        (p_first_installment_month + ((i - 1) * interval '1 month'))::date
      );
    end loop;
  end if;

  return v_purchase_id;
end;
$$;

revoke execute on function public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text, boolean, uuid) from public, anon;
grant execute on function public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text, boolean, uuid) to authenticated;