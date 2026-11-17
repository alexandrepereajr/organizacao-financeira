create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  linked_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint contacts_no_self_link check (linked_user_id is distinct from owner_id)
);

create index contacts_owner_idx on public.contacts (owner_id);

-- Impede adicionar a mesma pessoa com conta duas vezes
create unique index contacts_owner_linked_unique
on public.contacts (owner_id, linked_user_id)
where linked_user_id is not null;

alter table public.contacts enable row level security;

create policy "contacts_owner_all"
on public.contacts for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- Permite ver o perfil (nome) das pessoas que você adicionou
create policy "profiles_select_linked"
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.contacts c
    where c.owner_id = (select auth.uid())
      and c.linked_user_id = profiles.id
  )
);

-- Adiciona um contato a partir do código único de outro usuário
create or replace function public.add_contact_by_share_code(p_code text)
returns public.contacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.profiles;
  result public.contacts;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select * into target
  from public.profiles
  where share_code = upper(trim(p_code));

  if not found then
    raise exception 'Código não encontrado';
  end if;

  if target.id = auth.uid() then
    raise exception 'Você não pode adicionar a si mesmo';
  end if;

  insert into public.contacts (owner_id, name, linked_user_id)
  values (auth.uid(), target.display_name, target.id)
  on conflict (owner_id, linked_user_id) where linked_user_id is not null
  do nothing;

  select * into result
  from public.contacts
  where owner_id = auth.uid() and linked_user_id = target.id;

  return result;
end;
$$;

revoke execute on function public.add_contact_by_share_code(text) from public, anon;
grant execute on function public.add_contact_by_share_code(text) to authenticated;