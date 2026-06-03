import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, User, TrendingUp, LayoutGrid, AlertTriangle, CheckCircle2, Car } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { isOSAtrasada } from '../lib/osStatus'
import { BoxCard } from '../components/BoxCard'
import { OSDrawer } from '../components/OSDrawer'
import { ConcluirOSModal } from '../components/ConcluirOSModal'
import type { OrdemServico, StatusOS } from '../types'

// ── Helpers ──────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ACTIVE_STATUSES: StatusOS[] = ['em_andamento', 'aguardando_material', 'aguardando_aprovacao']

// ── StatusBar ────────────────────────────────────────────────────

interface StatChipProps {
  label: string
  value: string | number
  color?: string
  icon: React.ElementType
  onClick?: () => void
}

function StatChip({ label, value, color, icon: Icon, onClick }: StatChipProps) {
  const inner = (
    <>
      <Icon size={14} className={color ? '' : 'text-gray-500'} style={color ? { color } : undefined} />
      <div>
        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">{label}</p>
        <p className={`text-[15px] font-bold leading-tight ${color ? '' : 'text-ui-text'}`} style={color ? { color } : undefined}>
          {value}
        </p>
      </div>
    </>
  )
  const base = 'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-600 border border-ui-border w-full text-left'
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} transition-colors hover:border-gray-500 hover:bg-surface-500 cursor-pointer`}>
        {inner}
      </button>
    )
  }
  return <div className={base}>{inner}</div>
}

// ── Page ─────────────────────────────────────────────────────────

export function Patio() {
  const navigate = useNavigate()
  const {
    ordens, clientes, veiculos, agendamentos, instaladores, servicos,
    lancamentos, configuracoes,
  } = useApp()

  const todayStr = toDateStr(new Date())

  // ── Live status refresh (atrasados counter) ───────────────────
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Derived data ──────────────────────────────────────────────
  // Carros no pátio = todas as OS ativas (sem distinção de box)
  const carrosNoPatio = ordens
    .filter(o => ACTIVE_STATUSES.includes(o.status))
    .sort((a, b) => new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime())

  const noPatioCount = carrosNoPatio.length

  const atrasadosCount = carrosNoPatio.filter(os => isOSAtrasada(os)).length

  const faturamentoHoje = lancamentos
    .filter(l => l.tipo === 'entrada' && l.data === todayStr)
    .reduce((s, l) => s + l.valor, 0)

  const todayAgendamentos = agendamentos
    .filter(a => a.data === todayStr && a.status !== 'concluido' && a.status !== 'cancelado')
    .sort((a, b) => a.horario.localeCompare(b.horario))

  const concluidasHoje = ordens.filter(o =>
    o.status === 'concluido' && o.dataFinalizacao === todayStr
  )

  // ── Lookups ───────────────────────────────────────────────────
  const getCliente    = (id: string) => clientes.find(c => c.id === id) ?? null
  const getVeiculo    = (id: string) => veiculos.find(v => v.id === id) ?? null
  const getInstalador = (id: string) => instaladores.find(i => i.id === id) ?? null
  const getServico    = (id: string) => servicos.find(s => s.id === id)

  // ── Confirm concluir modal ────────────────────────────────────
  const [concluirOSData, setConcluirOSData] = useState<OrdemServico | null>(null)
  const [leavingBoxId, setLeavingBoxId]     = useState<string | null>(null)

  const handleOpenConfirm = (osId: string) => {
    const os = ordens.find(o => o.id === osId) ?? null
    setDrawerOS(null)        // fecha o editor para o modal não ficar atrás
    setConcluirOSData(os)
  }

  // ── Drawer state ──────────────────────────────────────────────
  const [drawerOS, setDrawerOS] = useState<OrdemServico | null>(null)

  // Sync drawer OS when ordens update (e.g. after Salvar or status change)
  useEffect(() => {
    if (drawerOS) {
      const updated = ordens.find(o => o.id === drawerOS.id)
      if (updated) setDrawerOS(updated)
    }
  }, [ordens])

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 min-h-full" style={{ backgroundColor: 'var(--wrap-bg)' }}>

      {/* ── Header + live indicator ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-ui-text font-display leading-tight">Pátio Ao Vivo</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: '#34d399' }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: '#34d399' }}
              />
            </span>
            <span className="text-[12px] sm:text-[13px] text-gray-500">
              Atualizado em tempo real
            </span>
          </div>
          <p className="text-[13px] mt-1.5 capitalize" style={{ color: 'var(--wrap-muted)' }}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="hidden md:flex overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 gap-3 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden">
        <div className="min-w-[140px] shrink-0 snap-start"><StatChip label="No Pátio" value={noPatioCount} color="#f0f0f4" icon={LayoutGrid} /></div>
        <div className="min-w-[140px] shrink-0 snap-start"><StatChip label="Atrasados" value={atrasadosCount} color={atrasadosCount > 0 ? '#e8304a' : '#5a6070'} icon={AlertTriangle} /></div>
        <div className="min-w-[150px] shrink-0 snap-start"><StatChip label="Faturado" value={fmt(faturamentoHoje)} color="#34d399" icon={TrendingUp} onClick={() => navigate('/financeiro')} /></div>
        <div className="min-w-[150px] shrink-0 snap-start"><StatChip label="Agenda" value={`${todayAgendamentos.length} hoje`} color={todayAgendamentos.length > 0 ? 'var(--wrap-accent)' : '#5a6070'} icon={Calendar} onClick={() => navigate('/agendamento')} /></div>
      </div>

      {/* ── Carros no pátio ── */}
      {carrosNoPatio.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Car size={32} className="text-gray-700" />
          <p className="mt-3 text-[14px] font-medium text-gray-400">Nenhum carro no pátio</p>
          <p className="text-[12px] text-gray-600 mt-1">Use o Check-in para registrar a entrada de um veículo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carrosNoPatio.map(os => (
            <BoxCard
              key={os.id}
              boxNum={0}
              os={os}
              cliente={getCliente(os.clienteId)}
              veiculo={getVeiculo(os.veiculoId)}
              instalador={getInstalador(os.instaladorId)}
              leaving={leavingBoxId === os.id}
              atrasada={isOSAtrasada(os)}
              onConcluir={() => setLeavingBoxId(null)}
              onConfirmarConcluir={handleOpenConfirm}
              onOpenDrawer={() => setDrawerOS(os)}
            />
          ))}
        </div>
      )}

      {/* ── Concluídas hoje ── */}
      <AnimatePresence>
        {concluidasHoje.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <h2 className="text-[12px] font-semibold tracking-widest uppercase flex items-center gap-2 text-gray-500">
              <CheckCircle2 size={12} style={{ color: '#34d399' }} />
              Concluídas Hoje
              <span
                className="px-1.5 py-0.5 rounded text-[11px] font-bold"
                style={{ backgroundColor: 'rgba(52,211,153,0.12)', color: '#34d399' }}
              >
                {concluidasHoje.length}
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {concluidasHoje.map(os => {
                const cliente = getCliente(os.clienteId)
                const veiculo = getVeiculo(os.veiculoId)
                return (
                  <button
                    key={os.id}
                    onClick={() => setDrawerOS(os)}
                    className="flex min-h-12 items-center justify-between rounded-xl p-5 sm:px-4 sm:py-3 text-left transition-opacity hover:opacity-80 w-full"
                    style={{
                      backgroundColor: 'rgba(52,211,153,0.04)',
                      border: '1px solid rgba(52,211,153,0.15)',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] sm:text-[12px] font-semibold text-ui-text truncate">
                        OS #{os.numero}
                      </div>
                      <div className="text-[12px] sm:text-[11px] truncate text-gray-500 mt-0.5">
                        {cliente?.nome ?? '—'} · {veiculo?.modelo ?? '—'}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-[12px] sm:text-[11px] font-semibold" style={{ color: '#34d399' }}>
                      {fmt(os.valorTotal)}
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Agendamentos de hoje ── */}
      <section className="space-y-3">
        <h2 className="text-[12px] font-semibold tracking-widest uppercase flex items-center gap-2 text-gray-500">
          <Calendar size={12} />
          Agendamentos de Hoje
          {todayAgendamentos.length === 0 && (
            <span className="normal-case font-normal text-gray-400">
              — nenhum
            </span>
          )}
        </h2>

        {todayAgendamentos.length > 0 && (
          <div className="space-y-2">
            {todayAgendamentos.map(ag => {
              const cliente = getCliente(ag.clienteId)
              const veiculo = getVeiculo(ag.veiculoId)
              const tecnico = getInstalador(ag.instaladorId)
              const servico = getServico(ag.servicoId)

              return (
                <div
                  key={ag.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl bg-surface-700/40 border border-ui-border"
                >
                  <div className="shrink-0 w-14 text-center">
                    <div className="text-[15px] font-bold" style={{ color: 'var(--wrap-accent)' }}>
                      {ag.horario}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {ag.duracao}h
                    </div>
                  </div>

                  <div className="w-px h-8 shrink-0 bg-surface-600" />

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-ui-text truncate">
                      {cliente?.nome ?? '—'}
                    </div>
                    <div className="text-[11px] truncate text-gray-500">
                      {veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '—'}
                      {servico ? ` · ${servico.nome}` : ''}
                      {ag.box > 0 ? ` · Box ${ag.box}` : ''}
                    </div>
                  </div>

                  {tecnico && (
                    <div className="shrink-0 flex items-center gap-1 text-[11px] text-gray-500">
                      <User size={11} />
                      {tecnico.nome.split(' ')[0]}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Modal: Concluir OS (shared component) ── */}
      <ConcluirOSModal
        os={concluirOSData}
        onClose={() => setConcluirOSData(null)}
        onConcluded={(osId) => setLeavingBoxId(osId)}
      />

      {/* ── OS Drawer (right panel) ── */}
      <OSDrawer
        os={drawerOS}
        cliente={drawerOS ? getCliente(drawerOS.clienteId) : null}
        veiculo={drawerOS ? getVeiculo(drawerOS.veiculoId) : null}
        instaladores={instaladores}
        numeroBoxes={configuracoes.numeroBoxes}
        onClose={() => setDrawerOS(null)}
        onConfirmarConcluir={handleOpenConfirm}
      />
    </div>
  )
}
