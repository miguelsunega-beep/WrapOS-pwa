import { useState } from 'react'
import { toast } from 'sonner'
import {
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, BarChart2, Eye, EyeOff,
} from 'lucide-react'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ActionButton } from '../components/ActionButton'
import { Modal } from '../components/Modal'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { Relatorios } from './Relatorios'

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
const CATEGORIAS_SAIDA  = ['Estoque', 'Folha', 'Aluguel', 'Marketing', 'Utilities', 'Manutenção', 'Outros']

const initForm = () => ({
  tipo: 'entrada' as 'entrada' | 'saida',
  categoria: 'OS',
  descricao: '',
  valor: '',
  data: new Date().toISOString().slice(0, 10),
  formaPagamento: 'PIX',
})

export function Financeiro() {
  const { lancamentos, ordens, adicionarLancamento, deletarLancamento } = useApp()
  const { theme } = useTheme()

  const gridColor    = theme === 'dark' ? '#1e2140' : '#e5e7eb'
  const tickColor    = theme === 'dark' ? '#6b7280' : '#4b5563'
  const tooltipBg    = theme === 'dark' ? '#18182a' : '#ffffff'
  const tooltipBrd   = theme === 'dark' ? '#1e2140' : '#e5e7eb'
  const tooltipLabel = theme === 'dark' ? '#9ca3af' : '#6b7280'
  const tooltipItem  = theme === 'dark' ? '#fff'    : '#111827'

  // ── Month select ──────────────────────────────────────────────
  const today = new Date()
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .replace(/^./, c => c.toUpperCase())
    return { value, label }
  })
  const [mesSel, setMesSel] = useState(meses[0].value)

  // ── KPIs ──────────────────────────────────────────────────────
  const lancMes = lancamentos.filter(l => l.data.startsWith(mesSel))
  const receita = lancMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const despesas = lancMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const lucro = receita - despesas
  const osConcluidas = ordens.filter(o => o.status === 'concluido' && o.dataFinalizacao?.startsWith(mesSel))
  const ticketMedio = osConcluidas.length > 0
    ? osConcluidas.reduce((s, o) => s + o.valorTotal, 0) / osConcluidas.length
    : 0

  // ── Chart data (last 6 months, oldest → newest) ───────────────
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mes = d.toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '').replace(/^./, c => c.toUpperCase())
    const receita = lancamentos
      .filter(l => l.tipo === 'entrada' && l.data.startsWith(key))
      .reduce((s, l) => s + l.valor, 0)
    const despesa = lancamentos
      .filter(l => l.tipo === 'saida' && l.data.startsWith(key))
      .reduce((s, l) => s + l.valor, 0)
    return { mes, receita, despesa }
  })

  // ── Sorted table ──────────────────────────────────────────────
  const lancOrdenados = [...lancMes].sort((a, b) => b.data.localeCompare(a.data))

  // ── Delete confirm ────────────────────────────────────────────
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const handleDelete = () => {
    if (!confirmar) return
    deletarLancamento(confirmar)
    setConfirmar(null)
    toast.success('Lançamento excluído.')
  }

  // ── Modal form ────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(initForm())

  const categorias = form.tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA

  const handleSalvar = () => {
    if (!form.descricao.trim()) { toast.error('Informe a descrição.'); return }
    const valor = parseFloat(form.valor)
    if (!valor || valor <= 0) { toast.error('Informe um valor válido.'); return }
    adicionarLancamento({
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao.trim(),
      valor,
      data: form.data,
      formaPagamento: form.formaPagamento,
    })
    toast.success('Lançamento adicionado com sucesso!')
    setModalOpen(false)
    setForm(initForm())
  }

  const closeModal = () => { setModalOpen(false); setForm(initForm()) }

  const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5'

  const [aba, setAba] = useState<'lancamentos' | 'relatorios'>('lancamentos')
  const [kpisOcultos, setKpisOcultos] = useState(false)

  return (
    <div>
      {/* Header — always visible */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-ui-text">Financeiro</h1>
            <p className="text-gray-500 text-xs mt-0.5">Receitas, despesas e fluxo de caixa</p>
          </div>
          {aba === 'lancamentos' && (
            <div className="flex items-center gap-2">
              <select
                value={mesSel}
                onChange={e => setMesSel(e.target.value)}
                className="bg-surface-700 border border-ui-border text-sm text-gray-400 rounded-lg px-3 py-2 focus:border-accent/50 transition-colors"
              >
                {meses.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <Button onClick={() => setModalOpen(true)}>
                <Plus size={15} />
                Novo Lançamento
              </Button>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 border-b border-ui-border">
          {([
            { key: 'lancamentos' as const, label: 'Lançamentos' },
            { key: 'relatorios'  as const, label: 'Relatórios'  },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setAba(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                aba === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.key === 'relatorios' && <BarChart2 size={14} />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Relatórios tab */}
      {aba === 'relatorios' && <Relatorios />}

      {/* Lançamentos tab */}
      {aba === 'lancamentos' && (
      <div className="p-6 space-y-5">

      {/* KPIs */}
      <div>
        {/* Barra de privacidade — olho discreto acima dos KPIs */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setKpisOcultos(o => !o)}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-surface-600/40"
            title={kpisOcultos ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {kpisOcultos ? <EyeOff size={13} /> : <Eye size={13} />}
            {kpisOcultos ? 'Mostrar valores' : 'Ocultar valores'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {([
            { label: 'Receita Bruta',  value: receita,     icon: TrendingUp,   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Despesas',       value: despesas,    icon: TrendingDown, color: 'text-accent',      bg: 'bg-accent/10'      },
            { label: 'Lucro Líquido',  value: lucro,       icon: DollarSign,   color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
            { label: 'Ticket Médio',   value: ticketMedio, icon: ArrowUpRight, color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
          ] as const).map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.label}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{item.label}</p>
                    <p
                      className={`text-2xl font-bold mt-2 transition-all duration-200 ${item.value < 0 ? 'text-red-400' : 'text-ui-text'} ${
                        kpisOcultos ? 'blur-md select-none pointer-events-none' : ''
                      }`}
                    >
                      {fmt(item.value)}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-1.5">
                      {item.label === 'Ticket Médio'
                        ? `${osConcluidas.length} OS concluída${osConcluidas.length !== 1 ? 's' : ''}`
                        : `${lancMes.length} lançamento${lancMes.length !== 1 ? 's' : ''} no mês`}
                    </p>
                  </div>
                  <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon size={17} className={item.color} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Chart */}
      <Card>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-ui-text">Fluxo de Caixa — Últimos 6 Meses</h2>
            <p className="text-gray-600 text-xs mt-0.5">Receita vs. Despesas</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={18} barGap={4} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: tickColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
              width={46}
            />
            <Tooltip
              contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBrd}`, borderRadius: 10 }}
              labelStyle={{ color: tooltipLabel, fontSize: 11 }}
              itemStyle={{ color: tooltipItem, fontSize: 12 }}
              formatter={(v: number) => fmt(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
            <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesa" name="Despesas" fill="#E94560" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Lançamentos */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-ui-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ui-text">Lançamentos do Mês</h2>
          <span className="text-xs text-gray-500">{lancOrdenados.length} registro{lancOrdenados.length !== 1 ? 's' : ''}</span>
        </div>
        {lancOrdenados.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-600 text-sm">
            Nenhum lançamento neste mês.
          </div>
        ) : (
          <div className="divide-y divide-ui-border">
            {lancOrdenados.map(l => (
              <div key={l.id} className="group px-5 py-3.5 flex items-center gap-4 hover:bg-surface-600/40 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${l.tipo === 'entrada' ? 'bg-emerald-500/10' : 'bg-accent/10'}`}>
                  {l.tipo === 'entrada'
                    ? <ArrowUpRight size={14} className="text-emerald-400" />
                    : <ArrowDownRight size={14} className="text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{l.descricao}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {fmtDate(l.data)} · {l.categoria} · {l.formaPagamento}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${l.tipo === 'entrada' ? 'text-emerald-400' : 'text-accent'}`}>
                      {l.tipo === 'entrada' ? '+' : '−'}{fmt(l.valor)}
                    </p>
                    <Badge
                      label={l.tipo === 'entrada' ? 'Receita' : 'Despesa'}
                      variant={l.tipo === 'entrada' ? 'success' : 'danger'}
                    />
                  </div>
                  <button
                    onClick={() => setConfirmar(l.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      </div>
      )}

      {/* Modal Novo Lançamento */}
      <Modal isOpen={modalOpen} onClose={closeModal} title="Novo Lançamento" size="md">
        <div className="space-y-4">
          {/* Tipo toggle */}
          <div>
            <label className={labelCls}>Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['entrada', 'saida'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    const cats = t === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA
                    setForm(p => ({ ...p, tipo: t, categoria: cats[0] }))
                  }}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.tipo === t
                      ? t === 'entrada'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'border-ui-border text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t === 'entrada' ? '▲ Entrada' : '▼ Saída'}
                </button>
              ))}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className={labelCls}>Categoria</label>
            <select
              value={form.categoria}
              onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
              className={inputCls}
            >
              {categorias.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className={labelCls}>Descrição <span className="text-accent">*</span></label>
            <input
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Ex: Pagamento OS #1090 — João Silva"
              className={inputCls}
            />
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Valor (R$) <span className="text-accent">*</span></label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.valor}
                onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                placeholder="0,00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Data</label>
              <input
                type="date"
                value={form.data}
                onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Forma de pagamento */}
          <div>
            <label className={labelCls}>Forma de Pagamento</label>
            <select
              value={form.formaPagamento}
              onChange={e => setForm(p => ({ ...p, formaPagamento: e.target.value }))}
              className={inputCls}
            >
              {FORMAS_PAGAMENTO.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <ActionButton onClick={handleSalvar}>Salvar Lançamento</ActionButton>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal isOpen={!!confirmar} onClose={() => setConfirmar(null)} title="Excluir Lançamento" size="sm">
        <p className="text-sm text-gray-400 mb-5">
          Tem certeza que deseja excluir este lançamento? Essa ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
