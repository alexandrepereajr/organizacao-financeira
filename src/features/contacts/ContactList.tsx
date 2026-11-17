import { deleteContact } from './actions'
import type { Contact } from './queries'
import styles from './contacts.module.css'

export function ContactList({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return <p className={styles.vazio}>Nenhum contato ainda.</p>
  }

  return (
    <ul className={styles.lista}>
      {contacts.map((contact) => (
        <li key={contact.id} className={styles.item}>
          <span className={styles.nome}>{contact.name}</span>
          <span className={styles.tag}>
            {contact.linked_user_id ? 'Com conta' : 'Sem conta'}
          </span>
          <form action={deleteContact}>
            <input type="hidden" name="id" value={contact.id} />
            <button className={styles.remover} type="submit">Remover</button>
          </form>
        </li>
      ))}
    </ul>
  )
}