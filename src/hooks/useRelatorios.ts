import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import type { LancamentoFinanceiro } from '../types'

// ── Helpers ────────────────────────────────────────────────────────

export const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const fmtDateStr = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

export type Periodo = 'semana' | 'mes' | 'trimestre' | 'ano'

export const PERIODO_LABEL: Record<Periodo, string> = {
  semana:    'Últimos 7 dias',
  mes:       'Este mês',
  trimestre: 'Este trimestre',
  ano:       'Este ano',
}

export const PIE_COLORS = ['var(--wrap-accent)', '#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#f87171', '#38bdf8']

function getPeriodStart(p: Periodo): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (p === 'semana') {
    const d = new Date(now)
    d.setDate(now.getDate() - 6)
    return d
  }
  if (p === 'mes')       return new Date(now.getFullYear(), now.getMonth(), 1)
  if (p === 'trimestre') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  return new Date(now.getFullYear(), 0, 1)
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Exported interfaces ────────────────────────────────────────────

export interface KpiRel {
  label: string
  value: string
  color: string
}

export interface ChartDataPoint {
  date:     string
  receitas: number
  despesas: number
  saldo:    number
}

export interface LancamentoFiltrado extends LancamentoFinanceiro {
  dataFmt:   string
  valorFmt:  string
  tipoStr:   string
  tipoBg:    string
  tipoColor: string
}

export interface TecnicoRanking {
  id:               string
  nome:             string
  primeiroNome:     string
  especialidadesStr: string
  osConcluidas:     number
  faturamento:      number
  faturamentoFmt:   string
  ticketFmt:        string
  tempoMedioFmt:    string
  comissaoStr:      string
  barWidthPct:      number
  posicao:          string
}

export interface ServicoStat {
  nome:             string
  count:            number
  receita:          number
  receitaFmt:       string
  precoUnitarioFmt: string
  barWidthPct:      number
}

export interface PieDataPoint {
  name:  string
  value: number
}

export interface ClienteTop {
  id:            string
  nome:          string
  totalGasto:    number
  totalGastoFmt: string
  barWidthPct:   number
}

export interface ClienteSemRetorno {
  id:         string
  nome:       string
  telefone:   string
  dias:       number
  badgeLabel: string
  badgeBg:    string
  badgeColor: string
}

// ── Hook ───────────────────────────────────────────────────────────

export function useRelatorios() {
  const { lancamentos, ordens, instaladores, servicos, clientes } = useApp()

  // ── Financeiro ─────────────────────────────────────────────────
  const [periodo, setPeriodo] = useState<Periodo>('mes')

  const filtered = useMemo(() => {
    const startStr = toDateStr(getPeriodStart(periodo))
    return lancamentos.filter(l => l.data >= startStr)
  }, [lancamentos, periodo])

  const receitas = useMemo(() => filtered.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0), [filtered])
  const despesas = useMemo(() => filtered.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0), [filtered])
  const lucro    = receitas - despesas

  const kpisFinanceiro: KpiRel[] = [
    { label: 'Receitas',      value: fmtBRL(receitas), color: '#34d399' },
    { label: 'Despesas',      value: fmtBRL(despesas), color: '#ff6b35' },
    { label: 'Lucro Líquido', value: fmtBRL(lucro),    color: lucro >= 0 ? '#34d399' : '#e8304a' },
  ]

  const chartData: ChartDataPoint[] = useMemo(() => {
    const map = new Map<string, { receitas: number; despesas: number }>()

    if (periodo === 'semana') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        map.set(toDateStr(d), { receitas: 0, despesas: 0 })
      }
    } else if (periodo === 'mes') {
      const now  = new Date()
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      for (let d = 1; d <= days; d++) {
        const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        map.set(key, { receitas: 0, despesas: 0 })
      }
    } else {
      filtered.forEach(l => {
        const key = l.data.slice(0, 7)
        if (!map.has(key)) map.set(key, { receitas: 0, despesas: 0 })
      })
    }

    filtered.forEach(l => {
      const key = (periodo === 'semana' || periodo === 'mes') ? l.data : l.data.slice(0, 7)
      if (map.has(key)) {
        const entry = map.get(key)!
        if (l.tipo === 'entrada') entry.receitas += l.valor
        else                       entry.despesas += l.valor
      }
    })

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: (periodo === 'semana' || periodo === 'mes')
          ? new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : new Date(date + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        receitas: vals.receitas,
        despesas: vals.despesas,
        saldo:    vals.receitas - vals.despesas,
      }))
  }, [filtered, periodo])

  const lancamentosFiltrados: LancamentoFiltrado[] = useMemo(
    () => filtered.slice(0, 10).map(l => ({
      ...l,
      dataFmt:   fmtDateStr(l.data),
      valorFmt:  `${l.tipo === 'entrada' ? '+' : '-'}${fmtBRL(l.valor)}`,
      tipoStr:   l.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída',
      tipoBg:    l.tipo === 'entrada' ? 'rgba(52,211,153,0.12)' : 'rgba(255,107,53,0.12)',
      tipoColor: l.tipo === 'entrada' ? '#34d399' : '#ff6b35',
    })),
    [filtered],
  )

  const filteredCount    = filtered.length
  const lancamentosExtras = Math.max(0, filteredCount - 10)

  // ── Técnicos ───────────────────────────────────────────────────
  const ranking: TecnicoRanking[] = useMemo(() => {
    const raw = instaladores.map(inst => {
      const minhas = ordens.filter(o => o.instaladorId === inst.id && o.status === 'concluido')
      const fat    = minhas.reduce((s, o) => s + o.valorTotal, 0)
      const ticket = minhas.length > 0 ? fat / minhas.length : 0
      const tempoTotal = minhas.reduce((s, o) => {
        const t = o.servicos.reduce((st, item) => {
          const sv = servicos.find(s => s.id === item.servicoId)
          return st + (sv?.tempEstimado ?? 0)
        }, 0)
        return s + t
      }, 0)
      const tempoMedio = minhas.length > 0 ? tempoTotal / minhas.length : 0
      return { inst, osConcluidas: minhas.length, faturamento: fat, ticket, tempoMedio }
    }).sort((a, b) => b.faturamento - a.faturamento)

    const maxFat = Math.max(...raw.map(r => r.faturamento), 1)

    return raw.map((r, i) => ({
      id:               r.inst.id,
      nome:             r.inst.nome,
      primeiroNome:     r.inst.nome.split(' ')[0],
      especialidadesStr: r.inst.especialidades.slice(0, 2).join(' · '),
      osConcluidas:     r.osConcluidas,
      faturamento:      r.faturamento,
      faturamentoFmt:   fmtBRL(r.faturamento),
      ticketFmt:        fmtBRL(r.ticket),
      tempoMedioFmt:    `${r.tempoMedio.toFixed(1)}h`,
      comissaoStr:      `${r.inst.comissaoPadrao}%`,
      barWidthPct:      (r.faturamento / maxFat) * 100,
      posicao:          i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`,
    }))
  }, [instaladores, ordens, servicos])

  const rankingChartData = useMemo(
    () => ranking.map(r => ({ name: r.primeiroNome, faturamento: r.faturamento })),
    [ranking],
  )

  // ── Serviços ───────────────────────────────────────────────────
  const statsServicos: ServicoStat[] = useMemo(() => {
    const map = new Map<string, { nome: string; count: number; receita: number }>()
    servicos.forEach(s => map.set(s.id, { nome: s.nome, count: 0, receita: 0 }))
    ordens.forEach(o => {
      if (o.status === 'cancelado') return
      o.servicos.forEach(item => {
        const entry = map.get(item.servicoId)
        if (entry) { entry.count++; entry.receita += item.preco }
      })
    })
    const raw      = Array.from(map.values()).sort((a, b) => b.receita - a.receita)
    const maxCount = Math.max(...raw.map(s => s.count), 1)
    return raw.map(s => ({
      nome:             s.nome,
      count:            s.count,
      receita:          s.receita,
      receitaFmt:       fmtBRL(s.receita),
      precoUnitarioFmt: fmtBRL(servicos.find(sv => sv.nome === s.nome)?.preco ?? 0),
      barWidthPct:      (s.count / maxCount) * 100,
    }))
  }, [servicos, ordens])

  const pieData: PieDataPoint[] = useMemo(
    () => statsServicos.slice(0, 7).map(s => ({ name: s.nome.split(' ').slice(0, 2).join(' '), value: s.count })),
    [statsServicos],
  )

  // ── Clientes ───────────────────────────────────────────────────
  const topClientes: ClienteTop[] = useMemo(() => {
    const sorted   = [...clientes].sort((a, b) => b.totalGasto - a.totalGasto).slice(0, 10)
    const maxGasto = sorted[0]?.totalGasto || 1
    return sorted.map(c => ({
      id:            c.id,
      nome:          c.nome,
      totalGasto:    c.totalGasto,
      totalGastoFmt: fmtBRL(c.totalGasto),
      barWidthPct:   (c.totalGasto / maxGasto) * 100,
    }))
  }, [clientes])

  const semRetorno: ClienteSemRetorno[] = useMemo(() => {
    const now    = new Date()
    const result: ClienteSemRetorno[] = []
    clientes.forEach(c => {
      const concluidas = ordens.filter(
        o => o.clienteId === c.id && o.status === 'concluido' && o.dataFinalizacao,
      )
      if (concluidas.length === 0) return
      const ultima = concluidas
        .map(o => new Date(o.dataFinalizacao! + 'T00:00:00').getTime())
        .sort((a, b) => b - a)[0]
      const dias = Math.floor((now.getTime() - ultima) / 86_400_000)
      if (dias < 30) return
      result.push({
        id:         c.id,
        nome:       c.nome,
        telefone:   c.telefone,
        dias,
        badgeLabel: `${dias}d sem contato`,
        badgeBg:    dias >= 90 ? 'rgba(232,48,74,0.12)'  : dias >= 60 ? 'rgba(255,107,53,0.12)' : 'rgba(245,158,11,0.12)',
        badgeColor: dias >= 90 ? '#e8304a'               : dias >= 60 ? '#ff6b35'               : '#f59e0b',
      })
    })
    return result.sort((a, b) => b.dias - a.dias)
  }, [clientes, ordens])

  const comRetorno  = clientes.filter(c => ordens.some(o => o.clienteId === c.id && o.status === 'concluido')).length
  const taxaRetorno = clientes.length > 0 ? Math.round((comRetorno / clientes.length) * 100) : 0

  const sem30 = semRetorno.filter(r => r.dias >= 30 && r.dias < 60).length
  const sem60 = semRetorno.filter(r => r.dias >= 60 && r.dias < 90).length
  const sem90 = semRetorno.filter(r => r.dias >= 90).length

  const kpisClientes: KpiRel[] = [
    { label: 'Total de Clientes', value: String(clientes.length), color: 'var(--wrap-text)' },
    { label: 'Sem retorno 30d+',  value: String(sem30),           color: '#ff6b35'          },
    { label: 'Sem retorno 60d+',  value: String(sem60),           color: '#e8304a'          },
    { label: 'Taxa de Retorno',   value: `${taxaRetorno}%`,       color: '#34d399'          },
  ]

  return {
    // Financeiro
    periodo,
    setPeriodo,
    PERIODO_LABEL,
    kpisFinanceiro,
    chartData,
    lancamentosFiltrados,
    filteredCount,
    lancamentosExtras,
    // Técnicos
    ranking,
    rankingChartData,
    // Serviços
    PIE_COLORS,
    pieData,
    statsServicos,
    // Clientes
    kpisClientes,
    topClientes,
    semRetorno,
    sem30,
    sem60,
    sem90,
  }
}
