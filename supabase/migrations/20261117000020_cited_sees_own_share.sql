-- Quem foi citado numa compra vê só a própria parte da divisão:
-- não vê quantos nem quem são os outros participantes, nem quanto cada um paga.
-- O nome do cartão já fica oculto pela regra de cards (migration 16).
--
-- Continuam vendo todas as linhas: o dono da compra, a conta compartilhada
-- vinculada à compra e o dono do cartão usado (a fatura dele cobra a compra toda).

create or replace function public.can_view_purchase_share(p_purchase_id uuid, p_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.purchases p
      where p.id = p_purchase_id
        and (
          p.owner_id = (select public.active_account())
          or p.shared_account_id = (select public.active_account())
        )
    )
    or exists (
      select 1
      from public.purchases p
      join public.cards k on k.id = p.card_id
      where p.id = p_purchase_id and k.owner_id = (select public.active_account())
    )
    or exists (
      select 1 from public.contacts c
      where c.id = p_contact_id and c.linked_user_id = (select public.active_account())
    );
$$;

revoke execute on function public.can_view_purchase_share(uuid, uuid) from public, anon;
grant execute on function public.can_view_purchase_share(uuid, uuid) to authenticated;

drop policy if exists "purchase_shares_select" on public.purchase_shares;
create policy "purchase_shares_select" on public.purchase_shares
for select to authenticated
using (public.can_view_purchase_share(purchase_id, coalesce(contact_id, shared_contact_id)));
