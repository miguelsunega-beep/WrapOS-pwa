import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { getOSVinculada, getStatusEfetivo, type StatusEfetivoAgendamento } from '../lib/agendamentoStatus'
import type { Agendamento, BadgeVariant, Cliente } from '../types'

// ── Module-level constants ────────────────────────────────────────
export const todayISO = new Date().toISOString().slice(0, 10)
export const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** Status "espelhado" exibido na UI — ver src/lib/agendamentoStatus.ts. */
export const statusEfetivoConfig: Record<StatusEfetivoAgendamento, { label: string; variant: BadgeVariant }> = {
  agendado:     { label: 'Agendado',      variant: 'info'    },
  em_andamento: { label: 'Em andamento',  variant: 'warning' },
  concluido:    { label: 'Concluído',     variant: 'success' },
  os_cancelada: { label: 'OS cancelada',  variant: 'danger'  },
}

// ── Calendar grid config ───────────────────────────────────────────
export const HOUR_START = 8
export const HOUR_END   = 19  // exclusivo — grade visível vai até 18:00
export const PX_PER_HOUR = 70

export interface TipoServicoConfig {
  key:   string
  label: string
  cor:   string
}

export const TIPOS_SERVICO: TipoServicoConfig[] = [
  { key: 'envelopamento', label: 'Envelopamento', cor: 'var(--wrap-accent)' },
  { key: 'ppf',           label: 'PPF',           cor: '#3b82f6' },
  { key: 'polimento',     label: 'Polimento',     cor: '#a855f7' },
  { key: 'pelicula',      label: 'Película',      cor: '#f59e0b' },
  { key: 'detalhamento',  label: 'Detalhamento',  cor: '#22c55e' },
]

function inferTipoServico(nomeServico: string): TipoServicoConfig {
  const n = nomeServico.toLowerCase()
  if (n.includes('ppf')) return TIPOS_SERVICO[1]
  if (n.includes('poli')) return TIPOS_SERVICO[2]
  if (n.includes('insulfilm') || n.includes('pelic') || n.includes('película')) return TIPOS_SERVICO[3]
  if (n.includes('higien') || n.includes('detalh')) return TIPOS_SERVICO[4]
  return TIPOS_SERVICO[0]
}

export const STATUS_FILTROS: { key: StatusEfetivoAgendamento; label: string; cor: string }[] = [
  { key: 'agendado',     label: 'Agendado',     cor: '#9ca3af' },
  { key: 'em_andamento', label: 'Em andamento', cor: '#ff6b35' },
  { key: 'concluido',    label: 'Concluído',    cor: '#34d399' },
  { key: 'os_cancelada', label: 'OS cancelada', cor: '#6b7280' },
]

export interface AppointmentVM {
  id:           string
  ag:           Agendamento
  modelo:       string
  cliente:      string
  placa:        string
  servicoNome:  string
  tipo:         TipoServicoConfig
  status:       StatusEfetivoAgendamento
  iso:          string
  inicioMin:    number
  duracaoMin:   number
  horarioLabel: string
  dataLabel:    string
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
    agendamentos, clientes, veiculos, servicos, instaladores, ordens,
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

  /** Navega a semana exibida até conter a data informada (usado pelo mini calendário). */
  const irParaData = (iso: string) => {
    const target = new Date(iso + 'T12:00:00')
    const diffWeeks = Math.round(
      (startOfWeek(target).getTime() - startOfWeek(new Date()).getTime()) / (7 * 86_400_000)
    )
    setSemanaOffset(diffWeeks)
    setDiaSelecionado(iso)
  }

  // ── Calendar grid view (semana/dia em grade horária) ───────────
  const [view, setView] = useState<'dia' | 'semana' | 'mes'>('semana')

  const [filtroTipos, setFiltroTipos] = useState<Record<string, boolean>>(
    () => Object.fromEntries(TIPOS_SERVICO.map(t => [t.key, true]))
  )
  const toggleTipo = (key: string) => setFiltroTipos(p => ({ ...p, [key]: !p[key] }))

  // "OS cancelada" fica oculta por padrão — é um caso raro e não deve poluir a agenda.
  const [filtroStatus, setFiltroStatus] = useState<Record<string, boolean>>(
    () => Object.fromEntries(STATUS_FILTROS.map(s => [s.key, s.key !== 'os_cancelada']))
  )
  const toggleStatus = (key: string) => setFiltroStatus(p => ({ ...p, [key]: !p[key] }))

  const buildAppointment = (ag: Agendamento): AppointmentVM => {
    const cliente = clientes.find(c => c.id === ag.clienteId)
    const veic    = veiculos.find(v => v.id === ag.veiculoId)
    const serv    = servicos.find(s => s.id === ag.servicoId)
    const tipo    = inferTipoServico(serv?.nome ?? '')

    const [h, m]      = ag.horario.split(':').map(Number)
    const inicioMin   = h * 60 + m
    const duracaoHoras = Math.max(ag.duracao, 1)
    const duracaoMin  = duracaoHoras * 60
    const fimMin      = inicioMin + duracaoMin
    const fmtHM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
    // Serviços que ultrapassam a meia-noite mostram a duração em horas em vez de um horário de término ambíguo.
    const horarioLabel = fimMin < 1440
      ? `${ag.horario} – ${fmtHM(fimMin)}`
      : `${ag.horario} · ${duracaoHoras}h`

    // Mesma convenção de mês abreviado (minúsculo, sem ponto) usada em weekLabel.
    const dataDate = new Date(ag.data + 'T12:00:00')
    const mesAbrev = dataDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    const dataLabel = `${String(dataDate.getDate()).padStart(2, '0')} ${mesAbrev}`

    return {
      id: ag.id, ag,
      modelo:      veic ? `${veic.marca} ${veic.modelo}` : 'Veículo não informado',
      cliente:     cliente?.nome ?? '—',
      placa:       veic?.placa ?? '',
      servicoNome: serv?.nome ?? 'Serviço não definido',
      tipo, status: getStatusEfetivo(ag, ordens), iso: ag.data,
      inicioMin, duracaoMin, horarioLabel, dataLabel,
    }
  }

  const getAppointmentsForDate = (iso: string): AppointmentVM[] =>
    agendamentos
      .filter(a => a.data === iso)
      .map(buildAppointment)
      .filter(vm => filtroStatus[vm.status] && filtroTipos[vm.tipo.key])

  const appointmentsByDia: Record<string, AppointmentVM[]> = {}
  diasDaSemana.forEach(({ iso }) => {
    appointmentsByDia[iso] = getAppointmentsForDate(iso)
  })

  // ── Próximo agendamento (card de destaque) ─────────────────────
  // Só considera quem ainda não foi aprovado (sem OS vinculada) — uma vez
  // aprovado, o "próximo" passa a ser acompanhado pela OS, não mais aqui.
  const proximoAgendamento = (() => {
    const nowHM = new Date().toTimeString().slice(0, 5)
    const candidato = [...agendamentos]
      .filter(a => getStatusEfetivo(a, ordens) === 'agendado')
      .filter(a => a.data > todayISO || (a.data === todayISO && a.horario >= nowHM))
      .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))[0]
    return candidato ? buildAppointment(candidato) : null
  })()

  // ── Lookup helpers ────────────────────────────────────────────
  const getTelCliente = (id: string) => clientes.find(c => c.id === id)?.telefone ?? ''
  const getVeiculoSub = (id: string) => {
    const v = veiculos.find(x => x.id === id)
    return v ? `${v.ano} · ${v.placa}` : ''
  }

  // ── Details modal ─────────────────────────────────────────────
  const [detalhes, setDetalhes] = useState<Agendamento | null>(null)

  const detCliente    = detalhes ? clientes.find(c => c.id === detalhes.clienteId)        : null
  const detVeiculo    = detalhes ? veiculos.find(v => v.id === detalhes.veiculoId)        : null
  const detServico    = detalhes ? servicos.find(s => s.id === detalhes.servicoId)        : null
  const detInstalador = detalhes ? instaladores.find(i => i.id === detalhes.instaladorId) : null
  const detValorStr   = detalhes?.valor != null ? fmtCurrency(detalhes.valor) : '—'
  const detDataStr    = detalhes ? new Date(detalhes.data + 'T12:00:00').toLocaleDateString('pt-BR') : ''
  const detStatusEfetivo = detalhes ? getStatusEfetivo(detalhes, ordens) : null
  const detOSVinculada   = detalhes ? getOSVinculada(detalhes.id, ordens) : null

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
      getStatusEfetivo(a, ordens) !== 'concluido' &&
      getStatusEfetivo(a, ordens) !== 'os_cancelada'
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
      getStatusEfetivo(a, ordens) !== 'concluido' &&
      getStatusEfetivo(a, ordens) !== 'os_cancelada'
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

  // ── Aprovar entrada → cria OS vinculada ────────────────────────
  // O agendamento não tem mais status próprio a partir daqui: ele passa a
  // espelhar o status da OS (ver getStatusEfetivo). Por isso, em vez de editar
  // o agendamento, só criamos a OS com agendamentoId apontando para ele.
  const [aprovandoId, setAprovandoId] = useState<string | null>(null)

  const handleAprovarEntrada = (ag: Agendamento) => {
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
    setDetalhes(null)
    setAprovandoId(ag.id)
    toast.success('Entrada aprovada — OS criada!')
  }

  // adicionarOS só retorna o número sequencial da OS, não o id gerado — então
  // esperamos a OS aparecer em `ordens` (via agendamentoId) para then navegar
  // já abrindo o detalhe dela, sem duplicar a lógica de criação de useOrdemServico.
  useEffect(() => {
    if (!aprovandoId) return
    const novaOS = getOSVinculada(aprovandoId, ordens)
    if (novaOS) {
      setAprovandoId(null)
      navigate('/ordens', { state: { openOSId: novaOS.id } })
    }
  }, [aprovandoId, ordens, navigate])

  const handleVerOS = (ag: Agendamento) => {
    const os = getOSVinculada(ag.id, ordens)
    setDetalhes(null)
    if (os) navigate('/ordens', { state: { openOSId: os.id } })
  }

  // ── Reagendar (edita data/horário do mesmo registro) ───────────
  const [reagendarId, setReagendarId] = useState<string | null>(null)
  const [reagendarData, setReagendarData] = useState(todayISO)
  const [reagendarHorario, setReagendarHorario] = useState('09:00')

  const abrirReagendar = (ag: Agendamento) => {
    setReagendarId(ag.id)
    setReagendarData(ag.data)
    setReagendarHorario(ag.horario)
  }

  const handleSalvarReagendamento = (): boolean => {
    if (!reagendarId) return false
    if (!reagendarData)    { toast.error('Informe a nova data.');    return false }
    if (!reagendarHorario) { toast.error('Informe o novo horário.'); return false }
    const conflito = agendamentos.some(a =>
      a.id !== reagendarId &&
      a.data === reagendarData &&
      a.horario === reagendarHorario &&
      getStatusEfetivo(a, ordens) !== 'concluido' &&
      getStatusEfetivo(a, ordens) !== 'os_cancelada'
    )
    if (conflito) { toast.error('Conflito: já existe agendamento neste horário.'); return false }
    const atual = agendamentos.find(a => a.id === reagendarId)
    editarAgendamento(reagendarId, {
      data:           reagendarData,
      horario:        reagendarHorario,
      reagendamentos: (atual?.reagendamentos ?? 0) + 1,
    })
    toast.success('Agendamento reagendado!')
    setReagendarId(null)
    return true
  }

  return {
    // context data exposed for JSX selects
    clientes, veiculos, servicos, instaladores,

    // week navigation
    diaSelecionado, setDiaSelecionado,
    diasDaSemana, weekLabel, diaSelecionadoLabel,
    navWeek, goToday, irParaData,

    // calendar grid view
    view, setView,
    filtroTipos, toggleTipo,
    filtroStatus, toggleStatus,
    appointmentsByDia, proximoAgendamento, getAppointmentsForDate,

    // lookup helpers + business rules
    getTelCliente, getVeiculoSub,

    // details modal
    detalhes, setDetalhes,
    detCliente, detVeiculo, detServico, detInstalador,
    detValorStr, detDataStr, detStatusEfetivo, detOSVinculada,

    // delete (= "Cancelar" no novo fluxo — exclusão real, sem soft-delete)
    confirmarDelete, setConfirmarDelete, handleDelete,

    // edit form
    editForm, setEditForm, abrirEditar, handleSalvarEdicao,
    editVeiculosCliente, instaladoresAtivos,

    // new form
    form, setForm, resetNovoForm,
    clientesFiltrados, veiculosCliente, selecionarCliente, handleSalvar,

    // aprovar entrada → OS
    handleAprovarEntrada, handleVerOS,

    // reagendar
    reagendarId, reagendarData, setReagendarData, reagendarHorario, setReagendarHorario,
    abrirReagendar, handleSalvarReagendamento,
  }
}
