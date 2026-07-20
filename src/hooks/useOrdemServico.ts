import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { useDraftState } from './useDraftState'
import { todayLocal } from '../lib/dateUtils'
import type { StatusOS, BadgeVariant, OrdemServico, Agendamento } from '../types'

// ── Constants ──────────────────────────────────────────────────────
export const statusConfig: Record<StatusOS, { label: string; variant: BadgeVariant }> = {
  em_andamento:         { label: 'Em Andamento',      variant: 'warning' },
  aguardando_material:  { label: 'Aguard. Material',  variant: 'info'    },
  aguardando_aprovacao: { label: 'Aguard. Aprovação', variant: 'purple'  },
  concluido:            { label: 'Concluído',         variant: 'success' },
  cancelado:            { label: 'Cancelado',         variant: 'danger'  },
}

const STATUS_ORDER: StatusOS[] = [
  'em_andamento', 'aguardando_material', 'aguardando_aprovacao', 'concluido', 'cancelado',
]

export const FORMAS_PAGAMENTO = [
  'PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Parcelado',
]

export const CORES_VEICULO_OS: { nome: string; hex: string }[] = [
  { nome: 'Preto', hex: '#1a1a1a' }, { nome: 'Branco', hex: '#e5e5e5' },
  { nome: 'Prata', hex: '#c4c8cc' }, { nome: 'Cinza', hex: '#6b7280' },
  { nome: 'Vermelho', hex: '#c0392b' }, { nome: 'Azul', hex: '#2563eb' },
  { nome: 'Verde', hex: '#16a34a' }, { nome: 'Amarelo', hex: '#eab308' },
  { nome: 'Laranja', hex: '#ea580c' }, { nome: 'Marrom', hex: '#78350f' },
  { nome: 'Bege', hex: '#d6c7a1' }, { nome: 'Dourado', hex: '#c8a44d' },
  { nome: 'Vinho', hex: '#7b1e3a' }, { nome: 'Grafite', hex: '#3a3f44' },
]

export const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

// ── Types ──────────────────────────────────────────────────────────
export type FiltroStatus = StatusOS | 'todos' | 'abertos'

export interface ServicoSelecionado { servicoId: string; valor: number }

export interface FormState {
  clienteSearch:     string
  clienteId:         string
  veiculoId:         string
  servicosSel:       ServicoSelecionado[]
  formaPagamento:    string
  instaladorId:      string
  box:               number
  comissaoAtiva:     boolean
  comissaoTipo:      'percentual' | 'fixo'
  comissaoPerc:      number
  comissaoFixo:      number
  observacoes:       string
  dataSaidaPrevista: string
  /** Preenchido automaticamente quando o usuário vincula a OS a um agendamento existente. */
  agendamentoId?:    string
}

const blankForm: FormState = {
  clienteSearch: '',
  clienteId: '',
  veiculoId: '',
  servicosSel: [],
  formaPagamento: 'PIX',
  instaladorId: '',
  box: 1,
  comissaoAtiva: false,
  comissaoTipo: 'percentual',
  comissaoPerc: 12,
  comissaoFixo: 0,
  observacoes: '',
  dataSaidaPrevista: '',
}

// ── Hook ───────────────────────────────────────────────────────────
export function useOrdemServico() {
  const {
    ordens, clientes, veiculos, servicos, instaladores, agendamentos,
    adicionarOSSequencial, deletarOS, cancelarOS,
    adicionarClienteSequencial, adicionarVeiculoSequencial, registrarPagamentoOS,
  } = useApp()
  const location = useLocation()

  // ── Filters ───────────────────────────────────────────────────
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<FiltroStatus>('todos')

  // ── OS aberta no OSModal ────────────────────────────────────────
  const [osAberta, setOsAberta] = useState<OrdemServico | null>(null)

  // Mantém osAberta sincronizada com o estado central (evita snapshot desatualizado
  // após ações como Aprovar/Cancelar/Registrar pagamento feitas dentro do próprio modal).
  useEffect(() => {
    setOsAberta(prev => {
      if (!prev) return prev
      const updated = ordens.find(o => o.id === prev.id)
      return updated ?? prev
    })
  }, [ordens])

  // ── Delete confirm ────────────────────────────────────────────
  const [confirmarDelete, setConfirmarDelete] = useState<string | null>(null)

  // ── Concluir OS ───────────────────────────────────────────────
  const [concluirOSData, setConcluirOSData] = useState<OrdemServico | null>(null)

  // ── New OS form ───────────────────────────────────────────────
  const [form, setForm, clearFormDraft]     = useDraftState<FormState>('wrapos_draft_os_nova_form', blankForm)
  const [criandoCliente, setCriandoCliente] = useState(false)
  const [novoCli, setNovoCli]               = useState({
    nome: '', telefone: '',
    marca: '', modelo: '', ano: new Date().getFullYear(), cor: '', placa: '',
  })

  // ── Agendamento sugerido (vinculação OS ↔ Agendamento) ───────────
  /**
   * Quando o usuário tenta salvar uma Nova OS e existe um agendamento
   * no mesmo dia para o mesmo cliente ou veículo, guardamos aqui para
   * perguntar se ele quer vincular antes de salvar.
   */
  const [agendamentoSugerido, setAgendamentoSugerido] = useState<Agendamento | null>(null)

  // ── Auto-open from navigation state (Dashboard → OS click) ────
  useEffect(() => {
    const state = location.state as { openOSId?: string; statusFilter?: string } | null
    if (state?.openOSId) {
      const os = ordens.find(o => o.id === state.openOSId)
      if (os) setOsAberta(os)
    }
    if (state?.statusFilter === 'abertos') {
      setStatusFilter('abertos')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Lookup helpers ────────────────────────────────────────────
  const clienteNome  = (id: string) => clientes.find(c => c.id === id)?.nome ?? '—'
  const instNome     = (id: string) => instaladores.find(i => i.id === id)?.nome ?? '—'
  const getCliente   = (id: string) => clientes.find(c => c.id === id) ?? null
  const getVeiculo   = (id: string) => veiculos.find(v => v.id === id)
  const veiculoLabel = (id: string) => {
    const v = getVeiculo(id)
    return v ? `${v.marca} ${v.modelo} ${v.ano}` : '—'
  }

  // ── Filtered list + counts ────────────────────────────────────
  const filtered = ordens
    .filter(os => {
      const q    = search.toLowerCase()
      const nome = clienteNome(os.clienteId).toLowerCase()
      const matchQ = !q || nome.includes(q) || String(os.numero).includes(q) ||
        os.servicos.some(s => s.nome.toLowerCase().includes(q))
      const matchS = statusFilter === 'todos'
        ? true
        : statusFilter === 'abertos'
          ? (os.status === 'em_andamento' || os.status === 'aguardando_material')
          : os.status === statusFilter
      return matchQ && matchS
    })
    .sort((a, b) => {
      const ar = (o: typeof a) => o.status === 'concluido' && o.statusPagamento === 'a_receber' ? 1 : 0
      if (ar(a) !== ar(b)) return ar(b) - ar(a)
      return b.numero - a.numero
    })

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = ordens.filter(o => o.status === s).length
    return acc
  }, {} as Record<StatusOS, number>)

  const totalOS = ordens.length

  // ── New OS form derived values ────────────────────────────────
  // clientes inativos não aparecem na busca (silenciosamente, sem aviso)
  const clientesFiltrados = clientes.filter(c =>
    (c.status ?? 'ativo') === 'ativo' && (
      c.nome.toLowerCase().includes(form.clienteSearch.toLowerCase()) ||
      c.cpf.includes(form.clienteSearch)
    ),
  )
  const veiculosDoCliente = veiculos.filter(v => v.clienteId === form.clienteId)

  const valorTotalNova = form.servicosSel.reduce((sum, s) => sum + (s.valor || 0), 0)

  const comissaoValor = form.comissaoAtiva
    ? form.comissaoTipo === 'percentual'
      ? +(valorTotalNova * form.comissaoPerc / 100).toFixed(2)
      : form.comissaoFixo
    : 0


  // ── Form actions ──────────────────────────────────────────────
  const resetForm = () => {
    setForm({ ...blankForm, servicosSel: [] })
    clearFormDraft()
    setCriandoCliente(false)
    setNovoCli({ nome: '', telefone: '', marca: '', modelo: '', ano: new Date().getFullYear(), cor: '', placa: '' })
  }

  const selecionarCliente = (id: string, nome: string) => {
    setForm(f => ({ ...f, clienteId: id, clienteSearch: nome, veiculoId: '' }))
  }

  // Cliente → veículo precisam ser criados em sequência estrita e awaited:
  // veículo referencia clienteId via FK composta (lojaId, id) — ver mesmo
  // motivo em CheckinRapido.tsx (bug de FK order corrigido em 2026-07-07).
  const handleCriarClienteInline = async (): Promise<boolean> => {
    if (!novoCli.nome.trim())     { toast.error('Informe o nome do cliente.'); return false }
    if (!novoCli.telefone.trim()) { toast.error('Informe o telefone.');        return false }

    let clienteId: string
    try {
      clienteId = await adicionarClienteSequencial({
        nome:          novoCli.nome.trim(),
        telefone:      novoCli.telefone.trim(),
        email:         '', cpf: '',
        comoConheceu:  'Cadastro via OS',
        dataCadastro:  todayLocal(),
        totalGasto:    0,
      })
    } catch {
      toast.error('Não foi possível criar o cliente. Tente novamente.')
      return false
    }

    let veiculoId = ''
    if (novoCli.placa.trim() || novoCli.marca.trim() || novoCli.modelo.trim()) {
      const limpa    = novoCli.placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
      const placaFmt = limpa.length === 7 ? `${limpa.slice(0, 3)}-${limpa.slice(3)}` : novoCli.placa.trim()
      try {
        veiculoId = await adicionarVeiculoSequencial({
          clienteId,
          marca:  novoCli.marca.trim(),
          modelo: novoCli.modelo.trim(),
          ano:    novoCli.ano,
          cor:    novoCli.cor.trim(),
          placa:  placaFmt,
        })
      } catch {
        toast.error('Não foi possível criar o veículo. Tente novamente.')
        return false
      }
    }

    setForm(f => ({ ...f, clienteId, clienteSearch: novoCli.nome.trim(), veiculoId }))
    setCriandoCliente(false)
    setNovoCli({ nome: '', telefone: '', marca: '', modelo: '', ano: new Date().getFullYear(), cor: '', placa: '' })
    toast.success('Cliente cadastrado e selecionado!')
    return true
  }

  const toggleServico = (id: string) =>
    setForm(f => ({
      ...f,
      servicosSel: f.servicosSel.some(s => s.servicoId === id)
        ? f.servicosSel.filter(s => s.servicoId !== id)
        : [...f.servicosSel, { servicoId: id, valor: 0 }],
    }))

  const setValorServico = (id: string, valor: number) =>
    setForm(f => ({ ...f, servicosSel: f.servicosSel.map(s => s.servicoId === id ? { ...s, valor } : s) }))

  const handleInstaladorChange = (id: string) => {
    const padrao = instaladores.find(i => i.id === id)?.comissaoPadrao ?? 12
    setForm(f => ({ ...f, instaladorId: id, comissaoPerc: padrao }))
  }

  // ── Save new OS ───────────────────────────────────────────────

  /** Núcleo de persistência — chamado tanto pelo fluxo direto quanto após confirmação de vínculo. */
  const _persistirOS = async (agendamentoId?: string, boxOverride?: number): Promise<boolean> => {
    try {
      const servicosMapeados = form.servicosSel.map(sel => {
        const s = servicos.find(x => x.id === sel.servicoId)
        if (!s) {
          throw new Error(`O serviço selecionado (ID: ${sel.servicoId}) não foi encontrado na base de dados.`)
        }
        return { servicoId: sel.servicoId, nome: s.nome, preco: sel.valor }
      })

      await adicionarOSSequencial({
        clienteId:         form.clienteId,
        veiculoId:         form.veiculoId,
        servicos:          servicosMapeados,
        valorTotal:        valorTotalNova,
        formaPagamento:    form.formaPagamento,
        instaladorId:      form.instaladorId,
        box:               boxOverride ?? form.box,
        comissao:          comissaoValor,
        observacoes:       form.observacoes,
        dataSaidaPrevista: form.dataSaidaPrevista || undefined,
        status:            'aguardando_aprovacao',
        agendamentoId,
      })
      return true
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar a OS.')
      console.error(err)
      return false
    }
  }

  /** Verifica conflito de box: já existe outra OS ativa hoje no mesmo box? */
  const _checarConflitoBox = (): boolean => {
    const hoje = todayLocal()
    const conflito = ordens.some(o =>
      o.id !== undefined &&           // garante que não compara consigo mesma (nova OS não tem id ainda)
      o.box === form.box &&
      o.dataCriacao === hoje &&
      o.status !== 'cancelado' &&
      o.status !== 'concluido'
    )
    return conflito
  }

  const handleSalvar = async (): Promise<boolean> => {
    if (!form.clienteId)                           { toast.error('Selecione um cliente.');                   return false }
    if (form.servicosSel.length === 0)             { toast.error('Selecione ao menos um serviço.');          return false }
    if (!form.servicosSel.some(s => s.valor > 0)) { toast.error('Informe o valor de ao menos um serviço.'); return false }

    // ── 1. Verificar se há agendamento para este cliente/veículo hoje ──
    const hoje = todayLocal()
    const agMatchado = agendamentos.find(ag => {
      // Só considera agendamentos do dia atual sem OS vinculada ainda
      if (ag.data !== hoje) return false
      const jaTemOS = ordens.some(o => o.agendamentoId === ag.id)
      if (jaTemOS) return false
      // Verifica match por cliente ou veículo
      const mesmoCliente = ag.clienteId === form.clienteId
      const mesmoVeiculo = form.veiculoId ? ag.veiculoId === form.veiculoId : false
      return mesmoCliente || mesmoVeiculo
    })

    if (agMatchado) {
      // Guarda o agendamento encontrado e deixa a página perguntar ao usuário
      setAgendamentoSugerido(agMatchado)
      return false // impede o fechamento do modal até o usuário decidir
    }

    // ── 2. Verificar conflito de box (aviso não-bloqueante) ──────────
    if (_checarConflitoBox()) {
      toast.warning(`Box ${form.box} já está em uso hoje por outra OS ativa.`)
    }

    const salvo = await _persistirOS()
    if (!salvo) return false
    toast.success('OS criada com sucesso!')
    resetForm()
    return true
  }

  /** Chamado quando o usuário confirma que quer vincular ao agendamento sugerido. */
  const confirmarVincularAgendamento = async (): Promise<boolean> => {
    if (!agendamentoSugerido) return false

    const boxAg = agendamentoSugerido.box

    // Verifica conflito de box com o box do agendamento (aviso não-bloqueante)
    const hoje = todayLocal()
    const conflitoBoxAg = ordens.some(o =>
      o.box === boxAg &&
      o.dataCriacao === hoje &&
      o.status !== 'cancelado' &&
      o.status !== 'concluido'
    )
    if (conflitoBoxAg) {
      toast.warning(`Box ${boxAg} (do agendamento) já está em uso hoje por outra OS ativa.`)
    }

    // Passa o box do agendamento diretamente (evita problema de state assíncrono)
    const salvo = await _persistirOS(agendamentoSugerido.id, boxAg)
    if (!salvo) return false
    toast.success('OS criada e vinculada ao agendamento!')
    setAgendamentoSugerido(null)
    resetForm()
    return true
  }

  /** Chamado quando o usuário recusa a vinculação e quer salvar a OS sem agendamento. */
  const recusarVincularAgendamento = async (): Promise<boolean> => {
    setAgendamentoSugerido(null)

    // Verifica conflito de box (aviso não-bloqueante)
    if (_checarConflitoBox()) {
      toast.warning(`Box ${form.box} já está em uso hoje por outra OS ativa.`)
    }

    const salvo = await _persistirOS()
    if (!salvo) return false
    toast.success('OS criada com sucesso!')
    resetForm()
    return true
  }

  // ── Status / lifecycle handlers ───────────────────────────────
  const handleDelete = () => {
    if (!confirmarDelete) return
    deletarOS(confirmarDelete)
    toast('OS removida.')
    if (osAberta?.id === confirmarDelete) setOsAberta(null)
    setConfirmarDelete(null)
  }

  /** Exclusão via OSModal, que já tem sua própria confirmação inline. */
  const excluirOS = (id: string) => {
    deletarOS(id)
    toast('OS removida.')
  }

  const handleCancelarOS = (id: string) => {
    cancelarOS(id)
    toast.success('OS cancelada.')
  }

  const handleRegistrarPagamento = (id: string) => {
    registrarPagamentoOS(id)
    toast.success('Pagamento registrado! Receita lançada no Financeiro.')
  }

  const abrirConcluir = (osId: string) => {
    const os = ordens.find(o => o.id === osId) ?? null
    setOsAberta(null)
    setConcluirOSData(os)
  }

  return {
    // context data for JSX selects
    servicos, instaladores,

    // filters
    search, setSearch,
    statusFilter, setStatusFilter,

    // list
    filtered, counts, totalOS,

    // OS aberta no OSModal
    osAberta, setOsAberta,

    // delete
    confirmarDelete, setConfirmarDelete, handleDelete, excluirOS,

    // conclude OS
    concluirOSData, setConcluirOSData,
    abrirConcluir,

    // new OS form
    form, setForm,
    criandoCliente, setCriandoCliente,
    novoCli, setNovoCli,
    clientesFiltrados, veiculosDoCliente,
    valorTotalNova, comissaoValor,
    resetForm, selecionarCliente, handleCriarClienteInline,
    toggleServico, setValorServico,
    handleInstaladorChange, handleSalvar,

    // agendamento linking
    agendamentoSugerido, setAgendamentoSugerido,
    confirmarVincularAgendamento, recusarVincularAgendamento,

    // status/lifecycle
    handleCancelarOS, handleRegistrarPagamento,

    // lookup helpers
    clienteNome, instNome, getCliente, getVeiculo, veiculoLabel,
  }
}
