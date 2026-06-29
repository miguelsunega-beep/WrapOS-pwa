import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Users, Wrench, Tag, Printer, Calendar } from 'lucide-react'
import {
  useRelatorios,
  fmtBRL,
} from '../hooks/useRelatorios'
import type {
  Periodo,
  KpiRel,
  ChartDataPoint,
  LancamentoFiltrado,
  TecnicoRanking,
  ServicoStat,
  PieDataPoint,
  ClienteTop,
  ClienteSemRetorno,
} from '../hooks/useRelatorios'

// ── Chart tooltip ─────────────────────────────────────────────────

interface TooltipPayload {
  name:  string
  value: number
  color: string
}

function ChartTooltip({ active, payload, label }: {
  active?:  boolean
  payload?: TooltipPayload[]
  label?:   string
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

interface TabFinanceiroProps {
  periodo:              Periodo
  setPeriodo:           (p: Periodo) => void
  PERIODO_LABEL:        Record<Periodo, string>
  kpisFinanceiro:       KpiRel[]
  chartData:            ChartDataPoint[]
  lancamentosFiltrados: LancamentoFiltrado[]
  filteredCount:        number
  lancamentosExtras:    number
}

function TabFinanceiro({
  periodo, setPeriodo, PERIODO_LABEL,
  kpisFinanceiro, chartData,
  lancamentosFiltrados, filteredCount, lancamentosExtras,
}: TabFinanceiroProps) {
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
        {kpisFinanceiro.map(item => (
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
            <Line type="monotone" dataKey="receitas" name="Receitas" stroke="#34d399" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="despesas"  name="Despesas" stroke="#ff6b35" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="saldo"     name="Saldo"    stroke="var(--wrap-accent)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
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
          {filteredCount === 0 ? (
            <p className="px-5 py-6 text-center text-[12px]" style={{ color: 'var(--wrap-muted)' }}>
              Nenhum lançamento no período
            </p>
          ) : lancamentosFiltrados.map(l => (
            <div key={l.id} className="flex items-center gap-3 px-5 py-2.5">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: l.tipoBg, color: l.tipoColor }}
              >
                {l.tipoStr}
              </span>
              <span className="flex-1 text-[12px] truncate" style={{ color: 'var(--wrap-text)' }}>{l.descricao}</span>
              <span className="text-[11px] shrink-0" style={{ color: 'var(--wrap-muted)' }}>{l.dataFmt}</span>
              <span
                className="text-[13px] font-semibold shrink-0"
                style={{ color: l.tipoColor }}
              >
                {l.valorFmt}
              </span>
            </div>
          ))}
          {lancamentosExtras > 0 && (
            <p className="px-5 py-3 text-center text-[11px]" style={{ color: 'var(--wrap-muted)' }}>
              +{lancamentosExtras} lançamentos no período
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Técnicos ─────────────────────────────────────────────────

interface TabTecnicosProps {
  ranking:          TecnicoRanking[]
  rankingChartData: { name: string; faturamento: number }[]
}

function TabTecnicos({ ranking, rankingChartData }: TabTecnicosProps) {
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
          <BarChart data={rankingChartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
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
            key={r.id}
            className="px-5 py-4"
            style={{ borderBottom: i < ranking.length - 1 ? '1px solid var(--wrap-border)' : 'none' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[18px] shrink-0">{r.posicao}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--wrap-text)' }}>{r.nome}</p>
                <p className="text-[11px]" style={{ color: 'var(--wrap-muted)' }}>{r.especialidadesStr}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[14px] font-bold" style={{ color: 'var(--wrap-accent)' }}>{r.faturamentoFmt}</p>
                <p className="text-[11px]" style={{ color: 'var(--wrap-muted)' }}>{r.osConcluidas} OS</p>
              </div>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--wrap-border2)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${r.barWidthPct}%`, background: 'var(--wrap-accent)' }}
              />
            </div>
            <div className="flex gap-4 mt-2">
              {[
                { label: 'Ticket médio',    value: r.ticketFmt     },
                { label: 'Tempo médio/OS',  value: r.tempoMedioFmt },
                { label: 'Comissão',        value: r.comissaoStr   },
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

interface TabServicosProps {
  PIE_COLORS: string[]
  pieData:    PieDataPoint[]
  statsServicos: ServicoStat[]
}

function TabServicos({ PIE_COLORS, pieData, statsServicos }: TabServicosProps) {
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
            {statsServicos.slice(0, 5).map((s, i) => (
              <div key={s.nome}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span style={{ color: 'var(--wrap-text)' }}>{s.nome}</span>
                  <span style={{ color: 'var(--wrap-accent)', fontWeight: 600 }}>{s.receitaFmt}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--wrap-border2)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.barWidthPct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
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
            {statsServicos.map((s, i) => (
              <tr
                key={s.nome}
                style={{ borderBottom: i < statsServicos.length - 1 ? '1px solid var(--wrap-border)' : 'none' }}
              >
                <td className="px-5 py-3 text-[13px] font-medium" style={{ color: 'var(--wrap-text)' }}>{s.nome}</td>
                <td className="px-5 py-3 text-[13px]" style={{ color: 'var(--wrap-muted)' }}>{s.count}</td>
                <td className="px-5 py-3 text-[13px] font-semibold" style={{ color: '#34d399' }}>{s.receitaFmt}</td>
                <td className="px-5 py-3 text-[13px]" style={{ color: 'var(--wrap-muted)' }}>{s.precoUnitarioFmt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab: Clientes ─────────────────────────────────────────────────

interface TabClientesProps {
  kpisClientes: KpiRel[]
  topClientes:  ClienteTop[]
  semRetorno:   ClienteSemRetorno[]
  sem30:        number
  sem60:        number
  sem90:        number
}

function TabClientes({ kpisClientes, topClientes, semRetorno, sem30, sem60, sem90 }: TabClientesProps) {
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpisClientes.map(item => (
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
              <span className="text-[13px] font-bold" style={{ color: 'var(--wrap-accent)' }}>{c.totalGastoFmt}</span>
            </div>
            <div className="ml-9 h-1.5 rounded-full" style={{ background: 'var(--wrap-border2)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${c.barWidthPct}%`, background: 'var(--wrap-accent)' }}
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
            {semRetorno.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--wrap-text)' }}>{r.nome}</p>
                  <p className="text-[11px]" style={{ color: 'var(--wrap-muted)' }}>{r.telefone}</p>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: r.badgeBg, color: r.badgeColor }}
                >
                  {r.badgeLabel}
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

// ── Main component ─────────────────────────────────────────────────

type Aba = 'financeiro' | 'tecnicos' | 'servicos' | 'clientes'

const ABAS: { key: Aba; label: string; icon: typeof TrendingUp }[] = [
  { key: 'financeiro', label: 'Financeiro', icon: TrendingUp },
  { key: 'tecnicos',   label: 'Técnicos',   icon: Wrench     },
  { key: 'servicos',   label: 'Serviços',   icon: Tag        },
  { key: 'clientes',   label: 'Clientes',   icon: Users      },
]

export function Relatorios() {
  const [aba, setAba] = useState<Aba>('financeiro')

  const {
    periodo, setPeriodo, PERIODO_LABEL,
    kpisFinanceiro, chartData,
    lancamentosFiltrados, filteredCount, lancamentosExtras,
    ranking, rankingChartData,
    PIE_COLORS, pieData, statsServicos,
    kpisClientes, topClientes, semRetorno, sem30, sem60, sem90,
  } = useRelatorios()

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
            const Icon   = tab.icon
            const active = aba === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setAba(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-all -mb-px"
                style={{
                  borderBottomColor: active ? 'var(--wrap-accent)' : 'transparent',
                  color:      active ? 'var(--wrap-accent)' : 'var(--wrap-muted)',
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
        {aba === 'financeiro' && (
          <TabFinanceiro
            periodo={periodo}
            setPeriodo={setPeriodo}
            PERIODO_LABEL={PERIODO_LABEL}
            kpisFinanceiro={kpisFinanceiro}
            chartData={chartData}
            lancamentosFiltrados={lancamentosFiltrados}
            filteredCount={filteredCount}
            lancamentosExtras={lancamentosExtras}
          />
        )}
        {aba === 'tecnicos' && (
          <TabTecnicos
            ranking={ranking}
            rankingChartData={rankingChartData}
          />
        )}
        {aba === 'servicos' && (
          <TabServicos
            PIE_COLORS={PIE_COLORS}
            pieData={pieData}
            statsServicos={statsServicos}
          />
        )}
        {aba === 'clientes' && (
          <TabClientes
            kpisClientes={kpisClientes}
            topClientes={topClientes}
            semRetorno={semRetorno}
            sem30={sem30}
            sem60={sem60}
            sem90={sem90}
          />
        )}
      </div>
    </>
  )
}
