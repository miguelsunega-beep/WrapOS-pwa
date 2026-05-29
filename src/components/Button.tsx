import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  primary:   'bg-accent text-white hover:opacity-90 shadow-sm shadow-accent/20',
  secondary: 'bg-surface-600 hover:bg-surface-500 text-ui-text border border-ui-border',
  ghost:     'hover:bg-surface-700 text-gray-400 hover:text-white',
  danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export function Button({
  variant = 'primary', size = 'md', children, className = '', ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
