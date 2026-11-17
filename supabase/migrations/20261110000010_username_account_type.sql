-- Username e tipo de conta
alter table public.profiles
  add column username text,
  add column account_type text not null default 'normal';

-- Perfis que já existam recebem um username provisório
update public.profiles
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 8)
where username is null;

alter table public.profiles
  alter column username set not null,
  add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  add constraint profiles_account_type_check check (account_type in ('normal', 'shared'));

create unique index profiles_username_unique on public.profiles (username);

-- Disponibilidade do username (usada no cadastro, antes de existir sessão)
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where username = lower(trim(p_username))
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- O perfil criado no cadastro passa a guardar username e tipo de conta
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_type text := case
    when new.raw_user_meta_data ->> 'account_type' = 'shared' then 'shared'
    else 'normal'
  end;
begin
  -- Usuários criados fora do app (sem username válido) recebem um provisório
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  insert into public.profiles (id, display_name, username, account_type)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    v_username,
    v_type
  );
  return new;
end;
$$;