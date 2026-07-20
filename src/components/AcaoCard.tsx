import { ChevronRight } from 'lucide-react'
import type { AcaoTema } from '../hooks/useHome'

interface AcaoCardProps {
  badge: string
  tema: AcaoTema
  titulo: string
  descricao: string
  cta: string
  onClick: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

const TEMAS: Record<AcaoTema, { card: string; border: string; badge: string; cta: string }> = {
  red:   { card: 'rgba(232,48,74,0.1)',   border: 'rgba(232,48,74,0.3)',   badge: 'bg-red-500/20 text-red-400',    cta: 'text-red-400'    },
  amber: { card: 'rgba(255,107,53,0.1)',  border: 'rgba(255,107,53,0.3)',  badge: 'bg-orange-500/20 text-orange-400', cta: 'text-orange-400' },
  blue:  { card: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)', badge: 'bg-blue-500/20 text-blue-400',  cta: 'text-blue-400'   },
}

export function AcaoCard({ badge, tema, titulo, descricao, cta, onClick, secondaryLabel, onSecondary }: AcaoCardProps) {
  const t = TEMAS[tema]
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="text-left rounded-xl p-4 flex flex-col gap-2 w-full transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
      style={{ background: t.card, border: `1px solid ${t.border}` }}
    >
      <span className={`self-start text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${t.badge}`}>
        {badge}
      </span>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--wrap-text)' }}>{titulo}</p>
        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--wrap-muted)' }}>{descricao}</p>
      </div>
      <div className="flex items-center gap-3 mt-auto">
        <div className={`flex items-center gap-1 text-xs font-semibold ${t.cta}`}>
          {cta}
          <ChevronRight size={12} />
        </div>
        {secondaryLabel && onSecondary && (
          <button
            onClick={e => { e.stopPropagation(); onSecondary() }}
            className="text-xs font-semibold px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--wrap-text)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}
