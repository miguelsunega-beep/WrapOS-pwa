import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useApp } from '../context/AppContext'
import type { StatusOS } from '../types'

const OPERACIONAIS: { v: StatusOS; label: string; color: string }[] = [
  { v: 'em_andamento',         label: 'Em Andamento',      color: '#34d399' },
  { v: 'aguardando_material',  label: 'Aguard. Material',  color: '#ff6b35' },
  { v: 'aguardando_aprovacao', label: 'Aguard. Aprovação', color: '#8b5cf6' },
]

const LABEL: Record<string, string> = {
  em_andamento:        'Em Andamento',
  aguardando_material: 'Aguard. Material',
  aguardando_aprovacao:'Aguard. Aprovação',
  concluido:           'Concluído',
  cancelado:           'Cancelado',
}

interface StatusQuickEditProps {
  osId: string
  status: StatusOS
  onChanged?: (novo: StatusOS) => void
  variant?: 'button' | 'badge'
}

export function StatusQuickEdit({ osId, status, onChanged, variant = 'button' }: StatusQuickEditProps) {
  const { mudarStatusOS } = useApp()
  const [open, setOpen] = useState(false)
  const [pendente, setPendente] = useState<StatusOS | null>(null)

  const editavel = status === 'em_andamento' || status === 'aguardando_material' || status === 'aguardando_aprovacao'

  const escolher = (novo: StatusOS) => {
    if (novo === status) { setOpen(false); return }
    setOpen(false)
    setPendente(novo)
  }

  const confirmar = () => {
    if (!pendente) return
    mudarStatusOS(osId, pendente)
    toast.success(`Status: ${LABEL[pendente]}`)
    onChanged?.(pendente)
    setPendente(null)
    setOpen(false)
  }

  const trigger = variant === 'badge' ? (
    <button
      onClick={(e) => { e.stopPropagation(); if (editavel) setOpen(true) }}
      title={editavel ? 'Clique para alterar o status' : undefined}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${editavel ? 'cursor-pointer hover:ring-1 hover:ring-accent/40' : 'cursor-default'}`}
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--wrap-text)' }}
    >
      {LABEL[status]}
      {editavel && <ChevronDown size={11} />}
    </button>
  ) : (
    <button
      onClick={(e) => { e.stopPropagation(); if (editavel) setOpen(true) }}
      disabled={!editavel}
      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-colors bg-surface-600 text-ui-text border border-ui-border hover:bg-surface-500 disabled:opacity-40"
    >
      Status: {LABEL[status]}
      {editavel && <ChevronDown size={13} />}
    </button>
  )

  return (
    <>
      {trigger}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Alterar status da OS" size="sm">
        <div className="space-y-2">
          <p className="text-[12px] text-gray-500 mb-2">Selecione o novo status operacional:</p>
          {OPERACIONAIS.map(opt => (
            <button
              key={opt.v}
              onClick={() => escolher(opt.v)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                opt.v === status ? 'border-accent/40 bg-accent/5' : 'border-ui-border bg-surface-700 hover:bg-surface-600'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
              <span className="text-sm font-medium text-ui-text">{opt.label}</span>
              {opt.v === status && <span className="ml-auto text-[10px] text-gray-500">atual</span>}
            </button>
          ))}
          <p className="text-[10px] text-gray-600 pt-1">Para concluir ou cancelar a OS, use os botões próprios.</p>
        </div>
      </Modal>

      <Modal isOpen={pendente !== null} onClose={() => setPendente(null)} title="Confirmar mudança" size="sm">
        <p className="text-sm text-gray-400 mb-5">
          Mudar status de <b className="text-ui-text">{LABEL[status]}</b> para{' '}
          <b className="text-ui-text">{pendente ? LABEL[pendente] : ''}</b>?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendente(null)}>Cancelar</Button>
          <Button onClick={confirmar}>Confirmar</Button>
        </div>
      </Modal>
    </>
  )
}
