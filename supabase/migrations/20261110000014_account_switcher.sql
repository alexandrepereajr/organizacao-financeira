-- 1. Conta ativa: lê o cabeçalho x-active-account e confere se o usuário é participante ativo
create or replace function public.active_account()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_header text;
  v_id uuid;
begin
  if v_uid is null then
    return null;
  end if;

  v_header := nullif(
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json ->> 'x-active-account',
    ''
  );
  if v_header is null then
    return v_uid;
  end if;

  begin
    v_id := v_header::uuid;
  exception when others then
    return v_uid;
  end;

  if v_id = v_uid then
    return v_uid;
  end if;

  if exists (
    select 1 from public.account_members m
    where m.shared_account_id = v_id
      and m.member_user_id = v_uid
      and m.status = 'active'
  ) then
    return v_id;
  end if;

  return v_uid;
end;
$$;

-- 2. Contas que o usuário pode usar (a própria e as compartilhadas em que é participante)
create or replace function public.my_accounts()
returns table (
  id uuid,
  display_name text,
  username text,
  account_type text,
  is_self boolean,
  is_active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.username, p.account_type,
         (p.id = auth.uid()),
         (p.id = (select public.active_account()))
  from public.profiles p
  where p.id = auth.uid()
     or p.id in (
       select m.shared_account_id
       from public.account_members m
       where m.member_user_id = auth.uid() and m.status = 'active'
     )
  order by (p.id = auth.uid()) desc, p.display_name;
$$;

-- 3. Dados da conta ativa
create or replace function public.current_account()
returns table (
  id uuid,
  display_name text,
  username text,
  account_type text,
  share_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.username, p.account_type, p.share_code
  from public.profiles p
  where p.id = (select public.active_account());
$$;

revoke execute on function public.my_accounts() from public, anon;
revoke execute on function public.current_account() from public, anon;
grant execute on function public.my_accounts() to authenticated;
grant execute on function public.current_account() to authenticated;

-- 4. Quem criou cada compra e entrada (histórico; ainda sem tela)
alter table public.purchases
  add column created_by uuid references public.profiles (id) on delete set null;

alter table public.incomes
  add column created_by uuid default auth.uid() references public.profiles (id) on delete set null;

-- 5. Novos registros passam a pertencer à conta ativa
alter table public.contacts alter column owner_id set default public.active_account();
alter table public.cards alter column owner_id set default public.active_account();
alter table public.categories alter column owner_id set default public.active_account();
alter table public.incomes alter column owner_id set default public.active_account();
alter table public.purchases alter column owner_id set default public.active_account();

-- 6. Regras de segurança em nome da conta ativa
drop policy if exists "contacts_owner_all" on public.contacts;
create policy "contacts_owner_all" on public.contacts
for all to authenticated
using (owner_id = (select public.active_account()))
with check (owner_id = (select public.active_account()));

drop policy if exists "cards_owner_all" on public.cards;
create policy "cards_owner_all" on public.cards
for all to authenticated
using (owner_id = (select public.active_account()))
with check (owner_id = (select public.active_account()));

drop policy if exists "categories_owner_all" on public.categories;
create policy "categories_owner_all" on public.categories
for all to authenticated
using (owner_id = (select public.active_account()))
with check (owner_id = (select public.active_account()));

drop policy if exists "incomes_owner_all" on public.incomes;
create policy "incomes_owner_all" on public.incomes
for all to authenticated
using (owner_id = (select public.active_account()))
with check (owner_id = (select public.active_account()));

drop policy if exists "invoices_owner_all" on public.invoices;
create policy "invoices_owner_all" on public.invoices
for all to authenticated
using (exists (
  select 1 from public.cards c
  where c.id = invoices.card_id and c.owner_id = (select public.active_account())
))
with check (exists (
  select 1 from public.cards c
  where c.id = invoices.card_id and c.owner_id = (select public.active_account())
));

drop policy if exists "purchases_delete_owner" on public.purchases;
create policy "purchases_delete_owner" on public.purchases
for delete to authenticated
using (owner_id = (select public.active_account()));

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or id = (select public.active_account()));

drop policy if exists "profiles_select_linked" on public.profiles;
create policy "profiles_select_linked" on public.profiles
for select to authenticated
using (
  exists (
    select 1 from public.contacts c
    where c.owner_id = (select public.active_account())
      and c.linked_user_id = profiles.id
  )
);

-- 7. Quem pode ver uma compra, em nome da conta ativa
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
    );
$$;

-- 8. create_purchase: o dono é a conta ativa; registra quem criou
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

-- 9. my_purchase_shares em nome da conta ativa
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
  where p.owner_id = (select public.active_account())
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
  where c.linked_user_id = (select public.active_account())
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

-- 10. add_contact_by_identifier em nome da conta ativa
create or replace function public.add_contact_by_identifier(p_value text)
returns public.contacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.active_account();
  v_valor text := trim(leading '@' from trim(p_value));
  v_alvo public.profiles;
  v_result public.contacts;
begin
  if auth.uid() is null or v_owner is null then
    raise exception 'Não autenticado';
  end if;

  if v_valor = '' then
    raise exception 'Código ou username não encontrado';
  end if;

  if v_valor = lower(v_valor) then
    select * into v_alvo from public.profiles where username = v_valor;
    if not found then
      select * into v_alvo from public.profiles where share_code = upper(v_valor);
    end if;
  else
    select * into v_alvo from public.profiles where share_code = upper(v_valor);
    if not found then
      select * into v_alvo from public.profiles where username = lower(v_valor);
    end if;
  end if;

  if not found then
    raise exception 'Código ou username não encontrado';
  end if;

  if v_alvo.id = v_owner then
    raise exception 'Você não pode adicionar a si mesmo';
  end if;

  if v_alvo.account_type = 'shared' then
    raise exception 'Contas compartilhadas não podem ser adicionadas como contato';
  end if;

  insert into public.contacts (owner_id, name, linked_user_id)
  values (v_owner, v_alvo.display_name, v_alvo.id)
  on conflict (owner_id, linked_user_id) where linked_user_id is not null
  do nothing;

  select * into v_result
  from public.contacts
  where owner_id = v_owner and linked_user_id = v_alvo.id;

  return v_result;
end;
$$;