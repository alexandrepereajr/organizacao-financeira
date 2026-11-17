-- 1. Compra vinculada a uma conta compartilhada e participante dessa conta na divisão
alter table public.purchases
  add column shared_account_id uuid references public.profiles (id) on delete set null,
  add column shared_pending boolean not null default false,
  add constraint purchases_pending_needs_shared
    check (not shared_pending or shared_account_id is not null);

alter table public.purchase_shares
  add column shared_contact_id uuid references public.contacts (id) on delete restrict,
  add constraint purchase_shares_one_target
    check (contact_id is null or shared_contact_id is null);

drop index if exists public.purchase_shares_owner_unique;

create unique index purchase_shares_owner_unique
  on public.purchase_shares (purchase_id)
  where contact_id is null and shared_contact_id is null;

create unique index purchase_shares_shared_contact_unique
  on public.purchase_shares (purchase_id, shared_contact_id)
  where shared_contact_id is not null;

-- 2. Conta compartilhada dona da compra continua fora da divisão
create or replace function public.check_shared_purchase_shares()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.contact_id is null and new.shared_contact_id is null and exists (
    select 1
    from public.purchases p
    join public.profiles o on o.id = p.owner_id
    where p.id = new.purchase_id and o.account_type = 'shared'
  ) then
    raise exception 'Compras de conta compartilhada devem pertencer a participantes';
  end if;

  return new;
end;
$$;

-- 3. Participantes de uma conta compartilhada, para quem é participante dela
--    (sem a própria pessoa, que na divisão já é o "Você")
create or replace function public.shared_participants(p_shared uuid)
returns table (id uuid, name text, linked_user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.linked_user_id
  from public.contacts c
  where c.owner_id = p_shared
    and exists (
      select 1 from public.account_members m
      where m.shared_account_id = p_shared
        and m.member_user_id = (select public.active_account())
        and m.status = 'active'
    )
    and c.linked_user_id is distinct from (select public.active_account())
  order by c.name;
$$;

revoke execute on function public.shared_participants(uuid) from public, anon;
grant execute on function public.shared_participants(uuid) to authenticated;

-- 4. Quem pode ver uma compra
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
      join public.contacts c on c.id = coalesce(s.contact_id, s.shared_contact_id)
      where s.purchase_id = p_purchase_id
        and c.linked_user_id = (select public.active_account())
    )
    or exists (
      select 1
      from public.purchases p
      join public.cards k on k.id = p.card_id
      where p.id = p_purchase_id and k.owner_id = (select public.active_account())
    )
    or exists (
      select 1 from public.purchases p
      where p.id = p_purchase_id and p.shared_account_id = (select public.active_account())
    );
$$;

-- 5. my_purchase_shares: agora também devolve se a compra está vinculada à conta ativa
drop function if exists public.my_purchase_shares(date, date);

create function public.my_purchase_shares(p_from date, p_to date)
returns table (purchase_id uuid, is_owner boolean, my_amount numeric, is_linked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with janela as (
    select p.id
    from public.purchases p
    where exists (
            select 1 from public.installments i
            where i.purchase_id = p.id and i.reference_month between p_from and p_to
          )
       or (
            p.is_recurring
            and p.first_installment_month <= p_to
            and (p.recurrence_end_month is null or p.recurrence_end_month >= p_from)
          )
  )
  select p.id, true,
         coalesce(sum(s.amount) filter (where s.contact_id is null and s.shared_contact_id is null), 0),
         false
  from public.purchases p
  left join public.purchase_shares s on s.purchase_id = p.id
  where p.owner_id = (select public.active_account())
    and p.id in (select id from janela)
  group by p.id

  union all

  select p.id, false, sum(s.amount), false
  from public.purchases p
  join public.purchase_shares s on s.purchase_id = p.id
  join public.contacts c on c.id = coalesce(s.contact_id, s.shared_contact_id)
  where c.linked_user_id = (select public.active_account())
    and p.id in (select id from janela)
  group by p.id

  union all

  select p.id, false, p.total_amount, true
  from public.purchases p
  where p.shared_account_id = (select public.active_account())
    and p.id in (select id from janela);
$$;

revoke execute on function public.my_purchase_shares(date, date) from public, anon;
grant execute on function public.my_purchase_shares(date, date) to authenticated;

-- 6. create_purchase com conta compartilhada (substitui a versão anterior)
drop function if exists public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text, boolean, uuid);

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
  p_category_id uuid default null,
  p_shared_account uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.active_account(); -- dono da compra
  v_recurring boolean := coalesce(p_is_recurring, false);
  v_shared uuid := p_shared_account;
  v_pending boolean := false;
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

  if v_shared is not null then
    if exists (select 1 from public.profiles where id = v_uid and account_type = 'shared') then
      raise exception 'Uma conta compartilhada não escolhe outra conta compartilhada';
    end if;

    if not exists (
      select 1 from public.account_members m
      where m.shared_account_id = v_shared and m.member_user_id = v_uid and m.status = 'active'
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
            and c.owner_id = v_shared
            and c.linked_user_id is distinct from v_uid
        )
    ) then
      raise exception 'Participante inválido na divisão';
    end if;

    v_pending := not exists (
      select 1
      from jsonb_to_recordset(p_shares) as x(contact_id uuid, shared_contact_id uuid, amount numeric)
      where x.shared_contact_id is not null
    );
  else
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
          where c.id = x.contact_id and c.owner_id = v_uid
        )
    ) then
      raise exception 'Contato inválido na divisão';
    end if;
  end if;

  select coalesce(sum(x.amount), 0)
  into v_shares_sum
  from jsonb_to_recordset(p_shares) as x(contact_id uuid, shared_contact_id uuid, amount numeric);

  if v_shares_sum <> p_total_amount then
    raise exception 'A soma das divisões (%) difere do total (%)', v_shares_sum, p_total_amount;
  end if;

  insert into public.purchases (
    owner_id, card_id, description, total_amount, purchase_date,
    installments_count, first_installment_month, notes, is_recurring, category_id, created_by,
    shared_account_id, shared_pending
  )
  values (
    v_uid, p_card_id, p_description, p_total_amount, p_purchase_date,
    p_installments_count, p_first_installment_month, p_notes, v_recurring, p_category_id, auth.uid(),
    v_shared, v_pending
  )
  returning id into v_purchase_id;

  insert into public.purchase_shares (purchase_id, contact_id, shared_contact_id, amount)
  select v_purchase_id, x.contact_id, x.shared_contact_id, x.amount
  from jsonb_to_recordset(p_shares) as x(contact_id uuid, shared_contact_id uuid, amount numeric);

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

revoke execute on function public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text, boolean, uuid, uuid) from public, anon;
grant execute on function public.create_purchase(text, numeric, date, integer, date, uuid, jsonb, text, boolean, uuid, uuid) to authenticated;