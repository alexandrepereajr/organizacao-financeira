-- Minha parte em cada compra que tem parcelas na janela [p_from, p_to]
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
    and exists (
      select 1 from public.installments i
      where i.purchase_id = p.id and i.reference_month between p_from and p_to
    )
  group by p.id

  union all

  select p.id, false, sum(s.amount)
  from public.purchases p
  join public.purchase_shares s on s.purchase_id = p.id
  join public.contacts c on c.id = s.contact_id
  where c.linked_user_id = (select auth.uid())
    and exists (
      select 1 from public.installments i
      where i.purchase_id = p.id and i.reference_month between p_from and p_to
    )
  group by p.id;
$$;

revoke execute on function public.my_purchase_shares(date, date) from public, anon;
grant execute on function public.my_purchase_shares(date, date) to authenticated;