-- Editar e excluir compras (parte 9d)
-- 1. Validação dos dados de uma compra (uso interno; mesmas regras de create_purchase)
-- 2. update_purchase: altera a compra, refazendo divisão e parcelas
-- 3. delete_purchase: exclui a compra, ou encerra uma recorrente a partir do mês
--
-- Só a conta dona da compra (a conta ativa) edita ou exclui.
-- Recorrente que começou antes do mês indicado: a série antiga termina no mês
-- anterior e uma nova começa no mês indicado, como em update_income.

-- 1. Validação. Devolve se a compra fica pendente (vinculada a uma conta
--    compartilhada e ainda sem participantes dela na divisão).
create or replace function public.check_purchase_input(
  p_owner uuid,
  p_card_id uuid,
  p_category_id uuid,
  p_shares jsonb,
  p_shared_account uuid,
  p_total_amount numeric,
  p_is_recurring boolean,
  p_installments_count integer
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shares_sum numeric;
begin
  if p_is_recurring and p_installments_count <> 1 then
    raise exception 'Compra recorrente não tem parcelas';
  end if;

  if p_card_id is not null and not exists (
    select 1 from public.cards c
    where c.id = p_card_id
      and (
        c.owner_id = p_owner
        or (
          not c.hide_from_shared
          and exists (
            select 1 from public.profiles o
            where o.id = p_owner and o.account_type = 'shared'
          )
          and exists (
            select 1 from public.account_members m
            where m.shared_account_id = p_owner
              and m.member_user_id = c.owner_id
              and m.status = 'active'
          )
        )
      )
  ) then
    raise exception 'Cartão inválido';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories
    where id = p_category_id and owner_id = p_owner and kind = 'purchase'
  ) then
    raise exception 'Categoria inválida';
  end if;

  if p_shares is null or jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'Informe ao menos uma divisão da compra';
  end if;

  select coalesce(sum(x.amount), 0)
  into v_shares_sum
  from jsonb_to_recordset(p_shares) as x(contact_id uuid, shared_contact_id uuid, amount numeric);

  if v_shares_sum <> p_total_amount then
    raise exception 'A soma das divisões (%) difere do total (%)', v_shares_sum, p_total_amount;
  end if;

  if p_shared_account is null then
    if exists (
      select 1
      from jsonb_to_recordset(p_shares) as x(contact_id uuid, shared_contact_id uuid, amount numeric)
      where x.shared_contact_id is not null
    ) then
      raise exception 'Divisão inválida';
    end if;

    if exists (
      select 1
      from jsonb_to_recordset(p_shares) as x(contact_id uuid, shared_contact_id uuid, amount numeric)
      where x.contact_id is not null
        and not exists (
          select 1 from public.contacts c
          where c.id = x.contact_id and c.owner_id = p_owner
        )
    ) then
      raise exception 'Contato inválido na divisão';
    end if;

    return false;
  end if;

  if exists (select 1 from public.profiles where id = p_owner and account_type = 'shared') then
    raise exception 'Uma conta compartilhada não escolhe outra conta compartilhada';
  end if;

  if not exists (
    select 1 from public.account_members m
    where m.shared_account_id = p_shared_account and m.member_user_id = p_owner and m.status = 'active'
  ) then
    raise exception 'Conta compartilhada inválida';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_shares) as x(contact_id uuid, shared_contact_id uuid, amount numeric)
    where x.contact_id is not null
  ) then
    raise exception 'Com conta compartilhada, a divisão é entre você e os participantes dela';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_shares) as x(contact_id uuid, shared_contact_id uuid, amount numeric)
    where x.shared_contact_id is not null
      and not exists (
        select 1 from public.contacts c
        where c.id = x.shared_contact_id
          and c.owner_id = p_shared_account
          and c.linked_user_id is distinct from p_owner
      )
  ) then
    raise exception 'Participante inválido na divisão';
  end if;

  return not exists (
    select 1
    from jsonb_to_recordset(p_shares) as x(contact_id uuid, shared_contact_id uuid, amount numeric)
    where x.shared_contact_id is not null
  );
end;
$$;

revoke execute on function public.check_purchase_input(uuid, uuid, uuid, jsonb, uuid, numeric, boolean, integer)
  from public, anon, authenticated;

-- 2. Alterar uma compra.
--    p_month: mês em que o usuário está editando (dia 1). Só faz diferença para
--    compra recorrente que começou antes dele. Devolve o id da compra que ficou
--    com os dados novos (o mesmo, ou o da nova série).
--    Uma compra não muda de recorrente para parcelada nem o contrário.
create or replace function public.update_purchase(
  p_purchase_id uuid,
  p_month date,
  p_description text,
  p_total_amount numeric,
  p_purchase_date date,
  p_installments_count integer,
  p_first_installment_month date,
  p_card_id uuid,
  p_shares jsonb,
  p_notes text default null,
  p_category_id uuid default null,
  p_shared_account uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.active_account();
  v_old public.purchases%rowtype;
  v_pending boolean;
  v_id uuid;
  v_cents bigint;
  v_base bigint;
  v_rem bigint;
  i integer;
begin
  if auth.uid() is null or v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_month is null or extract(day from p_month) <> 1 then
    raise exception 'Mês inválido';
  end if;

  select * into v_old
  from public.purchases
  where id = p_purchase_id and owner_id = v_uid
  for update;

  if not found then
    raise exception 'Compra não encontrada';
  end if;

  v_pending := public.check_purchase_input(
    v_uid, p_card_id, p_category_id, p_shares, p_shared_account,
    p_total_amount, v_old.is_recurring, p_installments_count
  );

  if v_old.is_recurring and v_old.first_installment_month < p_month then
    -- Recorrente que começou antes: encerra a série antiga e cria a nova a partir deste mês
    if v_old.recurrence_end_month is not null and v_old.recurrence_end_month < p_month then
      raise exception 'A recorrência já terminou antes deste mês';
    end if;

    update public.purchases
    set recurrence_end_month = (p_month - interval '1 month')::date
    where id = v_old.id;

    insert into public.purchases (
      owner_id, card_id, description, total_amount, purchase_date,
      installments_count, first_installment_month, notes, is_recurring, category_id, created_by,
      shared_account_id, shared_pending, recurrence_end_month
    )
    values (
      v_uid, p_card_id, p_description, p_total_amount, p_purchase_date,
      1, p_month, p_notes, true, p_category_id, auth.uid(),
      p_shared_account, v_pending, v_old.recurrence_end_month
    )
    returning id into v_id;
  else
    -- Compra comum, ou recorrente que começa neste mês ou depois: altera no lugar
    if v_old.is_recurring
       and v_old.recurrence_end_month is not null
       and p_first_installment_month > v_old.recurrence_end_month then
      raise exception 'O mês de início fica depois do fim da recorrência';
    end if;

    v_id := v_old.id;

    update public.purchases
    set card_id = p_card_id,
        description = p_description,
        total_amount = p_total_amount,
        purchase_date = p_purchase_date,
        installments_count = p_installments_count,
        first_installment_month = p_first_installment_month,
        notes = p_notes,
        category_id = p_category_id,
        shared_account_id = p_shared_account,
        shared_pending = v_pending
    where id = v_id;

    delete from public.purchase_shares where purchase_id = v_id;
    delete from public.installments where purchase_id = v_id;
  end if;

  insert into public.purchase_shares (purchase_id, contact_id, shared_contact_id, amount)
  select v_id, x.contact_id, x.shared_contact_id, x.amount
  from jsonb_to_recordset(p_shares) as x(contact_id uuid, shared_contact_id uuid, amount numeric);

  -- Parcelas: mesma regra de create_purchase (o resto em centavos vai nas primeiras)
  if not v_old.is_recurring then
    v_cents := round(p_total_amount * 100)::bigint;
    v_base := v_cents / p_installments_count;
    v_rem := v_cents - v_base * p_installments_count;

    for i in 1..p_installments_count loop
      insert into public.installments (purchase_id, number, amount, reference_month)
      values (
        v_id,
        i,
        (v_base + case when i <= v_rem then 1 else 0 end)::numeric / 100,
        (p_first_installment_month + ((i - 1) * interval '1 month'))::date
      );
    end loop;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.update_purchase(uuid, date, text, numeric, date, integer, date, uuid, jsonb, text, uuid, uuid)
  from public, anon;
grant execute on function public.update_purchase(uuid, date, text, numeric, date, integer, date, uuid, jsonb, text, uuid, uuid)
  to authenticated;

-- 3. Excluir uma compra. Recorrente que começou antes de p_month: só encerra no
--    mês anterior, preservando os meses passados. Devolve 'removida' ou 'encerrada'.
create or replace function public.delete_purchase(p_purchase_id uuid, p_month date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.active_account();
  v_old public.purchases%rowtype;
begin
  if auth.uid() is null or v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_month is null or extract(day from p_month) <> 1 then
    raise exception 'Mês inválido';
  end if;

  select * into v_old
  from public.purchases
  where id = p_purchase_id and owner_id = v_uid
  for update;

  if not found then
    raise exception 'Compra não encontrada';
  end if;

  if v_old.is_recurring and v_old.first_installment_month < p_month then
    update public.purchases
    set recurrence_end_month = (p_month - interval '1 month')::date
    where id = v_old.id
      and (recurrence_end_month is null or recurrence_end_month >= p_month);
    return 'encerrada';
  end if;

  -- Divisões e parcelas saem junto (on delete cascade)
  delete from public.purchases where id = v_old.id;
  return 'removida';
end;
$$;

revoke execute on function public.delete_purchase(uuid, date) from public, anon;
grant execute on function public.delete_purchase(uuid, date) to authenticated;
