'use client'

import { useState } from 'react'
import { createPurchase, updatePurchase } from './actions'
import {
  LIMITE_CENTAVOS,
  addMonths,
  allocateCents,
  resolvePercents,
  toCents,
  validateShares,
} from './calc'
import { InstallmentFields } from './InstallmentFields'
import { SharesEditor } from './SharesEditor'
import { SubmitButton } from './SubmitButton'
import type {
  Base,
  CardOption,
  CategoryOption,
  ContactOption,
  Participant,
  PurchaseEdit,
  SharedAccountOption,
  Tipo,
} from './types'
import styles from './purchases.module.css'

type Props = {
  cards: CardOption[]
  categories: CategoryOption[]
  contacts: ContactOption[]
  contasCompartilhadas: SharedAccountOption[]
  contaCompartilhada: boolean
  hoje: string
  edicao?: PurchaseEdit // presente ao editar uma compra existente
}

export function PurchaseForm({
  cards,
  categories,
  contacts,
  contasCompartilhadas,
  contaCompartilhada,
  hoje,
  edicao,
}: Props) {
  const inicial = edicao?.inicial
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [cartaoId, setCartaoId] = useState(inicial ? inicial.cartaoId : (cards[0]?.id ?? ''))
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '')
  const [tipoEscolhido, setTipoEscolhido] = useState<Tipo>(inicial?.tipo ?? 'avista')
  const [recorrente, setRecorrente] = useState(inicial?.recorrente ?? false)
  const [data, setData] = useState(inicial?.data ?? hoje)
  const [mesManual, setMesManual] = useState<string | null>(inicial?.mes ?? null)
  const [parcelas, setParcelas] = useState(inicial?.parcelas ?? '2')
  const [base, setBase] = useState<Base>('total')
  const [valorBase, setValorBase] = useState(inicial?.valor ?? '')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [contaCompartilhadaId, setContaCompartilhadaId] = useState(inicial?.contaCompartilhadaId ?? '')
  // Conta compartilhada não entra na divisão: a compra pertence aos participantes escolhidos
  const [participantes, setParticipantes] = useState<Participant[]>(
    inicial?.participantes ??
      (contaCompartilhada ? [] : [{ id: 'eu', contactId: null, name: 'Você', manual: null }]),
  )

  // Compra recorrente se comporta como uma cobrança única por mês (sem parcelas)
  const tipo: Tipo = recorrente ? 'avista' : tipoEscolhido

  // Com uma conta compartilhada escolhida, a divisão é entre você e os participantes dela
  const contaEscolhida = contasCompartilhadas.find((c) => c.id === contaCompartilhadaId)
  const contatosParaDivisao: ContactOption[] = contaEscolhida ? contaEscolhida.participants : contacts

  // Valores e datas derivados
  const mes = mesManual ?? data.slice(0, 7)
  const n = tipo === 'parcelado' ? Number.parseInt(parcelas, 10) : 1
  const nOk = Number.isInteger(n) && n >= 1 && n <= 120
  const centsBase = toCents(valorBase)

  let totalCents: number | null = null
  if (centsBase !== null && nOk) {
    totalCents = tipo === 'parcelado' && base === 'parcela' ? centsBase * n : centsBase
  }

  const totalExibido =
    tipo === 'avista' || base === 'total'
      ? valorBase
      : totalCents !== null
        ? (totalCents / 100).toFixed(2)
        : ''
  const parcelaExibida =
    base === 'parcela'
      ? valorBase
      : totalCents !== null && nOk
        ? (totalCents / n / 100).toFixed(2)
        : ''

  const mesOk = /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)
  const mesFinal = tipo === 'parcelado' && nOk && mesOk ? addMonths(mes, n - 1) : null

  // Divisão
  const manuais = participantes.map((p) => (p.manual === null ? null : Number(p.manual)))
  const percents = resolvePercents(manuais)
  const erroDivisao =
    participantes.length === 0
      ? 'Adicione ao menos um participante da conta compartilhada.'
      : validateShares(
          participantes.map((p) => p.contactId === null),
          percents,
        )
  const valoresCents = totalCents !== null ? allocateCents(totalCents, percents) : null

  const nomeOk = nome.trim().length >= 2 && nome.trim().length <= 100
  const parcelasOk = tipo === 'avista' || (Number.isInteger(n) && n >= 2 && n <= 120)
  const valorOk = totalCents !== null && totalCents <= LIMITE_CENTAVOS
  const podeSalvar = nomeOk && data !== '' && mesOk && parcelasOk && valorOk && erroDivisao === null

  const idsUsados = new Set(participantes.map((p) => p.contactId))
  const contatosDisponiveis = contatosParaDivisao.filter((c) => !idsUsados.has(c.id))

  // Se estava informando o valor da parcela, converte para o total ao sair do parcelado
  function voltarParaTotal() {
    if (base === 'parcela') {
      setBase('total')
      setValorBase(totalCents !== null ? (totalCents / 100).toFixed(2) : '')
    }
  }

  function mudarTipo(novo: Tipo) {
    if (novo === 'avista') voltarParaTotal()
    setTipoEscolhido(novo)
  }

  function mudarRecorrente(valor: boolean) {
    if (valor) voltarParaTotal()
    setRecorrente(valor)
  }

  function mudarTotal(valor: string) {
    setBase('total')
    setValorBase(valor)
  }

  function mudarParcela(valor: string) {
    setBase('parcela')
    setValorBase(valor)
  }

  function mudarContaCompartilhada(id: string) {
    setContaCompartilhadaId(id)
    // A divisão recomeça, porque os participantes possíveis mudam
    setParticipantes([{ id: 'eu', contactId: null, name: 'Você', manual: null }])
  }

  function adicionar(contactId: string) {
    const contato = contatosParaDivisao.find((c) => c.id === contactId)
    if (!contato) return
    setParticipantes((atual) => [
      ...atual,
      { id: contato.id, contactId: contato.id, name: contato.name, manual: null },
    ])
  }

  function remover(id: string) {
    setParticipantes((atual) => atual.filter((p) => p.id !== id))
  }

  function mudarManual(id: string, texto: string | null) {
    setParticipantes((atual) => atual.map((p) => (p.id === id ? { ...p, manual: texto } : p)))
  }

  const sharesJson = JSON.stringify(
    participantes.map((p, i) => ({ contactId: p.contactId, percent: percents[i] })),
  )

  return (
    <form action={edicao ? updatePurchase : createPurchase} className={styles.form}>
      {edicao && (
        <>
          <input type="hidden" name="id" value={edicao.id} />
          <input type="hidden" name="mes_lista" value={edicao.mesLista} />
          {edicao.aviso && <p className={styles.dica}>{edicao.aviso}</p>}
        </>
      )}
      <input type="hidden" name="mes" value={mes} />
      <input type="hidden" name="base" value={tipo === 'parcelado' ? base : 'total'} />
      <input type="hidden" name="valor" value={valorBase} />
      <input type="hidden" name="shares" value={sharesJson} />
      <input type="hidden" name="recorrente" value={recorrente ? '1' : '0'} />
      <input type="hidden" name="conta_compartilhada" value={contaCompartilhadaId} />

      <section className={styles.section}>
        <h2>Compra</h2>
        <label className={styles.label}>
          Nome da compra
          <input
            className={styles.input}
            type="text"
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={100}
            required
          />
        </label>

        <div className={styles.grid2}>
          <label className={styles.label}>
            Cartão
            <select
              className={styles.select}
              name="cartao"
              value={cartaoId}
              onChange={(e) => setCartaoId(e.target.value)}
            >
              <option value="">Sem cartão</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Data da compra
            <input
              className={styles.input}
              type="date"
              name="data"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </label>
        </div>

        <label className={styles.radio}>
          <input
            type="checkbox"
            checked={recorrente}
            onChange={(e) => mudarRecorrente(e.target.checked)}
            disabled={edicao !== undefined}
          />
          Compra recorrente (todo mês, sem mês final)
          {edicao && ' · não muda na edição'}
        </label>

        {!recorrente && (
          <div className={styles.radios} role="radiogroup" aria-label="Forma de pagamento">
            <label className={styles.radio}>
              <input
                type="radio"
                name="tipo"
                value="avista"
                checked={tipoEscolhido === 'avista'}
                onChange={() => mudarTipo('avista')}
              />
              À vista
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                name="tipo"
                value="parcelado"
                checked={tipoEscolhido === 'parcelado'}
                onChange={() => mudarTipo('parcelado')}
              />
              Parcelado
            </label>
          </div>
        )}

        <InstallmentFields
          tipo={tipo}
          recorrente={recorrente}
          mes={mes}
          onMes={setMesManual}
          parcelas={parcelas}
          onParcelas={setParcelas}
          mesFinal={mesFinal}
          total={totalExibido}
          parcela={parcelaExibida}
          onTotal={mudarTotal}
          onParcela={mudarParcela}
        />
      </section>

      <section className={styles.section}>
        <h2>Divisão</h2>

        {contasCompartilhadas.length > 0 && (
          <>
            <label className={styles.label}>
              Conta compartilhada (opcional)
              <select
                className={styles.select}
                value={contaCompartilhadaId}
                onChange={(e) => mudarContaCompartilhada(e.target.value)}
              >
                <option value="">Nenhuma</option>
                {contasCompartilhadas.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            {contaEscolhida && (
              <p className={styles.dica}>
                A divisão é entre você e os participantes de {contaEscolhida.name}. Sem participantes,
                a compra aparece como incompleta na conta compartilhada.
              </p>
            )}
          </>
        )}

        <SharesEditor
          participantes={participantes}
          percents={percents}
          valoresCents={valoresCents}
          contatosDisponiveis={contatosDisponiveis}
          erro={erroDivisao}
          onManual={mudarManual}
          onAdd={adicionar}
          onRemove={remover}
          contaCompartilhada={contaCompartilhada}
        />
      </section>

      <section className={styles.section}>
        <h2>Categoria e descrição (opcional)</h2>
        <label className={styles.label}>
          Categoria
          <select
            className={styles.select}
            name="categoria"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <textarea
          className={styles.textarea}
          name="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={500}
        />
      </section>

      <SubmitButton className={styles.button} disabled={!podeSalvar}>
        {edicao ? 'Salvar alterações' : 'Salvar compra'}
      </SubmitButton>
    </form>
  )
}