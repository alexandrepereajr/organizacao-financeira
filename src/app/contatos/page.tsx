import Link from 'next/link'
import { connection } from 'next/server'
import { AddByCodeForm } from '@/features/contacts/AddByCodeForm'
import { AddByNameForm } from '@/features/contacts/AddByNameForm'
import { ContactList } from '@/features/contacts/ContactList'
import { mensagem } from '@/features/contacts/messages'
import { getMyShareCode, listContacts } from '@/features/contacts/queries'
import styles from '@/features/contacts/contacts.module.css'

export const instant = false

type Props = { searchParams: Promise<{ erro?: string; aviso?: string }> }

export default async function ContatosPage({ searchParams }: Props) {
  // As consultas chamam getUser(), que usa Date.now(): precisa rodar na requisição
  await connection()
  const { erro, aviso } = await searchParams
  const [codigo, contacts] = await Promise.all([getMyShareCode(), listContacts()])
  const msgErro = mensagem(erro)
  const msgAviso = mensagem(aviso)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Contatos</h1>
          <Link href="/">Voltar</Link>
        </header>

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}
        {msgAviso && <p role="status" className={styles.aviso}>{msgAviso}</p>}

        <section className={styles.section}>
          <h2>Seu código</h2>
          <p className={styles.hint}>
            Passe este código para quem quiser te adicionar como contato.
          </p>
          <p className={styles.code}>{codigo ?? 'não encontrado'}</p>
        </section>

        <section className={styles.section}>
          <h2>Adicionar por código ou username</h2>
          <p className={styles.hint}>Para quem já tem conta no sistema.</p>
          <AddByCodeForm />
        </section>

        <section className={styles.section}>
          <h2>Adicionar só com o nome</h2>
          <p className={styles.hint}>Para quem não tem conta.</p>
          <AddByNameForm />
        </section>

        <section className={styles.section}>
          <h2>Seus contatos</h2>
          <ContactList contacts={contacts} />
        </section>
      </div>
    </main>
  )
}