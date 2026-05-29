import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Calendar, Plus, ChevronLeft, ChevronRight,
  Check, CheckCheck, Trash2, Pencil, FilePlus2,
  User, Wrench, CalendarClock,
} from 'lucide-react'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ActionButton } from '../components/ActionButton'
import { Modal } from '../components/Modal'
import { useApp } from '../context/AppContext'
import type { Agendamento, StatusAgendamento, BadgeVariant } from '../types'

// ── Module-level constants ────────────────────────────────────────
const todayISO = new Date().toISOString().slice(0, 10)
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const DURACOES = [1, 2, 3, 4, 6, 8, 12, 16, 24]

const statusConfig: Record<StatusAgendamento, { label: string; variant: BadgeVariant }> = {
  agendado:   { label: 'Agendado',   variant: 'info'    },
  confirmado: { label: 'Confirmado', variant: 'success' },
  concluido:  { label: 'Concluído',  variant: 'default' },
  cancelado:  { label: 'Cancelado',  variant: 'danger'  },
}

const startOfWeek = (d: Date): Date => {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(d)
  start.setDate(d.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

const toISO = (d: Date) => d.toISOString().slice(0, 10)

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

// ── Types ─────────────────────────────────────────────────────────
interface EditForm {
  clienteId:    string
  veiculoId:    string
  servicoId:    string
  instaladorId: string
  box:          number
  data:         string
  horario:      string
  duracao:      number
}

interface AgForm {
  clienteSearch: string
  clienteId: string
  veiculoId: string
  servicoId: string
  instaladorId: string
  box: number
  data: string
  horario: string
  duracao: number
}

// ── Component ─────────────────────────────────────────────────────
export function Agendamento() {
  const navigate = useNavigate()
  const {
    agendamentos, clientes, veiculos, servicos, instaladores, configuracoes,
    adicionarAgendamento, editarAgendamento, deletarAgendamento, adicionarOS,
  } = useApp()

  const boxes = Array.from({ length: configuracoes.numeroBoxes }, (_, i) => i + 1)

  // ── Week navigation ───────────────────────────────────────────
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [diaSelecionado, setDiaSelecionado] = useState(todayISO)

  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + semanaOffset * 7)
  const weekStart = startOfWeek(baseDate)

  const diasDaSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const weekLabel = (() => {
    const s = weekStart
    const e = diasDaSemana[6]
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} – ${e.getDate()} ${e.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())}`
    }
    const ms = s.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    const me = e.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')
    return `${s.getDate()} ${ms} – ${e.getDate()} ${me}`
  })()

  const navWeek = (dir: -1 | 1) => {
    const newOffset = semanaOffset + dir
    setSemanaOffset(newOffset)
    const base = new Date()
    base.setDate(base.getDate() + newOffset * 7)
    setDiaSelecionado(toISO(startOfWeek(base)))
  }

  const goToday = () => {
    setSemanaOffset(0)
    setDiaSelecionado(todayISO)
  }

  // ── Day's schedule ────────────────────────────────────────────
  const agsDia = [...agendamentos]
    .filter(a => a.data === diaSelecionado)
    .sort((a, b) => a.horario.localeCompare(b.horario))

  // ── Lookup helpers ────────────────────────────────────────────
  const getNomeCliente  = (id: string) => clientes.find(c => c.id === id)?.nome ?? '—'
  const getTelCliente   = (id: string) => clientes.find(c => c.id === id)?.telefone ?? ''
  const getVeiculoLabel = (id: string) => {
    const v = veiculos.find(x => x.id === id)
    return v ? `${v.marca} ${v.modelo} ${v.ano}` : '—'
  }
  const getVeiculoSub = (id: string) => {
    const v = veiculos.find(x => x.id === id)
    return v ? `${v.ano} · ${v.placa}` : ''
  }
  const getServicoNome  = (id: string) => servicos.find(s => s.id === id)?.nome ?? '—'
  const getInstalador   = (id: string) => instaladores.find(i => i.id === id)?.nome ?? '—'

  // ── Capacidade do dia (regra fixa) ────────────────────────────
  const capacidadeDia = (count: number) => {
    if (count === 0) return null
    if (count <= 3)  return { cor: '#34d399', label: 'Livre'   }
    if (count <= 5)  return { cor: '#ff6b35', label: 'Ocupado' }
    return            { cor: '#e8304a', label: 'Lotado'  }
  }

  // ── Status actions ────────────────────────────────────────────
  const handleStatus = (ag: Agendamento, status: StatusAgendamento) => {
    editarAgendamento(ag.id, { status })
    if (detalhes?.id === ag.id) setDetalhes({ ...ag, status })
    toast.success(`Status: ${statusConfig[status].label}`)
  }

  // ── Details modal ─────────────────────────────────────────────
  const [detalhes, setDetalhes] = useState<Agendamento | null>(null)

  // ── Delete confirm ────────────────────────────────────────────
  const [confirmarDelete, setConfirmarDelete] = useState<string | null>(null)
  const handleDelete = () => {
    if (!confirmarDelete) return
    deletarAgendamento(confirmarDelete)
    setConfirmarDelete(null)
    if (detalhes?.id === confirmarDelete) setDetalhes(null)
    toast.success('Agendamento excluído.')
  }

  // ── Edit modal ───────────────────────────────────────────────
  const [editOpen,    setEditOpen]    = useState(false)
  const [editandoId,  setEditandoId]  = useState<string | null>(null)
  const [editForm,    setEditForm]    = useState<EditForm>({
    clienteId: '', veiculoId: '', servicoId: '', instaladorId: '',
    box: 1, data: todayISO, horario: '09:00', duracao: 3,
  })

  const abrirEditar = (ag: Agendamento) => {
    setEditandoId(ag.id)
    setEditForm({
      clienteId:    ag.clienteId,
      veiculoId:    ag.veiculoId,
      servicoId:    ag.servicoId,
      instaladorId: ag.instaladorId,
      box:          ag.box,
      data:         ag.data,
      horario:      ag.horario,
      duracao:      ag.duracao,
    })
    setEditOpen(true)
  }

  const handleSalvarEdicao = () => {
    if (!editandoId) return
    if (!editForm.data)    { toast.error('Informe a data.'); return }
    if (!editForm.horario) { toast.error('Informe o horário.'); return }
    const conflito = agendamentos.some(a =>
      a.id !== editandoId &&
      a.box === editForm.box &&
      a.data === editForm.data &&
      a.horario === editForm.horario &&
      (a.status === 'agendado' || a.status === 'confirmado')
    )
    if (conflito) { toast.error(`Conflito: Box ${editForm.box} já está ocupado neste horário.`); return }
    editarAgendamento(editandoId, editForm)
    if (detalhes?.id === editandoId) setDetalhes(prev => prev ? { ...prev, ...editForm } : null)
    toast.success('Agendamento atualizado!')
    setEditOpen(false)
  }

  // ── Converter em OS ──────────────────────────────────────────
  const handleConverterOS = (ag: Agendamento) => {
    const servico = servicos.find(s => s.id === ag.servicoId)
    adicionarOS({
      clienteId:      ag.clienteId,
      veiculoId:      ag.veiculoId,
      servicos:       servico ? [{ servicoId: ag.servicoId, nome: servico.nome, preco: servico.preco }] : [],
      valorTotal:     servico?.preco ?? 0,
      formaPagamento: 'A definir',
      instaladorId:   ag.instaladorId,
      box:            ag.box,
      comissao:       0,
      observacoes:    '',
      status:         'em_andamento',
      agendamentoId:  ag.id,
    })
    editarAgendamento(ag.id, { status: 'concluido' })
    setDetalhes(null)
    toast.success('OS criada com sucesso!')
    navigate('/ordens')
  }

  // ── Novo agendamento form ─────────────────────────────────────
  const [novoOpen, setNovoOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const makeInitForm = (): AgForm => ({
    clienteSearch: '',
    clienteId: '',
    veiculoId: '',
    servicoId: servicos[0]?.id ?? '',
    instaladorId: instaladores.find(i => i.ativo)?.id ?? '',
    box: 1,
    data: diaSelecionado,
    horario: '09:00',
    duracao: 3,
  })

  const [form, setForm] = useState<AgForm>(makeInitForm)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const clientesFiltrados = form.clienteSearch.length > 0
    ? clientes.filter(c => c.nome.toLowerCase().includes(form.clienteSearch.toLowerCase()))
    : []

  const veiculosCliente = veiculos.filter(v => v.clienteId === form.clienteId)
  const instaladoresAtivos = instaladores.filter(i => i.ativo)

  const selecionarCliente = (c: typeof clientes[number]) => {
    const primeiro = veiculos.find(v => v.clienteId === c.id)
    setForm(p => ({ ...p, clienteSearch: c.nome, clienteId: c.id, veiculoId: primeiro?.id ?? '' }))
    setDropdownOpen(false)
  }

  const handleSalvar = () => {
    if (!form.clienteId) { toast.error('Selecione um cliente.'); return }
    if (!form.data)      { toast.error('Informe a data.'); return }
    if (!form.horario)   { toast.error('Informe o horário.'); return }
    const conflito = agendamentos.some(a =>
      a.box === form.box &&
      a.data === form.data &&
      a.horario === form.horario &&
      (a.status === 'agendado' || a.status === 'confirmado')
    )
    if (conflito) { toast.error(`Conflito: Box ${form.box} já está ocupado neste horário.`); return }
    adicionarAgendamento({
      clienteId:    form.clienteId,
      veiculoId:    form.veiculoId,
      servicoId:    form.servicoId,
      instaladorId: form.instaladorId,
      box:          form.box,
      data:         form.data,
      horario:      form.horario,
      duracao:      form.duracao,
      status:       'agendado',
    })
    toast.success('Agendamento criado com sucesso!')
    setNovoOpen(false)
  }

  const abrirNovo = () => {
    setForm(makeInitForm())
    setNovoOpen(true)
  }

  const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5'

  // ── Details modal computed ────────────────────────────────────
  const detCliente    = detalhes ? clientes.find(c => c.id === detalhes.clienteId)    : null
  const detVeiculo    = detalhes ? veiculos.find(v => v.id === detalhes.veiculoId)    : null
  const detServico    = detalhes ? servicos.find(s => s.id === detalhes.servicoId)    : null
  const detInstalador = detalhes ? instaladores.find(i => i.id === detalhes.instaladorId) : null

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ui-text">Agendamento</h1>
          <p className="text-gray-500 text-xs mt-0.5">Agenda semanal</p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus size={15} />
          Novo Agendamento
        </Button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navWeek(-1)}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-gray-500 hover:text-ui-text transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-ui-text min-w-[220px] text-center">{weekLabel}</span>
          <button
            onClick={() => navWeek(1)}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-gray-500 hover:text-ui-text transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-surface-700 hover:text-ui-text border border-ui-border transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Week cards */}
      <div className="grid grid-cols-7 gap-2">
        {diasDaSemana.map((d, i) => {
          const iso = toISO(d)
          const isToday = iso === todayISO
          const isSel = iso === diaSelecionado
          const count = agendamentos.filter(a => a.data === iso).length
          return (
            <button
              key={iso}
              onClick={() => setDiaSelecionado(iso)}
              className={`text-center p-3 rounded-xl border transition-all ${
                isSel
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-ui-border bg-surface-800 hover:border-accent/25 hover:bg-surface-700'
              }`}
            >
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">{DIAS_SEMANA[i]}</p>
              <p className={`text-xl font-bold mt-1 ${isToday ? 'text-accent' : isSel ? 'text-ui-text' : 'text-gray-400'}`}>
                {d.getDate()}
              </p>
              {(() => {
                const cap = capacidadeDia(count)
                return cap ? (
                  <div className="flex items-center justify-center gap-1 mt-1.5" title={cap.label}>
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: cap.cor }}
                    />
                    <span className="text-[10px] text-gray-500">{count}</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-700 mt-1.5">—</p>
                )
              })()}
            </button>
          )
        })}
      </div>

      {/* Schedule list */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-ui-border flex items-center gap-2">
          <Calendar size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-ui-text">
            Agenda —{' '}
            {new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long',
            }).replace(/^./, c => c.toUpperCase())}
          </h2>
          <span className="ml-auto text-xs text-gray-600">
            {agsDia.length} agendamento{agsDia.length !== 1 ? 's' : ''}
          </span>
        </div>

        {agsDia.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-600 text-sm">
            Nenhum agendamento para este dia.
          </div>
        ) : (
          <div className="divide-y divide-ui-border">
            {agsDia.map(ag => (
              <div
                key={ag.id}
                onClick={() => setDetalhes(ag)}
                className="group px-5 py-4 flex items-center gap-4 hover:bg-surface-600/40 transition-colors cursor-pointer"
              >
                <div className="w-14 text-center shrink-0">
                  <p className="text-sm font-bold text-accent">{ag.horario}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{ag.duracao}h</p>
                </div>
                <div className="w-px h-10 bg-ui-border shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ui-text">{getNomeCliente(ag.clienteId)}</p>
                  <p className="text-xs text-gray-500">{getVeiculoLabel(ag.veiculoId)}</p>
                </div>
                <div className="min-w-0 hidden lg:block">
                  <p className="text-xs text-gray-400 truncate max-w-[160px]">{getServicoNome(ag.servicoId)}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{getInstalador(ag.instaladorId)}</p>
                </div>
                <Badge label={`Box ${ag.box}`} variant="info" />
                <Badge label={statusConfig[ag.status].label} variant={statusConfig[ag.status].variant} />
                <div
                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  {ag.status === 'agendado' && (
                    <button
                      onClick={() => handleStatus(ag, 'confirmado')}
                      title="Confirmar"
                      className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-colors"
                    >
                      <Check size={13} />
                    </button>
                  )}
                  {(ag.status === 'agendado' || ag.status === 'confirmado') && (
                    <button
                      onClick={() => handleStatus(ag, 'concluido')}
                      title="Concluir"
                      className="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors"
                    >
                      <CheckCheck size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmarDelete(ag.id)}
                    title="Excluir"
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Modal Detalhes ──────────────────────────────────────── */}
      <Modal isOpen={!!detalhes} onClose={() => setDetalhes(null)} title="Detalhes do Agendamento" size="lg">
        {detalhes && (
          <div className="space-y-4">
            {/* Status + actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                label={statusConfig[detalhes.status].label}
                variant={statusConfig[detalhes.status].variant}
              />
              {detalhes.status === 'agendado' && (
                <button
                  onClick={() => handleStatus(detalhes, 'confirmado')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  ✓ Confirmar
                </button>
              )}
              {(detalhes.status === 'agendado' || detalhes.status === 'confirmado') && (
                <button
                  onClick={() => handleStatus(detalhes, 'concluido')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                >
                  ✓✓ Concluir
                </button>
              )}
              {detalhes.status !== 'cancelado' && detalhes.status !== 'concluido' && (
                <button
                  onClick={() => handleStatus(detalhes, 'cancelado')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Info grid 2x2 */}
            <div className="grid grid-cols-2 gap-3">
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
                <p className="text-xs text-gray-500 mt-0.5">
                  {detServico ? `${fmtCurrency(detServico.preco)} · ${detServico.tempEstimado}h estimadas` : ''}
                </p>
              </div>
              <div className="bg-surface-700 rounded-xl p-3.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Instalador</p>
                <p className="text-sm font-semibold text-ui-text">{detInstalador?.nome ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {detInstalador?.especialidades.join(', ') ?? ''}
                </p>
              </div>
            </div>

            {/* Data/Horário/Duração/Box row */}
            <div className="grid grid-cols-4 gap-3">
              {([
                { label: 'Data',    value: new Date(detalhes.data + 'T12:00:00').toLocaleDateString('pt-BR') },
                { label: 'Horário', value: detalhes.horario },
                { label: 'Duração', value: `${detalhes.duracao}h` },
                { label: 'Box',     value: `Box ${detalhes.box}` },
              ] as const).map(item => (
                <div key={item.label} className="bg-surface-700 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-bold text-ui-text mt-1.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-1 border-t border-ui-border">
              <button
                onClick={() => setConfirmarDelete(detalhes.id)}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={13} />
                Excluir agendamento
              </button>
              <div className="flex items-center gap-2">
                {detalhes.status === 'confirmado' && (
                  <button
                    onClick={() => handleConverterOS(detalhes)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                  >
                    <FilePlus2 size={13} />
                    Converter em OS
                  </button>
                )}
                <button
                  onClick={() => { setDetalhes(null); abrirEditar(detalhes) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-600 text-gray-400 border border-ui-border hover:text-ui-text hover:bg-surface-500 transition-colors"
                >
                  <Pencil size={13} />
                  Editar
                </button>
                <Button variant="secondary" onClick={() => setDetalhes(null)}>Fechar</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Novo Agendamento ──────────────────────────────── */}
      <Modal isOpen={novoOpen} onClose={() => setNovoOpen(false)} title="Novo Agendamento" size="lg">
        <div className="space-y-5">
          {/* ── Seção 1: Quem ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <User size={12} /> Cliente &amp; Veículo
            </p>

            {/* Cliente autocomplete */}
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
                        onMouseDown={() => selecionarCliente(c)}
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
          </section>

          {/* ── Seção 2: O quê ── */}
          <section className="space-y-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <Wrench size={12} /> Serviço &amp; Responsável
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Serviço</label>
                <select
                  value={form.servicoId}
                  onChange={e => setForm(p => ({ ...p, servicoId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Nenhum</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {fmtCurrency(s.preco)}
                    </option>
                  ))}
                </select>
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
              <CalendarClock size={12} /> Data, Box &amp; Duração
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Box</label>
                <select
                  value={form.box}
                  onChange={e => setForm(p => ({ ...p, box: Number(e.target.value) }))}
                  className={inputCls}
                >
                  {boxes.map(b => <option key={b} value={b}>Box {b}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Data <span className="text-accent">*</span></label>
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                  className={inputCls}
                />
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
            <div>
              <label className={labelCls}>Duração estimada</label>
              <select
                value={form.duracao}
                onChange={e => setForm(p => ({ ...p, duracao: Number(e.target.value) }))}
                className={inputCls}
              >
                {DURACOES.map(d => <option key={d} value={d}>{d}h</option>)}
              </select>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <ActionButton onClick={handleSalvar}>Criar Agendamento</ActionButton>
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
                {veiculos.filter(v => v.clienteId === editForm.clienteId).map(v => (
                  <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano} — {v.placa}</option>
                ))}
              </select>
            </div>
          )}

          {/* Serviço + Instalador */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Serviço</label>
              <select
                value={editForm.servicoId}
                onChange={e => setEditForm(p => ({ ...p, servicoId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Nenhum</option>
                {servicos.map(s => (
                  <option key={s.id} value={s.id}>{s.nome} — {fmtCurrency(s.preco)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Instalador</label>
              <select
                value={editForm.instaladorId}
                onChange={e => setEditForm(p => ({ ...p, instaladorId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Nenhum</option>
                {instaladores.filter(i => i.ativo).map(i => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Box + Data + Horário */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Box</label>
              <select
                value={editForm.box}
                onChange={e => setEditForm(p => ({ ...p, box: Number(e.target.value) }))}
                className={inputCls}
              >
                {boxes.map(b => <option key={b} value={b}>Box {b}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Data <span className="text-accent">*</span></label>
              <input
                type="date"
                value={editForm.data}
                onChange={e => setEditForm(p => ({ ...p, data: e.target.value }))}
                className={inputCls}
              />
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

          {/* Duração */}
          <div>
            <label className={labelCls}>Duração estimada</label>
            <select
              value={editForm.duracao}
              onChange={e => setEditForm(p => ({ ...p, duracao: Number(e.target.value) }))}
              className={inputCls}
            >
              {DURACOES.map(d => <option key={d} value={d}>{d}h</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <ActionButton onClick={handleSalvarEdicao}>Salvar Alterações</ActionButton>
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
