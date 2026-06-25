import { useState } from 'react'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import type { LancamentoFinanceiro } from '../types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const fmtDate = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

const FORMAS_PAGAMENTO = [
  'PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito',
  'Transferência', 'Boleto', 'Débito automático',
]
const CATEGORIAS_ENTRADA = ['OS', 'Adiantamento', 'Outros']
const CATEGORIAS_SAIDA   = ['Estoque', 'Folha', 'Aluguel', 'Marketing', 'Utilities', 'Manutenção', 'Outros']

export interface LancForm {
  tipo: 'entrada' | 'saida'
  categoria: string
  descricao: string
  valor: string
  data: string
  formaPagamento: string
}

const initForm = (): LancForm => ({
  tipo: 'entrada',
  categoria: 'OS',
  descricao: '',
  valor: '',
  data: new Date().toISOString().slice(0, 10),
  formaPagamento: 'PIX',
})

export interface KpiFinanceiro {
  label:    string
  value:    number
  valueStr: string
  icon:     LucideIcon
  color:    string
  bg:       string
  subtitle: string
}

export interface LancamentoEnriquecido extends LancamentoFinanceiro {
  dataFmt:        string
  valorFormatado: string
}

export function useFinanceiro() {
  const { lancamentos, ordens, adicionarLancamento, deletarLancamento } = useApp()
  const { theme } = useTheme()

  // ── Chart / tooltip colors ─────────────────────────────────────
  const gridColor    = theme === 'dark' ? '#1e2140' : '#e5e7eb'
  const tickColor    = theme === 'dark' ? '#6b7280' : '#4b5563'
  const tooltipBg    = theme === 'dark' ? '#18182a' : '#ffffff'
  const tooltipBrd   = theme === 'dark' ? '#1e2140' : '#e5e7eb'
  const tooltipLabel = theme === 'dark' ? '#9ca3af' : '#6b7280'
  const tooltipItem  = theme === 'dark' ? '#fff'    : '#111827'

  // ── Month selector ─────────────────────────────────────────────
  const today = new Date()
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .replace(/^./, c => c.toUpperCase())
    return { value, label }
  })
  const [mesSel, setMesSel] = useState(meses[0].value)

  // ── KPI values ─────────────────────────────────────────────────
  const lancMes  = lancamentos.filter(l => l.data.startsWith(mesSel))
  const receita  = lancMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const despesas = lancMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const lucro    = receita - despesas

  const osConcluidas = ordens.filter(o => o.status === 'concluido' && o.dataFinalizacao?.startsWith(mesSel))
  const ticketMedio  = osConcluidas.length > 0
    ? osConcluidas.reduce((s, o) => s + o.valorTotal, 0) / osConcluidas.length
    : 0

  const aReceber = ordens
    .filter(o => o.status === 'concluido' && o.statusPagamento === 'a_receber')
    .reduce((s, o) => s + o.valorTotal, 0)

  const lancCountLabel = `${lancMes.length} lançamento${lancMes.length !== 1 ? 's' : ''} no mês`
  const osCountLabel   = `${osConcluidas.length} OS concluída${osConcluidas.length !== 1 ? 's' : ''}`

  const kpisFinanceiro: KpiFinanceiro[] = [
    { label: 'Receita Bruta', value: receita,     valueStr: fmt(receita),     icon: TrendingUp,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', subtitle: lancCountLabel },
    { label: 'Despesas',      value: despesas,    valueStr: fmt(despesas),    icon: TrendingDown, color: 'text-accent',      bg: 'bg-accent/10',      subtitle: lancCountLabel },
    { label: 'Lucro Líquido', value: lucro,       valueStr: fmt(lucro),       icon: DollarSign,   color: 'text-blue-400',    bg: 'bg-blue-500/10',    subtitle: lancCountLabel },
    { label: 'Ticket Médio',  value: ticketMedio, valueStr: fmt(ticketMedio), icon: ArrowUpRight, color: 'text-purple-400',  bg: 'bg-purple-500/10',  subtitle: osCountLabel   },
  ]

  // ── Chart data (last 6 months, oldest → newest) ───────────────
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mes = d.toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '').replace(/^./, c => c.toUpperCase())
    const rec = lancamentos
      .filter(l => l.tipo === 'entrada' && l.data.startsWith(key))
      .reduce((s, l) => s + l.valor, 0)
    const desp = lancamentos
      .filter(l => l.tipo === 'saida' && l.data.startsWith(key))
      .reduce((s, l) => s + l.valor, 0)
    return { mes, receita: rec, despesa: desp }
  })

  // ── Sorted + enriched list ────────────────────────────────────
  const lancOrdenados: LancamentoEnriquecido[] = [...lancMes]
    .sort((a, b) => b.data.localeCompare(a.data))
    .map(l => ({
      ...l,
      dataFmt:        fmtDate(l.data),
      valorFormatado: `${l.tipo === 'entrada' ? '+' : '−'}${fmt(l.valor)}`,
    }))

  // ── Delete ────────────────────────────────────────────────────
  const deletarLancamentoById = (id: string) => {
    deletarLancamento(id)
    toast.success('Lançamento excluído.')
  }

  // ── Form ──────────────────────────────────────────────────────
  const [form, setForm] = useState<LancForm>(initForm)

  const categorias = form.tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA

  const setTipo = (t: 'entrada' | 'saida') => {
    const cats = t === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA
    setForm(p => ({ ...p, tipo: t, categoria: cats[0] }))
  }

  const resetForm = () => setForm(initForm())

  const salvarLancamento = (): boolean => {
    if (!form.descricao.trim()) { toast.error('Informe a descrição.'); return false }
    const valor = parseFloat(form.valor)
    if (!valor || valor <= 0) { toast.error('Informe um valor válido.'); return false }
    adicionarLancamento({
      tipo:           form.tipo,
      categoria:      form.categoria,
      descricao:      form.descricao.trim(),
      valor,
      data:           form.data,
      formaPagamento: form.formaPagamento,
    })
    toast.success('Lançamento adicionado com sucesso!')
    resetForm()
    return true
  }

  return {
    meses,
    mesSel,
    setMesSel,
    kpisFinanceiro,
    aReceber,
    aReceberStr:    fmt(aReceber),
    chartData,
    gridColor,
    tickColor,
    tooltipBg,
    tooltipBrd,
    tooltipLabel,
    tooltipItem,
    fmt,
    lancOrdenados,
    deletarLancamentoById,
    form,
    setForm,
    categorias,
    FORMAS_PAGAMENTO,
    setTipo,
    salvarLancamento,
    resetForm,
  }
}
