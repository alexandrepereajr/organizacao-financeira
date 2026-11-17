-- =====================================================================
-- APAGA TODOS OS DADOS DO APP. NÃO TEM VOLTA.
--
-- Apaga compras, parcelas, divisões, faturas, entradas, cartões,
-- contatos, categorias e vínculos de contas compartilhadas de TODAS as
-- contas, e apaga as contas de login (inclusive as contas de teste),
-- exceto os e-mails listados em v_manter.
--
-- As contas mantidas ficam vazias, com as categorias padrão recriadas
-- e o mesmo código de compartilhamento e username.
--
-- Como usar: Supabase > SQL Editor > colar este arquivo > ajustar
-- v_manter > Run. Não é uma migration: não precisa rodar de novo.
-- =====================================================================

do $$
declare
  -- E-mails das contas que devem continuar existindo (vazias).
  -- Exemplo: array['seu.email@exemplo.com']
  -- Deixe array[]::text[] para apagar TODAS as contas.
  v_manter text[] := array[]::text[];

  v_contas_apagadas integer;
  v_contas_mantidas integer;
begin
  -- 1. Dados do app. Primeiro as tabelas, porque contatos usados numa
  --    divisão não podem ser apagados antes das divisões (on delete restrict).
  truncate table
    public.installments,
    public.purchase_shares,
    public.purchases,
    public.invoices,
    public.income_shares,
    public.incomes,
    public.cards,
    public.contacts,
    public.account_members,
    public.categories;

  -- 2. Contas de login fora da lista. O perfil sai junto (on delete cascade).
  delete from auth.users
  where email is null or lower(email) <> all (select lower(e) from unnest(v_manter) as e);
  get diagnostics v_contas_apagadas = row_count;

  -- 3. Contas mantidas voltam com as categorias padrão
  perform public.seed_default_categories(p.id) from public.profiles p;
  select count(*) into v_contas_mantidas from public.profiles;

  raise notice 'Contas apagadas: %. Contas mantidas: %.', v_contas_apagadas, v_contas_mantidas;
end;
$$;
