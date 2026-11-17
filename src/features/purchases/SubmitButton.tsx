'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

type Props = { disabled?: boolean; className?: string; children: ReactNode }

export function SubmitButton({ disabled, className, children }: Props) {
  const { pending } = useFormStatus()
  return (
    <button className={className} type="submit" disabled={disabled || pending}>
      {pending ? 'Salvando...' : children}
    </button>
  )
}