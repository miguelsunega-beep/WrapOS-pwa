import { useState } from 'react'
import { toast } from 'sonner'
import { Users, CheckCircle, ClipboardList, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Instalador } from '../types'
import { todayLocal } from '../lib/dateUtils'

const mesAtual = todayLocal().slice(0, 7)

export const diasRestantes = (() => {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate() - t.getDate()
})()

export const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

export const ESPECIALIDADES = [
  'PPF', 'Envelopamento', 'Ceramic Coating', 'Chrome Delete', 'Insulfilm', 'Higienização',
]

const MEDALHAS = ['🥇', '🥈', '🥉', '4º', '5º', '6º', '7º', '8º', '9º']

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const initials = (nome: string) =>
  nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

interface InstForm {
  nome: string
  especialidades: string[]
  comissaoPadrao: string
  ativo: boolean
}

const initForm = (): InstForm => ({
  nome: '',
  especialidades: [],
  comissaoPadrao: '12',
  ativo: true,
})

interface MetaForm { faturamento: string; numeroOS: string; ticketMedio: string; novosClientes: string }

export interface KpiEquipe {
  label: string
  value: string
  color: string
  icon:  LucideIcon
  bg:    string
}

export interface InstaladorComStats extends Instalador {
  iniciais:       string
  osMesCount:     number
  faturadoMesStr: string
}

export interface MetaCardEquipe {
  titulo:  string
  atual:   number
  meta:    number
  pct:     number
  display: (v: number) => string
  cor:     string
}

export interface RankingItemEquipe {
  id:          string
  nome:        string
  osMes:       number
  faturado:    number
  faturadoStr: string
  posicao:     string
}

export function useEquipe() {
  const {
    instaladores, ordens, clientes, meta,
    adicionarInstalador, editarInstalador, deletarInstalador, atualizarMeta,
  } = useApp()

  // ── Equipe tab: KPI data ────────────────────────────────────────
  const ativos        = instaladores.filter(i => i.ativo)
  const osMesTotalLen = ordens.filter(o => o.dataCriacao.startsWith(mesAtual)).length
  const comissaoMedia = ativos.length > 0
    ? ativos.reduce((s, i) => s + i.comissaoPadrao, 0) / ativos.length
    : 0

  const kpisEquipe: KpiEquipe[] = [
    { label: 'Total da Equipe', value: String(instaladores.length),        color: 'text-ui-text',     icon: Users,         bg: 'bg-surface-600'    },
    { label: 'Ativos Hoje',     value: String(ativos.length),              color: 'text-emerald-400', icon: CheckCircle,   bg: 'bg-emerald-500/10' },
    { label: 'OS no Mês',       value: String(osMesTotalLen),              color: 'text-blue-400',    icon: ClipboardList, bg: 'bg-blue-500/10'    },
    { label: 'Comissão Média',  value: `${comissaoMedia.toFixed(1)}%`,     color: 'text-amber-400',   icon: TrendingUp,    bg: 'bg-amber-500/10'   },
  ]

  // ── Equipe tab: enriched installer list ─────────────────────────
  const instaladoresComStats: InstaladorComStats[] = instaladores.map(inst => {
    const instOsMes   = ordens.filter(o => o.instaladorId === inst.id && o.dataCriacao.startsWith(mesAtual))
    const faturadoMes = instOsMes.reduce((s, o) => s + o.valorTotal, 0)
    return {
      ...inst,
      iniciais:       initials(inst.nome),
      osMesCount:     instOsMes.length,
      faturadoMesStr: fmtCurrency(faturadoMes),
    }
  })

  // ── Instalador form state ────────────────────────────────────────
  const [form,       setForm]       = useState<InstForm>(initForm)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const toggleEsp = (esp: string) =>
    setForm(p => ({
      ...p,
      especialidades: p.especialidades.includes(esp)
        ? p.especialidades.filter(e => e !== esp)
        : [...p.especialidades, esp],
    }))

  const prepararNovo = () => { setForm(initForm()); setEditandoId(null) }

  const prepararEditar = (inst: Instalador) => {
    setForm({
      nome:           inst.nome,
      especialidades: [...inst.especialidades],
      comissaoPadrao: String(inst.comissaoPadrao),
      ativo:          inst.ativo,
    })
    setEditandoId(inst.id)
  }

  const salvarInstalador = (): boolean => {
    if (!form.nome.trim()) { toast.error('Informe o nome do instalador.'); return false }
    const dados = {
      nome:           form.nome.trim(),
      especialidades: form.especialidades,
      comissaoPadrao: Math.max(0, Math.min(100, parseFloat(form.comissaoPadrao) || 0)),
      ativo:          form.ativo,
    }
    if (!editandoId) {
      adicionarInstalador(dados)
      toast.success('Instalador cadastrado!')
    } else {
      editarInstalador(editandoId, dados)
      toast.success('Instalador atualizado!')
    }
    return true
  }

  const toggleAtivo = (id: string, current: boolean) => {
    editarInstalador(id, { ativo: !current })
    toast.success(`Instalador ${!current ? 'ativado' : 'desativado'}.`)
  }

  const deletarInstaladorById = (id: string) => {
    deletarInstalador(id)
    toast.success('Instalador excluído.')
  }

  // ── Metas tab: computed values ──────────────────────────────────
  const osConcluidas  = ordens.filter(o => o.status === 'concluido' && o.dataFinalizacao?.startsWith(mesAtual))
  const faturamento   = osConcluidas.reduce((s, o) => s + o.valorTotal, 0)
  const numOS         = osConcluidas.length
  const ticketMedio   = numOS > 0 ? faturamento / numOS : 0
  const novosClientes = clientes.filter(c => c.dataCadastro.startsWith(mesAtual)).length

  const metaCards: MetaCardEquipe[] = [
    { titulo: 'Faturamento',    atual: faturamento,   meta: meta.faturamento,   pct: meta.faturamento   > 0 ? Math.round((faturamento   / meta.faturamento)   * 100) : 0, display: fmtCurrency,                    cor: 'from-accent to-pink-600'      },
    { titulo: 'Número de OS',   atual: numOS,          meta: meta.numeroOS,      pct: meta.numeroOS      > 0 ? Math.round((numOS          / meta.numeroOS)      * 100) : 0, display: (v: number) => `${v} OS`,       cor: 'from-blue-500 to-cyan-500'     },
    { titulo: 'Ticket Médio',   atual: ticketMedio,    meta: meta.ticketMedio,   pct: meta.ticketMedio   > 0 ? Math.round((ticketMedio    / meta.ticketMedio)   * 100) : 0, display: fmtCurrency,                    cor: 'from-amber-500 to-orange-500'  },
    { titulo: 'Novos Clientes', atual: novosClientes,  meta: meta.novosClientes, pct: meta.novosClientes > 0 ? Math.round((novosClientes  / meta.novosClientes) * 100) : 0, display: (v: number) => `${v} clientes`, cor: 'from-purple-500 to-violet-600' },
  ]

  const ranking: RankingItemEquipe[] = instaladores
    .map(inst => {
      const instOS   = osConcluidas.filter(o => o.instaladorId === inst.id)
      const faturado = instOS.reduce((s, o) => s + o.valorTotal, 0)
      return { id: inst.id, nome: inst.nome, osMes: instOS.length, faturado }
    })
    .sort((a, b) => b.faturado - a.faturado)
    .map((item, i) => ({
      ...item,
      faturadoStr: fmtCurrency(item.faturado),
      posicao:     MEDALHAS[i] ?? `${i + 1}º`,
    }))

  const maxFaturado = ranking[0]?.faturado || 1

  // ── Meta form state ──────────────────────────────────────────────
  const [metaForm, setMetaForm] = useState<MetaForm>({
    faturamento:   String(meta.faturamento),
    numeroOS:      String(meta.numeroOS),
    ticketMedio:   String(meta.ticketMedio),
    novosClientes: String(meta.novosClientes),
  })

  const resetMetaForm = () => setMetaForm({
    faturamento:   String(meta.faturamento),
    numeroOS:      String(meta.numeroOS),
    ticketMedio:   String(meta.ticketMedio),
    novosClientes: String(meta.novosClientes),
  })

  const salvarMeta = () => {
    atualizarMeta({
      faturamento:   Math.max(0, parseFloat(metaForm.faturamento)  || 0),
      numeroOS:      Math.max(0, parseInt(metaForm.numeroOS)        || 0),
      ticketMedio:   Math.max(0, parseFloat(metaForm.ticketMedio)   || 0),
      novosClientes: Math.max(0, parseInt(metaForm.novosClientes)   || 0),
    })
    toast.success('Metas atualizadas!')
  }

  return {
    mesLabel,
    diasRestantes,
    ESPECIALIDADES,
    kpisEquipe,
    instaladoresComStats,
    form,    setForm,
    toggleEsp,
    prepararNovo,
    prepararEditar,
    salvarInstalador,
    toggleAtivo,
    deletarInstaladorById,
    metaCards,
    ranking,
    maxFaturado,
    metaForm, setMetaForm,
    resetMetaForm,
    salvarMeta,
  }
}
