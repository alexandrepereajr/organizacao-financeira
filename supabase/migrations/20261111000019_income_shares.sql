-- 1. Destinos de parte de uma entrada
create table public.income_shares (
  id uuid primary key default gen_random_uuid(),
  income_id uuid not null references public.incomes (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete restrict,
  shared_account_id uuid references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('percent', 'amount')),
  value numeric(12, 4) not null check (value > 0),
  constraint income_shares_one_recipient
    check ((contact_id is not null)::int + (shared_account_id is not null)::int = 1),
  constraint income_shares_percent_max
    check (kind <> 'percent' or value <= 100)
);

create unique index income_shares_contact_unique
  on public.income_shares (income_id, contact_id) where contact_id is not null;

create unique index income_shares_account_unique
  on public.income_shares (income_id, shared_account_id) where shared_account_id is not null;

alter table public.income_shares enable row level security;

-- Leitura pela dona da entrada; as alterações passam pelas funções abaixo
create policy "income_shares_select" on public.income_shares
for select to authenticated
using (
  exists (
    select 1 from public.incomes i
    where i.id = income_shares.income_id
      and i.owner_id = (select public.active_account())
  )
);

-- 2. Valida os destinos de uma entrada (uso interno)
-- p_shares: [{"recipient": "contact" ou "account", "id": "<uuid>", "kind": "percent" ou "amount", "value": 30}]
create or replace function public.validate_income_shares(p_owner uuid, p_amount numeric, p_shares jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric;
begin
  if p_shares is null or jsonb_typeof(p_shares) <> 'array' then
    raise exception 'Destinos inválidos';
  end if;

  if jsonb_array_length(p_shares) = 0 then
    return;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_shares) as x(recipient text, id uuid, kind text, value numeric)
    where x.recipient is null or x.recipient not in ('contact', 'account')
       or x.id is null
       or x.kind is null or x.kind not in ('percent', 'amount')
       or coalesce(x.value, 0) <= 0
       or (x.kind = 'percent' and x.value > 100)
  ) then
    raise exception 'Destino inválido';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_shares) as x(recipient text, id uuid, kind text, value numeric)
    where x.recipient = 'contact'
      and not exists (
        select 1 from public.contacts c where c.id = x.id and c.owner_id = p_owner
      )
  ) then
    raise exception 'Destino inválido';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_shares) as x(recipient text, id uuid, kind text, value numeric)
    where x.recipient = 'account'
      and not exists (
        select 1
        from public.account_members m
        join public.profiles a on a.id = m.shared_account_id
        where m.shared_account_id = x.id
          and m.member_user_id = p_owner
          and m.status = 'active'
          and a.account_type = 'shared'
      )
  ) then
    raise exception 'Destino inválido';
  end if;

  select coalesce(sum(case when x.kind = 'percent' then round(p_amount * x.value / 100, 2) else x.value end), 0)
  into v_total
  from jsonb_to_recordset(p_shares) as x(recipient text, id uuid, kind text, value numeric);

  if v_total > p_amount then
    raise exception 'O total destinado passa do valor da entrada';
  end if;
end;
$$;

-- 3. Grava os destinos de uma entrada, substituindo os anteriores (uso interno)
create or replace function public.set_income_shares(p_income uuid, p_shares jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.income_shares where income_id = p_income;

  insert into public.income_shares (income_id, contact_id, shared_account_id, kind, value)
  select p_income,
         case when x.recipient = 'contact' then x.id end,
         case when x.recipient = 'account' then x.id end,
         x.kind,
         x.value
  from jsonb_to_recordset(p_shares) as x(recipient text, id uuid, kind text, value numeric);
end;
$$;

revoke execute on function public.validate_income_shares(uuid, numeric, jsonb) from public, anon, authenticated;
revoke execute on function public.set_income_shares(uuid, jsonb) from public, anon, authenticated;

-- 4. Cria uma entrada (única, repetida por N meses ou recorrente) com os destinos
create or replace function public.create_income(
  p_description text,
  p_amount numeric,
  p_start_month date,
  p_repeat integer,
  p_recurring boolean,
  p_category uuid default null,
  p_shares jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.active_account();
  v_recurring boolean := coalesce(p_recurring, false);
  v_count integer := case when coalesce(p_recurring, false) then 1 else greatest(coalesce(p_repeat, 1), 1) end;
  v_id uuid;
  i integer;
begin
  if auth.uid() is null or v_owner is null then
    raise exception 'Não autenticado';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Valor inválido';
  end if;

  if extract(day from p_start_month) <> 1 or v_count > 60 then
    raise exception 'Período inválido';
  end if;

  if p_category is not null and not exists (
    select 1 from public.categories
    where id = p_category and owner_id = v_owner and kind = 'income'
  ) then
    raise exception 'Categoria inválida';
  end if;

  perform public.validate_income_shares(v_owner, p_amount, p_shares);

  for i in 0..(v_count - 1) loop
    insert into public.incomes (
      owner_id, category_id, description, amount, reference_month, is_recurring, created_by
    )
    values (
      v_owner, p_category, p_description, p_amount,
      (p_start_month + (i * interval '1 month'))::date, v_recurring, auth.uid()
    )
    returning id into v_id;

    perform public.set_income_shares(v_id, p_shares);
  end loop;

  return v_count;
end;
$$;

-- 5. Altera uma entrada a partir do mês indicado (recorrente que começou antes vira duas séries)
create or replace function public.update_income(
  p_id uuid,
  p_month date,
  p_description text,
  p_amount numeric,
  p_category uuid default null,
  p_shares jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.active_account();
  v_row public.incomes;
  v_new uuid;
begin
  if auth.uid() is null or v_owner is null then
    raise exception 'Não autenticado';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Valor inválido';
  end if;

  select * into v_row
  from public.incomes
  where id = p_id and owner_id = v_owner;

  if not found then
    raise exception 'Entrada inexistente';
  end if;

  if p_category is not null and not exists (
    select 1 from public.categories
    where id = p_category and owner_id = v_owner and kind = 'income'
  ) then
    raise exception 'Categoria inválida';
  end if;

  perform public.validate_income_shares(v_owner, p_amount, p_shares);

  if not v_row.is_recurring or v_row.reference_month >= p_month then
    -- Entrada única, ou recorrente que começa neste mês: altera no lugar
    update public.incomes
    set description = p_description, amount = p_amount, category_id = p_category
    where id = p_id;

    perform public.set_income_shares(p_id, p_shares);
  else
    -- Recorrente que começou antes: encerra a antiga no mês anterior e cria a nova a partir deste mês
    insert into public.incomes (
      owner_id, category_id, description, amount, reference_month,
      is_recurring, recurrence_end_month, created_by
    )
    values (
      v_owner, p_category, p_description, p_amount, p_month,
      true, v_row.recurrence_end_month, auth.uid()
    )
    returning id into v_new;

    perform public.set_income_shares(v_new, p_shares);

    update public.incomes
    set recurrence_end_month = (p_month - interval '1 month')::date
    where id = p_id;
  end if;
end;
$$;

-- 6. Entradas destinadas à conta ativa por outras contas (só a parte destinada)
create or replace function public.incomes_destined_to_me(p_from date, p_to date)
returns table (
  income_id uuid,
  owner_name text,
  description text,
  reference_month date,
  is_recurring boolean,
  recurrence_end_month date,
  destined_amount numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, p.display_name, i.description, i.reference_month, i.is_recurring, i.recurrence_end_month,
         sum(case when s.kind = 'percent' then round(i.amount * s.value / 100, 2)
                  else least(s.value, i.amount) end)
  from public.income_shares s
  join public.incomes i on i.id = s.income_id
  join public.profiles p on p.id = i.owner_id
  left join public.contacts c on c.id = s.contact_id
  where (
          s.shared_account_id = (select public.active_account())
          or c.linked_user_id = (select public.active_account())
        )
    and (
          (not i.is_recurring and i.reference_month between p_from and p_to)
          or (
            i.is_recurring
            and i.reference_month <= p_to
            and (i.recurrence_end_month is null or i.recurrence_end_month >= p_from)
          )
        )
  group by i.id, p.display_name, i.description, i.reference_month, i.is_recurring, i.recurrence_end_month;
$$;

revoke execute on function public.create_income(text, numeric, date, integer, boolean, uuid, jsonb) from public, anon;
revoke execute on function public.update_income(uuid, date, text, numeric, uuid, jsonb) from public, anon;
revoke execute on function public.incomes_destined_to_me(date, date) from public, anon;

grant execute on function public.create_income(text, numeric, date, integer, boolean, uuid, jsonb) to authenticated;
grant execute on function public.update_income(uuid, date, text, numeric, uuid, jsonb) to authenticated;
grant execute on function public.incomes_destined_to_me(date, date) to authenticated;