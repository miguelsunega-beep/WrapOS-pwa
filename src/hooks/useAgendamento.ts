import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import type { Agendamento, StatusAgendamento, BadgeVariant, Cliente } from '../types'

// ── Module-level constants ────────────────────────────────────────
export const todayISO = new Date().toISOString().slice(0, 10)
export const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export const statusConfig: Record<StatusAgendamento, { label: string; variant: BadgeVariant }> = {
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
export interface EditForm {
  clienteId:    string
  veiculoId:    string
  servicoId:    string
  instaladorId: string
  valor:        string
  data:         string
  horario:      string
  dataSaida:    string
  mesmoDia:     boolean
}

export interface AgForm {
  clienteSearch: string
  clienteId:     string
  veiculoId:     string
  servicoId:     string
  instaladorId:  string
  valor:         string
  data:          string
  horario:       string
  dataSaida:     string
  mesmoDia:      boolean
}

export interface DiaSemana {
  date:  Date
  iso:   string
  count: number
}

// ── Hook ──────────────────────────────────────────────────────────
export function useAgendamento() {
  const navigate = useNavigate()
  const {
    agendamentos, clientes, veiculos, servicos, instaladores,
    adicionarAgendamento, editarAgendamento, deletarAgendamento, adicionarOS,
  } = useApp()

  // ── Week navigation ───────────────────────────────────────────
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [diaSelecionado, setDiaSelecionado] = useState(todayISO)

  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + semanaOffset * 7)
  const weekStart = startOfWeek(baseDate)

  const diasDaSemana: DiaSemana[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    const iso = toISO(date)
    return { date, iso, count: agendamentos.filter(a => a.data === iso).length }
  })

  const weekLabel = (() => {
    const s = weekStart
    const e = diasDaSemana[6].date
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} – ${e.getDate()} ${e.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())}`
    }
    const ms = s.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    const me = e.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')
    return `${s.getDate()} ${ms} – ${e.getDate()} ${me}`
  })()

  const diaSelecionadoLabel = new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  }).replace(/^./, c => c.toUpperCase())

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
  const getServicoNome = (id: string) => servicos.find(s => s.id === id)?.nome ?? '—'
  const getInstalador  = (id: string) => instaladores.find(i => i.id === id)?.nome ?? '—'

  const capacidadeDia = (count: number): { cor: string; label: string } | null => {
    if (count === 0) return null
    if (count <= 3)  return { cor: '#34d399', label: 'Livre'   }
    if (count <= 5)  return { cor: '#ff6b35', label: 'Ocupado' }
    return                   { cor: '#e8304a', label: 'Lotado'  }
  }

  // ── Details modal ─────────────────────────────────────────────
  const [detalhes, setDetalhes] = useState<Agendamento | null>(null)

  const detCliente    = detalhes ? clientes.find(c => c.id === detalhes.clienteId)        : null
  const detVeiculo    = detalhes ? veiculos.find(v => v.id === detalhes.veiculoId)        : null
  const detServico    = detalhes ? servicos.find(s => s.id === detalhes.servicoId)        : null
  const detInstalador = detalhes ? instaladores.find(i => i.id === detalhes.instaladorId) : null
  const detValorStr   = detalhes?.valor != null ? fmtCurrency(detalhes.valor) : '—'
  const detDataStr    = detalhes ? new Date(detalhes.data + 'T12:00:00').toLocaleDateString('pt-BR') : ''

  // ── Status actions ────────────────────────────────────────────
  const handleStatus = (ag: Agendamento, status: StatusAgendamento) => {
    editarAgendamento(ag.id, { status })
    if (detalhes?.id === ag.id) setDetalhes({ ...ag, status })
    toast.success(`Status: ${statusConfig[status].label}`)
  }

  // ── Delete confirm ────────────────────────────────────────────
  const [confirmarDelete, setConfirmarDelete] = useState<string | null>(null)

  const handleDelete = () => {
    if (!confirmarDelete) return
    deletarAgendamento(confirmarDelete)
    setConfirmarDelete(null)
    if (detalhes?.id === confirmarDelete) setDetalhes(null)
    toast.success('Agendamento excluído.')
  }

  // ── Edit modal ────────────────────────────────────────────────
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    clienteId: '', veiculoId: '', servicoId: '', instaladorId: '',
    valor: '', data: todayISO, horario: '09:00',
    dataSaida: todayISO, mesmoDia: true,
  })

  const abrirEditar = (ag: Agendamento) => {
    setEditandoId(ag.id)
    setEditForm({
      clienteId:    ag.clienteId,
      veiculoId:    ag.veiculoId,
      servicoId:    ag.servicoId,
      instaladorId: ag.instaladorId,
      valor:        ag.valor != null ? String(ag.valor) : '',
      data:         ag.data,
      horario:      ag.horario,
      dataSaida:    ag.data,
      mesmoDia:     true,
    })
  }

  const handleSalvarEdicao = (): boolean => {
    if (!editandoId) return false
    if (!editForm.data)    { toast.error('Informe a data.');    return false }
    if (!editForm.horario) { toast.error('Informe o horário.'); return false }
    const conflito = agendamentos.some(a =>
      a.id !== editandoId &&
      a.data === editForm.data &&
      a.horario === editForm.horario &&
      (a.status === 'agendado' || a.status === 'confirmado')
    )
    if (conflito) { toast.error('Conflito: já existe agendamento neste horário.'); return false }
    const payload = { ...editForm, duracao: 0, valor: parseFloat(editForm.valor) || 0 }
    editarAgendamento(editandoId, payload)
    if (detalhes?.id === editandoId) setDetalhes(prev => prev ? { ...prev, ...payload } : null)
    toast.success('Agendamento atualizado!')
    return true
  }

  const editVeiculosCliente = veiculos.filter(v => v.clienteId === editForm.clienteId)
  const instaladoresAtivos  = instaladores.filter(i => i.ativo)

  // ── Novo agendamento form ─────────────────────────────────────
  const makeInitForm = (): AgForm => ({
    clienteSearch: '',
    clienteId:     '',
    veiculoId:     '',
    servicoId:     servicos[0]?.id ?? '',
    instaladorId:  instaladores.find(i => i.ativo)?.id ?? '',
    valor:         '',
    data:          diaSelecionado,
    horario:       '09:00',
    dataSaida:     diaSelecionado,
    mesmoDia:      true,
  })

  const [form, setForm] = useState<AgForm>(makeInitForm)

  const resetNovoForm = () => setForm(makeInitForm())

  const clientesFiltrados = form.clienteSearch.length > 0
    ? clientes.filter(c => c.nome.toLowerCase().includes(form.clienteSearch.toLowerCase()))
    : []

  const veiculosCliente = veiculos.filter(v => v.clienteId === form.clienteId)

  const selecionarCliente = (c: Cliente) => {
    const primeiro = veiculos.find(v => v.clienteId === c.id)
    setForm(p => ({ ...p, clienteSearch: c.nome, clienteId: c.id, veiculoId: primeiro?.id ?? '' }))
  }

  const handleSalvar = (): boolean => {
    if (!form.clienteId) { toast.error('Selecione um cliente.'); return false }
    if (!form.data)      { toast.error('Informe a data.');        return false }
    if (!form.horario)   { toast.error('Informe o horário.');     return false }
    const conflito = agendamentos.some(a =>
      a.data === form.data &&
      a.horario === form.horario &&
      (a.status === 'agendado' || a.status === 'confirmado')
    )
    if (conflito) { toast.error('Conflito: já existe agendamento neste horário.'); return false }
    adicionarAgendamento({
      clienteId:    form.clienteId,
      veiculoId:    form.veiculoId,
      servicoId:    form.servicoId,
      instaladorId: form.instaladorId,
      box:          1,
      data:         form.data,
      horario:      form.horario,
      duracao:      0,
      valor:        parseFloat(form.valor) || 0,
      status:       'agendado',
    })
    toast.success('Agendamento criado com sucesso!')
    return true
  }

  // ── Converter em OS ───────────────────────────────────────────
  const handleConverterOS = (ag: Agendamento) => {
    const servico = servicos.find(s => s.id === ag.servicoId)
    adicionarOS({
      clienteId:      ag.clienteId,
      veiculoId:      ag.veiculoId,
      servicos:       servico ? [{ servicoId: ag.servicoId, nome: servico.nome, preco: servico.preco ?? 0 }] : [],
      valorTotal:     ag.valor ?? servico?.preco ?? 0,
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

  return {
    // context data exposed for JSX selects
    clientes, veiculos, servicos, instaladores,

    // week navigation
    diaSelecionado, setDiaSelecionado,
    diasDaSemana, weekLabel, diaSelecionadoLabel,
    navWeek, goToday,

    // day data
    agsDia,

    // lookup helpers + business rules
    getNomeCliente, getTelCliente, getVeiculoLabel, getVeiculoSub,
    getServicoNome, getInstalador, capacidadeDia,

    // status
    handleStatus,

    // details modal
    detalhes, setDetalhes,
    detCliente, detVeiculo, detServico, detInstalador,
    detValorStr, detDataStr,

    // delete
    confirmarDelete, setConfirmarDelete, handleDelete,

    // edit form
    editForm, setEditForm, abrirEditar, handleSalvarEdicao,
    editVeiculosCliente, instaladoresAtivos,

    // new form
    form, setForm, resetNovoForm,
    clientesFiltrados, veiculosCliente, selecionarCliente, handleSalvar,

    // converter OS
    handleConverterOS,
  }
}
