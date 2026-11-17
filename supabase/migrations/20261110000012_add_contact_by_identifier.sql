create or replace function public.add_contact_by_identifier(p_value text)
returns public.contacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_valor text := trim(leading '@' from trim(p_value));
  v_alvo public.profiles;
  v_result public.contacts;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if v_valor = '' then
    raise exception 'Código ou username não encontrado';
  end if;

  -- Só minúsculas: tenta username primeiro; com maiúsculas: tenta código primeiro
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

  if v_alvo.id = auth.uid() then
    raise exception 'Você não pode adicionar a si mesmo';
  end if;

  if v_alvo.account_type = 'shared' then
    raise exception 'Contas compartilhadas não podem ser adicionadas como contato';
  end if;

  insert into public.contacts (owner_id, name, linked_user_id)
  values (auth.uid(), v_alvo.display_name, v_alvo.id)
  on conflict (owner_id, linked_user_id) where linked_user_id is not null
  do nothing;

  select * into v_result
  from public.contacts
  where owner_id = auth.uid() and linked_user_id = v_alvo.id;

  return v_result;
end;
$$;

revoke execute on function public.add_contact_by_identifier(text) from public, anon;
grant execute on function public.add_contact_by_identifier(text) to authenticated;

-- A função antiga fica sem uso
drop function if exists public.add_contact_by_share_code(text);