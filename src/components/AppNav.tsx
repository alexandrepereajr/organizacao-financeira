'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import styles from './AppNav.module.css'

// Telas sem navegação (antes do login)
const SEM_NAVEGACAO = ['/login', '/cadastro', '/auth']

type Item = { href: string; rotulo: string; icone: ReactNode }

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

const ITENS: Item[] = [
  { href: '/', rotulo: 'Início', icone: svg(<path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />) },
  {
    href: '/visoes/planilha',
    rotulo: 'Planilha',
    icone: svg(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M9 9.5v10" /></>),
  },
  {
    href: '/compras',
    rotulo: 'Compras',
    icone: svg(<><path d="M5 7h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>),
  },
  {
    href: '/entradas',
    rotulo: 'Entradas',
    icone: svg(<><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 19.5h15" /></>),
  },
  {
    href: '/faturas',
    rotulo: 'Faturas',
    icone: svg(<><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></>),
  },
]

function ativo(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  // /compras/nova tem botão próprio; não acende a aba Compras
  if (href === '/compras' && pathname === '/compras/nova') return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppNav() {
  const pathname = usePathname()
  if (SEM_NAVEGACAO.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null

  const novaCompraAtiva = pathname === '/compras/nova'

  return (
    <>
      <header className={styles.topo}>
        <div className={styles.topoConteudo}>
          <Link href="/" className={styles.marca}>
            <span className={styles.logo} aria-hidden="true">R$</span>
            <span className={styles.marcaTexto}>Organização Financeira</span>
          </Link>

          <nav className={styles.linksTopo} aria-label="Principal">
            {ITENS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={ativo(pathname, item.href) ? styles.linkAtivo : styles.link}
                aria-current={ativo(pathname, item.href) ? 'page' : undefined}
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>

          <Link
            href="/compras/nova"
            className={styles.novaCompra}
            aria-current={novaCompraAtiva ? 'page' : undefined}
          >
            <span aria-hidden="true">+</span> Nova compra
          </Link>
        </div>
      </header>

      {/* data-tabbar: o globals.css reserva espaço no fim da página para esta barra */}
      <nav className={styles.abas} aria-label="Principal" data-tabbar>
        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={ativo(pathname, item.href) ? styles.abaAtiva : styles.aba}
            aria-current={ativo(pathname, item.href) ? 'page' : undefined}
          >
            {item.icone}
            <span>{item.rotulo}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
