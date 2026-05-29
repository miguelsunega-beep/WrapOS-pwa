import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', padding = true, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-surface-700 border border-ui-border rounded-[10px]',
        padding ? 'p-5' : '',
        onClick ? 'cursor-pointer hover:border-accent/40 transition-colors' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
