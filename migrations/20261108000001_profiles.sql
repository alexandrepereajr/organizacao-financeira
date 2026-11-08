-- Gera o código único de compartilhamento (8 caracteres, sem 0/O/1/I)
create or replace function public.generate_share_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where share_code = code);
  end loop;
  return code;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  share_code text not null unique default public.generate_share_code(),
  created_at timestamptz not null default now()
);

-- Cria o perfil automaticamente quando a conta é criada
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Segurança
alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- O usuário só pode alterar o nome; o código não muda
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;