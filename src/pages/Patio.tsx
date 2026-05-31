import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, User, Wrench, TrendingUp, LayoutGrid, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { BoxCard } from '../components/BoxCard'
import { OSDrawer } from '../components/OSDrawer'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import type { OrdemServico, StatusOS } from '../types'

// ── Helpers ──────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDays(): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const ACTIVE_STATUSES: StatusOS[] = ['em_andamento', 'aguardando_material', 'aguardando_aprovacao']

// ── WeekStrip ────────────────────────────────────────────────────

function WeekStrip({ agendamentoDates }: { agendamentoDates: Set<string> }) {
  const days     = getWeekDays()
  const todayStr = toDateStr(new Date())

  return (
    <div className="flex flex-wrap sm:flex-nowrap gap-2">
      {days.map((day, i) => {
        const dateStr = toDateStr(day)
        const isToday = dateStr === todayStr
        const hasAppt = agendamentoDates.has(dateStr)

        return (
          <div
            key={dateStr}
            className="flex-1 min-w-[40px] flex flex-col items-center py-2.5 rounded-xl"
            style={{
              backgroundColor: isToday
                ? 'rgb(var(--wrap-accent-rgb) / 0.10)'
                : 'rgba(255,255,255,0.025)',
              border: isToday
                ? '1px solid rgb(var(--wrap-accent-rgb) / 0.30)'
                : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: isToday ? 'var(--wrap-accent)' : '#5a6070' }}
            >
              {DAY_LABELS[i]}
            </span>
            <span
              className="text-[17px] font-bold leading-tight"
              style={{ color: isToday ? 'var(--wrap-accent)' : '#f0f0f4' }}
            >
              {day.getDate()}
            </span>
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: hasAppt
                  ? (isToday ? 'var(--wrap-accent)' : '#4a5060')
                  : 'transparent',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── StatusBar ────────────────────────────────────────────────────

interface StatChipProps {
  label: string
  value: string | number
  color?: string
  icon: React.ElementType
}

function StatChip({ label, value, color, icon: Icon }: StatChipProps) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/[0.07]">
      <Icon size={14} style={{ color: color ?? '#5a6070' }} />
      <div>
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
          {label}
        </p>
        <p className="text-[15px] font-bold leading-tight" style={{ color: color ?? '#f0f0f4' }}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────

export function Patio() {
  const {
    ordens, clientes, veiculos, agendamentos, instaladores, servicos,
    lancamentos, configuracoes,
    concluirOS, editarOS,
  } = useApp()

  const todayStr = toDateStr(new Date())

  // ── Maintenance state (persisted per profile) ─────────────────
  const perfilId = sessionStorage.getItem('wrapos_perfil_ativo') ?? '_'
  const manutKey = `wrapos_perfil_${perfilId}_boxes_manutencao`

  const [boxesManutencao, setBoxesManutencao] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(manutKey)
      return stored ? (JSON.parse(stored) as number[]) : []
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(manutKey, JSON.stringify(boxesManutencao)) } catch {}
  }, [boxesManutencao, manutKey])

  // Manutenção confirm modal
  const [manutModal, setManutModal] = useState<number | null>(null)

  const handleConfirmarManut = () => {
    if (manutModal === null) return
    setBoxesManutencao(prev =>
      prev.includes(manutModal)
        ? prev.filter(n => n !== manutModal)
        : [...prev, manutModal]
    )
    setManutModal(null)
  }

  // ── Live status refresh (atrasados counter) ───────────────────
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Derived data ──────────────────────────────────────────────
  const activeOS = ordens.filter(o => ACTIVE_STATUSES.includes(o.status) && o.box > 0)

  const aguardandoAlocacao = ordens.filter(o =>
    ACTIVE_STATUSES.includes(o.status) && o.box === 0
  )

  const boxMap = new Map<number, OrdemServico>()
  for (const os of activeOS) {
    const cur = boxMap.get(os.box)
    if (!cur || os.dataCriacao > cur.dataCriacao) boxMap.set(os.box, os)
  }

  const boxes         = Array.from({ length: configuracoes.numeroBoxes }, (_, i) => i + 1)
  const occupiedCount = boxMap.size
  const livresCount   = boxes.length - occupiedCount - boxesManutencao.length

  const nowMs = Date.now()
  const atrasadosCount = activeOS.filter(
    os => nowMs - new Date(os.dataCriacao).getTime() > 6 * 3_600_000
  ).length

  const faturamentoHoje = lancamentos
    .filter(l => l.tipo === 'entrada' && l.data === todayStr)
    .reduce((s, l) => s + l.valor, 0)

  const agendamentoDates = new Set(
    agendamentos
      .filter(a => a.status !== 'concluido' && a.status !== 'cancelado')
      .map(a => a.data)
  )

  const todayAgendamentos = agendamentos
    .filter(a => a.data === todayStr && a.status !== 'concluido' && a.status !== 'cancelado')
    .sort((a, b) => a.horario.localeCompare(b.horario))

  const concluidasHoje = ordens.filter(o =>
    o.status === 'concluido' && o.dataFinalizacao === todayStr
  )

  // ── Lookups ───────────────────────────────────────────────────
  const getCliente  = (id: string) => clientes.find(c => c.id === id) ?? null
  const getVeiculo  = (id: string) => veiculos.find(v => v.id === id) ?? null
  const getInstalador = (id: string) => instaladores.find(i => i.id === id) ?? null
  const getServico  = (id: string) => servicos.find(s => s.id === id)

  // ── Confirm concluir modal ────────────────────────────────────
  const [confirmOS, setConfirmOS]       = useState<OrdemServico | null>(null)
  const [leavingBoxId, setLeavingBoxId] = useState<string | null>(null)

  const handleOpenConfirm = (osId: string) => {
    const os = ordens.find(o => o.id === osId) ?? null
    setConfirmOS(os)
  }

  const handleConfirmar = () => {
    if (!confirmOS) return
    const os = confirmOS
    concluirOS(os.id)
    setLeavingBoxId(os.id)
    setDrawerOS(null)
    setConfirmOS(null)
    toast.success(`OS #${os.numero} concluída — ${fmt(os.valorTotal)} lançado no financeiro`)
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

  // ── Alocar modal state ────────────────────────────────────────
  const [alocandoOS, setAlocandoOS] = useState<OrdemServico | null>(null)
  const [alocBox,    setAlocBox]    = useState(0)
  const [alocInst,   setAlocInst]   = useState('')

  const abrirAlocar = (os: OrdemServico) => {
    setAlocandoOS(os)
    setAlocBox(0)
    setAlocInst(os.instaladorId)
  }

  const confirmarAlocacao = () => {
    if (!alocandoOS || alocBox === 0) { toast.error('Selecione um box.'); return }
    editarOS(alocandoOS.id, { box: alocBox, instaladorId: alocInst })
    toast.success('OS alocada com sucesso!')
    setAlocandoOS(null)
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 min-h-full" style={{ backgroundColor: 'var(--wrap-bg)' }}>

      {/* ── Header + live indicator ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ui-text font-display">Pátio Ao Vivo</h1>
          <div className="flex items-center gap-2 mt-1">
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
            <span className="text-[13px] text-slate-500">
              Atualizado em tempo real
            </span>
          </div>
        </div>
      </div>

      {/* ── Status bar (Mobile Carrossel) ── */}
      <div className="flex overflow-x-auto pb-2 -mx-6 px-6 gap-3 snap-x [&::-webkit-scrollbar]:hidden">
        <div className="min-w-[140px] shrink-0 snap-start"><StatChip label="No Pátio" value={occupiedCount} color="#f0f0f4" icon={LayoutGrid} /></div>
        <div className="min-w-[140px] shrink-0 snap-start"><StatChip label="Livres" value={livresCount < 0 ? 0 : livresCount} color="#34d399" icon={LayoutGrid} /></div>
        <div className="min-w-[140px] shrink-0 snap-start"><StatChip label="Atrasados" value={atrasadosCount} color={atrasadosCount > 0 ? '#e8304a' : '#5a6070'} icon={AlertTriangle} /></div>
        <div className="min-w-[150px] shrink-0 snap-start"><StatChip label="Faturado" value={fmt(faturamentoHoje)} color="#34d399" icon={TrendingUp} /></div>
        <div className="min-w-[150px] shrink-0 snap-start"><StatChip label="Agenda" value={`${todayAgendamentos.length} hoje`} color={todayAgendamentos.length > 0 ? 'var(--wrap-accent)' : '#5a6070'} icon={Calendar} /></div>
      </div>

      {/* ── Weekly calendar strip ── */}
      <WeekStrip agendamentoDates={agendamentoDates} />

      {/* ── Boxes grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boxes.map(boxNum => {
          const os = boxMap.get(boxNum) ?? null
          return (
            <BoxCard
              key={boxNum}
              boxNum={boxNum}
              os={os}
              cliente={os ? getCliente(os.clienteId) : null}
              veiculo={os ? getVeiculo(os.veiculoId) : null}
              instalador={os ? getInstalador(os.instaladorId) : null}
              leaving={leavingBoxId === os?.id}
              onConcluir={() => setLeavingBoxId(null)}
              onConfirmarConcluir={handleOpenConfirm}
              onOpenDrawer={os ? () => setDrawerOS(os) : undefined}
              emManutencao={boxesManutencao.includes(boxNum)}
              onToggleManutencao={() => setManutModal(boxNum)}
            />
          )
        })}
      </div>

      {/* ── Aguardando alocação ── */}
      <AnimatePresence>
        {aguardandoAlocacao.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <h2 className="text-[12px] font-semibold tracking-widest uppercase flex items-center gap-2 text-slate-500">
              Aguardando Alocação
              <span
                className="px-1.5 py-0.5 rounded text-[11px] font-bold"
                style={{ backgroundColor: 'rgba(232,48,74,0.14)', color: '#e8304a' }}
              >
                {aguardandoAlocacao.length}
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {aguardandoAlocacao.map(os => {
                const cliente = getCliente(os.clienteId)
                const veiculo = getVeiculo(os.veiculoId)
                return (
                  <div
                    key={os.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: 'rgba(232,48,74,0.05)',
                      border: '1px solid rgba(232,48,74,0.18)',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-ui-text truncate">
                        OS #{os.numero}
                      </div>
                      <div className="text-[11px] truncate text-slate-500">
                        {cliente?.nome ?? '—'} · {veiculo?.modelo ?? '—'}
                      </div>
                    </div>
                    <button
                      onClick={() => abrirAlocar(os)}
                      className="ml-3 shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: 'rgba(232,48,74,0.14)',
                        color: '#e8304a',
                        border: '1px solid rgba(232,48,74,0.28)',
                      }}
                    >
                      Alocar
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Concluídas hoje ── */}
      <AnimatePresence>
        {concluidasHoje.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <h2 className="text-[12px] font-semibold tracking-widest uppercase flex items-center gap-2 text-slate-500">
              <CheckCircle2 size={12} style={{ color: '#34d399' }} />
              Concluídas Hoje
              <span
                className="px-1.5 py-0.5 rounded text-[11px] font-bold"
                style={{ backgroundColor: 'rgba(52,211,153,0.12)', color: '#34d399' }}
              >
                {concluidasHoje.length}
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {concluidasHoje.map(os => {
                const cliente = getCliente(os.clienteId)
                const veiculo = getVeiculo(os.veiculoId)
                return (
                  <button
                    key={os.id}
                    onClick={() => setDrawerOS(os)}
                    className="flex items-center justify-between rounded-xl px-4 py-3 text-left transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: 'rgba(52,211,153,0.04)',
                      border: '1px solid rgba(52,211,153,0.15)',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-ui-text truncate">
                        OS #{os.numero}
                      </div>
                      <div className="text-[11px] truncate text-slate-500">
                        {cliente?.nome ?? '—'} · {veiculo?.modelo ?? '—'}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-[11px] font-semibold" style={{ color: '#34d399' }}>
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
        <h2 className="text-[12px] font-semibold tracking-widest uppercase flex items-center gap-2 text-slate-500">
          <Calendar size={12} />
          Agendamentos de Hoje
          {todayAgendamentos.length === 0 && (
            <span className="normal-case font-normal text-slate-400">
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
                  className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/[0.025] border border-white/5"
                >
                  <div className="shrink-0 w-14 text-center">
                    <div className="text-[15px] font-bold" style={{ color: 'var(--wrap-accent)' }}>
                      {ag.horario}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {ag.duracao}h
                    </div>
                  </div>

                  <div className="w-px h-8 shrink-0 bg-white/[0.08]" />

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-ui-text truncate">
                      {cliente?.nome ?? '—'}
                    </div>
                    <div className="text-[11px] truncate text-slate-500">
                      {veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '—'}
                      {servico ? ` · ${servico.nome}` : ''}
                      {ag.box > 0 ? ` · Box ${ag.box}` : ''}
                    </div>
                  </div>

                  {tecnico && (
                    <div className="shrink-0 flex items-center gap-1 text-[11px] text-slate-500">
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

      {/* ── Modal: Confirmar Conclusão ── */}
      <Modal
        isOpen={confirmOS !== null}
        onClose={() => setConfirmOS(null)}
        title="Confirmar conclusão"
        size="sm"
      >
        {confirmOS && (
          <div className="space-y-4">
            <div
              className="p-4 rounded-xl space-y-1"
              style={{ backgroundColor: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.18)' }}
            >
              <p className="text-[14px] font-semibold text-ui-text">
                OS #{confirmOS.numero} — {getCliente(confirmOS.clienteId)?.nome ?? '—'}
              </p>
              <p className="text-[12px] text-slate-500">
                {getVeiculo(confirmOS.veiculoId)?.modelo ?? '—'}
                {confirmOS.box > 0 ? ` · Box ${confirmOS.box}` : ''}
              </p>
              <p className="text-[13px] font-semibold" style={{ color: '#34d399' }}>
                {fmt(confirmOS.valorTotal)}
              </p>
            </div>
            <p className="text-[12px] text-slate-500">
              Isso lançará o valor no financeiro e liberará o box.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmOS(null)} className="flex-1">
                Cancelar
              </Button>
              <button
                onClick={handleConfirmar}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#34d399', color: '#0a0c12' }}
              >
                <CheckCircle2 size={14} />
                Confirmar conclusão
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Alocar OS ── */}
      <Modal isOpen={alocandoOS !== null} onClose={() => setAlocandoOS(null)} title="Alocar OS" size="sm">
        {alocandoOS && (
          <div className="space-y-5">
            <p className="text-[13px] text-slate-500">
              OS #{alocandoOS.numero} —{' '}
              <span className="text-ui-text font-medium">{getCliente(alocandoOS.clienteId)?.nome}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] block mb-1.5 text-slate-500">Box</label>
                <select
                  value={alocBox}
                  onChange={e => setAlocBox(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none bg-white/5 border border-white/10 text-ui-text"
                >
                  <option value={0}>Selecione um box…</option>
                  {Array.from({ length: configuracoes.numeroBoxes }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>Box {n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] block mb-1.5 text-slate-500">Técnico</label>
                <select
                  value={alocInst}
                  onChange={e => setAlocInst(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none bg-white/5 border border-white/10 text-ui-text"
                >
                  <option value="">Sem técnico definido</option>
                  {instaladores.filter(i => i.ativo).map(i => (
                    <option key={i.id} value={i.id}>{i.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={confirmarAlocacao}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--wrap-accent)', color: 'white' }}
            >
              Confirmar Alocação
            </button>
          </div>
        )}
      </Modal>

      {/* ── Modal: Manutenção ── */}
      <Modal
        isOpen={manutModal !== null}
        onClose={() => setManutModal(null)}
        title={
          manutModal !== null && boxesManutencao.includes(manutModal)
            ? `Liberar Box ${manutModal}`
            : `Box ${manutModal} — Manutenção`
        }
        size="sm"
      >
        {manutModal !== null && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.20)' }}>
              <Wrench size={16} className="text-[#ff6b35] shrink-0" />
              <p className="text-[13px] text-ui-text">
                {boxesManutencao.includes(manutModal)
                  ? `Liberar Box ${manutModal} e marcar como disponível?`
                  : `Colocar Box ${manutModal} em manutenção? O box ficará indisponível.`}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setManutModal(null)}>Cancelar</Button>
              <button
                onClick={handleConfirmarManut}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: boxesManutencao.includes(manutModal)
                    ? 'rgba(52,211,153,0.15)'
                    : 'rgba(255,107,53,0.15)',
                  color: boxesManutencao.includes(manutModal) ? '#34d399' : '#ff6b35',
                  border: boxesManutencao.includes(manutModal)
                    ? '1px solid rgba(52,211,153,0.30)'
                    : '1px solid rgba(255,107,53,0.30)',
                }}
              >
                <Wrench size={13} className="inline mr-1.5" />
                {boxesManutencao.includes(manutModal) ? 'Liberar Box' : 'Entrar em Manutenção'}
              </button>
            </div>
          </div>
        )}
      </Modal>

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
