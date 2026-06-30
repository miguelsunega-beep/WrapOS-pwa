import { useState, useMemo } from 'react'
import {
  DndContext, DragOverlay,
  PointerSensor, TouchSensor,
  useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { Calendar, TrendingUp, LayoutGrid, AlertTriangle, CheckCircle2, Car } from 'lucide-react'
import { OSDrawer } from '../components/OSDrawer'
import { ConcluirOSModal } from '../components/ConcluirOSModal'
import { usePatio } from '../hooks/usePatio'
import { getEtapaPatio } from '../lib/patioEtapa'
import type { KanbanCard } from '../hooks/usePatio'
import type { EtapaPatio } from '../lib/patioEtapa'
import type { OrdemServico } from '../types'

// ── Stat chips (status bar) ───────────────────────────────────────

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

// ── Kanban card content ───────────────────────────────────────────

interface KanbanCardItemProps {
  card: KanbanCard
  etapa: EtapaPatio
  onOpenDrawer: (os: OrdemServico) => void
  onEntregar:  (osId: string) => void
  isOverlay?:  boolean
  dragListeners?: Record<string, unknown>
}

function KanbanCardItem({ card, etapa, onOpenDrawer, onEntregar, isOverlay, dragListeners }: KanbanCardItemProps) {
  const isConcluido = etapa === 'concluido'

  const barColor  = card.atrasada ? '#e8304a' : 'var(--wrap-accent)'
  const timeColor = card.atrasada ? '#e8304a' : card.progresso >= 80 ? '#f59e0b' : '#34d399'

  const inner = (
    <div
      className="rounded-xl p-3.5 space-y-2 select-none"
      style={{
        background: 'var(--wrap-bg)',
        border: `1px solid ${card.atrasada ? 'rgba(232,48,74,0.35)' : 'var(--wrap-border)'}`,
        boxShadow: isOverlay ? '0 8px 24px rgba(0,0,0,0.35)' : undefined,
        opacity:   isOverlay ? 0.95 : 1,
      }}
    >
      {/* OS # + time tag */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-gray-500 shrink-0">OS #{card.numero}</span>
        {card.tempoLabel && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full truncate"
            style={{ background: `${timeColor}20`, color: timeColor }}>
            {card.tempoLabel}
          </span>
        )}
      </div>

      {/* Veículo + serviço */}
      <div>
        <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--wrap-text)' }}>
          {card.veiculoLabel}
        </p>
        <p className="text-[11px] truncate" style={{ color: 'var(--wrap-muted)' }}>
          {card.servicoPrincipal}
        </p>
      </div>

      {/* Cliente */}
      <p className="text-[11px] truncate" style={{ color: 'var(--wrap-muted)' }}>
        {card.clienteNome}
      </p>

      {/* Barra de progresso */}
      {card.dataSaidaPrevista && (
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--wrap-border2)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${card.progresso}%`, background: barColor }}
          />
        </div>
      )}

      {/* Rodapé: instalador + ação */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
            style={{ background: 'rgb(var(--wrap-accent-rgb) / 0.18)', color: 'var(--wrap-accent)' }}
          >
            {card.instaladorIniciais}
          </div>
          <span className="text-[10px] truncate" style={{ color: 'var(--wrap-muted)' }}>
            {card.instaladorNome.split(' ')[0]}
          </span>
        </div>

        {isConcluido && (
          <button
            onClick={e => { e.stopPropagation(); onEntregar(card.id) }}
            className="shrink-0 text-[9px] font-semibold px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
          >
            Entregar veículo
          </button>
        )}
      </div>
    </div>
  )

  if (isConcluido) {
    // Concluído: sem cursor-pointer (não confunde o seletor dos testes)
    return (
      <div
        {...(dragListeners as React.HTMLAttributes<HTMLDivElement>)}
        style={{ touchAction: 'none' }}
      >
        {inner}
      </div>
    )
  }

  // Aguardando / Execução: cursor-pointer, clique abre drawer
  return (
    <div
      className="cursor-pointer"
      onClick={() => onOpenDrawer(card)}
      {...(dragListeners as React.HTMLAttributes<HTMLDivElement>)}
      style={{ touchAction: 'none' }}
    >
      {inner}
    </div>
  )
}

// ── Draggable wrapper ─────────────────────────────────────────────

interface DraggableCardProps {
  card: KanbanCard
  etapa: EtapaPatio
  onOpenDrawer: (os: OrdemServico) => void
  onEntregar:  (osId: string) => void
}

function DraggableCard({ card, etapa, onOpenDrawer, onEntregar }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity: isDragging ? 0 : 1,
        transition: isDragging ? undefined : 'opacity 0.15s',
      }}
      {...attributes}
    >
      <KanbanCardItem
        card={card}
        etapa={etapa}
        onOpenDrawer={onOpenDrawer}
        onEntregar={onEntregar}
        dragListeners={listeners as Record<string, unknown>}
      />
    </div>
  )
}

// ── Kanban column ─────────────────────────────────────────────────

const ETAPA_CONFIG: Record<EtapaPatio, { label: string; cor: string; corBg: string }> = {
  aguardando: { label: 'Aguardando', cor: '#f59e0b', corBg: 'rgba(245,158,11,0.07)' },
  execucao:   { label: 'Execução',   cor: '#3b82f6', corBg: 'rgba(59,130,246,0.07)' },
  concluido:  { label: 'Concluído',  cor: '#34d399', corBg: 'rgba(52,211,153,0.07)' },
}

interface KanbanColunaProps {
  etapa: EtapaPatio
  cards: KanbanCard[]
  onOpenDrawer: (os: OrdemServico) => void
  onEntregar:  (osId: string) => void
}

function KanbanColuna({ etapa, cards, onOpenDrawer, onEntregar }: KanbanColunaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })
  const { label, cor, corBg } = ETAPA_CONFIG[etapa]

  return (
    <div
      ref={setNodeRef}
      className="min-w-[268px] flex-1 flex flex-col rounded-xl snap-start shrink-0"
      style={{
        background: isOver ? corBg : 'var(--wrap-surface)',
        border: `1px solid ${isOver ? cor : 'var(--wrap-border)'}`,
        transition: 'border-color 0.12s, background 0.12s',
        minHeight: 200,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--wrap-border)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--wrap-text)' }}>{label}</h3>
        </div>
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `${cor}22`, color: cor }}
        >
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {cards.length === 0 ? (
          <p className="text-center text-[11px] py-8" style={{ color: 'var(--wrap-muted)' }}>
            Nenhuma OS
          </p>
        ) : (
          cards.map(card => (
            <DraggableCard
              key={card.id}
              card={card}
              etapa={etapa}
              onOpenDrawer={onOpenDrawer}
              onEntregar={onEntregar}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Confirm move dialog ───────────────────────────────────────────

interface ConfirmMoveProps {
  veiculoLabel: string
  novaEtapa: EtapaPatio
  onConfirm: () => void
  onCancel:  () => void
}

function ConfirmMoveModal({ veiculoLabel, novaEtapa, onConfirm, onCancel }: ConfirmMoveProps) {
  const { label, cor } = ETAPA_CONFIG[novaEtapa]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div
        className="relative rounded-xl p-5 space-y-4 w-full max-w-[320px]"
        style={{ background: 'var(--wrap-surface)', border: '1px solid var(--wrap-border2)' }}
      >
        <p className="text-[13px] font-bold" style={{ color: 'var(--wrap-text)' }}>
          Mover para {label}?
        </p>
        <p className="text-[12px]" style={{ color: 'var(--wrap-muted)' }}>
          {veiculoLabel}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold"
            style={{ background: 'var(--wrap-surface)', color: 'var(--wrap-muted)', border: '1px solid var(--wrap-border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg text-[12px] font-bold"
            style={{ background: `${cor}22`, color: cor, border: `1px solid ${cor}55` }}
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export function Patio() {
  const {
    carrosPorEtapa,
    noPatioCount,
    atrasadosCount,
    faturamentoHojeStr,
    todayAgendamentos,
    concluidasHoje,
    getCliente,
    getVeiculo,
    drawerOS,
    abrirDrawer,
    fecharDrawer,
    concluirOSData,
    handleOpenConfirm,
    fecharConcluir,
    moverEtapa,
    entregarVeiculo,
    instaladores,
    numeroBoxes,
    irParaFinanceiro,
    irParaAgendamento,
  } = usePatio()

  // ── DnD state ──────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<{ osId: string; novaEtapa: EtapaPatio } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const allCards = useMemo(
    () => [...carrosPorEtapa.aguardando, ...carrosPorEtapa.execucao, ...carrosPorEtapa.concluido],
    [carrosPorEtapa],
  )

  const activeCard = useMemo(
    () => (activeId ? allCards.find(c => c.id === activeId) ?? null : null),
    [activeId, allCards],
  )

  const pendingCard = useMemo(
    () => (pendingMove ? allCards.find(c => c.id === pendingMove.osId) ?? null : null),
    [pendingMove, allCards],
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const osId       = active.id as string
    const novaEtapa  = over.id  as EtapaPatio
    const card       = allCards.find(c => c.id === osId)
    if (!card) return

    const etapaAtual = getEtapaPatio(card.status, card.entregue)
    if (novaEtapa === etapaAtual) return

    if (novaEtapa === 'concluido') {
      // ConcluirOSModal é a própria confirmação
      handleOpenConfirm(osId)
    } else {
      setPendingMove({ osId, novaEtapa })
    }
  }

  function confirmMove() {
    if (!pendingMove) return
    moverEtapa(pendingMove.osId, pendingMove.novaEtapa)
    setPendingMove(null)
  }

  const isKanbanEmpty =
    carrosPorEtapa.aguardando.length === 0 &&
    carrosPorEtapa.execucao.length   === 0 &&
    carrosPorEtapa.concluido.length  === 0

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-full" style={{ backgroundColor: 'var(--wrap-bg)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-ui-text font-display leading-tight">Pátio</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: '#34d399' }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: '#34d399' }} />
            </span>
            <span className="text-[12px] sm:text-[13px] text-gray-500">Atualizado em tempo real</span>
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
        <div className="min-w-[140px] shrink-0 snap-start">
          <StatChip label="No Pátio" value={noPatioCount} color="#f0f0f4" icon={LayoutGrid} />
        </div>
        <div className="min-w-[140px] shrink-0 snap-start">
          <StatChip label="Atrasados" value={atrasadosCount} color={atrasadosCount > 0 ? '#e8304a' : '#5a6070'} icon={AlertTriangle} />
        </div>
        <div className="min-w-[150px] shrink-0 snap-start">
          <StatChip label="Faturado" value={faturamentoHojeStr} color="#34d399" icon={TrendingUp} onClick={irParaFinanceiro} />
        </div>
        <div className="min-w-[150px] shrink-0 snap-start">
          <StatChip
            label="Agenda" value={`${todayAgendamentos.length} hoje`}
            color={todayAgendamentos.length > 0 ? 'var(--wrap-accent)' : '#5a6070'}
            icon={Calendar} onClick={irParaAgendamento}
          />
        </div>
      </div>

      {/* ── Kanban ── */}
      {isKanbanEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Car size={32} className="text-gray-700" />
          <p className="mt-3 text-[14px] font-medium text-gray-400">Nenhum carro no pátio</p>
          <p className="text-[12px] text-gray-600 mt-1">Use o Check-in para registrar a entrada de um veículo.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-6 md:px-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
            {(['aguardando', 'execucao', 'concluido'] as EtapaPatio[]).map(etapa => (
              <KanbanColuna
                key={etapa}
                etapa={etapa}
                cards={carrosPorEtapa[etapa]}
                onOpenDrawer={abrirDrawer}
                onEntregar={entregarVeiculo}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <KanbanCardItem
                card={activeCard}
                etapa={getEtapaPatio(activeCard.status, activeCard.entregue) ?? 'aguardando'}
                onOpenDrawer={() => {}}
                onEntregar={() => {}}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Concluídas Hoje ── */}
      {concluidasHoje.length > 0 && (
        <section className="space-y-3">
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
                  onClick={() => abrirDrawer(os)}
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
                    {os.valorTotalStr}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Modal: confirmar mudança de etapa ── */}
      {pendingMove && pendingCard && (
        <ConfirmMoveModal
          veiculoLabel={pendingCard.veiculoLabel}
          novaEtapa={pendingMove.novaEtapa}
          onConfirm={confirmMove}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {/* ── Modal: Concluir OS ── */}
      <ConcluirOSModal
        os={concluirOSData}
        onClose={fecharConcluir}
        onConcluded={fecharConcluir}
      />

      {/* ── OS Drawer ── */}
      <OSDrawer
        os={drawerOS}
        cliente={drawerOS ? getCliente(drawerOS.clienteId) : null}
        veiculo={drawerOS ? getVeiculo(drawerOS.veiculoId) : null}
        instaladores={instaladores}
        numeroBoxes={numeroBoxes}
        onClose={fecharDrawer}
        onConfirmarConcluir={handleOpenConfirm}
      />
    </div>
  )
}
