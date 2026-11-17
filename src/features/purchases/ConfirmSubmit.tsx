'use client'

import type { ReactNode } from 'react'

type Props = { mensagem: string; className?: string; children: ReactNode }

// Botão de envio que pede confirmação antes (para ações que não têm volta)
export function ConfirmSubmit({ mensagem, className, children }: Props) {
  return (
    <button
      className={className}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
