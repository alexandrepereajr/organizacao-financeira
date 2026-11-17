import { formatCents } from '@/features/purchases/calc'
import type { Bloco } from './types'
import styles from './spreadsheet.module.css'

type Props = { bloco: Bloco; colunas: string[] }

export function GridTable({ bloco, colunas }: Props) {
  return (
    <section className={styles.bloco}>
      <h2 className={styles.titulo}>{bloco.titulo}</h2>
      <div className={styles.rolagem}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th className={styles.rotulo} scope="col" />
              {colunas.map((coluna) => (
                <th key={coluna} className={styles.mes} scope="col">{coluna}</th>
              ))}
            </tr>
          </thead>

          {bloco.vazio !== '' && (
            <tbody>
              {bloco.linhas.length === 0 && (
                <tr>
                  <td className={styles.vazio} colSpan={colunas.length + 1}>{bloco.vazio}</td>
                </tr>
              )}
              {bloco.linhas.map((linha) => (
                <tr key={linha.chave}>
                  <th className={styles.rotulo} scope="row">
                    {linha.rotulo}
                    {linha.sub && <span className={styles.sub}>{linha.sub}</span>}
                  </th>
                  {linha.celulas.map((celula, i) => (
                    <td key={i} className={styles.celula}>
                      {celula && (
                        <>
                          {celula.cents !== 0 && formatCents(celula.cents)}
                          {celula.nota && (
                            <span className={`${styles.nota} ${celula.alerta ? styles.alerta : ''}`}>
                              {celula.nota}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}

          {bloco.rodape.length > 0 && (
            <tfoot>
              {bloco.rodape.map((linha) => (
                <tr key={linha.chave} className={styles.rodape}>
                  <th className={styles.rotulo} scope="row">{linha.rotulo}</th>
                  {linha.valores.map((valor, i) => (
                    <td
                      key={i}
                      className={`${styles.celula} ${linha.destacarNegativo && valor !== null && valor < 0 ? styles.negativo : ''}`}
                    >
                      {valor !== null && formatCents(valor)}
                    </td>
                  ))}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </section>
  )
}