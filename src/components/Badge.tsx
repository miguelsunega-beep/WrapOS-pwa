import type { BadgeVariant } from '../types'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger:  'bg-red-500/10 text-red-400 border-red-500/20',
  info:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border tracking-wide ${variants[variant]}`}
    >
      {label}
    </span>
  )
}
