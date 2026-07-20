import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { usePlacaLookup } from './usePlacaLookup'
import { useCepLookup } from './useCepLookup'
import { todayLocal } from '../lib/dateUtils'
import { blankVeiculoForm, type VeiculoFormData } from '../components/VeiculoInlineForm'
import type { Cliente, BadgeVariant, StatusOS, Garantia as GarantiaType, Veiculo } from '../types'

// ── Formatters / helpers ──────────────────────────────────────────
export const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

export const initials = (nome: string) =>
  nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

export const isVip = (c: Cliente) => c.totalGasto >= 10000

const todayMS = Date.now()

const getDiasGar = (dataFim: string) =>
  Math.round((new Date(dataFim + 'T12:00:00').getTime() - todayMS) / 86_400_000)

const getDisplayStatusGar = (g: GarantiaType): { label: string; variant: BadgeVariant } => {
  if (g.status === 'expirada') return { label: 'Vencida',  variant: 'danger'  }
  if (g.status === 'acionada') return { label: 'Acionada', variant: 'warning' }
  const dias = getDiasGar(g.dataFim)
  if (dias < 0)   return { label: 'Vencida',  variant: 'danger'  }
  if (dias <= 30) return { label: 'Vencendo', variant: 'warning' }
  return { label: 'Ativa', variant: 'success' }
}

// ── Constants ─────────────────────────────────────────────────────
export const COMO_CONHECEU = ['Instagram', 'Google', 'Indicação', 'Facebook', 'TikTok', 'Outros']

export const statusConfig: Record<StatusOS, { label: string; variant: BadgeVariant }> = {
  em_andamento:         { label: 'Em Andamento',      variant: 'warning' },
  aguardando_material:  { label: 'Aguard. Material',  variant: 'info'    },
  aguardando_aprovacao: { label: 'Aguard. Aprovação', variant: 'purple'  },
  concluido:            { label: 'Concluído',         variant: 'success' },
  cancelado:            { label: 'Cancelado',         variant: 'danger'  },
}

// ── Form types ────────────────────────────────────────────────────
export interface ClienteForm {
  nome: string; telefone: string; email: string
  cpf: string; comoConheceu: string; cidade: string
}

const blankForm: ClienteForm = {
  nome: '', telefone: '', email: '', cpf: '', comoConheceu: 'Instagram', cidade: '',
}

export interface VeiculoForm {
  marca: string; modelo: string; ano: string; cor: string; placa: string
}

const blankVeiculo: VeiculoForm = { marca: '', modelo: '', ano: '', cor: '', placa: '' }

// ── Enriched guarantee type (inferred by page via hook return) ────
interface GarantiaEnriquecida extends GarantiaType {
  osNumero:      number | null
  displayStatus: { label: string; variant: BadgeVariant }
  diasRestantes: number
}

// ── Hook ──────────────────────────────────────────────────────────
export function useClientes() {
  const {
    clientes, veiculos, ordens, garantias,
    adicionarClienteSequencial, adicionarVeiculoSequencial, editarCliente, deletarCliente, reativarCliente,
    adicionarVeiculo, editarVeiculo, deletarVeiculo,
    editarGarantia, deletarGarantia, registrarAcionamento,
  } = useApp()

  // ── Search ────────────────────────────────────────────────────
  const [search, setSearch] = useState('')

  // ── Filtro de status (ativos por padrão) ───────────────────────
  const [statusFiltro, setStatusFiltro] = useState<'ativo' | 'inativo'>('ativo')

  // ── Selected client ───────────────────────────────────────────
  const [detalhes, setDetalhes] = useState<Cliente | null>(null)

  // ── Edit mode flag ────────────────────────────────────────────
  const [editando, setEditando] = useState(false)

  // ── Delete confirm ────────────────────────────────────────────
  const [confirmarDelete, setConfirmarDelete] = useState<string | null>(null)

  // ── Client form ───────────────────────────────────────────────
  const [form, setForm]         = useState<ClienteForm>(blankForm)
  const [cepInput, setCepInput] = useState('')
  const cepResult               = useCepLookup(cepInput)

  // ── Vehicle form ──────────────────────────────────────────────
  const [veiculoForm, setVeiculoForm]         = useState<VeiculoForm>(blankVeiculo)
  const [editVeiculoId, setEditVeiculoId]     = useState<string | null>(null)
  const [deletarVeiculoId, setDeletarVeiculoId] = useState<string | null>(null)
  const placaResult                           = usePlacaLookup(veiculoForm.placa)

  // ── Guarantee form ────────────────────────────────────────────
  const [garEditId,    setGarEditId]    = useState<string | null>(null)
  const [garEditForm,  setGarEditForm]  = useState({ servico: '', produto: '', dataInicio: '', dataFim: '' })
  const [garDeletarId, setGarDeletarId] = useState<string | null>(null)
  const [garAcionarId, setGarAcionarId] = useState<string | null>(null)

  // ── CEP auto-fill ─────────────────────────────────────────────
  useEffect(() => {
    if (cepResult.data?.localidade) {
      setForm(f => ({ ...f, cidade: cepResult.data!.localidade }))
    }
  }, [cepResult.data])

  // ── Placa auto-fill ───────────────────────────────────────────
  const prevPlacaApiOk = useRef(false)
  useEffect(() => {
    if (placaResult.apiOk && !prevPlacaApiOk.current && placaResult.data) {
      const d = placaResult.data
      setVeiculoForm(f => ({
        ...f,
        marca:  d.marca  || f.marca,
        modelo: d.modelo || f.modelo,
        ano:    d.ano    ? String(d.ano) : f.ano,
        cor:    d.cor    || f.cor,
      }))
    }
    prevPlacaApiOk.current = placaResult.apiOk
  }, [placaResult.apiOk, placaResult.data])

  // ── KPIs ──────────────────────────────────────────────────────
  const now       = new Date()
  const mesAtual  = now.getMonth()
  const anoAtual  = now.getFullYear()

  const totalClientes = clientes.length

  const vipCount = clientes.filter(isVip).length

  const novosCount = clientes.filter(c => {
    const d = new Date(c.dataCadastro + 'T00:00:00')
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual
  }).length

  const posVendaCount = clientes.filter(c => {
    const osCliente  = ordens.filter(o => o.clienteId === c.id)
    const concluidas = osCliente
      .filter(o => o.status === 'concluido' && o.dataFinalizacao)
      .map(o => new Date(o.dataFinalizacao! + 'T00:00:00').getTime())
    if (concluidas.length === 0) return false
    const ultima         = Math.max(...concluidas)
    const diasSemContato = (now.getTime() - ultima) / 86_400_000
    const temNovaDepois  = osCliente.some(o => new Date(o.dataCriacao + 'T00:00:00').getTime() > ultima)
    return diasSemContato > 30 && !temNovaDepois
  }).length

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = clientes
    .filter(c => (c.status ?? 'ativo') === statusFiltro)
    .filter(c =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf.includes(search),
    )
    .sort((a, b) => b.totalGasto - a.totalGasto)

  // ── Veículo principal (exibido em destaque na lista) ────────────
  const veiculoLabel = (clienteId: string) => {
    const v = veiculos.find(v => v.clienteId === clienteId)
    return v ? `${v.marca} ${v.modelo}` : null
  }

  // ── Derived data for selected client ──────────────────────────
  const detVeics = detalhes ? veiculos.filter(v => v.clienteId === detalhes.id) : []

  const detOsCliente = detalhes
    ? ordens.filter(o => o.clienteId === detalhes.id).sort((a, b) => b.numero - a.numero)
    : []

  const detUltimaVisita: string = detalhes
    ? (() => {
        const datas = ordens
          .filter(o => o.clienteId === detalhes.id && o.status === 'concluido' && o.dataFinalizacao)
          .map(o => o.dataFinalizacao!)
        if (datas.length === 0) return '—'
        return fmtDate(datas.sort().reverse()[0])
      })()
    : '—'

  const detGarantias: GarantiaEnriquecida[] = detalhes
    ? garantias
        .filter(g => g.clienteId === detalhes.id)
        .map(g => {
          const os = ordens.find(o => o.id === g.osId)
          return {
            ...g,
            osNumero:      os?.numero ?? null,
            displayStatus: getDisplayStatusGar(g),
            diasRestantes: getDiasGar(g.dataFim),
          }
        })
    : []

  // ── Novo veículo inline (ao criar cliente novo) ───────────────
  const [cadastrarVeiculoNovo, setCadastrarVeiculoNovo] = useState(false)
  const [novoVeiculoForm, setNovoVeiculoForm] = useState<VeiculoFormData>(blankVeiculoForm)

  // ── Client form actions ───────────────────────────────────────
  const resetForm = () => {
    setForm(blankForm)
    setCepInput('')
    setCadastrarVeiculoNovo(false)
    setNovoVeiculoForm(blankVeiculoForm)
  }

  const prepararNovo = () => { resetForm(); setEditando(false) }

  const prepararEditar = (c: Cliente) => {
    setForm({
      nome: c.nome, telefone: c.telefone, email: c.email,
      cpf: c.cpf, comoConheceu: c.comoConheceu, cidade: c.cidade ?? '',
    })
    setCepInput('')
    setEditando(true)
  }

  // No fluxo de cadastro (cliente novo + veículo inline), cliente → veículo
  // precisam ser criados em sequência estrita e awaited: mesmo motivo do fix
  // em CheckinRapido.tsx (bug de FK order corrigido em 2026-07-07).
  const handleSalvarCliente = async (): Promise<boolean> => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório.'); return false }
    if (editando && detalhes) {
      editarCliente(detalhes.id, {
        nome: form.nome, telefone: form.telefone, email: form.email,
        cpf: form.cpf, comoConheceu: form.comoConheceu, cidade: form.cidade,
      })
      setDetalhes(c => c ? { ...c, ...form } : null)
      toast.success('Cliente atualizado!')
    } else {
      // Se o usuário preencheu veículo inline, valida antes de criar o cliente.
      if (cadastrarVeiculoNovo && novoVeiculoForm.placa.trim()) {
        if (!novoVeiculoForm.marca.trim() || !novoVeiculoForm.modelo.trim()) {
          toast.error('Marca e Modelo do veículo são obrigatórios.')
          return false
        }
      }

      let clienteId: string
      try {
        clienteId = await adicionarClienteSequencial({
          nome: form.nome, telefone: form.telefone, email: form.email,
          cpf: form.cpf, comoConheceu: form.comoConheceu, cidade: form.cidade,
          dataCadastro: todayLocal(),
          totalGasto: 0,
        })
      } catch {
        toast.error('Não foi possível criar o cliente. Tente novamente.')
        return false
      }

      if (cadastrarVeiculoNovo && novoVeiculoForm.placa.trim()) {
        try {
          await adicionarVeiculoSequencial({
            clienteId,
            placa:  novoVeiculoForm.placa.toUpperCase(),
            marca:  novoVeiculoForm.marca,
            modelo: novoVeiculoForm.modelo,
            ano:    Number(novoVeiculoForm.ano) || new Date().getFullYear(),
            cor:    novoVeiculoForm.cor,
          })
        } catch {
          toast.error('Não foi possível criar o veículo. Tente novamente.')
          return false
        }
        toast.success('Cliente e veículo cadastrados com sucesso!')
      } else {
        toast.success('Cliente cadastrado com sucesso!')
      }
    }
    resetForm()
    return true
  }

  // ── Delete client ─────────────────────────────────────────────
  const handleDelete = () => {
    if (!confirmarDelete) return
    const resultado = deletarCliente(confirmarDelete)
    if (resultado === 'inativado') {
      toast.info('Cliente possui ordens de serviço vinculadas e foi inativado em vez de excluído.')
    } else {
      toast('Cliente removido.')
    }
    setConfirmarDelete(null)
    if (detalhes?.id === confirmarDelete) setDetalhes(null)
  }

  // ── Reativar cliente ──────────────────────────────────────────
  const handleReativar = (id: string) => {
    reativarCliente(id)
    toast.success('Cliente reativado.')
  }

  // ── Vehicle actions ───────────────────────────────────────────
  const resetVeiculo = () => { setVeiculoForm(blankVeiculo); setEditVeiculoId(null) }

  const prepararEditarVeiculo = (v: Veiculo) => {
    setVeiculoForm({ marca: v.marca, modelo: v.modelo, ano: String(v.ano), cor: v.cor, placa: v.placa })
    setEditVeiculoId(v.id)
  }

  const handleSalvarVeiculo = (): boolean => {
    if (!detalhes) return false
    if (!veiculoForm.marca || !veiculoForm.modelo || !veiculoForm.placa) {
      toast.error('Marca, Modelo e Placa são obrigatórios.')
      return false
    }
    const dados = {
      marca:  veiculoForm.marca,
      modelo: veiculoForm.modelo,
      ano:    Number(veiculoForm.ano) || new Date().getFullYear(),
      cor:    veiculoForm.cor,
      placa:  veiculoForm.placa.toUpperCase(),
    }
    if (editVeiculoId) {
      editarVeiculo(editVeiculoId, dados)
      toast.success('Veículo atualizado!')
    } else {
      adicionarVeiculo({ clienteId: detalhes.id, ...dados })
      toast.success('Veículo adicionado!')
    }
    resetVeiculo()
    return true
  }

  const handleDeletarVeiculo = () => {
    if (!deletarVeiculoId) return
    deletarVeiculo(deletarVeiculoId)
    setDeletarVeiculoId(null)
    toast.success('Veículo removido.')
  }

  // ── Guarantee actions ─────────────────────────────────────────
  const prepararEditarGar = (g: GarantiaType) => {
    setGarEditId(g.id)
    setGarEditForm({ servico: g.servico, produto: g.produto, dataInicio: g.dataInicio, dataFim: g.dataFim })
  }

  const handleSalvarGar = (): boolean => {
    if (!garEditId) return false
    if (!garEditForm.dataFim) { toast.error('Informe a data de vencimento.'); return false }
    editarGarantia(garEditId, garEditForm)
    toast.success('Garantia atualizada!')
    setGarEditId(null)
    return true
  }

  const handleDeletarGar = () => {
    if (!garDeletarId) return
    deletarGarantia(garDeletarId)
    setGarDeletarId(null)
    toast.success('Garantia excluída.')
  }

  const handleAcionarGar = () => {
    if (!garAcionarId) return
    registrarAcionamento(garAcionarId)
    setGarAcionarId(null)
    toast.success('Garantia acionada!')
  }

  return {
    // search + list
    search, setSearch, filtered, veiculoLabel,

    // filtro de status (ativos/inativos)
    statusFiltro, setStatusFiltro,

    // KPIs
    totalClientes, vipCount, novosCount, posVendaCount,

    // selected client + pre-computed derived data
    detalhes, setDetalhes,
    detVeics, detOsCliente, detUltimaVisita, detGarantias,

    // edit mode
    editando,

    // client form
    form, setForm, cepInput, setCepInput, cepResult,
    prepararNovo, prepararEditar, handleSalvarCliente, resetForm,

    // novo veículo inline (ao criar cliente)
    cadastrarVeiculoNovo, setCadastrarVeiculoNovo,
    novoVeiculoForm, setNovoVeiculoForm,

    // delete / reativar client
    confirmarDelete, setConfirmarDelete, handleDelete, handleReativar,

    // vehicle form
    veiculoForm, setVeiculoForm, placaResult,
    editVeiculoId, resetVeiculo, prepararEditarVeiculo, handleSalvarVeiculo,
    deletarVeiculoId, setDeletarVeiculoId, handleDeletarVeiculo,

    // guarantee
    garEditForm, setGarEditForm,
    garDeletarId, setGarDeletarId,
    garAcionarId, setGarAcionarId,
    prepararEditarGar, handleSalvarGar,
    handleDeletarGar, handleAcionarGar,
  }
}
