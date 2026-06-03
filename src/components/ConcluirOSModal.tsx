import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, CheckCheck } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { ActionButton } from './ActionButton'
import { useApp } from '../context/AppContext'
import type { OrdemServico, MaterialUsado } from '../types'

interface ConcluirOSModalProps {
  os: OrdemServico | null
  onClose: () => void
  /** chamado após concluir com sucesso, com o estado de pagamento escolhido */
  onConcluded?: (osId: string, pago: boolean) => void
}

export function ConcluirOSModal({ os, onClose, onConcluded }: ConcluirOSModalProps) {
  const { produtos, concluirOS } = useApp()
  const [materiais, setMateriais] = useState<MaterialUsado[]>([])
  const [pago, setPago] = useState(true)

  // Reset ao abrir nova OS
  useEffect(() => {
    if (os) { setMateriais([]); setPago(true) }
  }, [os?.id])

  const confirmar = () => {
    if (!os) return
    const mats = materiais.filter(m =>
      m.quantidade > 0 && (
        (m.origem === 'estoque' && m.produtoId) ||
        (m.origem === 'compra'  && m.nome?.trim() && (m.custo ?? 0) > 0) ||
        (m.origem === 'retalho' && m.nome?.trim())
      )
    )
    const { created } = concluirOS(os.id, mats, pago)
    const parts: string[] = ['OS concluída!']
    if (created.includes('receita')) parts.push('Receita lançada')
    if (created.includes('a_receber')) parts.push('Marcada como A RECEBER')
    if (created.includes('garantia')) parts.push('Garantia criada')
    if (mats.some(m => m.origem === 'estoque')) parts.push('Estoque baixado')
    if (created.includes('despesa_material')) parts.push('Despesa de material lançada')
    toast.success(parts.join(' · '))
    onConcluded?.(os.id, pago)
    onClose()
  }

  return (
    <Modal
      isOpen={os !== null}
      onClose={onClose}
      title={`Concluir OS #${os?.numero ?? ''}`}
      size="lg"
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-400">
          A OS será marcada como concluída. Uma garantia será criada automaticamente.
        </p>

        {/* Materiais utilizados */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Materiais Utilizados (opcional)</p>
            <button
              onClick={() => setMateriais(p => [...p, { origem: 'estoque', produtoId: '', quantidade: 1 }])}
              className="text-xs text-accent hover:text-ui-text transition-colors font-medium"
            >
              + Adicionar
            </button>
          </div>

          {materiais.length === 0 ? (
            <p className="text-xs text-gray-600 py-2 text-center border border-dashed border-ui-border rounded-xl">
              Nenhum material registrado — clique em "+ Adicionar" para registrar
            </p>
          ) : (
            <div className="space-y-2">
              {materiais.map((m, i) => (
                <div key={i} className="p-3 rounded-xl border border-ui-border bg-surface-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {([
                        { v: 'estoque', label: 'Estoque' },
                        { v: 'compra',  label: 'Compra' },
                        { v: 'retalho', label: 'Retalho' },
                      ] as const).map(opt => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setMateriais(p => p.map((x, j) => j === i
                            ? { origem: opt.v, quantidade: x.quantidade, produtoId: '', nome: '', custo: undefined }
                            : x))}
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
                      onClick={() => setMateriais(p => p.filter((_, j) => j !== i))}
                      className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {m.origem === 'estoque' ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={m.produtoId ?? ''}
                        onChange={e => setMateriais(p => p.map((x, j) => j === i ? { ...x, produtoId: e.target.value } : x))}
                        className="flex-1 bg-surface-600 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text focus:border-accent/50 outline-none"
                      >
                        <option className="bg-surface-700 text-ui-text" value="">Selecionar produto...</option>
                        {produtos.map(p => (
                          <option className="bg-surface-700 text-ui-text" key={p.id} value={p.id}>{p.nome} (em estoque: {p.quantidade} {p.unidade})</option>
                        ))}
                      </select>
                      <input
                        type="number" min={1}
                        value={m.quantidade}
                        onChange={e => setMateriais(p => p.map((x, j) => j === i ? { ...x, quantidade: +e.target.value } : x))}
                        className="w-20 bg-surface-600 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text text-center focus:border-accent/50 outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={m.origem === 'compra' ? 'Material comprado (ex: PPF cor X)' : 'Retalho/sobra usado'}
                        value={m.nome ?? ''}
                        onChange={e => setMateriais(p => p.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))}
                        className="flex-1 bg-surface-600 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-500 focus:border-accent/50 outline-none"
                      />
                      <input
                        type="number" min={1}
                        value={m.quantidade}
                        onChange={e => setMateriais(p => p.map((x, j) => j === i ? { ...x, quantidade: +e.target.value } : x))}
                        className="w-16 bg-surface-600 border border-ui-border rounded-lg px-2 py-2 text-sm text-ui-text text-center focus:border-accent/50 outline-none"
                      />
                      {m.origem === 'compra' && (
                        <div className="flex items-center gap-1">
                          <span className="text-[12px] text-gray-500">R$</span>
                          <input
                            type="number" min={0} step={10}
                            placeholder="custo"
                            value={m.custo ?? ''}
                            onChange={e => setMateriais(p => p.map((x, j) => j === i ? { ...x, custo: parseFloat(e.target.value) || 0 } : x))}
                            className="w-24 bg-surface-600 border border-ui-border rounded-lg px-2 py-2 text-sm text-ui-text text-right focus:border-accent/50 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {m.origem === 'compra' && (
                    <p className="text-[10px] text-amber-400/80">Será lançado como despesa no Financeiro.</p>
                  )}
                  {m.origem === 'retalho' && (
                    <p className="text-[10px] text-gray-600">Retalho/sobra — não baixa estoque nem gera despesa.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seletor pago / a receber */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPago(true)}
              className={`py-2 rounded-lg text-sm font-medium border transition-all ${pago ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-ui-border text-gray-500 hover:text-gray-300'}`}>
              ✓ Recebido agora
            </button>
            <button type="button" onClick={() => setPago(false)}
              className={`py-2 rounded-lg text-sm font-medium border transition-all ${!pago ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'border-ui-border text-gray-500 hover:text-gray-300'}`}>
              ⏳ A receber
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-ui-border">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <ActionButton onClick={confirmar}>
            <CheckCheck size={15} /> Concluir OS
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
