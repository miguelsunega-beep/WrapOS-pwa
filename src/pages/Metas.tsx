import { useState } from 'react'
import { toast } from 'sonner'
import { Target, Award, Pencil } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { useApp } from '../context/AppContext'

// ── Module-level helpers ──────────────────────────────────────────
const mesAtual = new Date().toISOString().slice(0, 7)

const diasRestantes = (() => {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate() - t.getDate()
})()

const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const MEDALHAS = ['🥇', '🥈', '🥉', '4º', '5º', '6º', '7º', '8º', '9º']

// ── Types ─────────────────────────────────────────────────────────
interface MetaForm { faturamento: string; numeroOS: string; ticketMedio: string; novosClientes: string }

// ── Component ─────────────────────────────────────────────────────
export function Metas() {
  const { meta, ordens, clientes, instaladores, atualizarMeta } = useApp()

  // ── Computed KPIs ─────────────────────────────────────────────
  const osConcluidas  = ordens.filter(
    o => o.status === 'concluido' && o.dataFinalizacao?.startsWith(mesAtual)
  )
  const faturamento   = osConcluidas.reduce((s, o) => s + o.valorTotal, 0)
  const numOS         = osConcluidas.length
  const ticketMedio   = numOS > 0 ? faturamento / numOS : 0
  const novosClientes = clientes.filter(c => c.dataCadastro.startsWith(mesAtual)).length

  // ── Ranking ───────────────────────────────────────────────────
  const ranking = instaladores
    .map(inst => {
      const instOS   = osConcluidas.filter(o => o.instaladorId === inst.id)
      const faturado = instOS.reduce((s, o) => s + o.valorTotal, 0)
      return { id: inst.id, nome: inst.nome, osMes: instOS.length, faturado }
    })
    .sort((a, b) => b.faturado - a.faturado)

  const maxFaturado = ranking[0]?.faturado || 1

  // ── Modal Editar Metas ────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<MetaForm>({
    faturamento:   String(meta.faturamento),
    numeroOS:      String(meta.numeroOS),
    ticketMedio:   String(meta.ticketMedio),
    novosClientes: String(meta.novosClientes),
  })

  const abrirEditar = () => {
    setForm({
      faturamento:   String(meta.faturamento),
      numeroOS:      String(meta.numeroOS),
      ticketMedio:   String(meta.ticketMedio),
      novosClientes: String(meta.novosClientes),
    })
    setEditOpen(true)
  }

  const handleSalvar = () => {
    atualizarMeta({
      faturamento:   Math.max(0, parseFloat(form.faturamento)  || 0),
      numeroOS:      Math.max(0, parseInt(form.numeroOS)        || 0),
      ticketMedio:   Math.max(0, parseFloat(form.ticketMedio)   || 0),
      novosClientes: Math.max(0, parseInt(form.novosClientes)   || 0),
    })
    toast.success('Metas atualizadas com sucesso!')
    setEditOpen(false)
  }

  const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5'

  const metaCards = [
    {
      titulo:  'Faturamento Mensal',
      atual:   faturamento,
      meta:    meta.faturamento,
      display: fmtCurrency,
      cor:     'from-accent to-pink-600',
    },
    {
      titulo:  'Número de OS',
      atual:   numOS,
      meta:    meta.numeroOS,
      display: (v: number) => `${v} OS`,
      cor:     'from-blue-500 to-cyan-500',
    },
    {
      titulo:  'Ticket Médio',
      atual:   ticketMedio,
      meta:    meta.ticketMedio,
      display: fmtCurrency,
      cor:     'from-amber-500 to-orange-500',
    },
    {
      titulo:  'Novos Clientes',
      atual:   novosClientes,
      meta:    meta.novosClientes,
      display: (v: number) => `${v} clientes`,
      cor:     'from-purple-500 to-violet-600',
    },
  ]

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ui-text">Metas</h1>
          <p className="text-gray-500 text-xs mt-0.5">Acompanhamento de metas — {mesLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Target size={15} className="text-accent" />
            <span>{diasRestantes} dias restantes</span>
          </div>
          <Button onClick={abrirEditar}>
            <Pencil size={14} />
            Editar Metas
          </Button>
        </div>
      </div>

      {/* Metas grid */}
      <div className="grid grid-cols-2 gap-4">
        {metaCards.map(m => {
          const pct = m.meta > 0 ? Math.round((m.atual / m.meta) * 100) : 0
          return (
            <Card key={m.titulo}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400">{m.titulo}</p>
                <span className={`text-xs font-bold ${pct >= 100 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-accent'}`}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${m.cor} transition-all duration-700`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-600">
                <span>{m.display(m.atual)}</span>
                <span>meta: {m.display(m.meta)}</span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Ranking de Técnicos */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-ui-border flex items-center gap-2">
          <Award size={15} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-ui-text">Ranking de Técnicos — {mesLabel}</h2>
        </div>
        <div className="divide-y divide-ui-border">
          {ranking.map((tec, i) => (
            <div key={tec.id} className="px-5 py-4 flex items-center gap-4">
              <span className="text-xl w-8 shrink-0">{MEDALHAS[i] ?? `${i + 1}º`}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ui-text">{tec.nome}</p>
                <p className="text-xs text-gray-500">{tec.osMes} OS concluídas no mês</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-ui-text">{fmtCurrency(tec.faturado)}</p>
                <p className="text-[11px] text-gray-600">faturados</p>
              </div>
              <div className="w-24">
                <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-pink-600 rounded-full"
                    style={{ width: `${(tec.faturado / maxFaturado) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal Editar Metas */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar Metas" size="sm">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Meta de Faturamento (R$)</label>
            <input
              type="number"
              min={0}
              value={form.faturamento}
              onChange={e => setForm(p => ({ ...p, faturamento: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Meta de Número de OS</label>
            <input
              type="number"
              min={0}
              value={form.numeroOS}
              onChange={e => setForm(p => ({ ...p, numeroOS: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Meta de Ticket Médio (R$)</label>
            <input
              type="number"
              min={0}
              value={form.ticketMedio}
              onChange={e => setForm(p => ({ ...p, ticketMedio: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Meta de Novos Clientes</label>
            <input
              type="number"
              min={0}
              value={form.novosClientes}
              onChange={e => setForm(p => ({ ...p, novosClientes: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-ui-border">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvar}>Salvar Metas</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
