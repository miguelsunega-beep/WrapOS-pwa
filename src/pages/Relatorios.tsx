import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Users, Wrench, Tag, Printer, Calendar } from 'lucide-react'
import { useApp } from '../context/AppContext'

// ── Helpers ───────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

type Periodo = 'semana' | 'mes' | 'trimestre' | 'ano'

function getPeriodStart(p: Periodo): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (p === 'semana') {
    const d = new Date(now)
    d.setDate(now.getDate() - 6)
    return d
  }
  if (p === 'mes') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  if (p === 'trimestre') {
    const m = now.getMonth()
    const qStart = Math.floor(m / 3) * 3
    return new Date(now.getFullYear(), qStart, 1)
  }
  return new Date(now.getFullYear(), 0, 1)
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const PERIODO_LABEL: Record<Periodo, string> = {
  semana:     'Últimos 7 dias',
  mes:        'Este mês',
  trimestre:  'Este trimestre',
  ano:        'Este ano',
}

// ── Chart tooltip ─────────────────────────────────────────────────

interface TooltipPayload {
  name:  string
  value: number
  color: string
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayload[]
  label?:  string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--wrap-surface2)',
      border: '1px solid var(--wrap-border2)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      {label && <p style={{ color: 'var(--wrap-muted)', marginBottom: 6 }}>{label}</p>}
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--wrap-muted)' }}>{p.name}:</span>
          <span style={{ color: 'var(--wrap-text)', fontWeight: 600 }}>{fmtBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Tab: Financeiro ───────────────────────────────────────────────

function TabFinanceiro() {
  const { lancamentos } = useApp()
  const [periodo, setPeriodo] = useState<Periodo>('mes')

  const periodoStart = getPeriodStart(periodo)
  const startStr     = toDateStr(periodoStart)

  const filtered = lancamentos.filter(l => l.data >= startStr)

  const receitas  = filtered.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const despesas  = filtered.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const lucro     = receitas - despesas

  // Build chart data grouped by day/week/month
  const chartData = useMemo(() => {
    const map = new Map<string, { receitas: number; despesas: number }>()

    if (periodo === 'semana') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = toDateStr(d)
        map.set(key, { receitas: 0, despesas: 0 })
      }
    } else if (periodo === 'mes') {
      const now = new Date()
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
      const key = periodo === 'semana' || periodo === 'mes' ? l.data : l.data.slice(0, 7)
      if (map.has(key)) {
        const entry = map.get(key)!
        if (l.tipo === 'entrada') entry.receitas += l.valor
        else entry.despesas += l.valor
      }
    })

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: periodo === 'semana' || periodo === 'mes'
          ? new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : new Date(date + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        receitas:  vals.receitas,
        despesas:  vals.despesas,
        saldo:     vals.receitas - vals.despesas,
      }))
  }, [filtered, periodo])

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(PERIODO_LABEL) as Periodo[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={{
              background: periodo === p ? 'rgb(var(--wrap-accent-rgb) / 0.15)' : 'var(--wrap-surface2)',
              border: `1px solid ${periodo === p ? 'rgb(var(--wrap-accent-rgb) / 0.4)' : 'var(--wrap-border)'}`,
              color: periodo === p ? 'var(--wrap-accent)' : 'var(--wrap-muted)',
            }}
          >
            <Calendar size={11} />
            {PERIODO_LABEL[p]}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Receitas',    value: receitas, color: '#34d399' },
          { label: 'Despesas',    value: despesas, color: '#ff6b35' },
          { label: 'Lucro Líquido', value: lucro, color: lucro >= 0 ? '#34d399' : '#e8304a' },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-xl p-4"
            style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
          >
            <p className="text-[11px] font-medium" style={{ color: 'var(--wrap-muted)' }}>{item.label}</p>
            <p className="text-2xl font-bold mt-1.5" style={{ color: item.color }}>{fmtBRL(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
      >
        <p className="text-[12px] font-semibold mb-4" style={{ color: 'var(--wrap-text)' }}>
          Fluxo de Caixa — {PERIODO_LABEL[periodo]}
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--wrap-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--wrap-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'var(--wrap-muted)' }}
              iconType="circle"
              iconSize={8}
            />
            <Line type="monotone" dataKey="receitas" name="Receitas"  stroke="#34d399" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="despesas"  name="Despesas"  stroke="#ff6b35" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="saldo"     name="Saldo"     stroke="var(--wrap-accent)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent entries */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
      >
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--wrap-border)' }}>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--wrap-text)' }}>Lançamentos no período</p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--wrap-border)' }}>
          {filtered.length === 0 ? (
            <p className="px-5 py-6 text-center text-[12px]" style={{ color: 'var(--wrap-muted)' }}>
              Nenhum lançamento no período
            </p>
          ) : filtered.slice(0, 10).map(l => (
            <div key={l.id} className="flex items-center gap-3 px-5 py-2.5">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: l.tipo === 'entrada' ? 'rgba(52,211,153,0.12)' : 'rgba(255,107,53,0.12)',
                  color:      l.tipo === 'entrada' ? '#34d399' : '#ff6b35',
                }}
              >
                {l.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
              </span>
              <span className="flex-1 text-[12px] truncate" style={{ color: 'var(--wrap-text)' }}>{l.descricao}</span>
              <span className="text-[11px] shrink-0" style={{ color: 'var(--wrap-muted)' }}>{fmtDate(l.data)}</span>
              <span
                className="text-[13px] font-semibold shrink-0"
                style={{ color: l.tipo === 'entrada' ? '#34d399' : '#ff6b35' }}
              >
                {l.tipo === 'entrada' ? '+' : '-'}{fmtBRL(l.valor)}
              </span>
            </div>
          ))}
          {filtered.length > 10 && (
            <p className="px-5 py-3 text-center text-[11px]" style={{ color: 'var(--wrap-muted)' }}>
              +{filtered.length - 10} lançamentos no período
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Técnicos ─────────────────────────────────────────────────

function TabTecnicos() {
  const { instaladores, ordens, servicos } = useApp()

  const ranking = useMemo(() => {
    return instaladores.map(inst => {
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
  }, [instaladores, ordens, servicos])

  const maxFat = Math.max(...ranking.map(r => r.faturamento), 1)

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
      >
        <p className="text-[12px] font-semibold mb-4" style={{ color: 'var(--wrap-text)' }}>
          Faturamento por Técnico
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ranking.map(r => ({ name: r.inst.nome.split(' ')[0], faturamento: r.faturamento }))}
            margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--wrap-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--wrap-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="faturamento" name="Faturamento" fill="var(--wrap-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranking table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
      >
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--wrap-border)' }}>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--wrap-text)' }}>Ranking de Técnicos</p>
        </div>
        {ranking.length === 0 ? (
          <p className="px-5 py-8 text-center text-[12px]" style={{ color: 'var(--wrap-muted)' }}>
            Nenhum técnico cadastrado
          </p>
        ) : ranking.map((r, i) => (
          <div
            key={r.inst.id}
            className="px-5 py-4"
            style={{ borderBottom: i < ranking.length - 1 ? '1px solid var(--wrap-border)' : 'none' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[18px] shrink-0">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--wrap-text)' }}>{r.inst.nome}</p>
                <p className="text-[11px]" style={{ color: 'var(--wrap-muted)' }}>
                  {r.inst.especialidades.slice(0, 2).join(' · ')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[14px] font-bold" style={{ color: 'var(--wrap-accent)' }}>{fmtBRL(r.faturamento)}</p>
                <p className="text-[11px]" style={{ color: 'var(--wrap-muted)' }}>{r.osConcluidas} OS</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full" style={{ background: 'var(--wrap-border2)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(r.faturamento / maxFat) * 100}%`,
                  background: 'var(--wrap-accent)',
                }}
              />
            </div>
            <div className="flex gap-4 mt-2">
              {[
                { label: 'Ticket médio', value: fmtBRL(r.ticket) },
                { label: 'Tempo médio/OS', value: `${r.tempoMedio.toFixed(1)}h` },
                { label: 'Comissão', value: `${r.inst.comissaoPadrao}%` },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-[10px]" style={{ color: 'var(--wrap-muted)' }}>{stat.label}</p>
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--wrap-text)' }}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab: Serviços ─────────────────────────────────────────────────

const PIE_COLORS = ['var(--wrap-accent)', '#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#f87171', '#38bdf8']

function TabServicos() {
  const { servicos, ordens } = useApp()

  const stats = useMemo(() => {
    const map = new Map<string, { nome: string; count: number; receita: number }>()
    servicos.forEach(s => map.set(s.id, { nome: s.nome, count: 0, receita: 0 }))
    ordens.forEach(o => {
      if (o.status === 'cancelado') return
      o.servicos.forEach(item => {
        const entry = map.get(item.servicoId)
        if (entry) { entry.count++; entry.receita += item.preco }
      })
    })
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita)
  }, [servicos, ordens])

  const pieData = stats.slice(0, 7).map(s => ({ name: s.nome.split(' ').slice(0, 2).join(' '), value: s.count }))
  const maxCount = Math.max(...stats.map(s => s.count), 1)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        {/* Pie chart */}
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
        >
          <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--wrap-text)' }}>
            Mix de Serviços (OS)
          </p>
          {pieData.every(d => d.value === 0) ? (
            <p className="text-center py-16 text-[12px]" style={{ color: 'var(--wrap-muted)' }}>Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`${v} OS`, 'Quantidade']}
                  contentStyle={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border2)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: 'var(--wrap-muted)' }}
                  itemStyle={{ color: 'var(--wrap-text)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, color: 'var(--wrap-muted)' }}
                  iconType="circle"
                  iconSize={7}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 5 KPI */}
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
        >
          <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--wrap-text)' }}>
            Top 5 por Receita
          </p>
          <div className="space-y-3">
            {stats.slice(0, 5).map((s, i) => (
              <div key={s.nome}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span style={{ color: 'var(--wrap-text)' }}>{s.nome}</span>
                  <span style={{ color: 'var(--wrap-accent)', fontWeight: 600 }}>{fmtBRL(s.receita)}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--wrap-border2)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(s.count / maxCount) * 100}%`,
                      background: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--wrap-muted)' }}>{s.count} execuções</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
      >
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--wrap-border)' }}>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--wrap-text)' }}>Todos os Serviços</p>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--wrap-border)' }}>
              {['Serviço', 'Execuções', 'Receita Total', 'Preço Unitário'].map(h => (
                <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wrap-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr
                key={s.nome}
                style={{ borderBottom: i < stats.length - 1 ? '1px solid var(--wrap-border)' : 'none' }}
              >
                <td className="px-5 py-3 text-[13px] font-medium" style={{ color: 'var(--wrap-text)' }}>{s.nome}</td>
                <td className="px-5 py-3 text-[13px]" style={{ color: 'var(--wrap-muted)' }}>{s.count}</td>
                <td className="px-5 py-3 text-[13px] font-semibold" style={{ color: '#34d399' }}>{fmtBRL(s.receita)}</td>
                <td className="px-5 py-3 text-[13px]" style={{ color: 'var(--wrap-muted)' }}>
                  {fmtBRL(servicos.find(sv => sv.nome === s.nome)?.preco ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab: Clientes ─────────────────────────────────────────────────

function TabClientes() {
  const { clientes, ordens } = useApp()
  const now = new Date()

  const topClientes = useMemo(
    () => [...clientes].sort((a, b) => b.totalGasto - a.totalGasto).slice(0, 10),
    [clientes],
  )
  const maxGasto = topClientes[0]?.totalGasto || 1

  const semRetorno = useMemo(() => {
    const result: { cliente: typeof clientes[0]; dias: number }[] = []
    clientes.forEach(c => {
      const concluidas = ordens.filter(
        o => o.clienteId === c.id && o.status === 'concluido' && o.dataFinalizacao,
      )
      if (concluidas.length === 0) return
      const ultima = concluidas
        .map(o => new Date(o.dataFinalizacao! + 'T00:00:00').getTime())
        .sort((a, b) => b - a)[0]
      const dias = Math.floor((now.getTime() - ultima) / 86_400_000)
      if (dias >= 30) result.push({ cliente: c, dias })
    })
    return result.sort((a, b) => b.dias - a.dias)
  }, [clientes, ordens])

  const comRetorno = clientes.filter(c =>
    ordens.some(o => o.clienteId === c.id && o.status === 'concluido'),
  ).length

  const taxaRetorno = clientes.length > 0
    ? Math.round((comRetorno / clientes.length) * 100)
    : 0

  const sem30  = semRetorno.filter(r => r.dias >= 30 && r.dias < 60).length
  const sem60  = semRetorno.filter(r => r.dias >= 60 && r.dias < 90).length
  const sem90  = semRetorno.filter(r => r.dias >= 90).length

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total de Clientes', value: String(clientes.length), color: 'var(--wrap-text)' },
          { label: 'Sem retorno 30d+', value: String(sem30), color: '#ff6b35' },
          { label: 'Sem retorno 60d+', value: String(sem60), color: '#e8304a' },
          { label: 'Taxa de Retorno', value: `${taxaRetorno}%`, color: '#34d399' },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-xl p-4"
            style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
          >
            <p className="text-[11px] font-medium" style={{ color: 'var(--wrap-muted)' }}>{item.label}</p>
            <p className="text-2xl font-bold mt-1.5" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Top clientes */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
      >
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--wrap-border)' }}>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--wrap-text)' }}>Top 10 Clientes por Valor Gasto</p>
        </div>
        {topClientes.map((c, i) => (
          <div
            key={c.id}
            className="px-5 py-3"
            style={{ borderBottom: i < topClientes.length - 1 ? '1px solid var(--wrap-border)' : 'none' }}
          >
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-[13px] font-bold w-6 shrink-0" style={{ color: 'var(--wrap-muted)' }}>#{i + 1}</span>
              <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--wrap-text)' }}>{c.nome}</span>
              <span className="text-[13px] font-bold" style={{ color: 'var(--wrap-accent)' }}>{fmtBRL(c.totalGasto)}</span>
            </div>
            <div className="ml-9 h-1.5 rounded-full" style={{ background: 'var(--wrap-border2)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(c.totalGasto / maxGasto) * 100}%`, background: 'var(--wrap-accent)' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Sem retorno */}
      {semRetorno.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)' }}
        >
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--wrap-border)' }}>
            <p className="text-[12px] font-semibold" style={{ color: 'var(--wrap-text)' }}>
              Clientes sem retorno ({semRetorno.length})
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: 'var(--wrap-border)' }}>
            {semRetorno.map(({ cliente, dias }) => (
              <div key={cliente.id} className="flex items-center gap-3 px-5 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--wrap-text)' }}>{cliente.nome}</p>
                  <p className="text-[11px]" style={{ color: 'var(--wrap-muted)' }}>{cliente.telefone}</p>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded"
                  style={{
                    background: dias >= 90 ? 'rgba(232,48,74,0.12)' : dias >= 60 ? 'rgba(255,107,53,0.12)' : 'rgba(245,158,11,0.12)',
                    color:      dias >= 90 ? '#e8304a' : dias >= 60 ? '#ff6b35' : '#f59e0b',
                  }}
                >
                  {dias}d sem contato
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 px-5 py-3" style={{ borderTop: '1px solid var(--wrap-border)' }}>
            {[
              { label: '30–59 dias', count: sem30, color: '#f59e0b' },
              { label: '60–89 dias', count: sem60, color: '#ff6b35' },
              { label: '90+ dias',   count: sem90, color: '#e8304a' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                <span style={{ color: 'var(--wrap-muted)' }}>{b.label}:</span>
                <span style={{ color: b.color, fontWeight: 600 }}>{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

type Aba = 'financeiro' | 'tecnicos' | 'servicos' | 'clientes'

const ABAS: { key: Aba; label: string; icon: typeof TrendingUp }[] = [
  { key: 'financeiro', label: 'Financeiro', icon: TrendingUp },
  { key: 'tecnicos',   label: 'Técnicos',   icon: Wrench     },
  { key: 'servicos',   label: 'Serviços',   icon: Tag        },
  { key: 'clientes',   label: 'Clientes',   icon: Users      },
]

export function Relatorios() {
  const [aba, setAba] = useState<Aba>('financeiro')

  const handlePrint = () => window.print()

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          aside, header { display: none !important; }
          .no-print { display: none !important; }
          body, html { background: white !important; color: black !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="p-6 space-y-5" style={{ background: 'var(--wrap-bg)', minHeight: '100%' }}>
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-xl font-bold font-display" style={{ color: 'var(--wrap-text)' }}>
              Relatórios
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--wrap-muted)' }}>
              Análise de desempenho do negócio
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--wrap-surface2)', border: '1px solid var(--wrap-border)', color: 'var(--wrap-text)' }}
          >
            <Printer size={14} />
            Exportar PDF
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 no-print" style={{ borderBottom: '1px solid var(--wrap-border)', paddingBottom: 0 }}>
          {ABAS.map(tab => {
            const Icon = tab.icon
            const active = aba === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setAba(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-all -mb-px"
                style={{
                  borderBottomColor: active ? 'var(--wrap-accent)' : 'transparent',
                  color:  active ? 'var(--wrap-accent)' : 'var(--wrap-muted)',
                  background: active ? 'rgb(var(--wrap-accent-rgb) / 0.04)' : 'transparent',
                }}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {aba === 'financeiro' && <TabFinanceiro />}
        {aba === 'tecnicos'   && <TabTecnicos />}
        {aba === 'servicos'   && <TabServicos />}
        {aba === 'clientes'   && <TabClientes />}
      </div>
    </>
  )
}
