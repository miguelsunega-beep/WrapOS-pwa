import { useState, ReactNode } from 'react'
import { Check, Loader2 } from 'lucide-react'

type ActionState = 'idle' | 'loading' | 'success' | 'error'

interface ActionButtonProps {
  onClick: () => Promise<void> | void
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
}

const variants = {
  primary:   'bg-accent hover:opacity-90 text-white shadow-sm shadow-accent/20',
  secondary: 'bg-surface-600 hover:bg-surface-500 text-ui-text border border-ui-border',
  danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export function ActionButton({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
}: ActionButtonProps) {
  const [state, setState] = useState<ActionState>('idle')

  const handle = async () => {
    if (state !== 'idle' || disabled) return
    setState('loading')
    try {
      await onClick()
      setState('success')
      setTimeout(() => setState('idle'), 1500)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 1500)
    }
  }

  const isLoading = state === 'loading'
  const isSuccess = state === 'success'
  const isError   = state === 'error'

  return (
    <button
      onClick={handle}
      disabled={isLoading || disabled}
      className={[
        'inline-flex items-center gap-2 rounded-lg font-medium transition-all',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        isError ? 'animate-shake' : '',
        isSuccess ? '!bg-emerald-500/15 !border-emerald-500/30 !text-emerald-400' : variants[variant],
        sizes[size],
        className,
      ].filter(Boolean).join(' ')}
    >
      {isLoading && <Loader2 size={14} className="animate-spin" />}
      {isSuccess && <Check size={14} />}
      {!isLoading && !isSuccess && children}
      {isLoading && <span>Salvando…</span>}
      {isSuccess && <span>Salvo!</span>}
    </button>
  )
}
