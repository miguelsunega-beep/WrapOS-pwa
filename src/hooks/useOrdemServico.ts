import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import type { StatusOS, BadgeVariant, OrdemServico, MaterialUsado } from '../types'

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
}

export interface EditFormState {
  servicosSel:    ServicoSelecionado[]
  formaPagamento: string
  instaladorId:   string
  box:            number
  observacoes:    string
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
    ordens, clientes, veiculos, servicos, instaladores, produtos,
    adicionarOS, editarOS, mudarStatusOS, deletarOS, cancelarOS,
    adicionarCliente, adicionarVeiculo, registrarPagamentoOS,
  } = useApp()
  const location = useLocation()

  // ── Filters ───────────────────────────────────────────────────
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<FiltroStatus>('todos')

  // ── Selected OS for details modal ─────────────────────────────
  const [detalhesOS, setDetalhesOS] = useState<OrdemServico | null>(null)

  // ── Delete confirm ────────────────────────────────────────────
  const [confirmarDelete, setConfirmarDelete] = useState<string | null>(null)

  // ── Edit OS ───────────────────────────────────────────────────
  const [editandoOS, setEditandoOS] = useState<OrdemServico | null>(null)
  const [editForm, setEditForm]     = useState<EditFormState>({
    servicosSel: [], formaPagamento: 'PIX', instaladorId: '', box: 1, observacoes: '',
  })

  // ── Concluir OS ───────────────────────────────────────────────
  const [concluirOSData, setConcluirOSData] = useState<OrdemServico | null>(null)

  // ── New OS form ───────────────────────────────────────────────
  const [form, setForm]                     = useState<FormState>(blankForm)
  const [criandoCliente, setCriandoCliente] = useState(false)
  const [novoCli, setNovoCli]               = useState({
    nome: '', telefone: '',
    marca: '', modelo: '', ano: new Date().getFullYear(), cor: '', placa: '',
  })

  // ── Auto-open from navigation state (Dashboard → OS click) ────
  useEffect(() => {
    const state = location.state as { openOSId?: string; statusFilter?: string } | null
    if (state?.openOSId) {
      const os = ordens.find(o => o.id === state.openOSId)
      if (os) setDetalhesOS(os)
    }
    if (state?.statusFilter === 'abertos') {
      setStatusFilter('abertos')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Lookup helpers ────────────────────────────────────────────
  const clienteNome  = (id: string) => clientes.find(c => c.id === id)?.nome ?? '—'
  const instNome     = (id: string) => instaladores.find(i => i.id === id)?.nome ?? '—'
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

  // ── Edit form derived ─────────────────────────────────────────
  const editValorTotal = editForm.servicosSel.reduce((sum, s) => sum + (s.valor || 0), 0)

  // ── Details modal derived (replaces IIFE) ─────────────────────
  const detCustoMateriais = detalhesOS
    ? (detalhesOS.materiaisUsados ?? []).reduce((sum, m) => {
        const origem = (m as MaterialUsado).origem ?? 'estoque'
        if (origem === 'estoque') {
          const p = produtos.find(x => x.id === m.produtoId)
          return sum + (p ? p.valorUnitario * m.quantidade : 0)
        }
        return sum + ((m as MaterialUsado).custo ?? 0)
      }, 0)
    : 0

  // ── Form actions ──────────────────────────────────────────────
  const resetForm = () => {
    setForm({ ...blankForm, servicosSel: [] })
    setCriandoCliente(false)
    setNovoCli({ nome: '', telefone: '', marca: '', modelo: '', ano: new Date().getFullYear(), cor: '', placa: '' })
  }

  const selecionarCliente = (id: string, nome: string) => {
    setForm(f => ({ ...f, clienteId: id, clienteSearch: nome, veiculoId: '' }))
  }

  const handleCriarClienteInline = (): boolean => {
    if (!novoCli.nome.trim())     { toast.error('Informe o nome do cliente.'); return false }
    if (!novoCli.telefone.trim()) { toast.error('Informe o telefone.');        return false }

    const clienteId = adicionarCliente({
      nome:          novoCli.nome.trim(),
      telefone:      novoCli.telefone.trim(),
      email:         '', cpf: '',
      comoConheceu:  'Cadastro via OS',
      dataCadastro:  new Date().toISOString().split('T')[0],
      totalGasto:    0,
    })

    let veiculoId = ''
    if (novoCli.placa.trim() || novoCli.marca.trim() || novoCli.modelo.trim()) {
      const limpa    = novoCli.placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
      const placaFmt = limpa.length === 7 ? `${limpa.slice(0, 3)}-${limpa.slice(3)}` : novoCli.placa.trim()
      veiculoId = adicionarVeiculo({
        clienteId,
        marca:  novoCli.marca.trim(),
        modelo: novoCli.modelo.trim(),
        ano:    novoCli.ano,
        cor:    novoCli.cor.trim(),
        placa:  placaFmt,
      })
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

  const toggleServicoEdit = (id: string) =>
    setEditForm(f => ({
      ...f,
      servicosSel: f.servicosSel.some(s => s.servicoId === id)
        ? f.servicosSel.filter(s => s.servicoId !== id)
        : [...f.servicosSel, { servicoId: id, valor: 0 }],
    }))

  const setValorServicoEdit = (id: string, valor: number) =>
    setEditForm(f => ({ ...f, servicosSel: f.servicosSel.map(s => s.servicoId === id ? { ...s, valor } : s) }))

  const handleInstaladorChange = (id: string) => {
    const padrao = instaladores.find(i => i.id === id)?.comissaoPadrao ?? 12
    setForm(f => ({ ...f, instaladorId: id, comissaoPerc: padrao }))
  }

  // ── Save new OS ───────────────────────────────────────────────
  const handleSalvar = (): boolean => {
    if (!form.clienteId)                           { toast.error('Selecione um cliente.');                   return false }
    if (form.servicosSel.length === 0)             { toast.error('Selecione ao menos um serviço.');          return false }
    if (!form.servicosSel.some(s => s.valor > 0)) { toast.error('Informe o valor de ao menos um serviço.'); return false }

    adicionarOS({
      clienteId:         form.clienteId,
      veiculoId:         form.veiculoId,
      servicos:          form.servicosSel.map(sel => {
        const s = servicos.find(x => x.id === sel.servicoId)!
        return { servicoId: sel.servicoId, nome: s.nome, preco: sel.valor }
      }),
      valorTotal:        valorTotalNova,
      formaPagamento:    form.formaPagamento,
      instaladorId:      form.instaladorId,
      box:               form.box,
      comissao:          comissaoValor,
      observacoes:       form.observacoes,
      dataSaidaPrevista: form.dataSaidaPrevista || undefined,
      status:            'aguardando_aprovacao',
    })
    toast.success('OS criada com sucesso!')
    resetForm()
    return true
  }

  // ── Edit OS ───────────────────────────────────────────────────
  const prepararEdicao = (os: OrdemServico) => {
    setEditandoOS(os)
    setEditForm({
      servicosSel:    os.servicos.map(s => ({ servicoId: s.servicoId, valor: s.preco ?? 0 })),
      formaPagamento: os.formaPagamento,
      instaladorId:   os.instaladorId,
      box:            os.box,
      observacoes:    os.observacoes,
    })
  }

  const handleSalvarEdicao = (): boolean => {
    if (!editandoOS)                                   return false
    if (editForm.servicosSel.length === 0)             { toast.error('Selecione ao menos um serviço.');          return false }
    if (!editForm.servicosSel.some(s => s.valor > 0)) { toast.error('Informe o valor de ao menos um serviço.'); return false }

    const servicosAtualizados = editForm.servicosSel.map(sel => {
      const cat           = servicos.find(s => s.id === sel.servicoId)
      const nomeExistente = editandoOS.servicos.find(s => s.servicoId === sel.servicoId)?.nome
      return { servicoId: sel.servicoId, nome: nomeExistente ?? cat?.nome ?? 'Serviço', preco: sel.valor }
    })

    const updates = {
      servicos:       servicosAtualizados,
      valorTotal:     editValorTotal,
      formaPagamento: editForm.formaPagamento,
      instaladorId:   editForm.instaladorId,
      box:            editForm.box,
      observacoes:    editForm.observacoes,
    }

    editarOS(editandoOS.id, updates)
    setDetalhesOS(prev => prev ? { ...prev, ...updates } : null)
    toast.success('OS atualizada com sucesso!')
    setEditandoOS(null)
    return true
  }

  const fecharEdicao = () => setEditandoOS(null)

  // ── Status / lifecycle handlers ───────────────────────────────
  const handleStatus = (id: string, status: StatusOS) => {
    mudarStatusOS(id, status)
    toast.success(`Status: "${statusConfig[status].label}"`)
    if (detalhesOS?.id === id) setDetalhesOS(p => p ? { ...p, status } : null)
  }

  const handleDelete = () => {
    if (!confirmarDelete) return
    deletarOS(confirmarDelete)
    toast('OS removida.')
    if (detalhesOS?.id === confirmarDelete) setDetalhesOS(null)
    setConfirmarDelete(null)
  }

  const handleCancelarOS = (id: string) => {
    cancelarOS(id)
    toast.success('OS cancelada.')
    if (detalhesOS?.id === id) setDetalhesOS(p => p ? { ...p, status: 'cancelado' as StatusOS } : null)
  }

  const handleRegistrarPagamento = (id: string) => {
    registrarPagamentoOS(id)
    toast.success('Pagamento registrado! Receita lançada no Financeiro.')
    setDetalhesOS(p => p ? { ...p, statusPagamento: 'pago' } : null)
  }

  const abrirConcluir = (os: OrdemServico) => setConcluirOSData(os)

  const handleConcluido = (osId: string, pago: boolean) => {
    if (detalhesOS?.id === osId) {
      const today = new Date().toISOString().split('T')[0]
      setDetalhesOS(p => p ? {
        ...p,
        status:          'concluido' as StatusOS,
        statusPagamento: pago ? 'pago' : 'a_receber',
        dataFinalizacao: today,
      } : null)
    }
  }

  return {
    // context data for JSX selects
    servicos, instaladores,

    // filters
    search, setSearch,
    statusFilter, setStatusFilter,

    // list
    filtered, counts, totalOS,

    // details modal
    detalhesOS, setDetalhesOS,
    detCustoMateriais,

    // delete
    confirmarDelete, setConfirmarDelete, handleDelete,

    // edit OS
    editandoOS, editForm, setEditForm,
    prepararEdicao, fecharEdicao, handleSalvarEdicao,
    editValorTotal,
    toggleServicoEdit, setValorServicoEdit,

    // conclude OS
    concluirOSData, setConcluirOSData,
    abrirConcluir, handleConcluido,

    // new OS form
    form, setForm,
    criandoCliente, setCriandoCliente,
    novoCli, setNovoCli,
    clientesFiltrados, veiculosDoCliente,
    valorTotalNova, comissaoValor,
    resetForm, selecionarCliente, handleCriarClienteInline,
    toggleServico, setValorServico,
    handleInstaladorChange, handleSalvar,

    // status/lifecycle
    handleStatus, handleCancelarOS, handleRegistrarPagamento,

    // lookup helpers
    clienteNome, instNome, getVeiculo, veiculoLabel,
  }
}
