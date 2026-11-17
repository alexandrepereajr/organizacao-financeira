import { CONTAS_TESTE } from './accounts'
import { devLogin } from './actions'
import styles from '@/components/ui.module.css'

export function DevPanel() {
  // Nunca aparece em produção
  if (process.env.NODE_ENV === 'production') return null

  return (
    <section className={styles.section}>
      <h2>Acesso rápido (só em desenvolvimento)</h2>
      <div className={styles.acoesRapidas}>
        {CONTAS_TESTE.map((conta) => (
          <form key={conta.username} action={devLogin}>
            <input type="hidden" name="username" value={conta.username} />
            <button className={styles.button} type="submit">
              {conta.nome}
              {conta.compartilhada ? ' (compartilhada)' : ''}
            </button>
          </form>
        ))}
      </div>
    </section>
  )
}