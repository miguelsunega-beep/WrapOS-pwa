interface PulsoPatioBarProps {
  aguardando: number
  execucao: number
  concluido: number
  onAbrir: () => void
}

export function PulsoPatioBar({ aguardando, execucao, concluido, onAbrir }: PulsoPatioBarProps) {
  // Inclui concluído (aguardando retirada) no total físico do pátio
  const noPatioTotal = aguardando + execucao + concluido
  const barTotal     = noPatioTotal || 1
  const pAgua  = (aguardando / barTotal) * 100
  const pExec  = (execucao  / barTotal) * 100
  const pConc  = (concluido / barTotal) * 100

  return (
    <div
      className="rounded-[10px] p-5"
      style={{ background: 'var(--wrap-surface)', border: '1px solid var(--wrap-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--wrap-text)' }}>Pulso do pátio</h2>
          <span className="text-xs" style={{ color: 'var(--wrap-muted)' }}>
            {noPatioTotal} no pátio
          </span>
        </div>
        <button
          onClick={onAbrir}
          className="text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--wrap-accent)' }}
        >
          Abrir quadro →
        </button>
      </div>

      {/* Barra segmentada */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {aguardando > 0 && (
          <div
            className="h-full rounded-l-full transition-all"
            style={{ width: `${pAgua}%`, background: '#f59e0b' }}
          />
        )}
        {execucao > 0 && (
          <div
            className="h-full transition-all"
            style={{
              width: `${pExec}%`,
              background: '#3b82f6',
              borderRadius: aguardando === 0 ? '9999px 0 0 9999px' : undefined,
            }}
          />
        )}
        {concluido > 0 && (
          <div
            className="h-full rounded-r-full transition-all"
            style={{ width: `${pConc}%`, background: '#34d399' }}
          />
        )}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
        <LegendaItem cor="#f59e0b" label="Aguardando" count={aguardando} />
        <LegendaItem cor="#3b82f6" label="Execução"   count={execucao}   />
        <LegendaItem cor="#34d399" label="Concluído"  count={concluido}  />
      </div>
    </div>
  )
}

function LegendaItem({ cor, label, count }: { cor: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
      <span className="text-xs" style={{ color: 'var(--wrap-muted)' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: 'var(--wrap-text)' }}>{count}</span>
    </div>
  )
}
