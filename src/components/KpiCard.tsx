interface SparklineProps {
  data: number[]
  positive: boolean
}

function Sparkline({ data, positive }: SparklineProps) {
  if (data.length < 2) return <div className="w-20 h-8" />
  const max   = Math.max(...data, 1)
  const min   = Math.min(...data)
  const range = max - min || 1
  const W = 80, H = 32, PAD = 3

  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2)
      return `${x},${y}`
    })
    .join(' ')

  const color = positive ? '#34d399' : '#ff6b35'

  return (
    <svg width={W} height={H} className="overflow-visible opacity-80" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface KpiCardProps {
  label: string
  value: string
  variacaoPct: number
  variacaoLabel: string
  sparkline: number[]
  onClick?: () => void
}

export function KpiCard({ label, value, variacaoPct, variacaoLabel, sparkline, onClick }: KpiCardProps) {
  const up = variacaoPct >= 0

  return (
    <button
      onClick={onClick}
      className="text-left rounded-[10px] p-4 transition-colors hover:border-[var(--wrap-border2)]"
      style={{ background: 'var(--wrap-surface)', border: '1px solid var(--wrap-border)' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--wrap-muted)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-1.5" style={{ color: 'var(--wrap-text)' }}>{value}</p>
      <div className="flex items-end justify-between mt-2 gap-2">
        <div className={`flex items-center gap-1 text-xs font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
          <span>{up ? '▲' : '▼'} {Math.abs(variacaoPct)}%</span>
          <span className="font-normal text-[10px]" style={{ color: 'var(--wrap-muted)' }}>
            {variacaoLabel}
          </span>
        </div>
        <div className={up ? 'text-emerald-400' : 'text-orange-400'}>
          <Sparkline data={sparkline} positive={up} />
        </div>
      </div>
    </button>
  )
}
