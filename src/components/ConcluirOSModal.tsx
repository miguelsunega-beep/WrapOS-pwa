import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { CheckCheck } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { ActionButton } from './ActionButton'
import { MaterialSelector } from './MaterialSelector'
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

  // Ao abrir, parte dos materiais já salvos na OS (via OSModal > Salvar) para não perdê-los.
  useEffect(() => {
    if (os) { setMateriais(os.materiaisUsados ?? []); setPago(true) }
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
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Materiais Utilizados (opcional)</p>
          <MaterialSelector materiais={materiais} onChange={setMateriais} produtos={produtos} />
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
