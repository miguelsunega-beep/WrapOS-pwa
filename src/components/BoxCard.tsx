import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Wrench, ChevronRight } from 'lucide-react'
import type { OrdemServico, Cliente, Veiculo, Instalador } from '../types'
import { CarSilhouette } from './CarSilhouette'

const STATUS_COLOR = {
  ok:   '#34d399',
  warn: '#ff6b35',
  late: '#e8304a',
} as const

type BoxStatus = keyof typeof STATUS_COLOR

function getBoxStatus(elapsedMs: number): BoxStatus {
  const h = elapsedMs / 3_600_000
  if (h < 4) return 'ok'
  if (h < 6) return 'warn'
  return 'late'
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const s = total % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  if (h >= 24) {
    const d = Math.floor(h / 24)
    const rh = h % 24
    return `${d}d ${String(rh).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface BoxCardProps {
  boxNum:                number
  os:                    OrdemServico | null
  cliente:               Cliente | null
  veiculo:               Veiculo | null
  instalador:            Instalador | null
  onConcluir:            (osId: string) => void
  onConfirmarConcluir?:  (osId: string) => void
  leaving?:              boolean
  onOpenDrawer?:         () => void
  onToggleManutencao?:   () => void
  emManutencao?:         boolean
}

export function BoxCard({
  boxNum, os, cliente, veiculo, instalador,
  onConcluir, onConfirmarConcluir, leaving,
  onOpenDrawer, onToggleManutencao, emManutencao,
}: BoxCardProps) {
  const [elapsed, setElapsed] = useState(0)

  const osId      = os?.id
  const osCreated = os?.dataCriacao

  useEffect(() => {
    if (!osId || !osCreated || leaving) return
    const startMs = new Date(osCreated).getTime()
    setElapsed(Date.now() - startMs)
    const id = setInterval(() => setElapsed(Date.now() - startMs), 1000)
    return () => clearInterval(id)
  }, [osId, osCreated, leaving])

  // ── Free box ────────────────────────────────────────────────────
  if (!os) {
    const inManut = emManutencao ?? false
    return (
      <div
        className="relative group flex flex-col items-center justify-center rounded-xl min-h-[260px] p-6"
        style={{
          border: inManut
            ? '1px dashed rgba(255,107,53,0.35)'
            : '1px dashed rgba(255,255,255,0.1)',
          backgroundColor: inManut ? 'rgba(255,107,53,0.04)' : 'rgba(19,22,30,0.5)',
        }}
      >
        <span
          className="text-[10px] font-semibold tracking-widest uppercase mb-3"
          style={{ color: inManut ? 'rgba(255,107,53,0.5)' : '#2a3040' }}
        >
          Box {boxNum}
        </span>
        <CarSilhouette color={inManut ? 'rgba(255,107,53,0.25)' : '#1e2330'} size={88} />
        <span
          className="mt-4 text-[12px] font-medium flex items-center gap-1.5"
          style={{ color: inManut ? '#ff6b35' : '#2a3040' }}
        >
          {inManut && <Wrench size={12} />}
          {inManut ? 'Em Manutenção' : 'Livre'}
        </span>
        {onToggleManutencao && (
          <button
            onClick={onToggleManutencao}
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
            style={{
              backgroundColor: inManut ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.05)',
              color: inManut ? '#ff6b35' : '#5a6070',
              border: inManut ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Wrench size={10} />
            {inManut ? 'Liberar' : 'Manutenção'}
          </button>
        )}
      </div>
    )
  }

  // ── Occupied box ────────────────────────────────────────────────
  const status      = getBoxStatus(elapsed)
  const statusColor = STATUS_COLOR[status]

  const handleConcluirClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onConfirmarConcluir?.(os.id)
  }

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1, y: 0 }}
      animate={leaving
        ? { opacity: 0, scale: 0.82, y: -18 }
        : { opacity: 1, scale: 1,    y: 0   }
      }
      transition={{ duration: 0.32, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (leaving) onConcluir(os.id)
      }}
      onClick={onOpenDrawer}
      className="group relative flex flex-col rounded-xl min-h-[260px] overflow-hidden cursor-pointer"
      style={{ border: `1px solid ${statusColor}28`, backgroundColor: 'var(--wrap-surface)' }}
    >
      {/* Status accent bar */}
      <div className="h-[2px] w-full shrink-0" style={{ backgroundColor: statusColor }} />

      {/* Header */}
      <div className="flex items-center px-4 pt-3 pb-1">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#3a4050' }}>
          Box {boxNum}
        </span>
      </div>

      {/* Silhouette + timer */}
      <div className="relative flex-1 flex items-center justify-center py-2">
        <div
          className="absolute top-2 right-4 flex items-center gap-1 text-[11px] font-mono font-semibold"
          style={{ color: statusColor }}
        >
          <Clock size={11} />
          {formatElapsed(elapsed)}
        </div>

        <motion.div
          whileHover={{ filter: `drop-shadow(0 0 14px ${statusColor}88)` }}
          transition={{ duration: 0.25 }}
        >
          <CarSilhouette color={statusColor} size={88} />
        </motion.div>

        {/* "Ver detalhes" hint on hover */}
        <div
          className="absolute bottom-1 inset-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none flex items-center justify-center gap-1"
          style={{ color: '#5a6070' }}
        >
          <span className="text-[10px]">Ver detalhes</span>
          <ChevronRight size={11} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 space-y-3">
        <div>
          <div className="text-[13px] font-semibold text-white truncate">
            {cliente?.nome ?? '—'}
          </div>
          <div className="text-[11px] truncate" style={{ color: '#5a6070' }}>
            {veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '—'}
            {veiculo?.placa ? ` · ${veiculo.placa}` : ''}
            {instalador ? ` · ${instalador.nome.split(' ')[0]}` : ''}
          </div>
        </div>

        <button
          onClick={handleConcluirClick}
          disabled={leaving}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40"
          style={{
            backgroundColor: `${STATUS_COLOR.ok}18`,
            color: STATUS_COLOR.ok,
            border: `1px solid ${STATUS_COLOR.ok}30`,
          }}
        >
          <CheckCircle2 size={13} />
          Concluir serviço
        </button>
      </div>
    </motion.div>
  )
}
