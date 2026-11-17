import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { signOut } from '@/features/auth/actions'
import { createClient } from '@/lib/supabase/server'
import { Atalho } from '@/features/home/Atalho'
import styles from '@/features/home/home.module.css'

export const instant = false
export default async function HomePage() {
  // getUser() usa Date.now(): precisa rodar na requisição, não no prerender
  await connection()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: contas } = await supabase.rpc('current_account')
  const profile = contas?.[0] ?? null
  const compartilhada = profile?.account_type === 'shared'

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.boasVindas}>
          <div>
            <h1 className={styles.titulo}>Olá, {profile?.display_name ?? user.email}</h1>
            <p className={styles.usuario}>
              @{profile?.username}
              {compartilhada && <span className={styles.tag}>Conta compartilhada</span>}
            </p>
          </div>
          <div className={styles.codigo}>
            <span className={styles.codigoRotulo}>Seu código</span>
            <strong className={styles.codigoValor}>{profile?.share_code ?? '—'}</strong>
            <span className={styles.codigoDica}>para outras pessoas te adicionarem</span>
          </div>
        </header>

        <section className={styles.grupo} aria-labelledby="lancar">
          <h2 id="lancar" className={styles.grupoTitulo}>Lançar</h2>
          <div className={styles.grade}>
            <Atalho href="/compras/nova" titulo="Nova compra" descricao="À vista, parcelada ou recorrente" destaque />
            <Atalho href="/entradas" titulo="Nova entrada" descricao="Salário e outros valores que entram" />
          </div>
        </section>

        <section className={styles.grupo} aria-labelledby="acompanhar">
          <h2 id="acompanhar" className={styles.grupoTitulo}>Acompanhar</h2>
          <div className={styles.grade}>
            <Atalho href="/visoes/planilha" titulo="Planilha" descricao="Meses em colunas: compras, cartões e entradas" />
            <Atalho href="/compras" titulo="Compras do mês" descricao="Editar ou excluir lançamentos" />
            <Atalho href="/faturas" titulo="Faturas" descricao="Valor real de cada cartão no mês" />
            <Atalho href="/entradas" titulo="Entradas" descricao="O que entra em cada mês" />
          </div>
        </section>

        <section className={styles.grupo} aria-labelledby="cadastros">
          <h2 id="cadastros" className={styles.grupoTitulo}>Cadastros</h2>
          <div className={styles.grade}>
            <Atalho href="/cartoes" titulo="Cartões" descricao="Fechamento e vencimento" />
            <Atalho href="/contatos" titulo="Contatos" descricao="Pessoas para dividir compras" />
            <Atalho href="/categorias" titulo="Categorias" descricao="Para compras e entradas" />
            {compartilhada ? (
              <>
                <Atalho href="/participantes" titulo="Participantes" descricao="Quem faz parte desta conta" />
                <Atalho href="/pendentes" titulo="Compras incompletas" descricao="Falta indicar a divisão" />
              </>
            ) : (
              <Atalho href="/contas" titulo="Contas compartilhadas" descricao="Convites e pedidos" />
            )}
          </div>
        </section>

        <form action={signOut} className={styles.sair}>
          <button type="submit" className={styles.botaoSair}>Sair da conta</button>
        </form>
      </div>
    </main>
  )
}
