-- p_shares: [{"contact_id": "<uuid ou null>", "amount": 50.00}, ...]
-- contact_id nulo = o próprio usuário
create or replace function public.create_purchase(
  p_description text,
  p_total_amount numeric,
  p_purchase_date date,
  p_installments_count integer,
  p_first_installment_month date,
  p_card_id uuid,
  p_shares jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
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
    installments_count, first_installment_month, notes
  )
  values (
    v_uid, p_card_id, p_description, p_total_amount, p_purchase_date,
    p_installments_count, p_first_installment_month, p_notes
  )
  returning id into v_purchase_id;

  insert into public.purchase_shares (purchase_id, contact_id, amount)
  select v_purchase_id, x.contact_id, x.amount
  from jsonb_to_recordset(p_shares) as x(contact_id uuid, amount numeric);

  -- Parcelas em centavos; o resto da divisão vai de 1 centavo nas primeiras parcelas
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

  return v_purchase_id;
end;
$$;

revoke execute on function public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text) from public, anon;
grant execute on function public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text) to authenticated;