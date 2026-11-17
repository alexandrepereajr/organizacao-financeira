-- 1. Colunas de recorrência
alter table public.purchases
  add column is_recurring boolean not null default false,
  add column recurrence_end_month date,
  add constraint purchases_recurring_single check (not is_recurring or installments_count = 1),
  add constraint purchases_recurrence_end_check check (
    recurrence_end_month is null
    or (
      is_recurring
      and extract(day from recurrence_end_month) = 1
      and recurrence_end_month >= first_installment_month
    )
  );

alter table public.incomes
  add column is_recurring boolean not null default false,
  add column recurrence_end_month date,
  add constraint incomes_recurrence_end_check check (
    recurrence_end_month is null
    or (
      is_recurring
      and extract(day from recurrence_end_month) = 1
      and recurrence_end_month >= reference_month
    )
  );

-- 2. create_purchase com recorrência (substitui a versão anterior)
drop function if exists public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text);

create or replace function public.create_purchase(
  p_description text,
  p_total_amount numeric,
  p_purchase_date date,
  p_installments_count integer,
  p_first_installment_month date,
  p_card_id uuid,
  p_shares jsonb,
  p_notes text default null,
  p_is_recurring boolean default false
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
    installments_count, first_installment_month, notes, is_recurring
  )
  values (
    v_uid, p_card_id, p_description, p_total_amount, p_purchase_date,
    p_installments_count, p_first_installment_month, p_notes, v_recurring
  )
  returning id into v_purchase_id;

  insert into public.purchase_shares (purchase_id, contact_id, amount)
  select v_purchase_id, x.contact_id, x.amount
  from jsonb_to_recordset(p_shares) as x(contact_id uuid, amount numeric);

  -- Compra recorrente não gera parcelas: a camada de dados repete o valor a cada mês
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

revoke execute on function public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text, boolean) to authenticated;

-- 3. my_purchase_shares passa a incluir compras recorrentes que valem na janela
create or replace function public.my_purchase_shares(p_from date, p_to date)
returns table (purchase_id uuid, is_owner boolean, my_amount numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, true, coalesce(sum(s.amount) filter (where s.contact_id is null), 0)
  from public.purchases p
  left join public.purchase_shares s on s.purchase_id = p.id
  where p.owner_id = (select auth.uid())
    and (
      exists (
        select 1 from public.installments i
        where i.purchase_id = p.id and i.reference_month between p_from and p_to
      )
      or (
        p.is_recurring
        and p.first_installment_month <= p_to
        and (p.recurrence_end_month is null or p.recurrence_end_month >= p_from)
      )
    )
  group by p.id

  union all

  select p.id, false, sum(s.amount)
  from public.purchases p
  join public.purchase_shares s on s.purchase_id = p.id
  join public.contacts c on c.id = s.contact_id
  where c.linked_user_id = (select auth.uid())
    and (
      exists (
        select 1 from public.installments i
        where i.purchase_id = p.id and i.reference_month between p_from and p_to
      )
      or (
        p.is_recurring
        and p.first_installment_month <= p_to
        and (p.recurrence_end_month is null or p.recurrence_end_month >= p_from)
      )
    )
  group by p.id;
$$;