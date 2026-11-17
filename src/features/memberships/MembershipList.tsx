import { removeMember, respondInvitation, respondRequest } from './actions'
import type { Membership } from './queries'
import styles from '@/components/ui.module.css'

type Props = {
  items: Membership[]
  modo: 'membro' | 'conta'
  voltar: '/contas' | '/participantes'
}

function rotulo(item: Membership, modo: Props['modo']): string {
  if (item.status === 'active') return 'Participante'
  if (item.needsMyResponse) return modo === 'membro' ? 'Convite recebido' : 'Pedido recebido'
  return modo === 'membro' ? 'Pedido enviado' : 'Convite enviado'
}

export function MembershipList({ items, modo, voltar }: Props) {
  if (items.length === 0) {
    return <p className={styles.vazio}>Nada por aqui ainda.</p>
  }

  return (
    <ul className={styles.lista}>
      {items.map((item) => (
        <li key={item.otherId} className={styles.item}>
          <div className={styles.linha}>
            <span className={styles.nome}>{item.name}</span>
            <span className={styles.tag}>{rotulo(item, modo)}</span>
          </div>
          <span className={styles.detalhe}>@{item.username}</span>

          <div className={styles.linha}>
            {item.status !== 'active' && item.needsMyResponse && (
              <>
                {(['sim', 'nao'] as const).map((resposta) => (
                  <form key={resposta} action={modo === 'membro' ? respondInvitation : respondRequest}>
                    <input
                      type="hidden"
                      name={modo === 'membro' ? 'conta' : 'membro'}
                      value={item.otherId}
                    />
                    <input type="hidden" name="aceitar" value={resposta} />
                    <button
                      className={resposta === 'sim' ? styles.button : styles.remover}
                      type="submit"
                    >
                      {resposta === 'sim' ? 'Aceitar' : 'Recusar'}
                    </button>
                  </form>
                ))}
              </>
            )}

            {(item.status === 'active' || !item.needsMyResponse) && (
              <form action={removeMember}>
                <input type="hidden" name="outro" value={item.otherId} />
                <input type="hidden" name="volta" value={voltar} />
                <button className={styles.remover} type="submit">
                  {item.status !== 'active' ? 'Cancelar' : modo === 'membro' ? 'Sair' : 'Remover'}
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}