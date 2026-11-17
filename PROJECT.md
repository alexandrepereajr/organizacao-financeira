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
| Banco de dados | Supabase (Postgres, plano gratuito); migrations 1 a 7 aplicadas | Em uso |
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
  supabase/migrations/       # SQL das migrations 1 a 7 (histórico; já aplicadas)
  src/
    proxy.ts                 # entrada do proxy (Next.js 16); chama updateSession
    app/
      layout.tsx
      globals.css
      page.tsx               # home protegida (nome e código do usuário, botão Sair)
      login/page.tsx
      cadastro/page.tsx
    features/
      auth/
        actions.ts           # Server Actions: signIn, signUp, signOut
        messages.ts          # textos fixos por código (?erro=codigo)
        AuthShell.tsx        # cartão visual das telas de login e cadastro
        auth.module.css
    lib/
      supabase/
        env.ts               # lê as duas variáveis NEXT_PUBLIC_*
        server.ts            # createClient() para servidor
        proxy.ts             # updateSession: renova sessão e protege rotas
```

Novas funcionalidades entram em `src/features/<nome>/` e novas rotas em `src/app/<rota>/`.

## 5. Modelo de dados

O banco está fechado e aplicado no Supabase (migrations 1 a 7, executadas sem erros). As parcelas são linhas e não colunas: a visão de planilha, com meses em colunas, é uma consulta agrupada pelo mês de referência.

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

Funções no banco: `add_contact_by_share_code` (adiciona um contato pelo código único), `create_purchase` (cria a compra, as divisões e as parcelas numa única transação, migration 5) e `can_view_purchase` (regra de leitura das compras).

Segurança: ativar **Row Level Security (RLS)** em todas as tabelas e exigir login.

### Colunas principais

- **profiles:** id (igual ao id do usuário no Supabase Auth), display_name, share_code (único, 8 caracteres, gerado automaticamente), created_at.
- **contacts:** id, owner_id, name, linked_user_id (vazio = pessoa sem conta), created_at. Não pode apontar para o próprio dono; um mesmo usuário vinculado só aparece uma vez por dono.
- **cards:** id, owner_id, name, closing_day (1 a 31), due_day (1 a 31), is_active, created_at.
- **purchases:** id, owner_id, card_id (pode ser vazio), description, total_amount (numeric 12,2, maior que zero), purchase_date, installments_count (1 a 120), first_installment_month (sempre dia 1), notes, created_at.
- **purchase_shares:** id, purchase_id, contact_id (vazio = o próprio dono), amount (maior que zero). Uma linha por participante; no máximo uma por contato e uma para o dono em cada compra.
- **installments:** id, purchase_id, number, amount, reference_month (sempre dia 1). Único por compra e número.
- **invoices:** id, card_id, reference_month (dia 1), amount, created_at. Único por cartão e mês.
- **incomes:** id, owner_id, description, amount (maior que zero), reference_month (dia 1), created_at.

### Regras de segurança (RLS)

- **profiles:** cada um lê o próprio perfil, os perfis de quem adicionou como contato e o perfil do dono das compras em que foi citado. Só o display_name pode ser alterado.
- **contacts, cards, incomes:** acesso total apenas do dono.
- **invoices:** acesso total apenas do dono do cartão.
- **purchases, purchase_shares, installments:** leitura para o dono e para quem foi citado (via a função can_view_purchase); exclusão de compra só pelo dono; não há inserts diretos.

### Funções

- `create_purchase(p_description text, p_total_amount numeric, p_purchase_date date, p_installments_count integer, p_first_installment_month date, p_card_id uuid, p_shares jsonb, p_notes text default null)` devolve o id da compra. O parâmetro p_shares é uma lista de objetos com contact_id (uuid ou null para o próprio usuário) e amount; a soma precisa ser igual ao total.
- `add_contact_by_share_code(p_code text)` devolve a linha do contato criado (ou já existente).
- `generate_share_code()` gera o código; o trigger em auth.users cria o perfil no cadastro, usando o nome enviado em display_name.

## 6. Funcionalidades

| Parte | Funcionalidade | Status |
| --- | --- | --- |
| 1 | Levantamento da planilha atual e modelo do banco | Concluído |
| 2 | Banco de dados: migrations 1 a 7 no Supabase | Concluído |
| 3 | Configuração do projeto (Next.js, GitHub, Vercel, variáveis de ambiente) | Concluído |
| 4 | Autenticação: login, cadastro e sair (primeira tela é o login) | Concluído |
| 5 | Contatos: mostrar o código único do usuário e adicionar por código ou só por nome | Próxima |
| 6 | Cartões | Pendente |
| 7 | Cadastro de compras, com divisão entre usuários e parcelas | Pendente |
| 8 | Visão em planilha (meses em colunas, blocos de compras, cartões e entradas) | Pendente |
| 9 | Faturas reais e entradas, com a diferença entre o que entra e o que gasta | Pendente |
| 10 | Exportar para CSV/Excel (backup) | Pendente |

## 7. Decisões e pontos de atenção

- O plano gratuito do Supabase pausa o projeto após cerca de uma semana sem uso (reativação com um clique).
- O plano gratuito não garante backups automáticos, por isso a exportação para CSV/Excel está no escopo.
- O plano Hobby da Vercel é restrito a uso não comercial, o que atende este caso.
- Compras criadas por outra pessoa aparecem automaticamente para quem foi citado (com conta), somente para leitura.
- Compras só são gravadas pela função `create_purchase`, que valida que a soma das divisões é igual ao total; as tabelas não aceitam inserts diretos.
- O mês de referência é sempre o dia 1; o mês da primeira parcela é informado pelo usuário, não calculado pelo fechamento do cartão.
- Parcelas são calculadas em centavos: o resto da divisão vai em 1 centavo nas primeiras parcelas.
- Um contato citado em uma compra não pode ser excluído.
- Autenticação por e-mail e senha. A opção Confirm email do Supabase está **desativada por enquanto**; antes de convidar outras pessoas é preciso ligá-la e criar a rota de retorno do link de confirmação.
- A sessão é validada com `supabase.auth.getUser()` no proxy e nas páginas protegidas.
- As telas de login e cadastro mostram mensagens fixas por código, nunca texto vindo da URL.
- Pendências do banco: quem é citado ainda não vê o nome do cartão nem dos outros participantes (será resolvido com uma view); falta a função de editar compra.

## 8. Próximos passos

1. **Parte 5, contatos:** criar a rota `/contatos` com a funcionalidade em `src/features/contacts/`: mostrar o código único do usuário, adicionar contato pelo código (chamando `add_contact_by_share_code`), adicionar contato só com nome (inserindo em contacts sem linked_user_id) e listar os contatos.
2. **Parte 6, cartões:** cadastro e lista de cartões.
3. **Parte 7, compras:** formulário que chama `create_purchase`, com divisão entre contatos e parcelas.
4. **Partes 8 a 10:** visão em planilha, faturas e entradas, exportação.
5. **Pendências técnicas:** rota de confirmação de e-mail, view com nome do cartão e dos participantes para compras compartilhadas, função de editar compra, acabamento visual das telas.

## 9. Histórico de atualizações

- **08/11/2026:** documento criado; stack e regras de trabalho definidas.
- **08/11/2026:** modelo de dados fechado e migrations 1 a 7 aplicadas no Supabase.
- **08/11/2026:** autenticação (login, cadastro e sair) implementada e funcionando no computador e na Vercel; deploy corrigido (Framework Preset e variáveis de ambiente). Documento completado para continuar em outra ferramenta.

## 10. Ambiente, variáveis e deploy

- **Projeto local:** pasta `organizacao-financeira` (Windows). Comandos: `npm run dev` (abre em http://localhost:3000) e `npm run build` (o mesmo build que a Vercel executa; rodar antes de subir).
- **Repositório:** GitHub, `alexandrepereajr/organizacao-financeira`, branch `main`. Cada push na `main` gera um deploy de produção na Vercel; outras branches geram Preview.
- **Variáveis de ambiente** (apenas os nomes; nunca guardar valores neste documento):
  - `NEXT_PUBLIC_SUPABASE_URL`: a Project URL do Supabase, no formato https://CODIGO.supabase.co, sem nada depois.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: a chave pública (anon ou publishable). **Nunca** usar a chave secret ou service_role.
- **Onde ficam:** localmente no arquivo `.env.local`, na raiz do projeto (ao lado do package.json), sem aspas e sem espaços em volta do `=`; nunca vai para o Git. Na Vercel, em Settings > Environment Variables, com os mesmos nomes, como variáveis comuns (não sensíveis), nos ambientes Production, Preview e Development.
- **Depois de mudar variáveis:** reiniciar o `npm run dev` (o Next.js só lê o arquivo ao iniciar) e, na Vercel, fazer Redeploy (as variáveis NEXT_PUBLIC_ são gravadas durante o build).
- **Vercel:** o Framework Preset precisa ser **Next.js**, sem sobrescrever o Output Directory.
- **Supabase:** em Authentication, a opção Confirm email está desativada por enquanto. As 7 migrations foram executadas manualmente no SQL Editor, na ordem; não executá-las de novo (dá erro de já existe). Mudanças futuras no banco entram como novas migrations numeradas, uma por arquivo.

## 11. Convenções de código

- Next.js 16 com App Router, TypeScript e imports pelo alias `@/` (que aponta para `src/`). Estilos com CSS Modules; não assumir Tailwind.
- **Proxy:** `src/proxy.ts` exporta a função `proxy` e chama `updateSession` (em `src/lib/supabase/proxy.ts`). Ela renova a sessão com `supabase.auth.getUser()`, deixa `/login` e `/cadastro` públicas, manda quem não está logado para `/login` e quem está logado em página pública para `/`.
- **Cliente Supabase no servidor:** `createClient()` de `@/lib/supabase/server` (assíncrono, usa os cookies); criar um por requisição. O cliente de navegador ainda não existe; quando for necessário, usar `createBrowserClient` do @supabase/ssr.
- **Gravações:** Server Actions em `src/features/<funcionalidade>/actions.ts`, com `'use server'`. Em caso de erro, redirecionam com um código (`?erro=codigo`) e os textos ficam em `messages.ts`.
- **Páginas que leem searchParams ou cookies** exportam `export const instant = false` antes do componente. Sem isso o Next.js 16.4 mostra o erro blocking-prerender-runtime e o build pode falhar. Se aparecer erro de `Date.now()` em uma página, chamar `await connection()` (de `next/server`) no início dela.
- **Compras** são sempre criadas pela função `create_purchase`. Valores monetários em numeric(12,2); meses de referência sempre no dia 1.

## 12. Problemas já encontrados e soluções

- **404 com ID na Vercel:** o Framework Preset estava como Other. Trocar para Next.js e fazer Redeploy.
- **Internal Server Error na Vercel:** variáveis de ambiente ausentes ou erradas. Corrigir e fazer Redeploy.
- **Erro de URL e Key obrigatórias, no computador:** `.env.local` com extensão escondida (`.env.local.txt`), fora da raiz ou com nome de variável diferente. Corrigir e reiniciar o `npm run dev`.
- **Erro Unexpected end of JSON input no cadastro:** URL do Supabase incorreta; precisa ser a Project URL da página de API.
- **Comando npm não reconhecido no terminal do VS Code:** fechar o VS Code por completo e abrir de novo (o PATH só atualiza em programas abertos depois da instalação do Node).
- **Chave secret colada por engano:** trocar pela anon/publishable e gerar nova secret no Supabase.
- **Avisos de prerender no Next.js 16.4:** resolvidos com `export const instant = false` nas páginas dinâmicas.
- **Success. No rows returned** no SQL Editor do Supabase é o resultado normal de comandos que criam estrutura.
