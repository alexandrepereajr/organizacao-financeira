# Organização Financeira — Documento de Contexto

Documento vivo para dar continuidade ao projeto entre conversas. **Cole este documento (ou anexe ao Projeto) no início de cada nova conversa** e atualize-o ao final de cada etapa.

## 1. Visão geral

Sistema de organização financeira **pessoal e simples**, para substituir a planilha de Excel que o Alexandre usa hoje. Acessível do celular e do computador, com dados sincronizados, usando **apenas ferramentas gratuitas**.

**Como é a planilha atual:** cada coluna é um mês e cada linha é uma compra. Em compras parceladas, o valor de cada parcela fica nas colunas dos meses. São três blocos: (1) compras, com o total do mês no fim; (2) cartões, com a soma das compras de cada cartão por mês e, no fim do mês, o valor exato da fatura fechada, também com total; (3) valores que entram, lançados também nos blocos anteriores para calcular a diferença entre o que entra e o que se gasta.

**O que o sistema novo deve ter:**

- Uma versão modernizada da planilha; a visão com meses em colunas (os três blocos acima) é uma das visualizações.
- Vários usuários, com a **tela de login como primeira tela**.
- Cada usuário tem seus próprios cartões e compras.
- Cada usuário tem um **código único**, gerado no cadastro, que outro usuário usa para adicioná-lo como contato.
- Também é possível citar numa compra uma pessoa que **não tem conta** (contato só com nome).
- Em cada compra se informa de quem ela é: totalmente do próprio usuário, dividida com outras pessoas, ou só de outra pessoa.
- Compras em que um usuário com conta foi citado aparecem para ele automaticamente, somente para leitura.

## 2. Stack e tecnologias

| Camada | Tecnologia | Status |
| --- | --- | --- |
| Hospedagem | Vercel (plano Hobby, gratuito); deploy automático a cada push na branch main | Em uso (publicado) |
| Banco de dados | Supabase (Postgres, plano gratuito); migrations 1 a 21 aplicadas | Em uso |
| Autenticação | Supabase Auth (e-mail e senha) | Em uso |
| Front-end | Next.js 16 (App Router) + TypeScript, estilos com CSS Modules | Em uso |
| Versionamento | GitHub, repositório alexandrepereajr/organizacao-financeira | Em uso |
| Editor e IA | VS Code com Ollama local para continuar o desenvolvimento | Decidido |

Restrição: usar **apenas ferramentas gratuitas**.

Versões instaladas: Next.js 16.4.5, @supabase/ssr 0.12.7 e @supabase/supabase-js 2.119.0, com a pasta `src/app`. No Next.js 16 a proteção de rotas fica em `proxy.ts` (nome antigo: `middleware.ts`).

## 3. Regras de trabalho com o assistente de IA

- **Ler este documento inteiro** antes de qualquer alteração. Responder em português do Brasil.
- Desenvolver **por partes**, uma de cada vez, possivelmente em várias conversas ou ferramentas.
- **Arquivos bem modulares**, cada um com uma única responsabilidade.
- Antes de editar um arquivo que já existe, **ler o conteúdo atual dele**. Fazer edições mínimas, só no trecho necessário; nunca reescrever um arquivo inteiro sem necessidade nem apagar código que não faz parte do pedido.
- **Não supor** nomes de arquivos, funções, colunas ou pastas: conferir no projeto ou neste documento; se não encontrar, perguntar.
- **Nunca** pedir, usar ou escrever chaves secretas (service_role ou secret) nem valores de variáveis de ambiente; não editar o `.env.local`.
- As ferramentas são recentes (Next.js 16, @supabase/ssr 0.12): seguir os padrões da seção 11 e, em caso de dúvida, consultar a documentação oficial em vez de inventar.
- Fazer um **commit antes de cada tarefa** e conferir o `git diff` depois; se algo sair do esperado, `git restore .` desfaz.
- Ao final de cada etapa, **atualizar este documento** (status, estrutura de pastas e histórico).

## 4. Estrutura de pastas

```
organizacao-financeira/
  .env.local                 # fora do Git; variáveis do Supabase (seção 10)
  package.json
  tsconfig.json              # alias @/* aponta para ./src/*
  supabase/migrations/       # SQL das migrations 1 a 21 (histórico; já aplicadas)
                             # contas-teste.sql: cria as contas de teste (seção 10)
  supabase/scripts/          # scripts avulsos (não são migrations)
                             # apagar-todos-os-dados.sql: zera o banco (seção 10)
  src/
    proxy.ts                 # entrada do proxy (Next.js 16); chama updateSession
    app/
      layout.tsx             # título do app, AppNav e AccountBar em todas as telas
      globals.css            # tokens de cor (claro/escuro) e estilos básicos
      page.tsx               # home: saudação, código e atalhos agrupados
      login/page.tsx         # com o painel de acesso rápido em desenvolvimento
      cadastro/page.tsx      # nome, username, e-mail, senha, conta compartilhada
      auth/confirm/route.ts  # destino do link do e-mail de confirmação
      contatos/page.tsx
      cartoes/page.tsx
      categorias/page.tsx
      compras/page.tsx       # compras da conta no mês, com editar e excluir
      compras/nova/page.tsx
      compras/[id]/editar/page.tsx
      entradas/page.tsx
      faturas/page.tsx
      contas/page.tsx        # conta normal: convites e pedidos para contas compartilhadas
      participantes/page.tsx # conta compartilhada: seus participantes
      pendentes/page.tsx     # conta compartilhada: compras incompletas
      visoes/planilha/page.tsx
    components/
      AppNav.tsx             # navegação: barra no topo; no celular, abas embaixo
      AccountBar.tsx         # seletor da conta ativa (só aparece com 2+ contas)
      MonthStepper.tsx       # navegação mês a mês
      ui.module.css          # estilos comuns das telas
    features/
      auth/                  # login, cadastro, sair, reenvio da confirmação
      home/                  # atalhos da tela inicial
      accounts/              # contas disponíveis e troca da conta ativa
      contacts/              # contatos por código/username ou só nome
      cards/                 # cartões (incluindo os de participantes)
      categories/            # categorias de compras e de entradas
      purchases/             # formulário de compra (nova e edição), lista do mês, parcelas, divisão (calc.ts)
      pending/               # completar compras vinculadas a conta compartilhada
      incomes/               # entradas, recorrência e destinos
      invoices/              # valor real da fatura por cartão e mês
      memberships/           # convites, pedidos e participantes
      ledger/                # lê do banco e monta os dados por mês
      spreadsheet/           # visão em planilha (blocos e tabela)
      dev/                   # acesso rápido às contas de teste (só no npm run dev)
    lib/
      month.ts               # validação do formato de mês AAAA-MM
      supabase/
        env.ts               # lê as duas variáveis NEXT_PUBLIC_*
        server.ts            # createClient() para servidor; envia a conta ativa
        proxy.ts             # updateSession: renova sessão e protege rotas
```

Novas funcionalidades entram em `src/features/<nome>/` e novas rotas em `src/app/<rota>/`. Cada pasta de funcionalidade segue o padrão `actions.ts` (gravações), `queries.ts` (leituras), `messages.ts` (textos) e componentes.

## 5. Modelo de dados

O banco está aplicado no Supabase (migrations 1 a 21). As parcelas são linhas e não colunas: a visão de planilha, com meses em colunas, é uma consulta agrupada pelo mês de referência. Compras e entradas recorrentes não geram linhas por mês: o código repete o valor em cada mês até `recurrence_end_month`.

### Contas normais, contas compartilhadas e conta ativa

- Cada perfil tem `account_type`: **normal** (uma pessoa) ou **shared** (uma conta compartilhada, como "Casa"). A conta compartilhada é criada no cadastro, marcando a opção correspondente.
- Usuários normais viram **participantes** de uma conta compartilhada por convite ou pedido aceito (tabela `account_members`).
- O participante pode **agir em nome** da conta compartilhada: a conta escolhida na AccountBar fica no cookie `conta_ativa`, o `createClient()` envia o cabeçalho `x-active-account` e a função `active_account()` confere se o vínculo está ativo. Sem cookie, a conta ativa é o próprio usuário.
- Novos registros pertencem à conta ativa (`owner_id` default `active_account()`), e as regras de RLS usam a conta ativa.
- A conta compartilhada não entra na divisão das compras: elas pertencem aos participantes. Uma compra vinculada à conta compartilhada sem divisão fica **pendente** (`shared_pending`) até ser completada em `/pendentes`.

### Tabelas

| Tabela | Função | Migration |
| --- | --- | --- |
| profiles | Um registro por usuário, com nome e código único de compartilhamento (criado por trigger no cadastro) | 20261108000001_profiles |
| contacts | Pessoas que o usuário pode citar nas compras: vinculadas a uma conta (via código) ou apenas um nome | 20261108000002_contacts |
| cards | Cartões do usuário (nome, dia de fechamento e de vencimento) | 20261108000003_cards |
| purchases | A compra: descrição, total, data, cartão, número de parcelas e mês da 1ª parcela | 20261108000004_purchases |
| purchase_shares | Divisão da compra por participante; contato vazio = o próprio dono | 20261108000004_purchases |
| installments | Uma linha por parcela, com valor e mês de referência | 20261108000004_purchases |
| invoices | Valor real da fatura fechada por cartão e mês | 20261108000006_invoices |
| incomes | Entradas por mês | 20261108000007_incomes |
| categories | Categorias do dono, separadas em compras e entradas | 20261110000011_categories |
| account_members | Vínculo entre conta compartilhada e participante (convidado, pedido ou ativo) | 20261110000013_shared_account_members |
| income_shares | Destinos de parte de uma entrada (para um contato ou uma conta compartilhada) | 20261111000019_income_shares |

O que cada migration de 8 a 19 acrescentou:

| Migration | Mudança |
| --- | --- |
| 08 my_purchase_shares | Função com a parte do usuário em cada compra de um período |
| 09 recurrence | Compras e entradas recorrentes |
| 10 username_account_type | Username único e tipo de conta (normal ou shared) |
| 11 categories | Categorias, com categorias padrão criadas no cadastro |
| 12 add_contact_by_identifier | Adicionar contato por username ou código (substitui `add_contact_by_share_code`) |
| 13 shared_account_members | Participantes de contas compartilhadas: convites, pedidos, aceite, remoção |
| 14 account_switcher | Conta ativa e regras de segurança em nome dela; `created_by` em compras e entradas |
| 15 shared_purchase_shares | A conta compartilhada não entra na divisão |
| 16 shared_cards | Cartões dos participantes visíveis para a conta compartilhada (com opção de ocultar) |
| 17 shared_purchases | Compras vinculadas a uma conta compartilhada; compra pendente |
| 18 complete_shared_purchase | Completar a divisão de uma compra pendente |
| 19 income_shares | Destinos de entradas; criar e alterar entradas por função |
| 20 cited_sees_own_share | Quem foi citado numa compra vê só a própria linha da divisão |
| 21 update_delete_purchase | Editar e excluir compras (`update_purchase`, `delete_purchase`) |

Funções principais no banco: `create_purchase` (cria a compra, as divisões e as parcelas numa única transação), `complete_shared_purchase`, `can_view_purchase` (regra de leitura das compras), `my_purchase_shares`, `add_contact_by_identifier`, `create_income`, `update_income`, `incomes_destined_to_me`, `active_account`, `my_accounts`, `current_account`, `visible_cards` e as de participantes (`invite_member`, `request_join`, `respond_invitation`, `respond_request`, `remove_member`, `membership_overview`).

Segurança: ativar **Row Level Security (RLS)** em todas as tabelas e exigir login.

### Colunas principais

- **profiles:** id (igual ao id do usuário no Supabase Auth), display_name, share_code (único, 8 caracteres, gerado automaticamente), username (único, 3 a 20 caracteres `a-z0-9_`), account_type (`normal` ou `shared`), created_at.
- **contacts:** id, owner_id, name, linked_user_id (vazio = pessoa sem conta), created_at. Não pode apontar para o próprio dono; um mesmo usuário vinculado só aparece uma vez por dono.
- **cards:** id, owner_id, name, closing_day (1 a 31), due_day (1 a 31), is_active, hide_from_shared (oculta o cartão das contas compartilhadas), created_at.
- **purchases:** id, owner_id, card_id (pode ser vazio), category_id, description, total_amount (numeric 12,2, maior que zero), purchase_date, installments_count (1 a 120), first_installment_month (sempre dia 1), is_recurring, recurrence_end_month, shared_account_id (conta compartilhada vinculada), shared_pending, created_by, notes, created_at.
- **purchase_shares:** id, purchase_id, contact_id (vazio = o próprio dono), shared_contact_id (participante da conta compartilhada), amount (maior que zero). Uma linha por participante.
- **categories:** id, owner_id, kind (`purchase` ou `income`), name (2 a 40 caracteres, único por dono e tipo), is_active, created_at.
- **account_members:** shared_account_id, member_user_id, status (`invited`, `requested` ou `active`), created_at, updated_at.
- **income_shares:** id, income_id, contact_id ou shared_account_id (exatamente um), kind (`percent` ou `amount`), value.
- **installments:** id, purchase_id, number, amount, reference_month (sempre dia 1). Único por compra e número.
- **invoices:** id, card_id, reference_month (dia 1), amount, created_at. Único por cartão e mês.
- **incomes:** id, owner_id, category_id, description, amount (maior que zero), reference_month (dia 1), is_recurring, recurrence_end_month, created_by, created_at.

### Regras de segurança (RLS)

A partir da migration 14, "dono" quer dizer a **conta ativa** (`active_account()`), não necessariamente o usuário logado.

- **profiles:** cada um lê o próprio perfil, os perfis de quem adicionou como contato e o perfil do dono das compras em que foi citado. Só o display_name pode ser alterado.
- **contacts, categories, incomes:** acesso total apenas do dono.
- **cards:** o dono vê e altera; a conta compartilhada só lê os cartões não ocultos dos participantes ativos.
- **invoices:** acesso total apenas do dono do cartão.
- **purchases, installments:** leitura para o dono, para quem foi citado, para a conta compartilhada vinculada e para o dono do cartão usado (via a função can_view_purchase); exclusão de compra só pelo dono; não há inserts nem updates diretos.
- **purchase_shares:** o dono da compra, a conta compartilhada vinculada e o dono do cartão veem todas as linhas; **quem foi citado vê só a própria linha** (função can_view_purchase_share, migration 20).
- **Regra de privacidade:** quem foi citado numa compra de outra conta não vê o nome do cartão nem quem são os outros participantes (nem quantos são ou quanto pagam). Vê a compra, o total, as parcelas, a própria parte e o nome de quem a criou.
- **account_members, income_shares:** só leitura; as alterações passam pelas funções.

### Funções

- `create_purchase(p_description text, p_total_amount numeric, p_purchase_date date, p_installments_count integer, p_first_installment_month date, p_card_id uuid, p_shares jsonb, p_notes text default null, p_is_recurring boolean default false, p_category_id uuid default null, p_shared_account uuid default null)` devolve o id da compra (versão da migration 17). O parâmetro p_shares é uma lista de objetos com contact_id (uuid ou null para o próprio usuário) e amount; a soma precisa ser igual ao total.
- `complete_shared_purchase(p_purchase_id uuid, p_shares jsonb)`: a conta compartilhada informa a divisão de uma compra pendente; p_shares usa shared_contact_id e amount.
- `create_income(p_description, p_amount, p_start_month, p_repeat, p_recurring, p_category, p_shares)` e `update_income(...)`: criam e alteram entradas com seus destinos. Alterar uma recorrente que começou antes encerra a série antiga e cria uma nova a partir do mês indicado.
- `update_purchase(p_purchase_id uuid, p_month date, ...)`, com os mesmos parâmetros de create_purchase menos p_is_recurring: só a conta dona altera; refaz divisão e parcelas. p_month é o mês de onde o usuário editou: numa recorrente que começou antes dele, a série antiga termina no mês anterior e uma nova começa em p_month (devolve o id da nova). A compra não muda entre recorrente e não recorrente. A validação fica em `check_purchase_input` (interna, mesmas regras de create_purchase).
- `delete_purchase(p_purchase_id uuid, p_month date)`: só a conta dona; exclui a compra com divisões e parcelas, ou, numa recorrente que começou antes de p_month, só encerra no mês anterior. Devolve `removida` ou `encerrada`.
- `add_contact_by_identifier(p_value text)` adiciona um contato por username ou código e devolve a linha do contato. A antiga `add_contact_by_share_code` foi removida.
- `generate_share_code()` gera o código; o trigger em auth.users cria o perfil no cadastro, usando o nome enviado em display_name.

## 6. Funcionalidades

| Parte | Funcionalidade | Status |
| --- | --- | --- |
| 1 | Levantamento da planilha atual e modelo do banco | Concluído |
| 2 | Banco de dados: migrations 1 a 7 no Supabase | Concluído |
| 3 | Configuração do projeto (Next.js, GitHub, Vercel, variáveis de ambiente) | Concluído |
| 4 | Autenticação: login, cadastro e sair (primeira tela é o login) | Concluído |
| 5 | Contatos: mostrar o código único do usuário e adicionar por código, username ou só por nome | Concluído |
| 6 | Cartões | Concluído |
| 7 | Cadastro de compras, com divisão entre usuários, parcelas, recorrência e categoria | Concluído |
| 8 | Visão em planilha (meses em colunas, blocos de compras, cartões e entradas) | Concluído |
| 9 | Faturas reais e entradas, com a diferença entre o que entra e o que gasta | Concluído |
| 9a | Categorias de compras e entradas | Concluído |
| 9b | Contas compartilhadas: participantes, troca de conta, cartões e compras compartilhados, compras pendentes | Concluído |
| 9c | Destinos de entradas (parte de uma entrada para um contato ou conta compartilhada) | Concluído |
| 9d | Editar e excluir compra, com lista de compras | Concluído |
| 10 | Exportar para CSV/Excel (backup) | Fora do escopo (decidido em 17/11/2026) |
| 11 | Confirmação de e-mail | Código pronto; falta configurar o Supabase (seção 10) |
| 12 | Acabamento visual e navegação | Concluído |

## 7. Decisões e pontos de atenção

- O plano gratuito do Supabase pausa o projeto após cerca de uma semana sem uso (reativação com um clique).
- O plano gratuito não garante backups automáticos. A exportação para CSV/Excel, que cobriria isso, saiu do escopo em 17/11/2026; o projeto fica sem backup próprio.
- O plano Hobby da Vercel é restrito a uso não comercial, o que atende este caso.
- Compras criadas por outra pessoa aparecem automaticamente para quem foi citado (com conta), somente para leitura.
- Compras só são gravadas pela função `create_purchase`, que valida que a soma das divisões é igual ao total; as tabelas não aceitam inserts diretos.
- O mês de referência é sempre o dia 1; o mês da primeira parcela é informado pelo usuário, não calculado pelo fechamento do cartão.
- Parcelas são calculadas em centavos: o resto da divisão vai em 1 centavo nas primeiras parcelas.
- Um contato citado em uma compra não pode ser excluído.
- Autenticação por e-mail e senha, com confirmação de e-mail. O link do e-mail leva a `/auth/confirm`, que valida o token (`verifyOtp` com `token_hash`, funciona mesmo abrindo o e-mail em outro aparelho) e já entra na conta; se outra conta estava logada no navegador, ela é deslogada antes.
- Quem tenta entrar sem confirmar vê uma mensagem própria e pode pedir um novo e-mail na tela de login. A resposta do reenvio é a mesma exista ou não a conta, para não revelar e-mails cadastrados. Cadastrar de novo não serve, porque o username fica reservado no primeiro cadastro.
- Envio de e-mails pelo serviço padrão do Supabase (decidido em 17/11/2026, porque só pessoas próximas vão usar). Ele tem limite baixo de envios por hora e pode entregar só para endereços da equipe do projeto no Supabase; se alguém não receber, a saída é configurar um SMTP próprio (Resend, Brevo e similares têm plano gratuito).
- Contas criadas antes de ligar a confirmação (e as contas de teste) já contam como confirmadas.
- A sessão é validada com `supabase.auth.getUser()` no proxy e nas páginas protegidas.
- As telas de login e cadastro mostram mensagens fixas por código, nunca texto vindo da URL.
- Quem é citado numa compra de outra conta só lê; editar e excluir é da conta dona. Ele também não vê o cartão nem os outros participantes (seção 5).
- Editar e excluir compras segue o padrão das entradas: lista por mês; recorrente que começou antes do mês é dividida (editar) ou encerrada (excluir), preservando os meses passados.
- Ao editar, a divisão gravada volta como percentuais; "Você" fica automático. Salvar sem mudar nada pode mover 1 centavo entre participantes.
- `created_by` já é gravado em compras e entradas, mas ainda não aparece em nenhuma tela.

## 8. Próximos passos

1. **Parte 11, confirmação de e-mail (pendente, configuração manual):** código pronto e testado localmente; falta o passo a passo do Supabase na seção 10 ("Supabase, confirmação de e-mail"), incluindo o teste com um cadastro real.
2. **Pendências técnicas:** mostrar `created_by` onde fizer sentido; levar `create_purchase` a usar `check_purchase_input` (hoje a validação está repetida nas duas).

## 9. Histórico de atualizações

- **08/11/2026:** documento criado; stack e regras de trabalho definidas.
- **08/11/2026:** modelo de dados fechado e migrations 1 a 7 aplicadas no Supabase.
- **08/11/2026:** autenticação (login, cadastro e sair) implementada e funcionando no computador e na Vercel; deploy corrigido (Framework Preset e variáveis de ambiente). Documento completado para continuar em outra ferramenta.
- **17/11/2026:** corrigido o `npm run build`, que falhava na checagem de tipos em `src/features/ledger/queries.ts`; adicionado `await connection()` nas páginas que leem a data (`/`, `/compras/nova`, `/entradas`, `/faturas`, `/visoes/planilha`).
- **17/11/2026:** documento atualizado com o que foi feito entre 09 e 11/11 (migrations 8 a 19, partes 5 a 9, categorias, contas compartilhadas, destinos de entradas) e com os próximos passos.
- **17/11/2026:** regra de privacidade das compras (quem é citado vê só a própria parte; migration 20). Parte 9d: lista de compras do mês (`/compras`), edição (`/compras/[id]/editar`) e exclusão, com as funções `update_purchase` e `delete_purchase` (migration 21). Migrations 20 e 21 aplicadas e testadas: citado vê só a própria linha; editar parcelada e recorrente (divisão da série), encerrar, excluir, recusa de soma errada e bloqueio de edição/exclusão por quem foi citado. Fluxo de editar e excluir também testado pela tela.
- **17/11/2026:** exportação para CSV saiu do escopo. Parte 11: rota `/auth/confirm`, mensagem para e-mail não confirmado e reenvio da confirmação no login. Testado localmente: link inválido, reenvio e login normal. Falta configurar o Supabase (seção 10) e testar com um cadastro real.
- **17/11/2026:** parte 12, visual. Corrigido o carregamento dos CSS Modules (Tailwind removido). Tokens de cor com tema claro e escuro, navegação (topo no computador, abas embaixo no celular), home com atalhos, título "Organização Financeira", planilha com coluna fixa estreita no celular e telas sem rolagem lateral a partir de 320 px. `await connection()` nas páginas de cartões, categorias, contatos, contas, participantes e pendentes.

## 10. Ambiente, variáveis e deploy

- **Projeto local:** pasta `organizacao-financeira` (Windows). Comandos: `npm run dev` (abre em http://localhost:3000) e `npm run build` (o mesmo build que a Vercel executa; rodar antes de subir).
- **Repositório:** GitHub, `alexandrepereajr/organizacao-financeira`, branch `main`. Cada push na `main` gera um deploy de produção na Vercel; outras branches geram Preview.
- **Variáveis de ambiente** (apenas os nomes; nunca guardar valores neste documento):
  - `NEXT_PUBLIC_SUPABASE_URL`: a Project URL do Supabase, no formato https://CODIGO.supabase.co, sem nada depois.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: a chave pública (anon ou publishable). **Nunca** usar a chave secret ou service_role.
- **Onde ficam:** localmente no arquivo `.env.local`, na raiz do projeto (ao lado do package.json), sem aspas e sem espaços em volta do `=`; nunca vai para o Git. Na Vercel, em Settings > Environment Variables, com os mesmos nomes, como variáveis comuns (não sensíveis), nos ambientes Production, Preview e Development.
- **Depois de mudar variáveis:** reiniciar o `npm run dev` (o Next.js só lê o arquivo ao iniciar) e, na Vercel, fazer Redeploy (as variáveis NEXT_PUBLIC_ são gravadas durante o build).
- **Vercel:** o Framework Preset precisa ser **Next.js**, sem sobrescrever o Output Directory.
- **Supabase, confirmação de e-mail — PENDENTE, a fazer pelo Alexandre** (Authentication no painel do Supabase):
  0. **Antes de tudo:** garantir que a rota `/auth/confirm` já está em produção (push na `main` e deploy da Vercel concluído). Se a confirmação for ligada antes, quem se cadastrar recebe um link que dá 404.
  1. *URL Configuration*: **Site URL** = endereço de produção na Vercel (sem barra no final). Em **Redirect URLs**, incluir também `http://localhost:3000/**`.
  2. *Emails > Confirm signup*: no template, trocar o link (`{{ .ConfirmationURL }}`) por `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. Pode manter o resto do texto do e-mail.
  3. *Sign In / Providers > Email*: ligar **Confirm email** e salvar.
  4. **Testar:** cadastrar uma conta nova com um e-mail próprio, abrir o link recebido e conferir que cai na home já logado. Tentar entrar antes de confirmar deve mostrar "Seu e-mail ainda não foi confirmado" e o formulário de reenvio.
  Observações: como o link usa a Site URL, um cadastro feito no `npm run dev` recebe link para a produção. O serviço de e-mail padrão envia poucos e-mails por hora e pode entregar só para endereços da equipe do projeto no Supabase; se alguém não receber, esse é o motivo provável (solução: SMTP próprio, em *Emails > SMTP Settings*).
- **Supabase:** as migrations 1 a 21 foram executadas no SQL Editor, na ordem; não executá-las de novo (dá erro de já existe). Mudanças futuras no banco entram como novas migrations numeradas em `supabase/migrations/`, uma por arquivo, continuando a partir da 22.
- **Começar do zero:** `supabase/scripts/apagar-todos-os-dados.sql` apaga todos os dados e todas as contas (inclusive as de teste), menos os e-mails listados em `v_manter`, que ficam vazios e com as categorias padrão. Não tem volta. Atenção: o desenvolvimento local usa o **mesmo** Supabase da produção; depois de começar a usar de verdade, não rodar o `contas-teste.sql` nele (os dados de teste se misturariam aos reais). Para voltar a ter contas de teste, o ideal é criar um segundo projeto no Supabase (o plano gratuito permite dois) e apontar o `.env.local` para ele.
- **Contas de teste:** `supabase/migrations/contas-teste.sql` cria as contas Ana, Bruno, Carla (normais) e Casa (compartilhada), com dados de exemplo; pode ser executado mais de uma vez. No `npm run dev`, a tela de login mostra o painel "Acesso rápido" para entrar nelas (código em `src/features/dev/`); em produção o painel não funciona.

## 11. Convenções de código

- Next.js 16 com App Router, TypeScript e imports pelo alias `@/` (que aponta para `src/`). Estilos com CSS Modules; o projeto **não usa Tailwind** (foi removido em 17/11/2026, ver seção 12).
- **Cores e visual:** usar sempre os tokens do `globals.css` (`var(--primary)`, `var(--surface)`, `var(--border)`, `var(--muted)`, `var(--danger)` etc.), nunca cores fixas, para funcionar nos temas claro e escuro. Containers em grid usam `grid-template-columns: minmax(0, 1fr)` para não estourar a largura no celular. A navegação fica no `AppNav`; telas novas que devem aparecer nela entram na lista `ITENS`.
- **Proxy:** `src/proxy.ts` exporta a função `proxy` e chama `updateSession` (em `src/lib/supabase/proxy.ts`). Ela renova a sessão com `supabase.auth.getUser()`, deixa `/login` e `/cadastro` públicas, manda quem não está logado para `/login` e quem está logado em página pública para `/`. `/auth/confirm` fica aberta para todos (lista `OPEN_PATHS`), logados ou não.
- **Cliente Supabase no servidor:** `createClient()` de `@/lib/supabase/server` (assíncrono, usa os cookies); criar um por requisição. O cliente de navegador ainda não existe; quando for necessário, usar `createBrowserClient` do @supabase/ssr.
- **Gravações:** Server Actions em `src/features/<funcionalidade>/actions.ts`, com `'use server'`. Em caso de erro, redirecionam com um código (`?erro=codigo`) e os textos ficam em `messages.ts`.
- **Páginas que leem searchParams ou cookies** exportam `export const instant = false` antes do componente. Sem isso o Next.js 16.4 mostra o erro blocking-prerender-runtime e o build pode falhar. Se aparecer erro de `Date.now()` em uma página, chamar `await connection()` (de `next/server`) no início dela.
- **Páginas que leem a data de hoje** (`hojeEmSaoPaulo()`, em `src/features/purchases/calc.ts`) ou que fazem consultas (que chamam `supabase.auth.getUser()`) começam com `await connection()`. Hoje todas as páginas logadas fazem isso.
- **Conta ativa:** sempre usar o `createClient()` de `@/lib/supabase/server`, que envia a conta ativa ao banco. Não filtrar por `user.id` nas consultas: o RLS já filtra pela conta ativa. Atenção: em compras, o RLS também devolve as compras de outras contas em que a conta foi citada; para listar só as da conta, filtrar `owner_id` pelo id da conta ativa (de `listAccounts()`). Para os dados da conta ativa, usar a função `current_account`.
- **Chamadas `rpc()`** devolvem `unknown` (não há tipos gerados do banco): declarar o tipo do resultado onde ele é usado.
- **Compras** são sempre criadas pela função `create_purchase`, e entradas por `create_income`. Valores monetários em numeric(12,2); meses de referência sempre no dia 1; no código, valores em centavos.

## 12. Problemas já encontrados e soluções

- **404 com ID na Vercel:** o Framework Preset estava como Other. Trocar para Next.js e fazer Redeploy.
- **Internal Server Error na Vercel:** variáveis de ambiente ausentes ou erradas. Corrigir e fazer Redeploy.
- **Erro de URL e Key obrigatórias, no computador:** `.env.local` com extensão escondida (`.env.local.txt`), fora da raiz ou com nome de variável diferente. Corrigir e reiniciar o `npm run dev`.
- **Erro Unexpected end of JSON input no cadastro:** URL do Supabase incorreta; precisa ser a Project URL da página de API.
- **Comando npm não reconhecido no terminal do VS Code:** fechar o VS Code por completo e abrir de novo (o PATH só atualiza em programas abertos depois da instalação do Node).
- **Chave secret colada por engano:** trocar pela anon/publishable e gerar nova secret no Supabase.
- **Telas sem estilo (classes vazias):** a regra `turbopack.rules["*.css"]` do Tailwind no `next.config.ts` fazia os CSS Modules virarem CSS global, e todo `styles.x` ficava vazio. Removidos a regra e o Tailwind.
- **Avisos de prerender no Next.js 16.4:** resolvidos com `export const instant = false` nas páginas dinâmicas.
- **Build falha com `Type 'unknown[]' is not assignable`:** sem tipos gerados do banco, `supabase.rpc()` devolve `unknown[]`. Declarar o tipo onde o dado é usado (por exemplo `shares as RawShare[]`); `.overrideTypes()` não resolve nesse caso. Rodar `npm run build` antes de subir, porque o `npm run dev` não checa tipos.
- **Erro de `new Date()`/`Date.now()` no prerender mesmo com `instant = false`:** chamar `await connection()` na primeira linha da página. Vale também para páginas que só chamam `supabase.auth.getUser()`, que usa `Date.now()` por dentro.
- **Success. No rows returned** no SQL Editor do Supabase é o resultado normal de comandos que criam estrutura.
