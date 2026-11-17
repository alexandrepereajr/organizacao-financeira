'use client'

import { useState } from 'react'
import type { Destino, OpcaoDestino } from './types'
import styles from '@/components/ui.module.css'

type Linha = { chave: number; alvo: string; kind: 'percent' | 'amount'; valor: string }

type Props = {
  contas: OpcaoDestino[]
  contatos: OpcaoDestino[]
  inicial?: Destino[]
}

const alvoDe = (destino: Destino) =>
  `${destino.recipient === 'account' ? 'conta' : 'contato'}:${destino.id}`

export function DestinationsEditor({ contas, contatos, inicial = [] }: Props) {
  const [ativo, setAtivo] = useState(inicial.length > 0)
  const [linhas, setLinhas] = useState<Linha[]>(
    inicial.map((d, i) => ({ chave: i, alvo: alvoDe(d), kind: d.kind, valor: String(d.value) })),
  )
  const [proxima, setProxima] = useState(inicial.length)

  if (contas.length === 0 && contatos.length === 0) return null

  function novaLinha(): Linha {
    return { chave: proxima, alvo: '', kind: 'percent', valor: '' }
  }

  function alternar(valor: boolean) {
    setAtivo(valor)
    if (valor && linhas.length === 0) {
      setLinhas([novaLinha()])
      setProxima(proxima + 1)
    }
  }

  function adicionar() {
    setLinhas([...linhas, novaLinha()])
    setProxima(proxima + 1)
  }

  function atualizar(chave: number, parte: Partial<Linha>) {
    setLinhas(linhas.map((l) => (l.chave === chave ? { ...l, ...parte } : l)))
  }

  function remover(chave: number) {
    setLinhas(linhas.filter((l) => l.chave !== chave))
  }

  // Só entram no envio as linhas completas
  const destinos: Destino[] = ativo
    ? linhas.flatMap((linha) => {
        const [tipo, id] = linha.alvo.split(':')
        const valor = Number(linha.valor)
        if (!id || !Number.isFinite(valor) || valor <= 0) return []
        return [
          {
            recipient: tipo === 'conta' ? ('account' as const) : ('contact' as const),
            id,
            kind: linha.kind,
            value: valor,
          },
        ]
      })
    : []

  const somaPercentuais = linhas
    .filter((l) => l.kind === 'percent')
    .reduce((soma, l) => soma + (Number(l.valor) || 0), 0)

  return (
    <div className={styles.form}>
      <input type="hidden" name="destinos" value={JSON.stringify(destinos)} />

      <label className={styles.check}>
        <input type="checkbox" checked={ativo} onChange={(e) => alternar(e.target.checked)} />
        Destinar parte desta entrada
      </label>

      {ativo && (
        <>
          {linhas.map((linha) => (
            <div key={linha.chave} className={styles.campos}>
              <select
                className={styles.input}
                value={linha.alvo}
                onChange={(e) => atualizar(linha.chave, { alvo: e.target.value })}
                aria-label="Destino"
              >
                <option value="">Escolha o destino...</option>
                {contas.length > 0 && (
                  <optgroup label="Contas compartilhadas">
                    {contas.map((c) => (
                      <option key={c.id} value={`conta:${c.id}`}>{c.name}</option>
                    ))}
                  </optgroup>
                )}
                {contatos.length > 0 && (
                  <optgroup label="Pessoas">
                    {contatos.map((c) => (
                      <option key={c.id} value={`contato:${c.id}`}>{c.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>

              <div className={styles.linha}>
                <input
                  className={styles.input}
                  type="number"
                  min={0.01}
                  step="0.01"
                  inputMode="decimal"
                  value={linha.valor}
                  onChange={(e) => atualizar(linha.chave, { valor: e.target.value })}
                  aria-label="Valor destinado"
                />
                <select
                  className={styles.input}
                  value={linha.kind}
                  onChange={(e) =>
                    atualizar(linha.chave, { kind: e.target.value === 'amount' ? 'amount' : 'percent' })
                  }
                  aria-label="Tipo do valor"
                >
                  <option value="percent">%</option>
                  <option value="amount">R$</option>
                </select>
                <button type="button" className={styles.remover} onClick={() => remover(linha.chave)}>
                  Remover
                </button>
              </div>
            </div>
          ))}

          {somaPercentuais > 100 && (
            <p role="alert" className={styles.erro}>Os percentuais passam de 100%.</p>
          )}

          <button type="button" className={styles.secundario} onClick={adicionar}>
            Adicionar destino
          </button>
        </>
      )}
    </div>
  )
}