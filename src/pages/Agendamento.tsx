import { useState, useRef, useEffect } from 'react'
import {
  Plus, ChevronLeft, ChevronRight,
  Check, Trash2, Pencil, FilePlus2, CheckCircle2, Repeat,
  User, Wrench, CalendarClock, Car, Clock, UserPlus,
} from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns'
import 'react-day-picker/dist/style.css'
import { useDraftState } from '../hooks/useDraftState'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ActionButton } from '../components/ActionButton'
import { Modal } from '../components/Modal'
import { DateField } from '../components/DateField'
import { AgendaGrid } from '../components/AgendaGrid'
import { VeiculoInlineForm } from '../components/VeiculoInlineForm'
import {
  useAgendamento, todayISO, statusEfetivoConfig, DIAS_SEMANA,
  TIPOS_SERVICO, STATUS_FILTROS,
  type AppointmentVM,
} from '../hooks/useAgendamento'

const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors'
const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5'

const VIEWS: { key: 'dia' | 'semana' | 'mes'; label: string }[] = [
  { key: 'dia',    label: 'Dia'    },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mês'    },
]

const parseISODate = (iso: string): Date | undefined => {
  const d = new Date(iso + 'T12:00:00')
  return isValid(d) ? d : undefined
}

interface MonthOverviewProps {
  monthDate:    Date
  diaSelecionado: string
  todayISO:     string
  getAppointmentsForDate: (iso: string) => AppointmentVM[]
  onSelectDia:  (iso: string) => void
}

function MonthOverview({ monthDate, diaSelecionado, todayISO, getAppointmentsForDate, onSelectDia }: MonthOverviewProps) {
  const inicio = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 })
  const fim    = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 })
  const dias   = eachDayOfInterval({ start: inicio, end: fim })

  return (
    <div className="bg-surface-800 border border-ui-border rounded-[10px] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-ui-border">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="py-2.5 text-center text-[10px] text-gray-600 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map(date => {
          const iso = format(date, 'yyyy-MM-dd')
          const isToday = iso === todayISO
          const isSel = iso === diaSelecionado
          const fora = !isSameMonth(date, monthDate)
          const ags = getAppointmentsForDate(iso)
          const cores = Array.from(new Set(ags.map(a => a.tipo.cor)))
          return (
            <button
              key={iso}
              onClick={() => onSelectDia(iso)}
              className={`min-h-[88px] p-2 text-left border-b border-r border-ui-border transition-colors hover:bg-surface-700/50 ${isSel ? 'bg-accent/5' : ''}`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  isToday
                    ? 'bg-accent text-white'
                    : isSel
                      ? 'ring-1 ring-accent/60 text-ui-text'
                      : fora ? 'text-gray-700' : 'text-ui-text'
                }`}
              >
                {date.getDate()}
              </span>
              {ags.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {cores.slice(0, 4).map(cor => (
                    <span key={cor} className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                  ))}
                  <span className="text-[10px] text-gray-500 ml-0.5">{ags.length}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Agendamento() {
  const {
    clientes, veiculos, servicos,
    diaSelecionado,
    diasDaSemana, weekLabel, diaSelecionadoLabel, navWeek, goToday, irParaData,
    view, setView,
    filtroTipos, toggleTipo, filtroStatus, toggleStatus,
    appointmentsByDia, proximoAgendamento, getAppointmentsForDate,
    getTelCliente, getVeiculoSub,
    detalhes, setDetalhes,
    detCliente, detVeiculo, detServico, detInstalador, detValorStr, detDataStr,
    detStatusEfetivo, detOSVinculada,
    confirmarDelete, setConfirmarDelete, handleDelete,
    editForm, setEditForm, abrirEditar, handleSalvarEdicao,
    editVeiculosCliente, instaladoresAtivos,
    form, setForm, resetNovoForm, clientesFiltrados, veiculosCliente, selecionarCliente, handleSalvar,
    handleAprovarEntrada, handleVerOS,
    reagendarData, setReagendarData, reagendarHorario, setReagendarHorario,
    abrirReagendar, handleSalvarReagendamento,
  } = useAgendamento()

  // ── Pure UI state ─────────────────────────────────────────────
  const [novoOpen, setNovoOpen]     = useDraftState('wrapos_draft_agendamento_novo_open', false)
  const [editOpen, setEditOpen]     = useState(false)
  const [reagendarOpen, setReagendarOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const onAbrirNovo = () => {
    resetNovoForm()
    setNovoOpen(true)
  }

  const onSalvar = async () => {
    if (await handleSalvar()) setNovoOpen(false)
  }

  const onSalvarEdicao = () => {
    if (handleSalvarEdicao()) setEditOpen(false)
  }

  const onAbrirReagendar = () => {
    if (!detalhes) return
    setDetalhes(null)
    abrirReagendar(detalhes)
    setReagendarOpen(true)
  }

  const onSalvarReagendamento = () => {
    if (handleSalvarReagendamento()) setReagendarOpen(false)
  }

  const diaAtualDate = diasDaSemana.find(d => d.iso === diaSelecionado)?.date
    ?? new Date(diaSelecionado + 'T12:00:00')

  const monthLabel = diaAtualDate
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase())

  const periodoLabel = view === 'dia' ? diaSelecionadoLabel : view === 'mes' ? monthLabel : weekLabel

  const navPeriodo = (dir: -1 | 1) => {
    if (view === 'semana') { navWeek(dir); return }
    const d = new Date(diaSelecionado + 'T12:00:00')
    if (view === 'dia') d.setDate(d.getDate() + dir)
    else d.setMonth(d.getMonth() + dir)
    irParaData(d.toISOString().slice(0, 10))
  }

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ui-text">Agendamento</h1>
          <p className="text-gray-500 text-xs mt-0.5">Agenda semanal</p>
        </div>
        <Button onClick={onAbrirNovo}>
          <Plus size={15} />
          Novo Agendamento
        </Button>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex bg-surface-800 border border-ui-border rounded-lg p-1 gap-1">
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                view === v.key ? 'bg-accent text-white shadow-sm shadow-accent/30' : 'text-gray-500 hover:text-ui-text'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navPeriodo(-1)}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-gray-500 hover:text-ui-text transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-ui-text min-w-[200px] text-center capitalize">{periodoLabel}</span>
          <button
            onClick={() => navPeriodo(1)}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-gray-500 hover:text-ui-text transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={goToday}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-surface-700 hover:text-ui-text border border-ui-border transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Sidebar + Grid */}
      <div className="flex flex-col md:flex-row gap-5 items-start">

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside className="w-full md:w-[262px] shrink-0 flex flex-col gap-4">

          {/* Mini calendário */}
          <Card padding={false} className="p-2">
            <div className="wrapos-daypicker flex justify-center">
              <DayPicker
                mode="single"
                locale={ptBR}
                selected={parseISODate(diaSelecionado)}
                defaultMonth={parseISODate(diaSelecionado)}
                onSelect={(d) => { if (d) irParaData(format(d, 'yyyy-MM-dd')) }}
              />
            </div>
          </Card>

          {/* Próximo agendamento */}
          {proximoAgendamento && (
            <div
              className="rounded-xl p-4 text-white shadow-lg cursor-pointer"
              style={{ backgroundColor: 'var(--wrap-accent)' }}
              onClick={() => setDetalhes(proximoAgendamento.ag)}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: '#ffd6da' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                  Próximo agendamento
                </p>
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Car size={14} className="text-white" />
                </div>
              </div>
              <p className="text-sm font-bold mt-2">{proximoAgendamento.modelo}</p>
              <p className="text-xs text-white/75 font-mono mt-0.5">
                {proximoAgendamento.cliente}{proximoAgendamento.placa ? ` · ${proximoAgendamento.placa}` : ''}
              </p>
              <div className="border-t border-white/20 my-2.5" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate">{proximoAgendamento.servicoNome}</span>
                <span className="flex items-center gap-1 text-xs font-bold shrink-0 whitespace-nowrap">
                  <Clock size={12} className="shrink-0" />
                  {proximoAgendamento.dataLabel} · {proximoAgendamento.ag.horario}
                </span>
              </div>
            </div>
          )}

          {/* Filtros */}
          <Card padding={false} className="p-4">
            <p className="text-xs font-semibold text-gray-400 mb-3">Filtros</p>

            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Tipo de Serviço</p>
            <div className="space-y-2 mb-4">
              {TIPOS_SERVICO.map(t => (
                <label key={t.key} className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={!!filtroTipos[t.key]}
                    onChange={() => toggleTipo(t.key)}
                    className="hidden"
                  />
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0"
                    style={filtroTipos[t.key]
                      ? { backgroundColor: 'var(--wrap-accent)', borderColor: 'var(--wrap-accent)' }
                      : { borderColor: 'var(--wrap-border2)' }}
                  >
                    {filtroTipos[t.key] && <Check size={11} className="text-white" />}
                  </span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                  <span className="text-gray-300">{t.label}</span>
                </label>
              ))}
            </div>

            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTROS.map(s => (
                <button
                  key={s.key}
                  onClick={() => toggleStatus(s.key)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] border transition-colors"
                  style={filtroStatus[s.key]
                    ? { backgroundColor: `${s.cor}1f`, borderColor: `${s.cor}40`, color: s.cor }
                    : { borderColor: 'var(--wrap-border2)', color: '#5a6070' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.cor }} />
                  {s.label}
                </button>
              ))}
            </div>
          </Card>
        </aside>

        {/* ── Área da grade ────────────────────────────────────── */}
        <div className="flex-1 min-w-0 w-full">
          {view === 'mes' ? (
            <MonthOverview
              monthDate={diaAtualDate}
              diaSelecionado={diaSelecionado}
              todayISO={todayISO}
              getAppointmentsForDate={getAppointmentsForDate}
              onSelectDia={(iso) => { irParaData(iso); setView('semana') }}
            />
          ) : (
            <AgendaGrid
              dias={view === 'dia' ? [{ date: diaAtualDate, iso: diaSelecionado }] : diasDaSemana}
              appointmentsByDia={appointmentsByDia}
              todayISO={todayISO}
              onSelect={setDetalhes}
            />
          )}
        </div>
      </div>

      {/* ── Modal Detalhes ──────────────────────────────────────── */}
      <Modal isOpen={!!detalhes} onClose={() => setDetalhes(null)} title="Detalhes do Agendamento" size="lg">
        {detalhes && detStatusEfetivo && (
          <div className="space-y-4">
            {/* Status + actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                label={statusEfetivoConfig[detStatusEfetivo].label}
                variant={statusEfetivoConfig[detStatusEfetivo].variant}
              />
              {detStatusEfetivo === 'agendado' && (
                <>
                  <button
                    onClick={() => handleAprovarEntrada(detalhes)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <CheckCircle2 size={13} />
                    Aprovar entrada
                  </button>
                  <button
                    onClick={onAbrirReagendar}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                  >
                    <Repeat size={13} />
                    Reagendar
                  </button>
                  <button
                    onClick={() => setConfirmarDelete(detalhes.id)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={13} />
                    Cancelar
                  </button>
                </>
              )}
              {(detalhes.reagendamentos ?? 0) > 0 && (
                <span className="text-[11px] text-gray-600">
                  Reagendado {detalhes.reagendamentos}x
                </span>
              )}
            </div>

            {/* Info grid 2x2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-surface-700 rounded-xl p-3.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Cliente</p>
                <p className="text-sm font-semibold text-ui-text">{detCliente?.nome ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{getTelCliente(detalhes.clienteId)}</p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Veículo</p>
                <p className="text-sm font-semibold text-ui-text">
                  {detVeiculo ? `${detVeiculo.marca} ${detVeiculo.modelo}` : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {detVeiculo ? getVeiculoSub(detVeiculo.id) : ''}
                </p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Serviço</p>
                <p className="text-sm font-semibold text-ui-text">{detServico?.nome ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{detValorStr}</p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Instalador</p>
                <p className="text-sm font-semibold text-ui-text">{detInstalador?.nome ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {detInstalador?.especialidades.join(', ') ?? ''}
                </p>
              </div>
            </div>

            {/* Data/Horário row */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: 'Data',    value: detDataStr       },
                { label: 'Horário', value: detalhes.horario },
              ] as const).map(item => (
                <div key={item.label} className="bg-surface-700 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-bold text-ui-text mt-1.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-1 border-t border-ui-border">
              {detStatusEfetivo === 'agendado' ? (
                <button
                  onClick={() => { setDetalhes(null); abrirEditar(detalhes); setEditOpen(true) }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-ui-text transition-colors"
                >
                  <Pencil size={13} />
                  Editar dados
                </button>
              ) : detOSVinculada ? (
                <button
                  onClick={() => handleVerOS(detalhes)}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <FilePlus2 size={13} />
                  Ver Ordem de Serviço
                </button>
              ) : <span />}
              <Button variant="secondary" onClick={() => setDetalhes(null)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Reagendar ─────────────────────────────────────── */}
      <Modal isOpen={reagendarOpen} onClose={() => setReagendarOpen(false)} title="Reagendar" size="sm">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nova data <span className="text-accent">*</span></label>
            <DateField value={reagendarData} onChange={setReagendarData} />
          </div>
          <div>
            <label className={labelCls}>Novo horário <span className="text-accent">*</span></label>
            <input
              type="time"
              value={reagendarHorario}
              onChange={e => setReagendarHorario(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setReagendarOpen(false)}>Cancelar</Button>
            <ActionButton onClick={onSalvarReagendamento}>Confirmar Reagendamento</ActionButton>
          </div>
        </div>
      </Modal>

      {/* ── Modal Novo Agendamento ──────────────────────────────── */}
      <Modal isOpen={novoOpen} onClose={() => setNovoOpen(false)} title="Novo Agendamento" size="lg">
        <div className="space-y-5">
          {/* Seção 1: Quem */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <User size={12} /> Cliente &amp; Veículo
              </p>
              {/* Toggle: cliente existente vs novo */}
              <button
                type="button"
                onClick={() => setForm(p => ({
                  ...p,
                  criandoCliente: !p.criandoCliente,
                  clienteSearch: '', clienteId: '', veiculoId: '',
                  novoClienteNome: '', novoClienteTel: '',
                }))}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                style={form.criandoCliente
                  ? { background: 'rgba(var(--wrap-accent-rgb)/0.12)', color: 'var(--wrap-accent)', border: '1px solid rgba(var(--wrap-accent-rgb)/0.3)' }
                  : { background: 'var(--wrap-surface)', color: '#6b7280', border: '1px solid var(--wrap-border)' }
                }
              >
                <UserPlus size={12} />
                {form.criandoCliente ? 'Cliente existente' : 'Novo cliente'}
              </button>
            </div>

            {form.criandoCliente ? (
              /* Novo cliente inline */
              <div className="space-y-3 p-4 rounded-xl border" style={{ background: 'rgba(var(--wrap-accent-rgb)/0.04)', borderColor: 'rgba(var(--wrap-accent-rgb)/0.2)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nome <span className="text-accent">*</span></label>
                    <input
                      placeholder="Nome completo"
                      value={form.novoClienteNome}
                      onChange={e => setForm(p => ({ ...p, novoClienteNome: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Telefone <span className="text-accent">*</span></label>
                    <input
                      placeholder="(11) 99999-9999"
                      value={form.novoClienteTel}
                      onChange={e => setForm(p => ({ ...p, novoClienteTel: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="border-t border-ui-border pt-3">
                  <VeiculoInlineForm
                    value={form.novoVeiculoForm}
                    onChange={v => setForm(p => ({ ...p, novoVeiculoForm: v }))}
                    showTitle
                  />
                </div>
              </div>
            ) : (
              /* Cliente existente */
              <>
                <div>
                  <label className={labelCls}>Cliente <span className="text-accent">*</span></label>
                  <div className="relative" ref={dropdownRef}>
                    <input
                      value={form.clienteSearch}
                      onChange={e => {
                        setForm(p => ({ ...p, clienteSearch: e.target.value, clienteId: '', veiculoId: '' }))
                        setDropdownOpen(true)
                      }}
                      onFocus={() => { if (form.clienteSearch.length > 0) setDropdownOpen(true) }}
                      placeholder="Buscar cliente pelo nome..."
                      className={inputCls}
                    />
                    {dropdownOpen && clientesFiltrados.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-surface-700 border border-ui-border rounded-xl shadow-xl overflow-hidden">
                        {clientesFiltrados.slice(0, 6).map(c => (
                          <button
                            key={c.id}
                            onMouseDown={() => { selecionarCliente(c); setDropdownOpen(false) }}
                            className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-surface-600 hover:text-ui-text transition-colors flex items-center justify-between"
                          >
                            <span>{c.nome}</span>
                            <span className="text-xs text-gray-600">{c.telefone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Veículo — only when client selected */}
                {form.clienteId && (
                  <div>
                    <label className={labelCls}>Veículo</label>
                    <select
                      value={form.veiculoId}
                      onChange={e => setForm(p => ({ ...p, veiculoId: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">Sem veículo específico</option>
                      {veiculosCliente.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.marca} {v.modelo} {v.ano} — {v.placa}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── Seção 2: O quê ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <Wrench size={12} /> Serviço &amp; Responsável
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Serviço</label>
                <select
                  value={form.servicoId}
                  onChange={e => setForm(p => ({ ...p, servicoId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Nenhum</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Valor (R$)</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={form.valor}
                  onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Instalador</label>
                <select
                  value={form.instaladorId}
                  onChange={e => setForm(p => ({ ...p, instaladorId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Nenhum</option>
                  {instaladoresAtivos.map(i => (
                    <option key={i.id} value={i.id}>{i.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Seção 3: Quando ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <CalendarClock size={12} /> Data &amp; Horário
            </p>
            {form.mesmoDia ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Data <span className="text-accent">*</span></label>
                  <DateField value={form.data} onChange={(iso) => setForm(p => ({ ...p, data: iso, dataSaida: iso }))} />
                </div>
                <div>
                  <label className={labelCls}>Horário <span className="text-accent">*</span></label>
                  <input
                    type="time"
                    value={form.horario}
                    onChange={e => setForm(p => ({ ...p, horario: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Entrada <span className="text-accent">*</span></label>
                    <DateField value={form.data} onChange={(iso) => setForm(p => ({ ...p, data: iso }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Saída prevista</label>
                    <DateField value={form.dataSaida} min={form.data} onChange={(iso) => setForm(p => ({ ...p, dataSaida: iso }))} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Horário <span className="text-accent">*</span></label>
                  <input
                    type="time"
                    value={form.horario}
                    onChange={e => setForm(p => ({ ...p, horario: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, mesmoDia: !p.mesmoDia, dataSaida: !p.mesmoDia ? p.data : p.dataSaida }))}
              className="flex items-center gap-2 text-sm font-medium transition-colors mt-1"
              style={{ color: form.mesmoDia ? 'var(--wrap-accent)' : '#6b7280' }}
            >
              <span
                className="relative rounded-full transition-colors"
                style={{ height: 22, width: 40, background: form.mesmoDia ? 'var(--wrap-accent)' : 'var(--surface-500)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform"
                  style={{ width: 18, height: 18, transform: form.mesmoDia ? 'translateX(18px)' : 'translateX(0)' }}
                />
              </span>
              Entra e sai no mesmo dia
            </button>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <ActionButton onClick={onSalvar}>Criar Agendamento</ActionButton>
          </div>
        </div>
      </Modal>

      {/* ── Modal Editar Agendamento ───────────────────────────── */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar Agendamento" size="lg">
        <div className="space-y-4">
          {/* Cliente */}
          <div>
            <label className={labelCls}>Cliente</label>
            <select
              value={editForm.clienteId}
              onChange={e => {
                const cId = e.target.value
                const primeiro = veiculos.find(v => v.clienteId === cId)
                setEditForm(p => ({ ...p, clienteId: cId, veiculoId: primeiro?.id ?? '' }))
              }}
              className={inputCls}
            >
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {/* Veículo */}
          {editForm.clienteId && (
            <div>
              <label className={labelCls}>Veículo</label>
              <select
                value={editForm.veiculoId}
                onChange={e => setEditForm(p => ({ ...p, veiculoId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Sem veículo específico</option>
                {editVeiculosCliente.map(v => (
                  <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano} — {v.placa}</option>
                ))}
              </select>
            </div>
          )}

          {/* Serviço + Valor + Instalador */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Serviço</label>
              <select
                value={editForm.servicoId}
                onChange={e => setEditForm(p => ({ ...p, servicoId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Nenhum</option>
                {servicos.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Valor (R$)</label>
              <input
                type="number"
                min={0}
                step={10}
                value={editForm.valor}
                onChange={e => setEditForm(p => ({ ...p, valor: e.target.value }))}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Instalador</label>
              <select
                value={editForm.instaladorId}
                onChange={e => setEditForm(p => ({ ...p, instaladorId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Nenhum</option>
                {instaladoresAtivos.map(i => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data & Horário */}
          {editForm.mesmoDia ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data <span className="text-accent">*</span></label>
                <DateField value={editForm.data} onChange={(iso) => setEditForm(p => ({ ...p, data: iso, dataSaida: iso }))} />
              </div>
              <div>
                <label className={labelCls}>Horário <span className="text-accent">*</span></label>
                <input
                  type="time"
                  value={editForm.horario}
                  onChange={e => setEditForm(p => ({ ...p, horario: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Entrada <span className="text-accent">*</span></label>
                  <DateField value={editForm.data} onChange={(iso) => setEditForm(p => ({ ...p, data: iso }))} />
                </div>
                <div>
                  <label className={labelCls}>Saída prevista</label>
                  <DateField value={editForm.dataSaida} min={editForm.data} onChange={(iso) => setEditForm(p => ({ ...p, dataSaida: iso }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Horário <span className="text-accent">*</span></label>
                <input
                  type="time"
                  value={editForm.horario}
                  onChange={e => setEditForm(p => ({ ...p, horario: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => setEditForm(p => ({ ...p, mesmoDia: !p.mesmoDia, dataSaida: !p.mesmoDia ? p.data : p.dataSaida }))}
            className="flex items-center gap-2 text-sm font-medium transition-colors mt-1"
            style={{ color: editForm.mesmoDia ? 'var(--wrap-accent)' : '#6b7280' }}
          >
            <span
              className="relative rounded-full transition-colors"
              style={{ height: 22, width: 40, background: editForm.mesmoDia ? 'var(--wrap-accent)' : 'var(--surface-500)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform"
                style={{ width: 18, height: 18, transform: editForm.mesmoDia ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </span>
            Entra e sai no mesmo dia
          </button>

          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <ActionButton onClick={onSalvarEdicao}>Salvar Alterações</ActionButton>
          </div>
        </div>
      </Modal>

      {/* ── Modal Delete confirm ────────────────────────────────── */}
      <Modal isOpen={!!confirmarDelete} onClose={() => setConfirmarDelete(null)} title="Excluir Agendamento" size="sm">
        <p className="text-sm text-gray-400 mb-5">
          Tem certeza que deseja excluir este agendamento? Essa ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmarDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
