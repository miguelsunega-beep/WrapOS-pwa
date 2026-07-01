import { X } from 'lucide-react'
import type { MaterialUsado, Produto } from '../types'

interface MaterialSelectorProps {
  materiais: MaterialUsado[]
  onChange: (materiais: MaterialUsado[]) => void
  produtos: Produto[]
  categoriasFiltro?: string[]
}

const DEFAULT_CATEGORIAS = ['PPF', 'Envelopamento']

export function MaterialSelector({ materiais, onChange, produtos, categoriasFiltro = DEFAULT_CATEGORIAS }: MaterialSelectorProps) {
  const produtosFiltrados = produtos.filter(p => categoriasFiltro.includes(p.categoria))

  const updateAt = (i: number, patch: Partial<MaterialUsado>) =>
    onChange(materiais.map((x, j) => j === i ? { ...x, ...patch } : x))

  const removeAt = (i: number) =>
    onChange(materiais.filter((_, j) => j !== i))

  const addMaterial = () =>
    onChange([...materiais, { origem: 'estoque', produtoId: '', quantidade: 1 }])

  return (
    <div className="space-y-2">
      {materiais.map((m, i) => (
        <div key={i} className="p-3 rounded-xl border border-ui-border bg-surface-700 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-1">
              {([
                { v: 'estoque', label: 'Estoque' },
                { v: 'compra',  label: 'Compra p/ este carro' },
                { v: 'retalho', label: 'Retalho' },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => updateAt(i, { origem: opt.v, produtoId: '', nome: '', custo: undefined })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    m.origem === opt.v
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-surface-600 border-ui-border text-gray-500 hover:text-ui-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => removeAt(i)}
              className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
            >
              <X size={13} />
            </button>
          </div>

          {m.origem === 'estoque' ? (
            <div className="flex items-center gap-2">
              <select
                value={m.produtoId ?? ''}
                onChange={e => updateAt(i, { produtoId: e.target.value })}
                className="flex-1 bg-surface-600 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text focus:border-accent/50 outline-none"
              >
                <option className="bg-surface-700 text-ui-text" value="">Selecionar produto...</option>
                {produtosFiltrados.map(p => (
                  <option className="bg-surface-700 text-ui-text" key={p.id} value={p.id}>
                    {p.nome} (em estoque: {p.quantidade} {p.unidade})
                  </option>
                ))}
              </select>
              <input
                type="number" min={1}
                value={m.quantidade}
                onChange={e => updateAt(i, { quantidade: +e.target.value })}
                className="w-20 bg-surface-600 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text text-center focus:border-accent/50 outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={m.origem === 'compra' ? 'Material comprado (ex: PPF cor X)' : 'Retalho/sobra usado'}
                value={m.nome ?? ''}
                onChange={e => updateAt(i, { nome: e.target.value })}
                className="flex-1 bg-surface-600 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-500 focus:border-accent/50 outline-none"
              />
              <input
                type="number" min={1}
                value={m.quantidade}
                onChange={e => updateAt(i, { quantidade: +e.target.value })}
                className="w-16 bg-surface-600 border border-ui-border rounded-lg px-2 py-2 text-sm text-ui-text text-center focus:border-accent/50 outline-none"
              />
              {m.origem === 'compra' && (
                <div className="flex items-center gap-1">
                  <span className="text-[12px] text-gray-500">R$</span>
                  <input
                    type="number" min={0} step={10}
                    placeholder="custo"
                    value={m.custo ?? ''}
                    onChange={e => updateAt(i, { custo: parseFloat(e.target.value) || 0 })}
                    className="w-24 bg-surface-600 border border-ui-border rounded-lg px-2 py-2 text-sm text-ui-text text-right focus:border-accent/50 outline-none"
                  />
                </div>
              )}
            </div>
          )}
          {m.origem === 'compra' && (
            <p className="text-[10px] text-amber-400/80">Lançado como despesa exclusiva desta OS no Financeiro.</p>
          )}
          {m.origem === 'retalho' && (
            <p className="text-[10px] text-gray-600">Não baixa estoque nem gera despesa.</p>
          )}
        </div>
      ))}

      <button
        onClick={addMaterial}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-colors text-gray-500 hover:text-ui-text border border-dashed border-ui-border"
      >
        + Adicionar material
      </button>
    </div>
  )
}
