'use client'

import { useState } from 'react'
import { allocateCents, resolvePercents, validateShares } from '@/features/purchases/calc'
import { SharesEditor } from '@/features/purchases/SharesEditor'
import { SubmitButton } from '@/features/purchases/SubmitButton'
import type { ContactOption, Participant } from '@/features/purchases/types'
import purchaseStyles from '@/features/purchases/purchases.module.css'
import { completeSharedPurchase } from './actions'

type Props = {
  purchaseId: string
  totalCents: number
  participantes: ContactOption[]
}

export function CompleteSharesForm({ purchaseId, totalCents, participantes: opcoes }: Props) {
  const [escolhidos, setEscolhidos] = useState<Participant[]>([])

  const manuais = escolhidos.map((p) => (p.manual === null ? null : Number(p.manual)))
  const percents = resolvePercents(manuais)
  const erro =
    escolhidos.length === 0
      ? 'Adicione ao menos um participante.'
      : validateShares(
          escolhidos.map(() => false),
          percents,
        )
  const valoresCents = allocateCents(totalCents, percents)

  const usados = new Set(escolhidos.map((p) => p.contactId))
  const disponiveis = opcoes.filter((c) => !usados.has(c.id))

  function adicionar(contactId: string) {
    const contato = opcoes.find((c) => c.id === contactId)
    if (!contato) return
    setEscolhidos((atual) => [
      ...atual,
      { id: contato.id, contactId: contato.id, name: contato.name, manual: null },
    ])
  }

  function remover(id: string) {
    setEscolhidos((atual) => atual.filter((p) => p.id !== id))
  }

  function mudarManual(id: string, texto: string | null) {
    setEscolhidos((atual) => atual.map((p) => (p.id === id ? { ...p, manual: texto } : p)))
  }

  const sharesJson = JSON.stringify(
    escolhidos.map((p, i) => ({ contactId: p.contactId, percent: percents[i] })),
  )

  return (
    <form action={completeSharedPurchase} className={purchaseStyles.form}>
      <input type="hidden" name="purchase_id" value={purchaseId} />
      <input type="hidden" name="shares" value={sharesJson} />

      <SharesEditor
        participantes={escolhidos}
        percents={percents}
        valoresCents={valoresCents}
        contatosDisponiveis={disponiveis}
        erro={erro}
        onManual={mudarManual}
        onAdd={adicionar}
        onRemove={remover}
        contaCompartilhada
      />

      <SubmitButton className={purchaseStyles.button} disabled={erro !== null}>
        Completar compra
      </SubmitButton>
    </form>
  )
}