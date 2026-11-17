-- Acelera a busca de compras vinculadas a uma conta compartilhada
create index if not exists purchases_shared_account_idx
  on public.purchases (shared_account_id)
  where shared_account_id is not null;

-- A conta compartilhada completa uma compra incompleta, indicando os participantes
-- p_shares: [{"shared_contact_id": "<uuid>", "amount": 50.00}, ...]
create or replace function public.complete_shared_purchase(p_purchase_id uuid, p_shares jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shared uuid := public.active_account();
  v_owner uuid;
  v_total numeric;
  v_sum numeric;
begin
  if auth.uid() is null or v_shared is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.profiles where id = v_shared and account_type = 'shared'
  ) then
    raise exception 'Só a conta compartilhada completa compras';
  end if;

  select p.owner_id, p.total_amount
  into v_owner, v_total
  from public.purchases p
  where p.id = p_purchase_id
    and p.shared_account_id = v_shared
    and p.shared_pending;

  if not found then
    raise exception 'Compra inexistente ou já completa';
  end if;

  if p_shares is null or jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'Informe ao menos um participante';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_shares) as x(shared_contact_id uuid, amount numeric)
    where x.shared_contact_id is null
       or coalesce(x.amount, 0) <= 0
       or not exists (
         select 1 from public.contacts c
         where c.id = x.shared_contact_id and c.owner_id = v_shared
       )
  ) then
    raise exception 'Participante inválido na divisão';
  end if;

  select coalesce(sum(x.amount), 0)
  into v_sum
  from jsonb_to_recordset(p_shares) as x(shared_contact_id uuid, amount numeric);

  if v_sum <> v_total then
    raise exception 'A soma das divisões (%) difere do total (%)', v_sum, v_total;
  end if;

  delete from public.purchase_shares where purchase_id = p_purchase_id;

  -- O participante que é a própria dona da compra vira a parte do dono
  insert into public.purchase_shares (purchase_id, contact_id, shared_contact_id, amount)
  select p_purchase_id,
         null,
         case when c.linked_user_id = v_owner then null else c.id end,
         x.amount
  from jsonb_to_recordset(p_shares) as x(shared_contact_id uuid, amount numeric)
  join public.contacts c on c.id = x.shared_contact_id;

  update public.purchases
  set shared_pending = false
  where id = p_purchase_id;
end;
$$;

revoke execute on function public.complete_shared_purchase(uuid, jsonb) from public, anon;
grant execute on function public.complete_shared_purchase(uuid, jsonb) to authenticated;