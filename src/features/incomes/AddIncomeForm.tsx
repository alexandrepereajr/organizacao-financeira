'use client'

import { useState } from 'react'
import type { Category } from '@/features/categories/queries'
import { createIncome } from './actions'
import { DestinationsEditor } from './DestinationsEditor'
import type { OpcaoDestino } from './types'
import styles from '@/components/ui.module.css'

type Props = {
  mes: string
  categories: Category[]
  contas: OpcaoDestino[]
  contatos: OpcaoDestino[]
  permitirDestinos: boolean
}

export function AddIncomeForm({ mes, categories, contas, contatos, permitirDestinos }: Props) {
  const [recorrente, setRecorrente] = useState(false)

  return (
    <form action={createIncome} className={styles.form}>
      <div className={styles.campos}>
        <label className={styles.label}>
          Descrição
          <input className={styles.input} type="text" name="descricao" minLength={2} maxLength={60} required />
        </label>
        <label className={styles.label}>
          Valor (R$)
          <input
            className={styles.input}
            type="number"
            name="valor"
            min={0.01}
            step="0.01"
            inputMode="decimal"
            required
          />
        </label>
      </div>

      <label className={styles.label}>
        Categoria (opcional)
        <select className={styles.input} name="categoria" defaultValue="">
          <option value="">Sem categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className={styles.check}>
        <input
          type="checkbox"
          name="recorrente"
          value="1"
          checked={recorrente}
          onChange={(e) => setRecorrente(e.target.checked)}
        />
        Recorrente (todo mês, sem mês final)
      </label>

      <div className={styles.campos}>
        <label className={styles.label}>
          {recorrente ? 'Mês de início' : 'Mês'}
          <input className={styles.input} type="month" name="mes" defaultValue={mes} required />
        </label>
        {!recorrente && (
          <label className={styles.label}>
            Repetir por (meses)
            <input
              className={styles.input}
              type="number"
              name="repetir"
              min={1}
              max={60}
              step={1}
              defaultValue={1}
              required
            />
          </label>
        )}
      </div>

      {permitirDestinos && <DestinationsEditor contas={contas} contatos={contatos} />}

      <button className={styles.button} type="submit">Adicionar entrada</button>
    </form>
  )
}