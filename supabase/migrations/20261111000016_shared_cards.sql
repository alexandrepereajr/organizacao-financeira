-- 1. Ocultar cartão em contas compartilhadas
alter table public.cards
  add column hide_from_shared boolean not null default false;

-- 2. Cartões: o dono vê e altera; a conta compartilhada só lê os cartões
--    não ocultos dos participantes com vínculo ativo
drop policy if exists "cards_owner_all" on public.cards;

create policy "cards_select" on public.cards
for select to authenticated
using (
  owner_id = (select public.active_account())
  or (
    not hide_from_shared
    and exists (
      select 1 from public.account_members m
      where m.shared_account_id = (select public.active_account())
        and m.member_user_id = cards.owner_id
        and m.status = 'active'
    )
  )
);

create policy "cards_insert" on public.cards
for insert to authenticated
with check (owner_id = (select public.active_account()));

create policy "cards_update" on public.cards
for update to authenticated
using (owner_id = (select public.active_account()))
with check (owner_id = (select public.active_account()));

create policy "cards_delete" on public.cards
for delete to authenticated
using (owner_id = (select public.active_account()));

-- 3. Cartões visíveis para a conta ativa, já com o nome do dono
create or replace function public.visible_cards()
returns table (
  id uuid,
  owner_id uuid,
  owner_name text,
  name text,
  closing_day smallint,
  due_day smallint,
  is_active boolean,
  hide_from_shared boolean,
  is_own boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.owner_id, coalesce(p.display_name, ''), c.name, c.closing_day, c.due_day,
         c.is_active, c.hide_from_shared,
         (c.owner_id = (select public.active_account()))
  from public.cards c
  left join public.profiles p on p.id = c.owner_id
  order by (c.owner_id = (select public.active_account())) desc, c.is_active desc, c.name;
$$;

revoke execute on function public.visible_cards() from public, anon;
grant execute on function public.visible_cards() to authenticated;

-- 4. O dono do cartão também enxerga as compras feitas nele (a fatura cobra tudo)
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
      where p.id = p_purchase_id and p.owner_id = (select public.active_account())
    )
    or exists (
      select 1
      from public.purchase_shares s
      join public.contacts c on c.id = s.contact_id
      where s.purchase_id = p_purchase_id
        and c.linked_user_id = (select public.active_account())
    )
    or exists (
      select 1
      from public.purchases p
      join public.cards k on k.id = p.card_id
      where p.id = p_purchase_id and k.owner_id = (select public.active_account())
    );
$$;

-- 5. create_purchase: a conta compartilhada pode usar cartões não ocultos dos participantes
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
  v_uid uuid := public.active_account(); -- dono da compra
  v_recurring boolean := coalesce(p_is_recurring, false);
  v_purchase_id uuid;
  v_cents bigint;
  v_base bigint;
  v_rem bigint;
  v_shares_sum numeric;
  i integer;
begin
  if auth.uid() is null or v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if v_recurring and p_installments_count <> 1 then
    raise exception 'Compra recorrente não tem parcelas';
  end if;

  if p_card_id is not null and not exists (
    select 1 from public.cards c
    where c.id = p_card_id
      and (
        c.owner_id = v_uid
        or (
          not c.hide_from_shared
          and exists (
            select 1 from public.profiles o
            where o.id = v_uid and o.account_type = 'shared'
          )
          and exists (
            select 1 from public.account_members m
            where m.shared_account_id = v_uid
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
    installments_count, first_installment_month, notes, is_recurring, category_id, created_by
  )
  values (
    v_uid, p_card_id, p_description, p_total_amount, p_purchase_date,
    p_installments_count, p_first_installment_month, p_notes, v_recurring, p_category_id, auth.uid()
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