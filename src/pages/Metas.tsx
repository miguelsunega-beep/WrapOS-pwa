import { useState } from 'react'
import { Target, Award, Pencil } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { useMetas } from '../hooks/useMetas'

export function Metas() {
  const {
    form,
    setForm,
    resetForm,
    salvarMeta,
    metaCards,
    ranking,
    maxFaturado,
    mesLabel,
    diasRestantes,
  } = useMetas()

  const [editOpen, setEditOpen] = useState(false)

  const abrirEditar = () => {
    resetForm()
    setEditOpen(true)
  }

  const handleSalvar = () => {
    salvarMeta()
    setEditOpen(false)
  }

  const inputCls = 'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors'
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5'

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
        {metaCards.map(m => (
          <Card key={m.titulo}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400">{m.titulo}</p>
              <span className={`text-xs font-bold ${m.pct >= 100 ? 'text-emerald-400' : m.pct >= 70 ? 'text-amber-400' : 'text-accent'}`}>
                {m.pct}%
              </span>
            </div>
            <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${m.cor} transition-all duration-700`}
                style={{ width: `${Math.min(m.pct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-600">
              <span>{m.display(m.atual)}</span>
              <span>meta: {m.display(m.meta)}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Ranking de Técnicos */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-ui-border flex items-center gap-2">
          <Award size={15} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-ui-text">Ranking de Técnicos — {mesLabel}</h2>
        </div>
        <div className="divide-y divide-ui-border">
          {ranking.map(tec => (
            <div key={tec.id} className="px-5 py-4 flex items-center gap-4">
              <span className="text-xl w-8 shrink-0">{tec.posicao}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ui-text">{tec.nome}</p>
                <p className="text-xs text-gray-500">{tec.osMes} OS concluídas no mês</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-ui-text">{tec.faturadoStr}</p>
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
