-- =====================================================================
-- Usuários e dados de teste. Senha de todas as contas: Teste12345
-- Pode ser executado mais de uma vez: o que já existe é pulado.
-- =====================================================================

-- Funções auxiliares temporárias (removidas no final)
create or replace function public.tmp_seed_cat(p_owner uuid, p_kind text, p_name text)
returns uuid
language sql
stable
as $$
  select id from public.categories
  where owner_id = p_owner and kind = p_kind and name = p_name;
$$;

create or replace function public.tmp_seed_purchase(
  p_owner uuid,
  p_nome text,
  p_card uuid,
  p_cat uuid,
  p_total numeric,
  p_parcelas integer,
  p_mes date,
  p_dia integer,
  p_recorrente boolean,
  p_shares jsonb
)
returns void
language plpgsql
as $$
declare
  v_id uuid;
  v_cents bigint := round(p_total * 100)::bigint;
  v_base bigint;
  v_rem bigint;
  i integer;
begin
  insert into public.purchases (
    owner_id, card_id, category_id, description, total_amount, purchase_date,
    installments_count, first_installment_month, is_recurring, created_by
  )
  values (
    p_owner, p_card, p_cat, p_nome, p_total, p_mes + (p_dia - 1),
    p_parcelas, p_mes, p_recorrente, p_owner
  )
  returning id into v_id;

  insert into public.purchase_shares (purchase_id, contact_id, amount)
  select v_id, (x ->> 'contact')::uuid, (x ->> 'amount')::numeric
  from jsonb_array_elements(p_shares) as x;

  if not p_recorrente then
    v_base := v_cents / p_parcelas;
    v_rem := v_cents - v_base * p_parcelas;

    for i in 1..p_parcelas loop
      insert into public.installments (purchase_id, number, amount, reference_month)
      values (
        v_id,
        i,
        (v_base + case when i <= v_rem then 1 else 0 end)::numeric / 100,
        (p_mes + ((i - 1) * interval '1 month'))::date
      );
    end loop;
  end if;
end;
$$;

-- 1. Contas de teste (o trigger do banco cria o perfil e as categorias)
do $$
declare
  r record;
  v_id uuid;
begin
  for r in
    select * from (values
      ('ana.teste@mailinator.com',   'Ana',   'ana_teste',   'normal'),
      ('bruno.teste@mailinator.com', 'Bruno', 'bruno_teste', 'normal'),
      ('carla.teste@mailinator.com', 'Carla', 'carla_teste', 'normal'),
      ('casa.teste@mailinator.com',  'Casa',  'casa_teste',  'shared')
    ) as t(email, nome, username, tipo)
  loop
    if exists (select 1 from auth.users where email = r.email) then
      continue;
    end if;

    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      r.email, extensions.crypt('Teste12345', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', r.nome, 'username', r.username, 'account_type', r.tipo),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', r.email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

-- 2. Dados das contas normais (a Casa fica vazia)
do $$
declare
  v_mes date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  v_ana uuid;
  v_bruno uuid;
  v_carla uuid;
  v_nubank uuid;
  v_inter uuid;
  v_itau uuid;
  v_c6 uuid;
  v_santander uuid;
  v_c_bruno uuid;
  v_c_maria uuid;
  v_c_ana uuid;
  v_c_carla uuid;
  v_c_pedro uuid;
begin
  select id into v_ana from public.profiles where username = 'ana_teste';
  select id into v_bruno from public.profiles where username = 'bruno_teste';
  select id into v_carla from public.profiles where username = 'carla_teste';

  -- ---------------------------------------------------------------- Ana
  if v_ana is not null and not exists (select 1 from public.cards where owner_id = v_ana) then
    insert into public.cards (owner_id, name, closing_day, due_day) values (v_ana, 'Nubank', 3, 10) returning id into v_nubank;
    insert into public.cards (owner_id, name, closing_day, due_day) values (v_ana, 'Inter', 20, 27) returning id into v_inter;

    insert into public.contacts (owner_id, name, linked_user_id) values (v_ana, 'Bruno', v_bruno) returning id into v_c_bruno;
    insert into public.contacts (owner_id, name) values (v_ana, 'Maria') returning id into v_c_maria;

    insert into public.incomes (owner_id, category_id, description, amount, reference_month, is_recurring, created_by)
    values
      (v_ana, public.tmp_seed_cat(v_ana, 'income', 'Salário'), 'Salário', 5200, (v_mes - interval '3 months')::date, true, v_ana),
      (v_ana, public.tmp_seed_cat(v_ana, 'income', 'Freelance'), 'Freelance site', 800, (v_mes - interval '1 month')::date, false, v_ana);

    perform public.tmp_seed_purchase(v_ana, 'Mercado', v_nubank, public.tmp_seed_cat(v_ana, 'purchase', 'Alimentação'),
      320.50, 1, v_mes, 5, false, jsonb_build_array(jsonb_build_object('contact', null, 'amount', 320.50)));

    perform public.tmp_seed_purchase(v_ana, 'Notebook', v_nubank, public.tmp_seed_cat(v_ana, 'purchase', 'Compras'),
      3600, 12, (v_mes - interval '2 months')::date, 10, false, jsonb_build_array(jsonb_build_object('contact', null, 'amount', 3600)));

    perform public.tmp_seed_purchase(v_ana, 'Netflix', v_nubank, public.tmp_seed_cat(v_ana, 'purchase', 'Assinaturas'),
      55.90, 1, (v_mes - interval '4 months')::date, 8, true, jsonb_build_array(jsonb_build_object('contact', null, 'amount', 55.90)));

    perform public.tmp_seed_purchase(v_ana, 'Jantar com o Bruno', v_inter, public.tmp_seed_cat(v_ana, 'purchase', 'Lazer'),
      180, 1, v_mes, 12, false,
      jsonb_build_array(jsonb_build_object('contact', null, 'amount', 90), jsonb_build_object('contact', v_c_bruno, 'amount', 90)));

    perform public.tmp_seed_purchase(v_ana, 'Aluguel de carro', v_inter, public.tmp_seed_cat(v_ana, 'purchase', 'Transporte'),
      900, 3, v_mes, 15, false,
      jsonb_build_array(jsonb_build_object('contact', null, 'amount', 540), jsonb_build_object('contact', v_c_maria, 'amount', 360)));

    perform public.tmp_seed_purchase(v_ana, 'Academia', null, public.tmp_seed_cat(v_ana, 'purchase', 'Saúde'),
      120, 1, (v_mes - interval '1 month')::date, 1, true, jsonb_build_array(jsonb_build_object('contact', null, 'amount', 120)));

    insert into public.invoices (card_id, reference_month, amount)
    values (v_nubank, (v_mes - interval '1 month')::date, 640);
  end if;

  -- -------------------------------------------------------------- Bruno
  if v_bruno is not null and not exists (select 1 from public.cards where owner_id = v_bruno) then
    insert into public.cards (owner_id, name, closing_day, due_day) values (v_bruno, 'Itaú', 10, 17) returning id into v_itau;

    insert into public.contacts (owner_id, name, linked_user_id) values (v_bruno, 'Ana', v_ana) returning id into v_c_ana;
    insert into public.contacts (owner_id, name, linked_user_id) values (v_bruno, 'Carla', v_carla) returning id into v_c_carla;

    insert into public.incomes (owner_id, category_id, description, amount, reference_month, is_recurring, created_by)
    values (v_bruno, public.tmp_seed_cat(v_bruno, 'income', 'Salário'), 'Salário', 4100, (v_mes - interval '2 months')::date, true, v_bruno);

    insert into public.incomes (owner_id, category_id, description, amount, reference_month, is_recurring, created_by)
    select v_bruno, public.tmp_seed_cat(v_bruno, 'income', 'Rendimentos'), 'Aluguel recebido', 900,
           (v_mes + (g * interval '1 month'))::date, false, v_bruno
    from generate_series(0, 5) as g;

    perform public.tmp_seed_purchase(v_bruno, 'Supermercado', v_itau, public.tmp_seed_cat(v_bruno, 'purchase', 'Alimentação'),
      450, 1, v_mes, 6, false, jsonb_build_array(jsonb_build_object('contact', null, 'amount', 450)));

    perform public.tmp_seed_purchase(v_bruno, 'TV', v_itau, public.tmp_seed_cat(v_bruno, 'purchase', 'Compras'),
      2400, 10, (v_mes - interval '1 month')::date, 9, false, jsonb_build_array(jsonb_build_object('contact', null, 'amount', 2400)));

    perform public.tmp_seed_purchase(v_bruno, 'Spotify', v_itau, public.tmp_seed_cat(v_bruno, 'purchase', 'Assinaturas'),
      21.90, 1, (v_mes - interval '3 months')::date, 4, true, jsonb_build_array(jsonb_build_object('contact', null, 'amount', 21.90)));

    perform public.tmp_seed_purchase(v_bruno, 'Presente de aniversário', v_itau, public.tmp_seed_cat(v_bruno, 'purchase', 'Compras'),
      250, 1, v_mes, 14, false,
      jsonb_build_array(
        jsonb_build_object('contact', null, 'amount', 100),
        jsonb_build_object('contact', v_c_ana, 'amount', 75),
        jsonb_build_object('contact', v_c_carla, 'amount', 75)
      ));

    insert into public.invoices (card_id, reference_month, amount)
    values (v_itau, (v_mes - interval '1 month')::date, 1100);
  end if;

  -- -------------------------------------------------------------- Carla
  if v_carla is not null and not exists (select 1 from public.cards where owner_id = v_carla) then
    insert into public.cards (owner_id, name, closing_day, due_day) values (v_carla, 'C6', 15, 22) returning id into v_c6;
    insert into public.cards (owner_id, name, closing_day, due_day) values (v_carla, 'Santander', 5, 12) returning id into v_santander;

    insert into public.contacts (owner_id, name, linked_user_id) values (v_carla, 'Bruno', v_bruno);
    insert into public.contacts (owner_id, name) values (v_carla, 'Pedro') returning id into v_c_pedro;

    insert into public.incomes (owner_id, category_id, description, amount, reference_month, is_recurring, created_by)
    values
      (v_carla, public.tmp_seed_cat(v_carla, 'income', 'Salário'), 'Salário', 6300, (v_mes - interval '5 months')::date, true, v_carla),
      (v_carla, public.tmp_seed_cat(v_carla, 'income', 'Outros'), 'Venda de itens', 350, v_mes, false, v_carla);

    perform public.tmp_seed_purchase(v_carla, 'Curso online', v_c6, public.tmp_seed_cat(v_carla, 'purchase', 'Educação'),
      1200, 6, v_mes, 7, false, jsonb_build_array(jsonb_build_object('contact', null, 'amount', 1200)));

    perform public.tmp_seed_purchase(v_carla, 'Farmácia', v_santander, public.tmp_seed_cat(v_carla, 'purchase', 'Saúde'),
      89.90, 1, v_mes, 3, false, jsonb_build_array(jsonb_build_object('contact', null, 'amount', 89.90)));

    perform public.tmp_seed_purchase(v_carla, 'Plano de celular', v_santander, public.tmp_seed_cat(v_carla, 'purchase', 'Assinaturas'),
      79.90, 1, (v_mes - interval '2 months')::date, 5, true, jsonb_build_array(jsonb_build_object('contact', null, 'amount', 79.90)));

    perform public.tmp_seed_purchase(v_carla, 'Viagem', v_c6, public.tmp_seed_cat(v_carla, 'purchase', 'Lazer'),
      2800, 8, (v_mes + interval '1 month')::date, 20, false,
      jsonb_build_array(jsonb_build_object('contact', null, 'amount', 1400), jsonb_build_object('contact', v_c_pedro, 'amount', 1400)));

    insert into public.invoices (card_id, reference_month, amount)
    values (v_santander, (v_mes - interval '1 month')::date, 210);
  end if;
end;
$$;

-- 3. Remove as funções auxiliares
drop function if exists public.tmp_seed_purchase(uuid, text, uuid, uuid, numeric, integer, date, integer, boolean, jsonb);
drop function if exists public.tmp_seed_cat(uuid, text, text);