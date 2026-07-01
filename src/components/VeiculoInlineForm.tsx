import { useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { usePlacaLookup } from '../hooks/usePlacaLookup'

// ── Tipo exportado ────────────────────────────────────────────────
export interface VeiculoFormData {
  placa:  string
  marca:  string
  modelo: string
  ano:    string
  cor:    string
}

export const blankVeiculoForm: VeiculoFormData = {
  placa: '', marca: '', modelo: '', ano: '', cor: '',
}

const inputCls =
  'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-500 focus:border-accent/50 outline-none transition-colors'

interface VeiculoInlineFormProps {
  value:      VeiculoFormData
  onChange:   (v: VeiculoFormData) => void
  /** Se falso, o título "Dados do Veículo" não é renderizado */
  showTitle?: boolean
}

/**
 * Campos inline de veículo com lookup automático por placa.
 * Compartilhado entre CheckinRapido, Agendamento e Clientes.
 */
export function VeiculoInlineForm({ value, onChange, showTitle = true }: VeiculoInlineFormProps) {
  const { loading, apiOk, data: placaData } = usePlacaLookup(value.placa)

  // Preenchimento automático quando a API retorna dados
  useEffect(() => {
    if (placaData) {
      onChange({
        ...value,
        marca:  placaData.marca  || value.marca,
        modelo: placaData.modelo || value.modelo,
        ano:    placaData.ano    ? String(placaData.ano) : value.ano,
        cor:    placaData.cor    || value.cor,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placaData])

  const set = (field: keyof VeiculoFormData, val: string) =>
    onChange({ ...value, [field]: val })

  return (
    <div className="space-y-3">
      {showTitle && (
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Dados do veículo
        </p>
      )}

      {/* Placa */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">
          Placa <span className="text-accent">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="ABC1D23"
            value={value.placa}
            onChange={e =>
              set('placa', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8))
            }
            className={`${inputCls} uppercase font-mono pr-8`}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {loading && <Loader2 size={13} className="text-gray-500 animate-spin" />}
            {apiOk && !loading && <Check size={13} className="text-emerald-400" />}
          </div>
        </div>
        {apiOk && (
          <p className="mt-1 text-[11px] text-emerald-400">
            Dados preenchidos automaticamente
          </p>
        )}
      </div>

      {/* Marca + Modelo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Marca <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Toyota"
            value={value.marca}
            onChange={e => set('marca', e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Modelo <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Corolla"
            value={value.modelo}
            onChange={e => set('modelo', e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Ano + Cor */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Ano</label>
          <input
            type="number"
            placeholder={String(new Date().getFullYear())}
            value={value.ano}
            onChange={e => set('ano', e.target.value)}
            min={1960}
            max={new Date().getFullYear() + 1}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Cor</label>
          <input
            type="text"
            placeholder="Ex: Preto"
            value={value.cor}
            onChange={e => set('cor', e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  )
}
