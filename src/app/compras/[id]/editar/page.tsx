import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { listAccounts } from '@/features/accounts/queries'
import { listCards } from '@/features/cards/queries'
import { listCategories } from '@/features/categories/queries'
import { listContacts } from '@/features/contacts/queries'
import { formatMonth, hojeEmSaoPaulo } from '@/features/purchases/calc'
import { mensagem } from '@/features/purchases/messages'
import { PurchaseForm } from '@/features/purchases/PurchaseForm'
import {
  getPurchaseForEdit,
  listSharedAccountOptions,
  participantesDaCompra,
} from '@/features/purchases/queries'
import { MES } from '@/lib/month'
import styles from '@/features/purchases/purchases.module.css'

export const instant = false

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mes?: string; erro?: string }>
}

export default async function EditarCompraPage({ params, searchParams }: Props) {
  // Lê a data de hoje: precisa rodar na requisição, não no prerender
  await connection()
  const { id } = await params
  const { mes, erro } = await searchParams
  // Mês da lista de onde o usuário veio; vazio se abriu o link direto
  const mesLista = mes && MES.test(mes) ? mes : ''

  const contas = await listAccounts()
  const ativa = contas?.find((conta) => conta.isActive)
  if (!UUID.test(id) || !ativa) notFound()

  // Só a conta dona edita: quem foi citado não encontra a compra aqui
  const compra = await getPurchaseForEdit(ativa.id, id)
  if (!compra) notFound()

  const [cards, contacts, categories, contasCompartilhadas] = await Promise.all([
    listCards(),
    listContacts(),
    listCategories(),
    listSharedAccountOptions(contas),
  ])

  const contaCompartilhada = ativa.isShared
  const participantesDaConta =
    contasCompartilhadas.find((c) => c.id === compra.sharedAccountId)?.participants ?? []
  const nomes = new Map(
    [...contacts, ...participantesDaConta].map((c) => [c.id, c.name] as const),
  )

  const participantes = participantesDaCompra(compra, nomes)
  // Compra só de outras pessoas: "Você" volta com 0% para poder entrar na divisão
  if (!contaCompartilhada && !participantes.some((p) => p.contactId === null)) {
    participantes.unshift({ id: 'eu', contactId: null, name: 'Você', manual: '0' })
  }

  const aviso =
    compra.isRecurring && mesLista && compra.startMonth < mesLista
      ? `Esta compra é recorrente desde ${formatMonth(compra.startMonth)}. As alterações valem a partir de ${formatMonth(mesLista)}; os meses anteriores continuam como estavam.`
      : null

  const voltar = mesLista ? `/compras?mes=${mesLista}` : '/compras'
  const msgErro = mensagem(erro)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Editar compra</h1>
          <Link href={voltar}>Voltar</Link>
        </header>

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}

        <PurchaseForm
          cards={cards
            // Mantém o cartão atual na lista mesmo se ele foi desativado
            .filter((c) => c.is_active || c.id === compra.cardId)
            .map((c) => ({ id: c.id, name: c.is_own ? c.name : `${c.name} (${c.owner_name})` }))}
          categories={categories
            .filter((c) => c.kind === 'purchase' && (c.isActive || c.id === compra.categoryId))
            .map(({ id, name }) => ({ id, name }))}
          contacts={contacts.map(({ id, name }) => ({ id, name }))}
          contasCompartilhadas={contasCompartilhadas}
          contaCompartilhada={contaCompartilhada}
          hoje={hojeEmSaoPaulo()}
          edicao={{ id: compra.id, mesLista, aviso, inicial: { ...compra.inicial, participantes } }}
        />
      </div>
    </main>
  )
}
