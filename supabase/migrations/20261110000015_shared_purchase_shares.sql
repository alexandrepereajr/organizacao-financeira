-- Conta compartilhada não entra na divisão: a compra pertence aos participantes
create or replace function public.check_shared_purchase_shares()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.contact_id is null and exists (
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

create trigger purchase_shares_check_shared
before insert on public.purchase_shares
for each row execute function public.check_shared_purchase_shares();