import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Wrench, AlertTriangle, LayoutGrid } from 'lucide-react'
import type { OrdemServico, Cliente, Veiculo, Instalador } from '../types'

const COR_VEICULO: Record<string, string> = {
  preto: '#1a1a1a', branco: '#e5e5e5', prata: '#c4c8cc', prateado: '#c4c8cc',
  cinza: '#6b7280', vermelho: '#c0392b', azul: '#2563eb', verde: '#16a34a',
  amarelo: '#eab308', laranja: '#ea580c', marrom: '#78350f', bege: '#d6c7a1',
  dourado: '#c8a44d', vinho: '#7b1e3a', grafite: '#3a3f44',
}

function corDoVeiculo(cor?: string): string {
  if (!cor) return '#3a4050'
  const key = cor.trim().toLowerCase()
  return COR_VEICULO[key] ?? '#3a4050'
}

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
        className="relative group flex flex-col items-center justify-center rounded-xl h-full p-6"
        style={{
          border: inManut
            ? '1px dashed rgba(255,107,53,0.35)'
            : '1px dashed rgba(255,255,255,0.1)',
          backgroundColor: inManut ? 'rgba(255,107,53,0.04)' : 'rgba(19,22,30,0.5)',
        }}
      >
        <LayoutGrid
          size={22}
          style={{ color: inManut ? '#ff6b35' : '#2a3040' }}
        />
        <span
          className="text-[10px] font-semibold tracking-widest uppercase mt-3"
          style={{ color: inManut ? 'rgba(255,107,53,0.5)' : '#2a3040' }}
        >
          Box {boxNum}
        </span>
        <span
          className="mt-1 text-[12px] font-medium flex items-center gap-1.5"
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
  const corVeic     = corDoVeiculo(veiculo?.cor)

  const servicoLabel = os.servicos.length
    ? os.servicos[0].nome + (os.servicos.length > 1 ? ` +${os.servicos.length - 1}` : '')
    : 'Sem serviço'

  const primeiroNomeInst = instalador?.nome.split(' ')[0]

  const handleConcluirClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onConfirmarConcluir?.(os.id)
  }

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1, y: 0 }}
      animate={leaving
        ? { opacity: 0, scale: 0.82, y: -18 }
        : { opacity: 1, scale: 1,    y: 0  }
      }
      transition={{ duration: 0.32, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (leaving) onConcluir(os.id)
      }}
      onClick={onOpenDrawer}
      className="group relative flex rounded-xl h-full overflow-hidden cursor-pointer"
      style={{
        border: `1px solid ${status === 'late' ? `${STATUS_COLOR.late}40` : 'var(--wrap-border)'}`,
        backgroundColor: 'var(--wrap-surface)',
      }}
    >
      {/* Barra lateral — cor do veículo */}
      <div style={{ width: 5, backgroundColor: corVeic, flexShrink: 0 }} />

      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col">
        {/* Topo: badge de tempo */}
        <div className="flex items-center min-w-0">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ml-auto shrink-0"
            style={{ color: statusColor, backgroundColor: `${statusColor}1f` }}
          >
            {status === 'late' ? <AlertTriangle size={11} /> : <Clock size={11} />}
            {formatElapsed(elapsed)}
          </span>
        </div>

        {/* Modelo */}
        <p className="text-[15px] font-semibold text-ui-text truncate mt-2">
          {veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '—'}
        </p>

        {/* Serviço principal */}
        <p className="text-[12px] text-slate-400 truncate mt-0.5">
          {servicoLabel}
        </p>

        {/* Cor + cliente */}
        <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
          <span
            className="shrink-0"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: corVeic,
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          />
          <p className="text-[11px] text-slate-500 truncate">
            {(veiculo?.cor ?? '—')}
            {' · '}
            {(cliente?.nome ?? '—')}
            {primeiroNomeInst ? ` · ${primeiroNomeInst}` : ''}
          </p>
        </div>

        <button
          onClick={handleConcluirClick}
          disabled={leaving}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40 mt-3"
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
