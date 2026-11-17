-- Conta em nome da qual o usuário está agindo.
-- Por enquanto é o próprio usuário; o seletor de conta (parte B2) redefine esta função.
create or replace function public.active_account()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid();
$$;

revoke execute on function public.active_account() from public, anon;
grant execute on function public.active_account() to authenticated;

-- Vínculos entre contas compartilhadas e usuários normais
create table public.account_members (
  shared_account_id uuid not null references public.profiles (id) on delete cascade,
  member_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('invited', 'requested', 'active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shared_account_id, member_user_id),
  constraint account_members_distinct check (shared_account_id <> member_user_id)
);

create index account_members_member_idx on public.account_members (member_user_id);

alter table public.account_members enable row level security;

-- Leitura apenas; toda alteração passa pelas funções abaixo
create policy "account_members_select" on public.account_members
for select to authenticated
using (
  member_user_id = (select auth.uid())
  or shared_account_id = (select public.active_account())
);

-- Tipos de conta corretos: compartilhada de um lado, normal do outro
create or replace function public.check_account_member_types()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.shared_account_id and account_type = 'shared'
  ) then
    raise exception 'Só contas compartilhadas recebem participantes';
  end if;

  if not exists (
    select 1 from public.profiles where id = new.member_user_id and account_type = 'normal'
  ) then
    raise exception 'Só contas normais podem ser participantes com conta';
  end if;

  return new;
end;
$$;

create trigger account_members_check_types
before insert on public.account_members
for each row execute function public.check_account_member_types();

-- Conta compartilhada só vincula uma pessoa com conta depois do vínculo ativo
create or replace function public.check_shared_contact_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.linked_user_id is not null
     and exists (
       select 1 from public.profiles where id = new.owner_id and account_type = 'shared'
     )
     and not exists (
       select 1 from public.account_members m
       where m.shared_account_id = new.owner_id
         and m.member_user_id = new.linked_user_id
         and m.status = 'active'
     )
  then
    raise exception 'Contas compartilhadas adicionam pessoas com conta por convite';
  end if;

  return new;
end;
$$;

create trigger contacts_check_shared_link
before insert or update of linked_user_id on public.contacts
for each row execute function public.check_shared_contact_link();

-- Busca um perfil por código ou username (uso interno)
create or replace function public.find_profile_id(p_value text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_valor text := trim(leading '@' from trim(p_value));
  v_id uuid;
begin
  if v_valor = '' then
    return null;
  end if;

  if v_valor = lower(v_valor) then
    select id into v_id from public.profiles where username = v_valor;
    if v_id is null then
      select id into v_id from public.profiles where share_code = upper(v_valor);
    end if;
  else
    select id into v_id from public.profiles where share_code = upper(v_valor);
    if v_id is null then
      select id into v_id from public.profiles where username = lower(v_valor);
    end if;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.find_profile_id(text) from public, anon, authenticated;

-- Ativa o vínculo e coloca a pessoa na lista de participantes (uso interno)
create or replace function public.activate_member(p_shared uuid, p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_members
  set status = 'active', updated_at = now()
  where shared_account_id = p_shared and member_user_id = p_member;

  insert into public.contacts (owner_id, name, linked_user_id)
  select p_shared, p.display_name, p.id
  from public.profiles p
  where p.id = p_member
  on conflict (owner_id, linked_user_id) where linked_user_id is not null
  do nothing;
end;
$$;

revoke execute on function public.activate_member(uuid, uuid) from public, anon, authenticated;

-- A conta compartilhada convida uma pessoa pelo código ou username
create or replace function public.invite_member(p_value text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shared uuid := public.active_account();
  v_target uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.profiles where id = v_shared and account_type = 'shared'
  ) then
    raise exception 'Só contas compartilhadas convidam participantes';
  end if;

  v_target := public.find_profile_id(p_value);
  if v_target is null then
    raise exception 'Código ou username não encontrado';
  end if;

  if not exists (
    select 1 from public.profiles where id = v_target and account_type = 'normal'
  ) then
    raise exception 'Só contas normais podem ser convidadas';
  end if;

  select status into v_status
  from public.account_members
  where shared_account_id = v_shared and member_user_id = v_target;

  if v_status = 'active' then
    return 'active';
  end if;

  if v_status = 'requested' then
    perform public.activate_member(v_shared, v_target);
    return 'active';
  end if;

  if v_status = 'invited' then
    return 'invited';
  end if;

  insert into public.account_members (shared_account_id, member_user_id, status)
  values (v_shared, v_target, 'invited');
  return 'invited';
end;
$$;

-- O usuário normal pede para entrar numa conta compartilhada pelo código ou username dela
create or replace function public.request_join(p_value text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_target uuid;
  v_status text;
begin
  if v_me is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.profiles where id = v_me and account_type = 'normal'
  ) then
    raise exception 'Só contas normais pedem para entrar em contas compartilhadas';
  end if;

  v_target := public.find_profile_id(p_value);
  if v_target is null then
    raise exception 'Código ou username não encontrado';
  end if;

  if not exists (
    select 1 from public.profiles where id = v_target and account_type = 'shared'
  ) then
    raise exception 'Esse código ou username não é de uma conta compartilhada';
  end if;

  select status into v_status
  from public.account_members
  where shared_account_id = v_target and member_user_id = v_me;

  if v_status = 'active' then
    return 'active';
  end if;

  if v_status = 'invited' then
    perform public.activate_member(v_target, v_me);
    return 'active';
  end if;

  if v_status = 'requested' then
    return 'requested';
  end if;

  insert into public.account_members (shared_account_id, member_user_id, status)
  values (v_target, v_me, 'requested');
  return 'requested';
end;
$$;

-- O usuário aceita ou recusa um convite recebido
create or replace function public.respond_invitation(p_shared_account uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.account_members
    where shared_account_id = p_shared_account and member_user_id = v_me and status = 'invited'
  ) then
    raise exception 'Convite inexistente';
  end if;

  if p_accept then
    perform public.activate_member(p_shared_account, v_me);
  else
    delete from public.account_members
    where shared_account_id = p_shared_account and member_user_id = v_me;
  end if;
end;
$$;

-- A conta compartilhada aceita ou recusa um pedido de entrada
create or replace function public.respond_request(p_member uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shared uuid := public.active_account();
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.account_members
    where shared_account_id = v_shared and member_user_id = p_member and status = 'requested'
  ) then
    raise exception 'Pedido inexistente';
  end if;

  if p_accept then
    perform public.activate_member(v_shared, p_member);
  else
    delete from public.account_members
    where shared_account_id = v_shared and member_user_id = p_member;
  end if;
end;
$$;

-- Sair, remover ou cancelar (pedido, convite ou vínculo)
create or replace function public.remove_member(p_other uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_shared uuid;
  v_member uuid;
begin
  if v_actor is null then
    raise exception 'Não autenticado';
  end if;

  if exists (
    select 1 from public.account_members
    where shared_account_id = p_other and member_user_id = v_actor
  ) then
    v_shared := p_other;
    v_member := v_actor;
  elsif exists (
    select 1 from public.account_members
    where shared_account_id = public.active_account() and member_user_id = p_other
  ) then
    v_shared := public.active_account();
    v_member := p_other;
  else
    raise exception 'Vínculo inexistente';
  end if;

  delete from public.account_members
  where shared_account_id = v_shared and member_user_id = v_member;

  -- A pessoa continua na lista como nome (compras antigas), mas sem acesso
  update public.contacts
  set linked_user_id = null
  where owner_id = v_shared and linked_user_id = v_member;
end;
$$;

-- Vínculos da conta atual: para um usuário normal, suas contas compartilhadas;
-- para uma conta compartilhada, seus participantes com conta
create or replace function public.membership_overview()
returns table (
  other_id uuid,
  other_name text,
  other_username text,
  status text,
  needs_my_response boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.username, m.status, (m.status = 'invited')
  from public.account_members m
  join public.profiles p on p.id = m.shared_account_id
  where m.member_user_id = (select public.active_account())

  union all

  select p.id, p.display_name, p.username, m.status, (m.status = 'requested')
  from public.account_members m
  join public.profiles p on p.id = m.member_user_id
  where m.shared_account_id = (select public.active_account());
$$;

revoke execute on function public.invite_member(text) from public, anon;
revoke execute on function public.request_join(text) from public, anon;
revoke execute on function public.respond_invitation(uuid, boolean) from public, anon;
revoke execute on function public.respond_request(uuid, boolean) from public, anon;
revoke execute on function public.remove_member(uuid) from public, anon;
revoke execute on function public.membership_overview() from public, anon;

grant execute on function public.invite_member(text) to authenticated;
grant execute on function public.request_join(text) to authenticated;
grant execute on function public.respond_invitation(uuid, boolean) to authenticated;
grant execute on function public.respond_request(uuid, boolean) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
grant execute on function public.membership_overview() to authenticated;