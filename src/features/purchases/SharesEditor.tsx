'use client'

import { useState } from 'react'
import { formatCents } from './calc'
import type { ContactOption, Participant } from './types'
import styles from './purchases.module.css'

type Props = {
  participantes: Participant[]
  percents: number[]
  valoresCents: number[] | null
  contatosDisponiveis: ContactOption[]
  erro: string | null
  onManual: (id: string, texto: string | null) => void
  onAdd: (contactId: string) => void
  onRemove: (id: string) => void
  contaCompartilhada: boolean
}

export function SharesEditor(props: Props) {
  const [escolhido, setEscolhido] = useState('')

  function adicionar() {
    if (!escolhido) return
    props.onAdd(escolhido)
    setEscolhido('')
  }

  return (
    <>
      <ul className={styles.divisao}>
        {props.participantes.map((p, i) => {
          const manual = p.manual !== null
          const valor = p.manual ?? String(Math.round(props.percents[i] * 100) / 100)
          return (
            <li key={p.id} className={styles.pessoa}>
              <span className={styles.pessoaNome}>{p.name}</span>
              <input
                className={styles.percent}
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={valor}
                onChange={(e) => props.onManual(p.id, e.target.value)}
                aria-label={`Percentual de ${p.name}`}
              />
              <span>%</span>
              <span className={styles.valorPessoa}>
                {props.valoresCents ? formatCents(props.valoresCents[i]) : ''}
              </span>
              {manual && props.participantes.length > 1 && (
                <button type="button" className={styles.link} onClick={() => props.onManual(p.id, null)}>
                  automático
                </button>
              )}
              {p.contactId !== null && (
                <button type="button" className={styles.remover} onClick={() => props.onRemove(p.id)}>
                  Remover
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {props.erro ? (
        <p role="alert" className={styles.erro}>{props.erro}</p>
      ) : (
        <p className={styles.ok}>Divisão: 100%</p>
      )}

      {props.contatosDisponiveis.length > 0 ? (
        <div className={styles.adicionar}>
          <select
            className={styles.select}
            value={escolhido}
            onChange={(e) => setEscolhido(e.target.value)}
            aria-label="Pessoa a adicionar"
          >
            <option value="">Adicionar pessoa...</option>
            {props.contatosDisponiveis.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="button" className={styles.secundario} onClick={adicionar} disabled={!escolhido}>
            Adicionar
          </button>
        </div>
      ) : (
        <p className={styles.dica}>
          {props.contaCompartilhada ? (
            <>Adicione participantes em <a href="/participantes">Participantes</a>.</>
          ) : (
            <>Para dividir com alguém, cadastre a pessoa em <a href="/contatos">Contatos</a>.</>
          )}
        </p>
      )}
    </>
  )
}