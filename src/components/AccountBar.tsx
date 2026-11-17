import { switchAccount } from '@/features/accounts/actions'
import { listAccounts } from '@/features/accounts/queries'
import styles from './AccountBar.module.css'
import { connection } from 'next/server'

export async function AccountBar() {
  await connection()
  const contas = await listAccounts()

  // Só aparece para quem tem mais de uma conta disponível
  if (!contas || contas.length < 2) return null

  const ativa = contas.find((conta) => conta.isActive) ?? contas[0]

  return (
    <div className={`${styles.bar} ${ativa.isShared ? styles.compartilhada : ''}`}>
      <span className={styles.rotulo}>Você está em:</span>
      <strong>{ativa.name}</strong>
      <span className={styles.tag}>{ativa.isShared ? 'Conta compartilhada' : 'Pessoal'}</span>

      <form action={switchAccount} className={styles.form}>
        <select
          className={styles.select}
          name="conta"
          defaultValue={ativa.isSelf ? '' : ativa.id}
          aria-label="Trocar de conta"
        >
          {contas.map((conta) => (
            <option key={conta.id} value={conta.isSelf ? '' : conta.id}>
              {conta.isSelf ? `${conta.name} (pessoal)` : conta.name}
            </option>
          ))}
        </select>
        <button className={styles.botao} type="submit">Trocar</button>
      </form>
    </div>
  )
}